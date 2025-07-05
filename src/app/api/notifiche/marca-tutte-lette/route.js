import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    await prisma.notifica.updateMany({
      where: {
        letta: false
      },
      data: {
        letta: true
      }
    })

    return NextResponse.json({ message: 'Tutte le notifiche sono state marcate come lette' })
  } catch (error) {
    console.error('Errore aggiornamento notifiche:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}