import { OpenAI } from 'openai';

// Inizializzazione del client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Genera un messaggio personalizzato per il cliente utilizzando GPT
 * @param {Object} cliente - Dati del cliente
 * @param {Object} contratto - Dati del contratto
 * @param {Object} fornitore - Dati del fornitore
 * @param {String} tipo - Tipo di notifica (PENALTY_FREE, RECOMMENDED, EXPIRY)
 * @param {Object} options - Opzioni aggiuntive
 * @returns {Promise<String>} Il messaggio generato
 */
export async function generatePersonalizedMessage(cliente, contratto, fornitore, tipo, options = {}) {
  try {
    // Preparazione del contesto per GPT
    const context = {
      cliente: {
        nome: cliente.nome,
        cognome: cliente.cognome,
        email: cliente.email,
        telefono: cliente.telefono,
      },
      contratto: {
        startDate: contratto.startDate,
        durataMesi: contratto.durataMesi,
        penaltyFreeDate: contratto.penaltyFreeDate,
        recommendedDate: contratto.recommendedDate,
        expiryDate: contratto.expiryDate,
      },
      fornitore: {
        ragioneSociale: fornitore.ragioneSociale,
        tipo: fornitore.tipo,
      },
      tipo,
      tono: options.tono || 'professionale', // professionale, informale, urgente
      lunghezza: options.lunghezza || 'media', // breve, media, lunga
    };

    // Costruzione del prompt per GPT
    let prompt = `Genera un messaggio personalizzato per un cliente nel settore energia. `;
    
    switch (tipo) {
      case 'PENALTY_FREE':
        prompt += `Il contratto ha superato il periodo di penalità ed è ora modificabile senza costi aggiuntivi. `;
        break;
      case 'RECOMMENDED':
        prompt += `È consigliabile valutare un cambio di fornitore poiché il contratto si avvicina alla scadenza. `;
        break;
      case 'EXPIRY':
        prompt += `Il contratto sta per scadere e richiede un'azione immediata. `;
        break;
      default:
        prompt += `Informa il cliente sullo stato del suo contratto. `;
    }

    prompt += `\n\nDati del cliente e del contratto:\n`;
    prompt += `- Nome cliente: ${context.cliente.nome} ${context.cliente.cognome}\n`;
    prompt += `- Fornitore: ${context.fornitore.ragioneSociale} (${context.fornitore.tipo})\n`;
    prompt += `- Data inizio contratto: ${new Date(context.contratto.startDate).toLocaleDateString('it-IT')}\n`;
    prompt += `- Durata contratto: ${context.contratto.durataMesi} mesi\n`;
    
    if (context.contratto.penaltyFreeDate) {
      prompt += `- Data fine penalità: ${new Date(context.contratto.penaltyFreeDate).toLocaleDateString('it-IT')}\n`;
    }
    
    if (context.contratto.expiryDate) {
      prompt += `- Data scadenza: ${new Date(context.contratto.expiryDate).toLocaleDateString('it-IT')}\n`;
    }

    prompt += `\nIstruzioni specifiche:\n`;
    prompt += `- Usa un tono ${context.tono}\n`;
    prompt += `- Crea un messaggio di lunghezza ${context.lunghezza}\n`;
    prompt += `- Personalizza il messaggio in base al tipo di notifica (${tipo})\n`;
    prompt += `- Non includere formule di apertura o chiusura (come "Gentile" o "Cordiali saluti")\n`;
    prompt += `- Concentrati sui benefici per il cliente\n`;
    prompt += `- Includi una chiara call-to-action\n`;
    
    // Chiamata a GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Sei un assistente specializzato nella comunicazione con clienti nel settore energia e telecomunicazioni. Il tuo obiettivo è creare messaggi persuasivi, chiari e personalizzati." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Errore nella generazione del messaggio con GPT:', error);
    // Fallback a un messaggio predefinito in caso di errore
    return getDefaultMessage(cliente, fornitore, tipo);
  }
}

/**
 * Genera un messaggio predefinito in caso di fallback
 */
function getDefaultMessage(cliente, fornitore, tipo) {
  const nomeCompleto = `${cliente.nome} ${cliente.cognome}`;
  const ragioneSociale = fornitore.ragioneSociale;
  
  switch (tipo) {
    case 'PENALTY_FREE':
      return `Il suo contratto con ${ragioneSociale} è ora modificabile senza penali. Questo è il momento ideale per valutare nuove offerte sul mercato!`;
    case 'RECOMMENDED':
      return `Il suo contratto con ${ragioneSociale} si avvicina alla scadenza. Consigliamo di valutare nuove offerte per evitare rinnovi automatici.`;
    case 'EXPIRY':
      return `Il suo contratto con ${ragioneSociale} sta per scadere! La invitiamo a contattarci immediatamente per evitare interruzioni del servizio.`;
    default:
      return `La informiamo che ci sono aggiornamenti importanti riguardo il suo contratto con ${ragioneSociale}.`;
  }
}

/**
 * Analizza il profilo del cliente e suggerisce offerte personalizzate
 */
export async function suggestPersonalizedOffers(cliente, contratti, fornitori) {
  try {
    // Preparazione del contesto per GPT
    const clienteInfo = {
      nome: cliente.nome,
      cognome: cliente.cognome,
      contratti: contratti.map(c => ({
        fornitore: c.fornitore.ragioneSociale,
        tipo: c.fornitore.tipo,
        startDate: new Date(c.startDate).toLocaleDateString('it-IT'),
        expiryDate: c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('it-IT') : 'N/A',
      }))
    };
    
    const fornitoriDisponibili = fornitori.map(f => ({
      nome: f.ragioneSociale,
      tipo: f.tipo,
    }));

    // Costruzione del prompt
    const prompt = `
      Analizza il profilo del cliente e suggerisci le 3 migliori offerte personalizzate.
      
      Dati del cliente:
      - Nome: ${clienteInfo.nome} ${clienteInfo.cognome}
      - Contratti attuali: ${JSON.stringify(clienteInfo.contratti)}
      
      Fornitori disponibili:
      ${JSON.stringify(fornitoriDisponibili)}
      
      Per ogni suggerimento, fornisci:
      1. Nome del fornitore consigliato
      2. Tipo di servizio (LUCE, GAS, LUCE_GAS)
      3. Breve motivazione della raccomandazione
      4. Stima del potenziale risparmio
    `;

    // Chiamata a GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Sei un consulente esperto nel settore energia e telecomunicazioni. Il tuo obiettivo è analizzare i dati dei clienti e suggerire le offerte più vantaggiose in base al loro profilo." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Parsing della risposta
    const suggerimentiText = completion.choices[0].message.content.trim();
    
    // Qui potresti implementare un parser più sofisticato per strutturare meglio i suggerimenti
    return {
      suggerimenti: suggerimentiText,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Errore nella generazione dei suggerimenti:', error);
    return {
      suggerimenti: "Non è stato possibile generare suggerimenti personalizzati in questo momento.",
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}