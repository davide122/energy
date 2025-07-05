import { NextResponse } from 'next/server'
import { prisma, calculateContractDates, getContractsForNotification } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import { format } from 'date-fns'

// Verifica del secret per sicurezza
const verifyCronSecret = (request) => {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.error('CRON_SECRET non configurato')
    return false
  }
  
  return authHeader === `Bearer ${cronSecret}`
}

// Funzione per processare notifiche di un tipo specifico
const processNotificationType = async (tipo, today) => {
  try {
    console.log(`Processando notifiche tipo: ${tipo}`)
    
    // Trova contratti che necessitano notifica oggi
    const contracts = await getContractsForNotification(today, tipo)
    console.log(`Trovati ${contracts.length} contratti per ${tipo}`)
    
    const results = []
    
    for (const contract of contracts) {
      try {
        // Verifica se esiste già una notifica per oggi
        const existingNotification = await prisma.notifica.findFirst({
          where: {
            contrattoId: contract.id,
            tipo: tipo,
            scheduledDate: {
              gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
              lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
            }
          }
        })
        
        if (existingNotification) {
          console.log(`Notifica ${tipo} già esistente per contratto ${contract.id}`)
          continue
        }
        
        // Determina il canale di notifica preferito
        const channel = contract.cliente.email ? 'EMAIL' : 'DASHBOARD'
        const recipient = contract.cliente.email || null
        
        // Crea la notifica nel database
        const notification = await prisma.notifica.create({
          data: {
            contrattoId: contract.id,
            tipo: tipo,
            scheduledDate: today,
            channel: channel,
            status: 'PENDING'
          }
        })
        
        // Invia la notifica se c'è un destinatario
        if (recipient) {
          const sendResult = await sendNotification(
            channel,
            recipient,
            tipo,
            contract.cliente,
            contract,
            contract.fornitore
          )
          
          // Aggiorna lo status della notifica
          await prisma.notifica.update({
            where: { id: notification.id },
            data: {
              status: sendResult.success ? 'SENT' : 'FAILED',
              sentAt: sendResult.success ? new Date() : null,
              errorMessage: sendResult.error || null
            }
          })
          
          results.push({
            contrattoId: contract.id,
            cliente: `${contract.cliente.nome} ${contract.cliente.cognome}`,
            fornitore: contract.fornitore.ragioneSociale,
            tipo: tipo,
            status: sendResult.success ? 'SENT' : 'FAILED',
            error: sendResult.error
          })
        } else {
          // Solo notifica dashboard
          await prisma.notifica.update({
            where: { id: notification.id },
            data: {
              status: 'SENT',
              sentAt: new Date()
            }
          })
          
          results.push({
            contrattoId: contract.id,
            cliente: `${contract.cliente.nome} ${contract.cliente.cognome}`,
            fornitore: contract.fornitore.ragioneSociale,
            tipo: tipo,
            status: 'DASHBOARD_ONLY'
          })
        }
        
      } catch (error) {
        console.error(`Errore processando contratto ${contract.id}:`, error)
        results.push({
          contrattoId: contract.id,
          cliente: `${contract.cliente.nome} ${contract.cliente.cognome}`,
          tipo: tipo,
          status: 'ERROR',
          error: error.message
        })
      }
    }
    
    return results
  } catch (error) {
    console.error(`Errore processando tipo ${tipo}:`, error)
    throw error
  }
}

// Funzione per aggiornare le date calcolate dei contratti
const updateContractDates = async () => {
  try {
    const contracts = await prisma.contratto.findMany({
      where: {
        OR: [
          { penaltyFreeDate: null },
          { recommendedDate: null },
          { expiryDate: null }
        ]
      }
    })
    
    for (const contract of contracts) {
      const dates = calculateContractDates(
        contract.startDate,
        contract.durataMesi,
        contract.penaltyFreeAfterMesi
      )
      
      await prisma.contratto.update({
        where: { id: contract.id },
        data: {
          penaltyFreeDate: dates.penaltyFreeDate,
          recommendedDate: dates.recommendedDate,
          expiryDate: dates.expiryDate
        }
      })
    }
    
    console.log(`Aggiornate ${contracts.length} date contratti`)
  } catch (error) {
    console.error('Errore aggiornamento date contratti:', error)
  }
}

export async function POST(request) {
  try {
    // Verifica autorizzazione
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    console.log(`Avvio scheduler notifiche per ${format(today, 'dd/MM/yyyy')}`)
    
    // Aggiorna le date calcolate dei contratti
    await updateContractDates()
    
    // Processa tutti i tipi di notifica
    const penaltyFreeResults = await processNotificationType('PENALTY_FREE', today)
    const recommendedResults = await processNotificationType('RECOMMENDED', today)
    const expiryResults = await processNotificationType('EXPIRY', today)
    
    const summary = {
      date: format(today, 'dd/MM/yyyy'),
      totalProcessed: penaltyFreeResults.length + recommendedResults.length + expiryResults.length,
      penaltyFree: {
        count: penaltyFreeResults.length,
        sent: penaltyFreeResults.filter(r => r.status === 'SENT').length,
        failed: penaltyFreeResults.filter(r => r.status === 'FAILED').length
      },
      recommended: {
        count: recommendedResults.length,
        sent: recommendedResults.filter(r => r.status === 'SENT').length,
        failed: recommendedResults.filter(r => r.status === 'FAILED').length
      },
      expiry: {
        count: expiryResults.length,
        sent: expiryResults.filter(r => r.status === 'SENT').length,
        failed: expiryResults.filter(r => r.status === 'FAILED').length
      },
      details: {
        penaltyFree: penaltyFreeResults,
        recommended: recommendedResults,
        expiry: expiryResults
      }
    }
    
    console.log('Scheduler completato:', summary)
    
    return NextResponse.json({
      success: true,
      message: 'Scheduler eseguito con successo',
      summary
    })
    
  } catch (error) {
    console.error('Errore scheduler:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Errore interno del server',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Endpoint GET per test manuale
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Non autorizzato' },
      { status: 401 }
    )
  }
  
  // Esegui lo stesso processo del POST
  return POST(request)
}