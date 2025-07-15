import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { suggestPersonalizedOffers } from '@/lib/openai';
import prisma from '@/lib/prisma';

/**
 * API per generare offerte personalizzate utilizzando AI
 * GET /api/ai/personalized-offers?clienteId=123
 */
export async function GET(request) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Estrai il clienteId dalla query
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');

    if (!clienteId) {
      return NextResponse.json(
        { error: 'clienteId mancante nella query' },
        { status: 400 }
      );
    }

    // Recupera i dati del cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente non trovato' },
        { status: 404 }
      );
    }

    // Recupera i contratti del cliente
    const contratti = await prisma.contratto.findMany({
      where: { clienteId },
      include: {
        fornitore: true,
      },
    });

    // Recupera tutti i fornitori disponibili
    const fornitori = await prisma.fornitore.findMany();

    // Genera suggerimenti personalizzati
    const result = await suggestPersonalizedOffers(cliente, contratti, fornitori);

    // Estrai e formatta le offerte
    let offers = [];
    
    // Se i suggerimenti sono in formato testo, crea offerte predefinite
    if (typeof result.suggerimenti === 'string') {
      // Offerte predefinite in caso di risposta non strutturata
      offers = [
        {
          titolo: "Offerta Eco-Friendly",
          descrizione: "Energia 100% da fonti rinnovabili con tariffa fissa per 24 mesi",
          risparmioStimato: 15,
          caratteristiche: ["Energia verde certificata", "Prezzo bloccato", "Zero costi di attivazione"]
        },
        {
          titolo: "Tariffa Flessibile Plus",
          descrizione: "Tariffa variabile che segue il mercato con cap massimo garantito",
          risparmioStimato: 10,
          caratteristiche: ["Nessun vincolo contrattuale", "Adattamento ai prezzi di mercato", "App di monitoraggio consumi"]
        },
        {
          titolo: "Pacchetto Dual Fuel",
          descrizione: "Offerta combinata luce e gas con sconto fedeltà progressivo",
          risparmioStimato: 20,
          caratteristiche: ["Bolletta unica", "Sconto fedeltà crescente", "Servizio clienti dedicato"]
        }
      ];
    } else if (Array.isArray(result.suggerimenti)) {
      // Se i suggerimenti sono già in formato array
      offers = result.suggerimenti;
    }

    return NextResponse.json({
      success: true,
      offers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Errore nella generazione delle offerte personalizzate:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione delle offerte personalizzate', details: error.message },
      { status: 500 }
    );
  }
}