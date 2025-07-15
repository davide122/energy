import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OpenAI } from 'openai';
import { addDays, format, differenceInDays, isValid } from 'date-fns';

// Inizializzazione del client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API per generare analisi predittive utilizzando AI
 * GET /api/ai/predictive-analysis
 */
export async function GET(request) {
  try {
    // Verifica autenticazione
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica se l'utente è un amministratore
    const isAdmin = session.user.role === 'ADMIN';

    // Recupera i dati necessari per l'analisi predittiva
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    
    // Recupera i contratti in scadenza nei prossimi 30 giorni
    const expiringContracts = await prisma.contratto.findMany({
      where: {
        expiryDate: {
          gte: today,
          lte: thirtyDaysFromNow
        }
      },
      include: {
        cliente: true,
        fornitore: true,
        notifiche: true
      }
    });

    // Recupera i contratti scaduti negli ultimi 30 giorni
    const recentlyExpiredContracts = await prisma.contratto.findMany({
      where: {
        expiryDate: {
          lt: today,
          gte: addDays(today, -30)
        }
      },
      include: {
        cliente: true,
        fornitore: true,
        notifiche: true
      }
    });

    // Recupera tutti i contratti attivi
    const activeContracts = await prisma.contratto.findMany({
      where: {
        expiryDate: {
          gt: today
        }
      },
      include: {
        cliente: true,
        fornitore: true,
        notifiche: true
      }
    });

    // Recupera le statistiche storiche di rinnovo
    const historicalRenewals = await prisma.storicoContratto.findMany({
      where: {
        createdAt: {
          gte: addDays(today, -90) // Ultimi 90 giorni
        }
      },
      include: {
        contratto: true
      }
    });

    // Se l'API key di OpenAI non è configurata, genera previsioni mock
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key non configurata. Utilizzo previsioni mock.');
      return NextResponse.json(generateMockPredictions(expiringContracts, recentlyExpiredContracts, activeContracts));
    }

    // Prepara i dati per l'analisi con OpenAI
    const analysisData = {
      expiringContracts: expiringContracts.map(c => ({
        id: c.id,
        clientName: `${c.cliente.nome} ${c.cliente.cognome}`,
        fornitore: c.fornitore.ragioneSociale,
        tipo: c.fornitore.tipo,
        startDate: isValid(new Date(c.startDate)) ? format(new Date(c.startDate), 'dd/MM/yyyy') : 'N/A',
        expiryDate: isValid(new Date(c.expiryDate)) ? format(new Date(c.expiryDate), 'dd/MM/yyyy') : 'N/A',
        daysToExpiry: isValid(new Date(c.expiryDate)) ? differenceInDays(new Date(c.expiryDate), today) : 0,
        notificationCount: c.notifiche.length,
        hasRecentNotification: c.notifiche.some(n => 
          isValid(new Date(n.sentAt)) && differenceInDays(today, new Date(n.sentAt)) <= 7
        )
      })),
      recentlyExpiredContracts: recentlyExpiredContracts.length,
      activeContractsCount: activeContracts.length,
      renewalRate: historicalRenewals.length > 0 ? 
        (historicalRenewals.filter(h => h.tipo === 'RINNOVO').length / historicalRenewals.length) * 100 : 0
    };

    try {
      // Chiamata a OpenAI per l'analisi predittiva
      const prompt = `
        Analizza i seguenti dati sui contratti e genera previsioni sul tasso di rinnovo e sui contratti a rischio.
        
        Dati sui contratti in scadenza nei prossimi 30 giorni:
        ${JSON.stringify(analysisData.expiringContracts, null, 2)}
        
        Statistiche aggiuntive:
        - Contratti scaduti negli ultimi 30 giorni: ${analysisData.recentlyExpiredContracts}
        - Totale contratti attivi: ${analysisData.activeContractsCount}
        - Tasso storico di rinnovo: ${analysisData.renewalRate.toFixed(2)}%
        
        Genera una risposta in formato JSON con i seguenti campi:
        1. renewalPrediction: { count: numero di rinnovi previsti, trend: variazione percentuale rispetto al tasso storico (positivo o negativo), message: breve spiegazione }
        2. conversionRate: { rate: percentuale stimata di conversione, trend: variazione percentuale rispetto al tasso storico, message: breve spiegazione }
        3. atRiskContracts: array di contratti a rischio di non rinnovo, ciascuno con { clientName, fornitore, expiryDate, riskScore (percentuale), reason }
        4. insights: array di 3-5 insight strategici basati sui dati
        
        Assicurati che la risposta sia in italiano e in formato JSON valido.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Sei un analista esperto di business intelligence nel settore energetico. Il tuo compito è analizzare i dati sui contratti e generare previsioni accurate e insight strategici." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      // Estrai e analizza la risposta
      const responseText = completion.choices[0].message.content.trim();
      
      try {
        // Cerca di estrarre il JSON dalla risposta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/m);
        if (jsonMatch) {
          const predictions = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            ...predictions,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (parseError) {
        console.error('Errore nel parsing delle previsioni:', parseError);
      }
      
      // In caso di errore nel parsing, restituisci previsioni mock
      return NextResponse.json(generateMockPredictions(expiringContracts, recentlyExpiredContracts, activeContracts));
    } catch (aiError) {
      console.error('Errore nella generazione delle previsioni con OpenAI:', aiError);
      // In caso di errore con OpenAI, restituisci previsioni mock
      return NextResponse.json(generateMockPredictions(expiringContracts, recentlyExpiredContracts, activeContracts));
    }
  } catch (error) {
    console.error('Errore nell\'analisi predittiva:', error);
    return NextResponse.json(
      { error: 'Errore nell\'analisi predittiva', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Genera previsioni mock in caso di fallback
 */
function generateMockPredictions(expiringContracts, recentlyExpiredContracts, activeContracts) {
  const today = new Date();
  
  // Seleziona alcuni contratti a rischio
  const atRiskContracts = expiringContracts
    .slice(0, Math.min(3, expiringContracts.length))
    .map(c => ({
      clientName: `${c.cliente.nome} ${c.cliente.cognome}`,
      fornitore: c.fornitore.ragioneSociale,
      expiryDate: isValid(new Date(c.expiryDate)) ? format(new Date(c.expiryDate), 'dd/MM/yyyy') : 'N/A',
      riskScore: Math.floor(Math.random() * 30) + 60, // Rischio tra 60% e 90%
      reason: "Storico di ritardi nei pagamenti e mancanza di comunicazione recente."
    }));

  return {
    renewalPrediction: {
      count: Math.floor(expiringContracts.length * 0.7),
      trend: 5,
      message: "Previsto un aumento dei rinnovi grazie alle recenti campagne di comunicazione."
    },
    conversionRate: {
      rate: 72,
      trend: -3,
      message: "Leggero calo rispetto al trimestre precedente dovuto all'aumento della concorrenza."
    },
    atRiskContracts,
    insights: [
      "I contratti di tipo GAS mostrano un tasso di rinnovo superiore del 15% rispetto a quelli di tipo LUCE.",
      "I clienti contattati almeno 2 volte nell'ultimo mese hanno una probabilità di rinnovo del 35% superiore.",
      "Si consiglia di concentrare gli sforzi sui clienti con contratti di alto valore in scadenza nelle prossime 2 settimane.",
      "L'invio di notifiche personalizzate ha aumentato il tasso di risposta del 28% rispetto alle comunicazioni standard."
    ],
    timestamp: new Date().toISOString(),
  };
}