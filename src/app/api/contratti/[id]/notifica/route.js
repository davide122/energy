import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendNotification } from '@/lib/notifications'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

// Endpoint per inviare notifiche manuali per un contratto
export async function POST(request, { params }) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Ottieni l'ID del contratto dai parametri
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'ID contratto mancante' }, { status: 400 })
    }

    // Ottieni i dati dalla richiesta
    const { channel, messaggio } = await request.json()
    
    // Verifica che il canale sia valido
    if (!channel || !['EMAIL', 'SMS'].includes(channel)) {
      return NextResponse.json({ error: 'Canale non valido. Utilizzare EMAIL o SMS' }, { status: 400 })
    }

    // Trova il contratto con cliente e fornitore
    const contratto = await prisma.contratto.findUnique({
      where: { id },
      include: {
        cliente: true,
        fornitore: true
      }
    })

    if (!contratto) {
      return NextResponse.json({ error: 'Contratto non trovato' }, { status: 404 })
    }

    // Verifica che il contratto abbia superato la penalità
    const now = new Date()
    const penaltyFreeDate = contratto.penaltyFreeDate ? new Date(contratto.penaltyFreeDate) : null
    
    if (!penaltyFreeDate || penaltyFreeDate > now) {
      return NextResponse.json({
        error: 'Il contratto non ha ancora superato il periodo di penalità',
        penaltyFreeDate: contratto.penaltyFreeDate
      }, { status: 400 })
    }

    // Prepara i dati per la notifica
    const destinatario = channel === 'EMAIL' ? contratto.cliente.email : contratto.cliente.telefono
    
    if (!destinatario) {
      return NextResponse.json({
        error: `${channel === 'EMAIL' ? 'Email' : 'Numero di telefono'} del cliente non disponibile`
      }, { status: 400 })
    }

    // Prepara i dati per il template
    const notificaData = {
      nomeCliente: `${contratto.cliente.nome} ${contratto.cliente.cognome}`,
      ragioneSocialeFornitore: contratto.fornitore.ragioneSociale,
      tipoFornitore: contratto.fornitore.tipo,
      dataScadenza: contratto.expiryDate ? new Date(contratto.expiryDate).toLocaleDateString('it-IT') : 'Non specificata',
      messaggio: messaggio || `Il suo contratto con ${contratto.fornitore.ragioneSociale} è ora modificabile senza penali.`
    }

    // Invia la notifica
    const result = await sendNotification(
      destinatario,
      'PENALTY_FREE',
      notificaData,
      channel
    )

    // Registra la notifica nel database
    const notifica = await prisma.notifica.create({
      data: {
        tipo: 'PENALTY_FREE',
        scheduledDate: new Date(),
        channel,
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error || null,
        contrattoId: contratto.id
      }
    })

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Notifica inviata con successo' : 'Errore nell\'invio della notifica',
      notifica,
      error: result.error
    })

  } catch (error) {
    console.error('Errore nell\'invio della notifica manuale:', error)
    return NextResponse.json(
      { error: 'Errore interno del server', details: error.message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}