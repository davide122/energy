import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const today = new Date()
    const sevenMonthsAgo = new Date()
    sevenMonthsAgo.setMonth(today.getMonth() - 7)

    // Trova tutti i contratti
    const contratti = await prisma.contratto.findMany({
      include: {
        cliente: true,
        fornitore: true,
        notifiche: {
          where: {
            tipo: 'PENALTY_FREE',
            status: 'SENT'
          }
        }
      }
    })

    const contrattiAnalisi = contratti.map(contratto => {
      const startDate = new Date(contratto.startDate)
      const expiryDate = new Date(contratto.expiryDate)
      const penaltyFreeDate = new Date(contratto.penaltyFreeDate)
      const recommendedDate = new Date(contratto.recommendedDate)
      
      // Calcola mesi dall'inizio
      const monthsFromStart = (today - startDate) / (1000 * 60 * 60 * 24 * 30.44)
      const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
      
      // Determina lo stato
      let status = 'attivo'
      let priority = 3
      let actionRequired = false
      let emailSent = contratto.notifiche.length > 0
      
      if (daysToExpiry <= 0) {
        status = 'scaduto'
        priority = 1
        actionRequired = true
      } else if (daysToExpiry <= 30) {
        status = 'in-scadenza'
        priority = 1
        actionRequired = true
      } else if (monthsFromStart >= 7) {
        status = 'modificabile'
        priority = 2
        actionRequired = true
      } else if (today >= recommendedDate) {
        status = 'cambio-consigliato'
        priority = 2
        actionRequired = true
      } else if (today >= penaltyFreeDate) {
        status = 'penalty-free'
        priority = 2
        actionRequired = true
      }
      
      return {
        ...contratto,
        status,
        priority,
        actionRequired,
        emailSent,
        monthsFromStart: Math.floor(monthsFromStart),
        daysToExpiry,
        canChange: monthsFromStart >= 7
      }
    })

    // Ordina per priorità
    const contrattiOrdinati = contrattiAnalisi.sort((a, b) => a.priority - b.priority)
    
    // Statistiche
    const stats = {
      totaleContratti: contratti.length,
      modificabili: contrattiAnalisi.filter(c => c.canChange).length,
      inScadenza: contrattiAnalisi.filter(c => c.status === 'in-scadenza').length,
      scaduti: contrattiAnalisi.filter(c => c.status === 'scaduto').length,
      penaltyFree: contrattiAnalisi.filter(c => c.status === 'penalty-free').length,
      emailDaInviare: contrattiAnalisi.filter(c => c.actionRequired && !c.emailSent).length
    }

    return NextResponse.json({
      contratti: contrattiOrdinati,
      stats
    })
  } catch (error) {
    console.error('Errore API admin contratti alert:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { action, contrattoIds } = await request.json()

    if (action === 'send-emails') {
      const risultati = []
      
      for (const contrattoId of contrattoIds) {
        const contratto = await prisma.contratto.findUnique({
          where: { id: contrattoId },
          include: {
            cliente: true,
            fornitore: true
          }
        })

        if (!contratto) continue

        const today = new Date()
        const startDate = new Date(contratto.startDate)
        const expiryDate = new Date(contratto.expiryDate)
        const monthsFromStart = (today - startDate) / (1000 * 60 * 60 * 24 * 30.44)
        const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
        
        let tipoNotifica = 'PENALTY_FREE'
        if (daysToExpiry <= 30) {
          tipoNotifica = 'EXPIRY'
        } else if (daysToExpiry <= 90) {
          tipoNotifica = 'RECOMMENDED'
        }

        // Invia email
        const emailResult = await sendNotification(
          'EMAIL',
          contratto.cliente.email,
          tipoNotifica,
          contratto.cliente,
          contratto,
          contratto.fornitore
        )

        // Salva notifica nel database
        await prisma.notifica.create({
          data: {
            contrattoId: contratto.id,
            tipo: tipoNotifica,
            scheduledDate: today,
            channel: 'EMAIL',
            status: emailResult.success ? 'SENT' : 'FAILED',
            sentAt: emailResult.success ? today : null,
            errorMessage: emailResult.error || null
          }
        })

        risultati.push({
          contrattoId: contratto.id,
          cliente: `${contratto.cliente.nome} ${contratto.cliente.cognome}`,
          email: contratto.cliente.email,
          success: emailResult.success,
          error: emailResult.error
        })
      }

      return NextResponse.json({ risultati })
    }

    return NextResponse.json({ error: 'Azione non supportata' }, { status: 400 })
  } catch (error) {
    console.error('Errore POST admin contratti alert:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}