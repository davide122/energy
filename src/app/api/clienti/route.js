import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Schema di validazione per cliente
const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome è obbligatorio'),
  cognome: z.string().min(1, 'Cognome è obbligatorio'),
  email: z.string().email('Email non valida').optional().nullable(),
  telefono: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  note: z.string().optional().nullable()
})

// GET - Lista clienti con ricerca e filtri
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'cognome'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const fornitore = searchParams.get('fornitore')
    const scadenza = searchParams.get('scadenza') // 'today', 'week', 'month'

    const skip = (page - 1) * limit

    // Costruisci filtri
    const where = {
      OR: search ? [
        { nome: { contains: search, mode: 'insensitive' } },
        { cognome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ] : undefined
    }

    // Filtro per fornitore
    if (fornitore) {
      where.contratti = {
        some: {
          fornitoreId: fornitore
        }
      }
    }

    // Filtro per scadenza
    if (scadenza) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let endDate = new Date(today)
      
      switch (scadenza) {
        case 'today':
          endDate.setDate(today.getDate() + 1)
          break
        case 'week':
          endDate.setDate(today.getDate() + 7)
          break
        case 'month':
          endDate.setMonth(today.getMonth() + 1)
          break
      }
      
      where.contratti = {
        ...where.contratti,
        some: {
          ...where.contratti?.some,
          expiryDate: {
            gte: today,
            lte: endDate
          }
        }
      }
    }

    const [clienti, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contratti: {
            include: {
              fornitore: true
            },
            orderBy: {
              startDate: 'desc'
            }
          },
          _count: {
            select: {
              contratti: true
            }
          }
        }
      }),
      prisma.cliente.count({ where })
    ])

    return NextResponse.json({
      clienti,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Errore GET clienti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo cliente
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validazione
    const validatedData = clienteSchema.parse(body)

    // Verifica email univoca se fornita
    if (validatedData.email) {
      const existingCliente = await prisma.cliente.findUnique({
        where: { email: validatedData.email }
      })
      
      if (existingCliente) {
        return NextResponse.json(
          { error: 'Email già in uso' },
          { status: 400 }
        )
      }
    }

    const cliente = await prisma.cliente.create({
      data: validatedData,
      include: {
        contratti: {
          include: {
            fornitore: true
          }
        },
        _count: {
          select: {
            contratti: true
          }
        }
      }
    })

    return NextResponse.json(cliente, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore POST cliente:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}