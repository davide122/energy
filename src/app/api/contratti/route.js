import { NextResponse } from 'next/server'
import { prisma, calculateContractDates, checkFornitoreHistory } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Schema di validazione per contratto
const contrattoSchema = z.object({
  clienteId: z.string().min(1, 'Cliente è obbligatorio'),
  fornitoreId: z.string().min(1, 'Fornitore è obbligatorio'),
  startDate: z.string().datetime('Data inizio non valida'),
  durataMesi: z.number().int().min(1, 'Durata deve essere almeno 1 mese').max(60, 'Durata massima 60 mesi'),
  penaltyFreeAfterMesi: z.number().int().min(1).max(24).default(6)
})

// GET - Lista contratti
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')
    const fornitoreId = searchParams.get('fornitoreId')
    const status = searchParams.get('status') // 'attivo', 'scaduto', 'in_scadenza'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'startDate'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit
    const today = new Date()

    // Costruisci filtri
    const where = {
      AND: [
        clienteId ? { clienteId } : {},
        fornitoreId ? { fornitoreId } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    }

    // Filtro per status
    if (status) {
      switch (status) {
        case 'attivo':
          where.AND.push({
            expiryDate: {
              gt: today
            }
          })
          break
        case 'scaduto':
          where.AND.push({
            expiryDate: {
              lte: today
            }
          })
          break
        case 'in_scadenza':
          const nextMonth = new Date(today)
          nextMonth.setMonth(today.getMonth() + 1)
          where.AND.push({
            expiryDate: {
              gt: today,
              lte: nextMonth
            }
          })
          break
      }
    }

    const [contratti, total] = await Promise.all([
      prisma.contratto.findMany({
        where: Object.keys(where.AND).length > 0 ? where : {},
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          cliente: true,
          fornitore: true,
          _count: {
            select: {
              notifiche: true,
              storicoContratti: true
            }
          }
        }
      }),
      prisma.contratto.count({ 
        where: Object.keys(where.AND).length > 0 ? where : {} 
      })
    ])

    // Aggiungi informazioni di status per ogni contratto
    const contrattiWithStatus = contratti.map(contratto => {
      const now = new Date()
      const expiryDate = new Date(contratto.expiryDate)
      const penaltyFreeDate = new Date(contratto.penaltyFreeDate)
      const recommendedDate = new Date(contratto.recommendedDate)
      
      let status = 'attivo'
      let daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
      
      if (expiryDate <= now) {
        status = 'scaduto'
      } else if (daysToExpiry <= 30) {
        status = 'in_scadenza'
      }
      
      const isPenaltyFree = now >= penaltyFreeDate
      const isRecommendedChange = now >= recommendedDate
      
      return {
        ...contratto,
        status,
        daysToExpiry,
        isPenaltyFree,
        isRecommendedChange
      }
    })

    return NextResponse.json({
      contratti: contrattiWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Errore GET contratti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo contratto
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validazione
    const validatedData = contrattoSchema.parse(body)

    // Verifica che cliente e fornitore esistano
    const [cliente, fornitore] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: validatedData.clienteId } }),
      prisma.fornitore.findUnique({ where: { id: validatedData.fornitoreId } })
    ])

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente non trovato' },
        { status: 400 }
      )
    }

    if (!fornitore) {
      return NextResponse.json(
        { error: 'Fornitore non trovato' },
        { status: 400 }
      )
    }

    // Verifica che non sia lo stesso fornitore dell'ultimo contratto
    const isSameProvider = await checkFornitoreHistory(validatedData.clienteId, validatedData.fornitoreId)
    if (isSameProvider) {
      return NextResponse.json(
        { error: 'Non è possibile utilizzare lo stesso fornitore consecutivamente' },
        { status: 400 }
      )
    }

    // Calcola le date del contratto
    const dates = calculateContractDates(
      validatedData.startDate,
      validatedData.durataMesi,
      validatedData.penaltyFreeAfterMesi
    )

    // Crea il contratto
    const contratto = await prisma.contratto.create({
      data: {
        ...validatedData,
        startDate: new Date(validatedData.startDate),
        penaltyFreeDate: dates.penaltyFreeDate,
        recommendedDate: dates.recommendedDate,
        expiryDate: dates.expiryDate
      },
      include: {
        cliente: true,
        fornitore: true,
        _count: {
          select: {
            notifiche: true,
            storicoContratti: true
          }
        }
      }
    })

    // Crea record nello storico
    await prisma.storicoContratto.create({
      data: {
        contrattoId: contratto.id,
        fornitoreId: validatedData.fornitoreId,
        startDate: new Date(validatedData.startDate),
        endDate: dates.expiryDate
      }
    })

    return NextResponse.json(contratto, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore POST contratto:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}