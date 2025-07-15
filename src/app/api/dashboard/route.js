import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { it } from 'date-fns/locale'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const today = new Date()
    const startToday = startOfDay(today)
    const endToday = endOfDay(today)
    const startWeek = startOfWeek(today, { weekStartsOn: 1 })
    const endWeek = endOfWeek(today, { weekStartsOn: 1 })
    const startMonth = startOfMonth(today)
    const endMonth = endOfMonth(today)

    // Scadenze odierne per tipo
    const [penaltyFreeRaw, recommendedRaw, expiryRaw] = await Promise.all([
      prisma.contratto.findMany({
        where: {
          penaltyFreeDate: {
            gte: startToday,
            lte: endToday
          }
        },
        include: {
          cliente: true,
          fornitore: true
        }
      }),
      prisma.contratto.findMany({
        where: {
          recommendedDate: {
            gte: startToday,
            lte: endToday
          }
        },
        include: {
          cliente: true,
          fornitore: true
        }
      }),
      prisma.contratto.findMany({
        where: {
          expiryDate: {
            gte: startToday,
            lte: endToday
          }
        },
        include: {
          cliente: true,
          fornitore: true
        }
      })
    ])
    
    // Filtra i contratti con date valide e aggiungi flag di validità
    const penaltyFreeToday = penaltyFreeRaw.map(contratto => {
      const penaltyFreeDate = new Date(contratto.penaltyFreeDate)
      const isPenaltyFreeValid = !isNaN(penaltyFreeDate.getTime())
      return { ...contratto, isPenaltyFreeValid }
    }).filter(c => c.isPenaltyFreeValid)
    
    const recommendedToday = recommendedRaw.map(contratto => {
      const recommendedDate = new Date(contratto.recommendedDate)
      const isRecommendedValid = !isNaN(recommendedDate.getTime())
      return { ...contratto, isRecommendedValid }
    }).filter(c => c.isRecommendedValid)
    
    const expiryToday = expiryRaw.map(contratto => {
      const expiryDate = new Date(contratto.expiryDate)
      const isExpiryValid = !isNaN(expiryDate.getTime())
      return { ...contratto, isExpiryValid }
    }).filter(c => c.isExpiryValid)

    // Statistiche generali
    const [totalClienti, totalFornitori, totalContratti, contrattiAttiviRaw] = await Promise.all([
      prisma.cliente.count(),
      prisma.fornitore.count(),
      prisma.contratto.count(),
      prisma.contratto.findMany({
        where: {
          expiryDate: {
            gt: today
          }
        },
        select: {
          id: true,
          expiryDate: true
        }
      })
    ])
    
    // Filtra i contratti attivi con date di scadenza valide
    const contrattiAttivi = contrattiAttiviRaw.filter(contratto => {
      const expiryDate = new Date(contratto.expiryDate)
      return !isNaN(expiryDate.getTime())
    }).length

    // Contratti in scadenza (prossimi 30 giorni) e scaduti (ultimi 30 giorni)
    const next30Days = new Date(today)
    next30Days.setDate(today.getDate() + 30)
    const past30Days = new Date(today)
    past30Days.setDate(today.getDate() - 30)
    
    const contrattiInScadenza = await prisma.contratto.findMany({
      where: {
        OR: [
          // Contratti in scadenza nei prossimi 30 giorni
          {
            expiryDate: {
              gt: today,
              lte: next30Days
            }
          },
          // Contratti scaduti negli ultimi 30 giorni
          {
            expiryDate: {
              gte: past30Days,
              lt: today
            }
          }
        ]
      },
      include: {
        cliente: true,
        fornitore: true
      },
      orderBy: {
        expiryDate: 'asc'
      }
    })
    
    // Aggiungi informazioni di status per ogni contratto
    const contrattiWithStatus = contrattiInScadenza.map(contratto => {
      const now = new Date()
      const expiryDate = new Date(contratto.expiryDate)
      const penaltyFreeDate = new Date(contratto.penaltyFreeDate)
      const recommendedDate = new Date(contratto.recommendedDate)
      
      // Verifica che le date siano valide
      const isExpiryValid = !isNaN(expiryDate.getTime())
      const isPenaltyFreeValid = !isNaN(penaltyFreeDate.getTime())
      const isRecommendedValid = !isNaN(recommendedDate.getTime())
      
      let status = 'attivo'
      let daysToExpiry = 0
      
      if (isExpiryValid) {
        daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
        
        if (expiryDate <= now) {
          status = 'scaduto'
        } else if (daysToExpiry <= 30) {
          status = 'in_scadenza'
        }
      } else {
        status = 'errore_data'
      }
      
      const isPenaltyFree = isPenaltyFreeValid && now >= penaltyFreeDate
      const isRecommendedChange = isRecommendedValid && now >= recommendedDate
      
      return {
        ...contratto,
        status,
        daysToExpiry,
        isPenaltyFree,
        isRecommendedChange,
        isExpiryValid,
        isPenaltyFreeValid,
        isRecommendedValid
      }
    })

    // Notifiche recenti (ultime 10)
    const notificheRecentiRaw = await prisma.notifica.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
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
    
    // Aggiungi validazione delle date per le notifiche
    const notificheRecenti = notificheRecentiRaw.map(notifica => {
      // Verifica che createdAt sia una data valida
      const createdAt = new Date(notifica.createdAt)
      const isCreatedAtValid = !isNaN(createdAt.getTime())
      
      // Verifica che scheduledDate sia una data valida se presente
      let isScheduledDateValid = true
      if (notifica.scheduledDate) {
        const scheduledDate = new Date(notifica.scheduledDate)
        isScheduledDateValid = !isNaN(scheduledDate.getTime())
      }
      
      // Verifica che le date del contratto associato siano valide (se presente)
      let contractDateValidation = {}
      if (notifica.contratto) {
        const expiryDate = new Date(notifica.contratto.expiryDate)
        const penaltyFreeDate = new Date(notifica.contratto.penaltyFreeDate)
        const recommendedDate = new Date(notifica.contratto.recommendedDate)
        
        contractDateValidation = {
          isExpiryValid: !isNaN(expiryDate.getTime()),
          isPenaltyFreeValid: !isNaN(penaltyFreeDate.getTime()),
          isRecommendedValid: !isNaN(recommendedDate.getTime())
        }
      }
      
      return {
        ...notifica,
        isCreatedAtValid,
        isScheduledDateValid,
        ...contractDateValidation
      }
    })

    // Statistiche per tipo fornitore
    const statsFornitori = await prisma.fornitore.groupBy({
      by: ['tipo'],
      _count: {
        _all: true
      }
    })

    // Grafico contratti per mese (ultimi 6 mesi)
    const chartData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(today, i))
      const monthEnd = endOfMonth(subMonths(today, i))
      
      const [nuoviContrattiRaw, scadutiContrattiRaw] = await Promise.all([
        prisma.contratto.findMany({
          where: {
            startDate: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          select: {
            id: true,
            startDate: true
          }
        }),
        prisma.contratto.findMany({
          where: {
            expiryDate: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          select: {
            id: true,
            expiryDate: true
          }
        })
      ])
      
      // Filtra i contratti con date valide
      const nuoviContratti = nuoviContrattiRaw.filter(contratto => {
        const startDate = new Date(contratto.startDate)
        return !isNaN(startDate.getTime())
      }).length
      
      const scadutiContratti = scadutiContrattiRaw.filter(contratto => {
        const expiryDate = new Date(contratto.expiryDate)
        return !isNaN(expiryDate.getTime())
      }).length
      
      chartData.push({
        mese: format(monthStart, 'MMM yyyy', { locale: it }),
        nuovi: nuoviContratti,
        scaduti: scadutiContratti
      })
    }

    // Distribuzione contratti per fornitore (top 5)
    const topFornitori = await prisma.fornitore.findMany({
      include: {
        _count: {
          select: {
            contratti: true
          }
        }
      },
      orderBy: {
        contratti: {
          _count: 'desc'
        }
      },
      take: 5
    })

    // Notifiche per status
    const notificheStats = await prisma.notifica.groupBy({
      by: ['status'],
      _count: {
        _all: true
      },
      where: {
        createdAt: {
          gte: startMonth,
          lte: endMonth
        }
      }
    })

    // Task/Azioni da fare (notifiche dashboard pending)
    const taskDaFareRaw = await prisma.notifica.findMany({
      where: {
        channel: 'DASHBOARD',
        status: 'PENDING'
      },
      include: {
        contratto: {
          include: {
            cliente: true,
            fornitore: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      take: 10
    })
    
    // Aggiungi validazione delle date per i task
    const taskDaFare = taskDaFareRaw.map(task => {
      // Verifica che createdAt sia una data valida
      const createdAt = new Date(task.createdAt)
      const isCreatedAtValid = !isNaN(createdAt.getTime())
      
      // Verifica che scheduledDate sia una data valida se presente
      let isScheduledDateValid = true
      if (task.scheduledDate) {
        const scheduledDate = new Date(task.scheduledDate)
        isScheduledDateValid = !isNaN(scheduledDate.getTime())
      }
      
      // Verifica che le date del contratto associato siano valide (se presente)
      let contractDateValidation = {}
      if (task.contratto) {
        const expiryDate = new Date(task.contratto.expiryDate)
        const penaltyFreeDate = new Date(task.contratto.penaltyFreeDate)
        const recommendedDate = new Date(task.contratto.recommendedDate)
        
        contractDateValidation = {
          isExpiryValid: !isNaN(expiryDate.getTime()),
          isPenaltyFreeValid: !isNaN(penaltyFreeDate.getTime()),
          isRecommendedValid: !isNaN(recommendedDate.getTime())
        }
      }
      
      return {
        ...task,
        isCreatedAtValid,
        isScheduledDateValid,
        ...contractDateValidation
      }
    })

    // Calcola statistiche dettagliate sui contratti
    const contrattiPenaltyFree = contrattiWithStatus.filter(c => c.isPenaltyFree).length;
    const contrattiRecommended = contrattiWithStatus.filter(c => c.isRecommendedChange).length;
    const contrattiScaduti = contrattiWithStatus.filter(c => c.status === 'scaduto').length;
    const contrattiInScadenzaProssima = contrattiWithStatus.filter(c => c.status === 'in_scadenza').length;
    
    const dashboard = {
      scadenzeOdierne: {
        penaltyFree: penaltyFreeToday,
        recommended: recommendedToday,
        expiry: expiryToday,
        totale: penaltyFreeToday.length + recommendedToday.length + expiryToday.length
      },
      statistiche: {
        clienti: totalClienti,
        fornitori: totalFornitori,
        contratti: totalContratti,
        contrattiAttivi,
        contrattiInScadenza: contrattiWithStatus.length,
        contrattiPenaltyFree,
        contrattiRecommended,
        contrattiScaduti,
        contrattiInScadenzaProssima
      },
      contrattiInScadenza: contrattiWithStatus,
      notificheRecenti,
      taskDaFare,
      grafici: {
        contrattiPerMese: chartData,
        fornitori: statsFornitori.map(stat => ({
          tipo: stat.tipo,
          count: stat._count._all
        })),
        topFornitori: topFornitori.map(f => ({
          id: f.id,
          ragioneSociale: f.ragioneSociale,
          tipo: f.tipo,
          contratti: f._count.contratti
        })),
        notifiche: notificheStats.map(stat => ({
          status: stat.status,
          count: stat._count._all
        }))
      },
      ultimoAggiornamento: new Date().toISOString()
    }

    return NextResponse.json(dashboard)

  } catch (error) {
    console.error('Errore GET dashboard:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}