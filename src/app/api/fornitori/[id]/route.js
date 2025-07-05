import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Schema di validazione per aggiornamento fornitore
const updateFornitoreSchema = z.object({
  ragioneSociale: z.string().min(1, 'Ragione sociale è obbligatoria').optional(),
  tipo: z.enum(['LUCE', 'GAS', 'LUCE_GAS'], {
    errorMap: () => ({ message: 'Tipo deve essere LUCE, GAS o LUCE_GAS' })
  }).optional(),
  note: z.string().optional().nullable()
})

// GET - Dettagli fornitore singolo
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params

    const fornitore = await prisma.fornitore.findUnique({
      where: { id },
      include: {
        contratti: {
          include: {
            cliente: true
          },
          orderBy: {
            startDate: 'desc'
          }
        },
        storicoContratti: {
          include: {
            contratto: {
              include: {
                cliente: true
              }
            }
          },
          orderBy: {
            startDate: 'desc'
          }
        },
        _count: {
          select: {
            contratti: true,
            storicoContratti: true
          }
        }
      }
    })

    if (!fornitore) {
      return NextResponse.json(
        { error: 'Fornitore non trovato' },
        { status: 404 }
      )
    }

    // Calcola statistiche
    const contrattiAttivi = fornitore.contratti.filter(c => {
      const today = new Date()
      return c.expiryDate && new Date(c.expiryDate) > today
    })

    const contrattiInScadenza = contrattiAttivi.filter(c => {
      const today = new Date()
      const scadenza = new Date(c.expiryDate)
      const diffTime = scadenza - today
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays <= 30
    })

    return NextResponse.json({
      ...fornitore,
      statistiche: {
        contrattiAttivi: contrattiAttivi.length,
        contrattiInScadenza: contrattiInScadenza.length,
        totaleStorico: fornitore._count.storicoContratti
      }
    })

  } catch (error) {
    console.error('Errore GET fornitore:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna fornitore
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    // Validazione
    const validatedData = updateFornitoreSchema.parse(body)

    // Verifica che il fornitore esista
    const existingFornitore = await prisma.fornitore.findUnique({
      where: { id }
    })

    if (!existingFornitore) {
      return NextResponse.json(
        { error: 'Fornitore non trovato' },
        { status: 404 }
      )
    }

    // Verifica ragione sociale univoca se fornita e diversa da quella attuale
    if (validatedData.ragioneSociale && 
        validatedData.ragioneSociale.toLowerCase() !== existingFornitore.ragioneSociale.toLowerCase()) {
      const ragioneSocialeExists = await prisma.fornitore.findFirst({
        where: {
          ragioneSociale: {
            equals: validatedData.ragioneSociale,
            mode: 'insensitive'
          }
        }
      })
      
      if (ragioneSocialeExists) {
        return NextResponse.json(
          { error: 'Ragione sociale già esistente' },
          { status: 400 }
        )
      }
    }

    const fornitore = await prisma.fornitore.update({
      where: { id },
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

    return NextResponse.json(fornitore)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore PUT fornitore:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina fornitore
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params

    // Verifica che il fornitore esista
    const existingFornitore = await prisma.fornitore.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contratti: true,
            storicoContratti: true
          }
        }
      }
    })

    if (!existingFornitore) {
      return NextResponse.json(
        { error: 'Fornitore non trovato' },
        { status: 404 }
      )
    }

    // Verifica se ha contratti o storico associati
    if (existingFornitore._count.contratti > 0 || existingFornitore._count.storicoContratti > 0) {
      return NextResponse.json(
        { 
          error: 'Impossibile eliminare fornitore con contratti associati',
          details: 'Eliminare prima tutti i contratti del fornitore'
        },
        { status: 400 }
      )
    }

    await prisma.fornitore.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Fornitore eliminato con successo' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Errore DELETE fornitore:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}