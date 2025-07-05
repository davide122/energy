import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Schema di validazione per aggiornamento cliente
const updateClienteSchema = z.object({
  nome: z.string().min(1, 'Nome è obbligatorio').optional(),
  cognome: z.string().min(1, 'Cognome è obbligatorio').optional(),
  email: z.string().email('Email non valida').optional().nullable(),
  telefono: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  note: z.string().optional().nullable()
})

// GET - Dettagli cliente singolo
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        contratti: {
          include: {
            fornitore: true,
            notifiche: {
              orderBy: {
                scheduledDate: 'desc'
              },
              take: 10
            },
            storicoContratti: {
              include: {
                fornitore: true
              },
              orderBy: {
                startDate: 'desc'
              }
            }
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
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente non trovato' },
        { status: 404 }
      )
    }

    // Aggiungi informazioni sui contratti attivi
    const contrattiAttivi = cliente.contratti.filter(c => {
      const today = new Date()
      return c.expiryDate && new Date(c.expiryDate) > today
    })

    const prossimaScadenza = contrattiAttivi.reduce((earliest, contract) => {
      if (!earliest || new Date(contract.expiryDate) < new Date(earliest.expiryDate)) {
        return contract
      }
      return earliest
    }, null)

    return NextResponse.json({
      ...cliente,
      contrattiAttivi: contrattiAttivi.length,
      prossimaScadenza
    })

  } catch (error) {
    console.error('Errore GET cliente:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna cliente
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    // Validazione
    const validatedData = updateClienteSchema.parse(body)

    // Verifica che il cliente esista
    const existingCliente = await prisma.cliente.findUnique({
      where: { id }
    })

    if (!existingCliente) {
      return NextResponse.json(
        { error: 'Cliente non trovato' },
        { status: 404 }
      )
    }

    // Verifica email univoca se fornita e diversa da quella attuale
    if (validatedData.email && validatedData.email !== existingCliente.email) {
      const emailExists = await prisma.cliente.findUnique({
        where: { email: validatedData.email }
      })
      
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email già in uso' },
          { status: 400 }
        )
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: validatedData,
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
    })

    return NextResponse.json(cliente)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Errore PUT cliente:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// DELETE - Elimina cliente
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params

    // Verifica che il cliente esista
    const existingCliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contratti: true
          }
        }
      }
    })

    if (!existingCliente) {
      return NextResponse.json(
        { error: 'Cliente non trovato' },
        { status: 404 }
      )
    }

    // Verifica se ha contratti attivi
    if (existingCliente._count.contratti > 0) {
      return NextResponse.json(
        { 
          error: 'Impossibile eliminare cliente con contratti associati',
          details: 'Eliminare prima tutti i contratti del cliente'
        },
        { status: 400 }
      )
    }

    await prisma.cliente.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Cliente eliminato con successo' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Errore DELETE cliente:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}