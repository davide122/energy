import { NextResponse } from 'next/server'
import { prisma, calculateContractDates } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Schema di validazione per aggiornamento contratto
const updateContrattoSchema = z.object({
  startDate: z.string().datetime('Data inizio non valida').optional(),
  durataMesi: z.number().int().min(1, 'Durata deve essere almeno 1 mese').max(60, 'Durata massima 60 mesi').optional(),
  penaltyFreeAfterMesi: z.number().int().min(1).max(24).optional()
})

// GET - Dettagli contratto singolo
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params

    const contratto = await prisma.contratto.findUnique({
      where: { id },
      include: {
        cliente: true,
        fornitore: true,
        notifiche: {
          orderBy: {
            scheduledDate: 'desc'
          }
        },
        storicoContratti: {
          include: {
            fornitore: true
          },
          orderBy: {
            startDate: 'desc'
          }
        }
      }
    })

    if (!contratto) {
      return NextResponse.json(
        { error: 'Contratto non trovato' },
        { status: 404 }
      )
    }

    // Calcola informazioni aggiuntive
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
    
    // Statistiche notifiche
    const notificheStats = {
      totali: contratto.notifiche.length,
      inviate: contratto.notifiche.filter(n => n.status === 'SENT').length,
      fallite: contratto.notifiche.filter(n => n.status === 'FAILED').length,
      pending: contratto.notifiche.filter(n => n.status === 'PENDING').length
    }

    return NextResponse.json({
      ...contratto,
      status,
      daysToExpiry,
      isPenaltyFree,
      isRecommendedChange,
      notificheStats
    })

  } catch (error) {
    console.error('Errore GET contratto:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna contratto
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    // Validazione
    const validatedData = updateContrattoSchema.parse(body)

    // Verifica che il contratto esista
    const existingContratto = await prisma.contratto.findUnique({
      where: { id }
    })

    if (!existingContratto) {
      return NextResponse.json(
        { error: 'Contratto non trovato' },
        { status: 404 }
      )
    }

    // Prepara i dati per l'aggiornamento
    const updateData = { ...validatedData }
    
    // Se viene modificata la data di inizio o la durata, ricalcola le date
    if (validatedData.startDate || validatedData.durataMesi || validatedData.penaltyFreeAfterMesi) {
      const startDate = validatedData.startDate ? new Date(validatedData.startDate) : existingContratto.startDate
      const durataMesi = validatedData.durataMesi || existingContratto.durataMesi
      const penaltyFreeAfterMesi = validatedData.penaltyFreeAfterMesi || existingContratto.penaltyFreeAfterMesi
      
      const dates = calculateContractDates(startDate, durataMesi, penaltyFreeAfterMesi)
      
      updateData.startDate = startDate
      updateData.penaltyFreeDate = dates.penaltyFreeDate
      updateData.recommendedDate = dates.recommendedDate
      updateData.expiryDate = dates.expiryDate
    }

    const contratto = await prisma.contratto.update({
      where: { id },
      data: updateData,
      include: {
        cliente: true,
        fornitore: true,
        notifiche: {
          orderBy: {
            scheduledDate: 'desc'
          }
        },
        _count: {
          select: {
            notifiche: true,
            storicoContratti: true
          }
        }
      }
    })

    // Aggiorna anche lo storico se necessario
    if (validatedData.startDate || validatedData.durataMesi) {
      await prisma.storicoContratto.updateMany({
        where: {
          contrattoId: id
        },
        data: {
          startDate: contratto.startDate,
          endDate: contratto.expiryDate
        }
      })
    }

    return NextResponse.json(contratto)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore PUT contratto:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina contratto
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params

    // Verifica che il contratto esista
    const existingContratto = await prisma.contratto.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            notifiche: true,
            storicoContratti: true
          }
        }
      }
    })

    if (!existingContratto) {
      return NextResponse.json(
        { error: 'Contratto non trovato' },
        { status: 404 }
      )
    }

    // Elimina il contratto (le notifiche e lo storico verranno eliminati automaticamente per cascade)
    await prisma.contratto.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Contratto eliminato con successo' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Errore DELETE contratto:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}