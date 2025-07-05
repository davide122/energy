import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Utility functions per calcoli date
export const calculateContractDates = (startDate, durataMesi, penaltyFreeAfterMesi = 6) => {
  const start = new Date(startDate)
  
  const penaltyFreeDate = new Date(start)
  penaltyFreeDate.setMonth(start.getMonth() + penaltyFreeAfterMesi)
  
  const recommendedDate = new Date(start)
  recommendedDate.setMonth(start.getMonth() + 10)
  
  const expiryDate = new Date(start)
  expiryDate.setMonth(start.getMonth() + durataMesi)
  
  return {
    penaltyFreeDate,
    recommendedDate,
    expiryDate
  }
}

// Funzione per verificare se un fornitore è già stato usato
export const checkFornitoreHistory = async (clienteId, fornitoreId) => {
  const lastContract = await prisma.storicoContratto.findFirst({
    where: {
      contratto: {
        clienteId: clienteId
      }
    },
    orderBy: {
      endDate: 'desc'
    },
    include: {
      fornitore: true
    }
  })
  
  return lastContract?.fornitoreId === fornitoreId
}

// Funzione per ottenere contratti in scadenza
export const getContractsForNotification = async (date, tipo) => {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const nextDay = new Date(targetDate)
  nextDay.setDate(targetDate.getDate() + 1)
  
  let dateField
  switch (tipo) {
    case 'PENALTY_FREE':
      dateField = 'penaltyFreeDate'
      break
    case 'RECOMMENDED':
      dateField = 'recommendedDate'
      break
    case 'EXPIRY':
      dateField = 'expiryDate'
      break
    default:
      throw new Error('Tipo notifica non valido')
  }
  
  return await prisma.contratto.findMany({
    where: {
      [dateField]: {
        gte: targetDate,
        lt: nextDay
      }
    },
    include: {
      cliente: true,
      fornitore: true
    }
  })
}