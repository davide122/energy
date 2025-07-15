import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendNotification } from '../../../../lib/notifications'

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    // Verifica che la richiesta provenga da un cron job autorizzato
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const now = new Date()
    const results = {
      emailInviate: 0,
      errori: 0,
      dettagli: []
    }

    // Trova tutti i contratti che necessitano notifiche
    const contratti = await prisma.contratto.findMany({
      include: {
        cliente: true,
        fornitore: true,
        notifiche: {
          where: {
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Ultime 24 ore
            }
          }
        }
      }
    })

    for (const contratto of contratti) {
      const dataInizio = new Date(contratto.dataInizio)
      const dataFine = new Date(contratto.dataFine)
      
      // Calcola le date importanti
      const penaltyFreeDate = new Date(dataInizio)
      penaltyFreeDate.setMonth(penaltyFreeDate.getMonth() + 7) // 7 mesi dopo l'inizio
      
      const recommendedDate = new Date(dataFine)
      recommendedDate.setMonth(recommendedDate.getMonth() - 2) // 2 mesi prima della scadenza
      
      const expiryWarningDate = new Date(dataFine)
      expiryWarningDate.setDate(expiryWarningDate.getDate() - 30) // 30 giorni prima della scadenza
      
      let tipoNotifica = null
      let messaggio = ''
      
      // Determina il tipo di notifica necessaria
      if (now >= penaltyFreeDate && now < recommendedDate) {
        // Contratto modificabile senza penali
        const giorniDaPenaltyFree = Math.floor((now - penaltyFreeDate) / (1000 * 60 * 60 * 24))
        if (giorniDaPenaltyFree === 0 || giorniDaPenaltyFree === 30 || giorniDaPenaltyFree === 60) {
          tipoNotifica = 'PENALTY_FREE'
          messaggio = `Il suo contratto con ${contratto.fornitore.ragioneSociale} può essere modificato senza penali da ${giorniDaPenaltyFree} giorni.`
        }
      } else if (now >= recommendedDate && now < expiryWarningDate) {
        // Periodo consigliato per il cambio
        const giorniAScadenza = Math.floor((dataFine - now) / (1000 * 60 * 60 * 24))
        if (giorniAScadenza === 60 || giorniAScadenza === 45 || giorniAScadenza === 30) {
          tipoNotifica = 'RECOMMENDED'
          messaggio = `Le consigliamo di valutare il rinnovo del contratto con ${contratto.fornitore.ragioneSociale}. Scadenza tra ${giorniAScadenza} giorni.`
        }
      } else if (now >= expiryWarningDate) {
        // Avviso di scadenza imminente
        const giorniAScadenza = Math.floor((dataFine - now) / (1000 * 60 * 60 * 24))
        if (giorniAScadenza <= 30 && giorniAScadenza >= 0) {
          if (giorniAScadenza === 30 || giorniAScadenza === 15 || giorniAScadenza === 7 || giorniAScadenza === 1) {
            tipoNotifica = 'EXPIRY'
            messaggio = giorniAScadenza === 0 
              ? `Il suo contratto con ${contratto.fornitore.ragioneSociale} scade oggi!`
              : `Il suo contratto con ${contratto.fornitore.ragioneSociale} scade tra ${giorniAScadenza} giorni.`
          }
        }
      }
      
      // Se è necessaria una notifica, controlla se non è già stata inviata oggi
      if (tipoNotifica) {
        const notificaEsistente = contratto.notifiche.find(n => 
          n.tipo === tipoNotifica && 
          n.createdAt >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
        )
        
        if (!notificaEsistente) {
          try {
            // Invia email al cliente
            const emailResult = await sendNotification(
              contratto.cliente.email,
              tipoNotifica,
              {
                nomeCliente: `${contratto.cliente.nome} ${contratto.cliente.cognome}`,
                ragioneSocialeFornitore: contratto.fornitore.ragioneSociale,
                dataScadenza: dataFine.toLocaleDateString('it-IT'),
                messaggio
              },
              'EMAIL'
            )
            
            // Registra la notifica nel database
            await prisma.notifica.create({
              data: {
                tipo: tipoNotifica,
                messaggio,
                contrattoId: contratto.id,
                channel: 'EMAIL',
                status: emailResult.success ? 'SENT' : 'FAILED',
                metadata: {
                  emailId: emailResult.messageId,
                  recipient: contratto.cliente.email
                }
              }
            })
            
            if (emailResult.success) {
              results.emailInviate++
              results.dettagli.push({
                cliente: `${contratto.cliente.nome} ${contratto.cliente.cognome}`,
                email: contratto.cliente.email,
                tipo: tipoNotifica,
                status: 'success'
              })
            } else {
              results.errori++
              results.dettagli.push({
                cliente: `${contratto.cliente.nome} ${contratto.cliente.cognome}`,
                email: contratto.cliente.email,
                tipo: tipoNotifica,
                status: 'error',
                errore: emailResult.error
              })
            }
            
          } catch (error) {
            console.error('Errore nell\'invio della notifica:', error)
            results.errori++
            results.dettagli.push({
              cliente: `${contratto.cliente.nome} ${contratto.cliente.cognome}`,
              email: contratto.cliente.email,
              tipo: tipoNotifica,
              status: 'error',
              errore: error.message
            })
          }
        }
      }
    }
    
    // Invia report all'admin se ci sono state attività
    if (results.emailInviate > 0 || results.errori > 0) {
      try {
        const adminUsers = await prisma.user.findMany({
          where: { role: 'ADMIN' }
        })
        
        for (const admin of adminUsers) {
          await sendNotification(
            admin.email,
            'ADMIN_REPORT',
            {
              data: now.toLocaleDateString('it-IT'),
              emailInviate: results.emailInviate,
              errori: results.errori,
              dettagli: results.dettagli
            },
            'EMAIL'
          )
        }
      } catch (error) {
        console.error('Errore nell\'invio del report admin:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Job di notifiche completato',
      risultati: results
    })
    
  } catch (error) {
    console.error('Errore nel job di notifiche:', error)
    return NextResponse.json(
      { error: 'Errore interno del server', details: error.message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Endpoint per test manuale (solo per admin)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const testMode = searchParams.get('test') === 'true'
    
    if (!testMode) {
      return NextResponse.json({ error: 'Endpoint non disponibile' }, { status: 404 })
    }
    
    // Simula l'esecuzione del job senza inviare email reali
    const now = new Date()
    const contratti = await prisma.contratto.findMany({
      include: {
        cliente: true,
        fornitore: true
      }
    })
    
    const simulazione = []
    
    for (const contratto of contratti) {
      const dataInizio = new Date(contratto.dataInizio)
      const dataFine = new Date(contratto.dataFine)
      
      const penaltyFreeDate = new Date(dataInizio)
      penaltyFreeDate.setMonth(penaltyFreeDate.getMonth() + 7)
      
      const recommendedDate = new Date(dataFine)
      recommendedDate.setMonth(recommendedDate.getMonth() - 2)
      
      const expiryWarningDate = new Date(dataFine)
      expiryWarningDate.setDate(expiryWarningDate.getDate() - 30)
      
      let stato = 'normale'
      if (now >= penaltyFreeDate && now < recommendedDate) {
        stato = 'modificabile'
      } else if (now >= recommendedDate && now < expiryWarningDate) {
        stato = 'cambio_consigliato'
      } else if (now >= expiryWarningDate) {
        stato = 'in_scadenza'
      }
      
      if (stato !== 'normale') {
        simulazione.push({
          cliente: `${contratto.cliente.nome} ${contratto.cliente.cognome}`,
          fornitore: contratto.fornitore.ragioneSociale,
          stato,
          dataInizio: dataInizio.toLocaleDateString('it-IT'),
          dataFine: dataFine.toLocaleDateString('it-IT'),
          penaltyFreeDate: penaltyFreeDate.toLocaleDateString('it-IT'),
          recommendedDate: recommendedDate.toLocaleDateString('it-IT')
        })
      }
    }
    
    return NextResponse.json({
      message: 'Simulazione job notifiche',
      contrattiDaNotificare: simulazione.length,
      dettagli: simulazione
    })
    
  } catch (error) {
    console.error('Errore nella simulazione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}