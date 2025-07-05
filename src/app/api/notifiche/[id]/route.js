import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params
    const { letta } = await request.json()

    const notifica = await prisma.notifica.update({
      where: { id: parseInt(id) },
      data: { letta },
      include: {
        contratto: {
          include: {
            cliente: true,
            fornitore: true
          }
        }
      }
    })

    return NextResponse.json(notifica)
  } catch (error) {
    console.error('Errore aggiornamento notifica:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id } = params

    await prisma.notifica.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: 'Notifica eliminata con successo' })
  } catch (error) {
    console.error('Errore eliminazione notifica:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}