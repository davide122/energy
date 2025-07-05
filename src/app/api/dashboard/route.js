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
    const [penaltyFreeToday, recommendedToday, expiryToday] = await Promise.all([
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

    // Statistiche generali
    const [totalClienti, totalFornitori, totalContratti, contrattiAttivi] = await Promise.all([
      prisma.cliente.count(),
      prisma.fornitore.count(),
      prisma.contratto.count(),
      prisma.contratto.count({
        where: {
          expiryDate: {
            gt: today
          }
        }
      })
    ])

    // Contratti in scadenza (prossimi 30 giorni)
    const next30Days = new Date(today)
    next30Days.setDate(today.getDate() + 30)
    
    const contrattiInScadenza = await prisma.contratto.findMany({
      where: {
        expiryDate: {
          gt: today,
          lte: next30Days
        }
      },
      include: {
        cliente: true,
        fornitore: true
      },
      orderBy: {
        expiryDate: 'asc'
      }
    })

    // Notifiche recenti (ultime 10)
    const notificheRecenti = await prisma.notifica.findMany({
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
      
      const [nuoviContratti, scadutiContratti] = await Promise.all([
        prisma.contratto.count({
          where: {
            startDate: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        }),
        prisma.contratto.count({
          where: {
            expiryDate: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        })
      ])
      
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
    const taskDaFare = await prisma.notifica.findMany({
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
        contrattiInScadenza: contrattiInScadenza.length
      },
      contrattiInScadenza,
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