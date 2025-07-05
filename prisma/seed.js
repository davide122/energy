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

  // Crea fornitori di esempio
  const fornitori = await Promise.all([
    prisma.fornitore.upsert({
      where: { ragioneSociale: 'Enel Energia' },
      update: {},
      create: {
        ragioneSociale: 'Enel Energia',
        tipo: 'luce',
        note: 'Fornitore principale per energia elettrica'
      }
    }),
    prisma.fornitore.upsert({
      where: { ragioneSociale: 'Eni Gas e Luce' },
      update: {},
      create: {
        ragioneSociale: 'Eni Gas e Luce',
        tipo: 'gas',
        note: 'Fornitore principale per gas naturale'
      }
    }),
    prisma.fornitore.upsert({
      where: { ragioneSociale: 'A2A Energia' },
      update: {},
      create: {
        ragioneSociale: 'A2A Energia',
        tipo: 'luce',
        note: 'Fornitore alternativo per energia elettrica'
      }
    }),
    prisma.fornitore.upsert({
      where: { ragioneSociale: 'Edison Energia' },
      update: {},
      create: {
        ragioneSociale: 'Edison Energia',
        tipo: 'gas',
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
  const dataInizio1 = new Date()
  dataInizio1.setFullYear(oggi.getFullYear() - 2)
  const dataFine1 = new Date()
  dataFine1.setDate(oggi.getDate() + 15)
  const dataPenaltyFree1 = new Date(dataFine1)
  dataPenaltyFree1.setDate(dataFine1.getDate() - 60)
  const dataRaccomandataCambio1 = new Date(dataFine1)
  dataRaccomandataCambio1.setDate(dataFine1.getDate() - 30)

  contratti.push(await prisma.contratto.create({
    data: {
      clienteId: clienti[0].id,
      fornitoreId: fornitori[0].id,
      dataInizio: dataInizio1,
      dataFine: dataFine1,
      durataMesi: 24,
      periodoGratisMesi: 2,
      dataPenaltyFree: dataPenaltyFree1,
      dataRaccomandataCambio: dataRaccomandataCambio1
    }
  }))

  // Contratto 2 - Giulia Bianchi con Eni (penalty free oggi)
  const dataInizio2 = new Date()
  dataInizio2.setFullYear(oggi.getFullYear() - 1)
  dataInizio2.setMonth(oggi.getMonth() - 10)
  const dataFine2 = new Date()
  dataFine2.setMonth(oggi.getMonth() + 2)
  const dataPenaltyFree2 = new Date(oggi)
  const dataRaccomandataCambio2 = new Date()
  dataRaccomandataCambio2.setMonth(oggi.getMonth() + 1)

  contratti.push(await prisma.contratto.create({
    data: {
      clienteId: clienti[1].id,
      fornitoreId: fornitori[1].id,
      dataInizio: dataInizio2,
      dataFine: dataFine2,
      durataMesi: 12,
      periodoGratisMesi: 2,
      dataPenaltyFree: dataPenaltyFree2,
      dataRaccomandataCambio: dataRaccomandataCambio2
    }
  }))

  // Contratto 3 - Luca Verdi con A2A (cambio raccomandato oggi)
  const dataInizio3 = new Date()
  dataInizio3.setFullYear(oggi.getFullYear() - 1)
  dataInizio3.setMonth(oggi.getMonth() - 11)
  const dataFine3 = new Date()
  dataFine3.setMonth(oggi.getMonth() + 1)
  const dataPenaltyFree3 = new Date()
  dataPenaltyFree3.setMonth(oggi.getMonth() - 1)
  const dataRaccomandataCambio3 = new Date(oggi)

  contratti.push(await prisma.contratto.create({
    data: {
      clienteId: clienti[2].id,
      fornitoreId: fornitori[2].id,
      dataInizio: dataInizio3,
      dataFine: dataFine3,
      durataMesi: 12,
      periodoGratisMesi: 2,
      dataPenaltyFree: dataPenaltyFree3,
      dataRaccomandataCambio: dataRaccomandataCambio3
    }
  }))

  // Contratto 4 - Anna Neri con Edison (attivo)
  const dataInizio4 = new Date()
  dataInizio4.setMonth(oggi.getMonth() - 6)
  const dataFine4 = new Date()
  dataFine4.setMonth(oggi.getMonth() + 18)
  const dataPenaltyFree4 = new Date()
  dataPenaltyFree4.setMonth(oggi.getMonth() + 16)
  const dataRaccomandataCambio4 = new Date()
  dataRaccomandataCambio4.setMonth(oggi.getMonth() + 17)

  contratti.push(await prisma.contratto.create({
    data: {
      clienteId: clienti[3].id,
      fornitoreId: fornitori[3].id,
      dataInizio: dataInizio4,
      dataFine: dataFine4,
      durataMesi: 24,
      periodoGratisMesi: 2,
      dataPenaltyFree: dataPenaltyFree4,
      dataRaccomandataCambio: dataRaccomandataCambio4
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