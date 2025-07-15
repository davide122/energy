import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generatePersonalizedMessage } from '@/lib/openai';

/**
 * API per generare messaggi personalizzati utilizzando AI
 * POST /api/ai/generate-messages
 */
export async function POST(request) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Estrai i dati dalla richiesta
    const data = await request.json();
    const { cliente, contratto, fornitore, tipo, options } = data;

    // Validazione dei dati
    if (!cliente || !contratto || !fornitore || !tipo) {
      return NextResponse.json(
        { error: 'Dati mancanti. Richiesti: cliente, contratto, fornitore, tipo' },
        { status: 400 }
      );
    }

    // Genera più varianti di messaggi
    const numVariants = 3;
    const messagePromises = [];
    
    for (let i = 0; i < numVariants; i++) {
      messagePromises.push(
        generatePersonalizedMessage(cliente, contratto, fornitore, tipo, options)
      );
    }

    // Attendi che tutte le promesse siano risolte
    const messages = await Promise.all(messagePromises);

    // Filtra eventuali duplicati
    const uniqueMessages = [...new Set(messages)];

    return NextResponse.json({
      success: true,
      messages: uniqueMessages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Errore nella generazione dei messaggi:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione dei messaggi', details: error.message },
      { status: 500 }
    );
  }
}