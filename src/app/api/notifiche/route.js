import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const notifiche = await prisma.notifica.findMany({
      include: {
        contratto: {
          include: {
            cliente: true,
            fornitore: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(notifiche)
  } catch (error) {
    console.error('Errore API notifiche:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { tipo, contrattoId, scheduledDate, channel } = await request.json()

    if (!tipo || !contrattoId) {
      return NextResponse.json(
        { error: 'Tipo e contrattoId sono obbligatori' },
        { status: 400 }
      )
    }

    const notifica = await prisma.notifica.create({
      data: {
        tipo,
        contrattoId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        channel: channel || 'EMAIL'
      },
      include: {
        contratto: {
          include: {
            cliente: true,
            fornitore: true
          }
        }
      }
    })

    return NextResponse.json(notifica, { status: 201 })
  } catch (error) {
    console.error('Errore creazione notifica:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}