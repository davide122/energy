const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Inizializzazione del database...')

  // Crea utente admin
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm-energie.it' },
    update: {},
    create: {
      email: 'admin@crm-energie.it',
      name: 'Amministratore',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log('✅ Utente admin creato:', admin.email)

  // Elimina fornitori esistenti e ricrea
  await prisma.fornitore.deleteMany({})
  
  // Crea fornitori di esempio
  const fornitori = await Promise.all([
    prisma.fornitore.create({
      data: {
        ragioneSociale: 'Enel Energia',
        tipo: 'LUCE',
        note: 'Fornitore principale per energia elettrica'
      }
    }),
    prisma.fornitore.create({
      data: {
        ragioneSociale: 'Eni Gas e Luce',
        tipo: 'GAS',
        note: 'Fornitore principale per gas naturale'
      }
    }),
    prisma.fornitore.create({
      data: {
        ragioneSociale: 'A2A Energia',
        tipo: 'LUCE',
        note: 'Fornitore alternativo per energia elettrica'
      }
    }),
    prisma.fornitore.create({
      data: {
        ragioneSociale: 'Edison Energia',
        tipo: 'GAS',
        note: 'Fornitore alternativo per gas naturale'
      }
    })
  ])

  console.log('✅ Fornitori creati:', fornitori.length)

  // Crea clienti di esempio
  const clienti = await Promise.all([
    prisma.cliente.upsert({
      where: { email: 'mario.rossi@email.it' },
      update: {},
      create: {
        nome: 'Mario',
        cognome: 'Rossi',
        email: 'mario.rossi@email.it',
        telefono: '+39 333 1234567',
        indirizzo: 'Via Roma 123, Milano',
        note: 'Cliente storico, sempre puntuale nei pagamenti'
      }
    }),
    prisma.cliente.upsert({
      where: { email: 'giulia.bianchi@email.it' },
      update: {},
      create: {
        nome: 'Giulia',
        cognome: 'Bianchi',
        email: 'giulia.bianchi@email.it',
        telefono: '+39 334 2345678',
        indirizzo: 'Corso Italia 456, Roma',
        note: 'Nuova cliente, interessata a offerte green'
      }
    }),
    prisma.cliente.upsert({
      where: { email: 'luca.verdi@email.it' },
      update: {},
      create: {
        nome: 'Luca',
        cognome: 'Verdi',
        email: 'luca.verdi@email.it',
        telefono: '+39 335 3456789',
        indirizzo: 'Piazza Duomo 789, Napoli',
        note: 'Cliente business, consumi elevati'
      }
    }),
    prisma.cliente.upsert({
      where: { email: 'anna.neri@email.it' },
      update: {},
      create: {
        nome: 'Anna',
        cognome: 'Neri',
        email: 'anna.neri@email.it',
        telefono: '+39 336 4567890',
        indirizzo: 'Via Garibaldi 321, Torino',
        note: 'Cliente attento ai costi'
      }
    })
  ])

  console.log('✅ Clienti creati:', clienti.length)

  // Crea contratti di esempio
  const oggi = new Date()
  const contratti = []

  // Contratto 1 - Mario Rossi con Enel (in scadenza tra 15 giorni)
  const startDate1 = new Date()
  startDate1.setFullYear(oggi.getFullYear() - 2)
  const expiryDate1 = new Date()
  expiryDate1.setDate(oggi.getDate() + 15)
  const penaltyFreeDate1 = new Date(expiryDate1)
  penaltyFreeDate1.setDate(expiryDate1.getDate() - 60)
  const recommendedDate1 = new Date(expiryDate1)
  recommendedDate1.setDate(expiryDate1.getDate() - 30)

  contratti.push(await prisma.contratto.create({
    data: {
      clienteId: clienti[0].id,
      fornitoreId: fornitori[0].id,
      startDate: startDate1,
      durataMesi: 24,
      penaltyFreeAfterMesi: 6,
      penaltyFreeDate: penaltyFreeDate1,
      recommendedDate: recommendedDate1,
      expiryDate: expiryDate1
    }
  }))

  // Contratto 2 - Giulia Bianchi con Eni (penalty free oggi)
  const startDate2 = new Date()
  startDate2.setFullYear(oggi.getFullYear() - 1)
  startDate2.setMonth(oggi.getMonth() - 10)
  const expiryDate2 = new Date()
  expiryDate2.setMonth(oggi.getMonth() + 2)
  const penaltyFreeDate2 = new Date(oggi)
  const recommendedDate2 = new Date()
  recommendedDate2.setMonth(oggi.getMonth() + 1)

  contratti.push(await prisma.contratto.create({
    data: {
      clienteId: clienti[1].id,
      fornitoreId: fornitori[1].id,
      startDate: startDate2,
      durataMesi: 12,
      penaltyFreeAfterMesi: 6,
      penaltyFreeDate: penaltyFreeDate2,
      recommendedDate: recommendedDate2,
      expiryDate: expiryDate2
    }
  }))

  // Contratto 3 - Luca Verdi con A2A (cambio raccomandato oggi)
  const startDate3 = new Date()
  startDate3.setFullYear(oggi.getFullYear() - 1)
  startDate3.setMonth(oggi.getMonth() - 11)
  const expiryDate3 = new Date()
  expiryDate3.setMonth(oggi.getMonth() + 1)
  const penaltyFreeDate3 = new Date()
  penaltyFreeDate3.setMonth(oggi.getMonth() - 1)
  const recommendedDate3 = new Date(oggi)

  contratti.push(await prisma.contratto.create({
    data: {
      clienteId: clienti[2].id,
      fornitoreId: fornitori[2].id,
      startDate: startDate3,
      durataMesi: 12,
      penaltyFreeAfterMesi: 6,
      penaltyFreeDate: penaltyFreeDate3,
      recommendedDate: recommendedDate3,
      expiryDate: expiryDate3
    }
  }))

  // Contratto 4 - Anna Neri con Edison (attivo)
  const startDate4 = new Date()
  startDate4.setMonth(oggi.getMonth() - 6)
  const expiryDate4 = new Date()
  expiryDate4.setMonth(oggi.getMonth() + 18)
  const penaltyFreeDate4 = new Date()
  penaltyFreeDate4.setMonth(oggi.getMonth() + 16)
  const recommendedDate4 = new Date()
  recommendedDate4.setMonth(oggi.getMonth() + 17)

  contratti.push(await prisma.contratto.create({
    data: {
      clienteId: clienti[3].id,
      fornitoreId: fornitori[3].id,
      startDate: startDate4,
      durataMesi: 24,
      penaltyFreeAfterMesi: 6,
      penaltyFreeDate: penaltyFreeDate4,
      recommendedDate: recommendedDate4,
      expiryDate: expiryDate4
    }
  }))

  console.log('✅ Contratti creati:', contratti.length)

  // Crea notifiche di esempio
  const notifiche = await Promise.all([
    prisma.notifica.create({
      data: {
        tipo: 'expiry',
        messaggio: 'Il contratto di Mario Rossi scade tra 15 giorni',
        contrattoId: contratti[0].id,
        letta: false
      }
    }),
    prisma.notifica.create({
      data: {
        tipo: 'penalty_free',
        messaggio: 'Il contratto di Giulia Bianchi è entrato nel periodo penalty free',
        contrattoId: contratti[1].id,
        letta: false
      }
    }),
    prisma.notifica.create({
      data: {
        tipo: 'recommended',
        messaggio: 'È raccomandato il cambio fornitore per Luca Verdi',
        contrattoId: contratti[2].id,
        letta: false
      }
    }),
    prisma.notifica.create({
      data: {
        tipo: 'info',
        messaggio: 'Nuovo contratto attivato per Anna Neri',
        contrattoId: contratti[3].id,
        letta: true
      }
    })
  ])

  console.log('✅ Notifiche create:', notifiche.length)

  console.log('🎉 Seed completato con successo!')
  console.log('📧 Email admin: admin@crm-energie.it')
  console.log('🔑 Password admin: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Errore durante il seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })