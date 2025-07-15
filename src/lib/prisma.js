import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Utility functions per calcoli date
export const calculateContractDates = (startDate, durataMesi, penaltyFreeAfterMesi = 6) => {
  // Assicuriamoci che startDate sia una data valida
  const start = startDate ? new Date(startDate) : new Date()
  
  // Verifichiamo che la data sia valida
  if (isNaN(start.getTime())) {
    throw new Error('Data di inizio non valida')
  }
  
  // Convertiamo i valori a numeri interi per evitare problemi
  const mesiDurata = parseInt(durataMesi) || 12
  const mesiPenaltyFree = parseInt(penaltyFreeAfterMesi) || 6
  
  // Creiamo nuove istanze di Date per evitare riferimenti condivisi
  const penaltyFreeDate = new Date(start)
  penaltyFreeDate.setMonth(start.getMonth() + mesiPenaltyFree)
  
  const recommendedDate = new Date(start)
  // Il cambio consigliato è 2 mesi prima della scadenza o dopo il penalty free, il più recente dei due
  const mesiRecommended = Math.max(mesiPenaltyFree, mesiDurata - 2)
  recommendedDate.setMonth(start.getMonth() + mesiRecommended)
  
  const expiryDate = new Date(start)
  expiryDate.setMonth(start.getMonth() + mesiDurata)
  
  return {
    penaltyFreeDate,
    recommendedDate,
    expiryDate
  }
}

// Funzione per verificare se un fornitore è già stato usato
export const checkFornitoreHistory = async (clienteId, fornitoreId) => {
  // Trova l'ultimo contratto del cliente
  const lastContract = await prisma.contratto.findFirst({
    where: {
      clienteId: clienteId
    },
    orderBy: {
      startDate: 'desc'
    },
    include: {
      fornitore: true
    }
  });
  
  // Verifica se l'ultimo fornitore è lo stesso di quello selezionato
  const isSameProvider = lastContract?.fornitoreId === fornitoreId;
  
  return isSameProvider;
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