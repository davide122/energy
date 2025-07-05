import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Schema di validazione per fornitore
const fornitoreSchema = z.object({
  ragioneSociale: z.string().min(1, 'Ragione sociale è obbligatoria'),
  tipo: z.enum(['LUCE', 'GAS', 'LUCE_GAS'], {
    errorMap: () => ({ message: 'Tipo deve essere LUCE, GAS o LUCE_GAS' })
  }),
  note: z.string().optional().nullable()
})

// GET - Lista fornitori
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const tipo = searchParams.get('tipo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'ragioneSociale'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const skip = (page - 1) * limit

    // Costruisci filtri
    const where = {
      AND: [
        search ? {
          ragioneSociale: {
            contains: search,
            mode: 'insensitive'
          }
        } : {},
        tipo ? { tipo } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    }

    const [fornitori, total] = await Promise.all([
      prisma.fornitore.findMany({
        where: Object.keys(where.AND).length > 0 ? where : {},
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              contratti: true,
              storicoContratti: true
            }
          }
        }
      }),
      prisma.fornitore.count({ 
        where: Object.keys(where.AND).length > 0 ? where : {} 
      })
    ])

    return NextResponse.json({
      fornitori,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Errore GET fornitori:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo fornitore
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validazione
    const validatedData = fornitoreSchema.parse(body)

    // Verifica ragione sociale univoca
    const existingFornitore = await prisma.fornitore.findFirst({
      where: {
        ragioneSociale: {
          equals: validatedData.ragioneSociale,
          mode: 'insensitive'
        }
      }
    })
    
    if (existingFornitore) {
      return NextResponse.json(
        { error: 'Ragione sociale già esistente' },
        { status: 400 }
      )
    }

    const fornitore = await prisma.fornitore.create({
      data: validatedData,
      include: {
        _count: {
          select: {
            contratti: true,
            storicoContratti: true
          }
        }
      }
    })

    return NextResponse.json(fornitore, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore POST fornitore:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}