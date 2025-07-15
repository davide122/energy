import sgMail from '@sendgrid/mail'
import twilio from 'twilio'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// Configurazione SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

// Configurazione Twilio (opzionale)
let twilioClient = null
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )
}

// Template email
const getEmailTemplate = (tipo, data) => {
  // Supporta sia il formato vecchio che quello nuovo
  const clienteNome = data.nomeCliente || `${data.cliente?.nome} ${data.cliente?.cognome}`
  const ragioneSocialeFornitore = data.ragioneSocialeFornitore || data.fornitore?.ragioneSociale
  const tipoFornitore = data.fornitore?.tipo || 'N/A'
  const dataFormatted = format(new Date(), 'dd MMMM yyyy', { locale: it })
  
  const templates = {
    PENALTY_FREE: {
      subject: `🔔 Contratto ${ragioneSocialeFornitore} - Periodo Penalty Free Attivo`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Contratto senza penali!</h2>
          <p>Gentile <strong>${clienteNome}</strong>,</p>
          <p>${data.messaggio || `Il suo contratto con <strong>${ragioneSocialeFornitore}</strong> è ora modificabile senza penali.`}</p>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Dettagli contratto:</strong></p>
            <ul>
              <li>Fornitore: ${ragioneSocialeFornitore}</li>
              <li>Tipo: ${tipoFornitore}</li>
              <li>Data scadenza: ${data.dataScadenza || 'Non specificata'}</li>
            </ul>
          </div>
          <p>Questo è il momento ideale per valutare nuove offerte sul mercato!</p>
          <p>Cordiali saluti,<br>Il team CRM Energie</p>
        </div>
      `
    },
    RECOMMENDED: {
      subject: `⚡ Consigliamo il cambio fornitore - ${ragioneSocialeFornitore}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">È il momento di cambiare!</h2>
          <p>Gentile <strong>${clienteNome}</strong>,</p>
          <p>${data.messaggio || `Il suo contratto con <strong>${ragioneSocialeFornitore}</strong> si avvicina alla scadenza.`}</p>
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Dettagli contratto:</strong></p>
            <ul>
              <li>Fornitore: ${ragioneSocialeFornitore}</li>
              <li>Tipo: ${tipoFornitore}</li>
              <li>Data scadenza: ${data.dataScadenza || 'Non specificata'}</li>
            </ul>
          </div>
          <p>Consigliamo di iniziare a valutare nuove offerte per evitare rinnovi automatici.</p>
          <p>Cordiali saluti,<br>Il team CRM Energie</p>
        </div>
      `
    },
    EXPIRY: {
      subject: `🚨 URGENTE: Contratto in scadenza - ${ragioneSocialeFornitore}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Contratto in scadenza!</h2>
          <p>Gentile <strong>${clienteNome}</strong>,</p>
          <p>${data.messaggio || `Il suo contratto con <strong>${ragioneSocialeFornitore}</strong> scade oggi!`}</p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Dettagli contratto:</strong></p>
            <ul>
              <li>Fornitore: ${ragioneSocialeFornitore}</li>
              <li>Tipo: ${tipoFornitore}</li>
              <li>Data scadenza: ${data.dataScadenza || 'Non specificata'}</li>
            </ul>
          </div>
          <p><strong>AZIONE RICHIESTA:</strong> Contattaci immediatamente per evitare interruzioni del servizio.</p>
          <p>Cordiali saluti,<br>Il team CRM Energie</p>
        </div>
      `
    },
    ADMIN_REPORT: {
      subject: `📊 Report Notifiche Contratti - ${data.data}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Report Notifiche Contratti</h2>
          <p><strong>Data:</strong> ${data.data}</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Riepilogo</h3>
            <ul>
              <li><strong>Email inviate:</strong> ${data.emailInviate}</li>
              <li><strong>Errori:</strong> ${data.errori}</li>
              <li><strong>Totale elaborazioni:</strong> ${data.emailInviate + data.errori}</li>
            </ul>
          </div>
          ${data.dettagli && data.dettagli.length > 0 ? `
            <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h3>Dettagli</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Cliente</th>
                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Email</th>
                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Tipo</th>
                    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.dettagli.map(dettaglio => `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">${dettaglio.cliente}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">${dettaglio.email}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">${dettaglio.tipo}</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">
                        <span style="color: ${dettaglio.status === 'success' ? '#10b981' : '#ef4444'};">
                          ${dettaglio.status === 'success' ? '✅ Inviata' : '❌ Errore'}
                        </span>
                        ${dettaglio.errore ? `<br><small>${dettaglio.errore}</small>` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          <p>Cordiali saluti,<br>Sistema CRM Energie</p>
        </div>
      `
    }
  }
  
  return templates[tipo]
}

// Template SMS
const getSMSTemplate = (tipo, data) => {
  const clienteNome = data.nomeCliente || `${data.cliente?.nome} ${data.cliente?.cognome}`
  const ragioneSocialeFornitore = data.ragioneSocialeFornitore || data.fornitore?.ragioneSociale
  
  const templates = {
    PENALTY_FREE: `🔔 ${clienteNome}, il contratto ${ragioneSocialeFornitore} è ora modificabile senza penali! Momento ideale per valutare nuove offerte.`,
    RECOMMENDED: `⚡ ${clienteNome}, il contratto ${ragioneSocialeFornitore} si avvicina alla scadenza (${data.dataScadenza || 'Non specificata'}). Consigliamo di valutare nuove offerte.`,
    EXPIRY: `🚨 URGENTE ${clienteNome}: contratto ${ragioneSocialeFornitore} scade oggi! Contattaci immediatamente.`
  }
  
  return templates[tipo]
}

// Funzione per inviare email
export const sendEmail = async (to, tipo, data) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid non configurato, simulando invio email:', { to, tipo, subject: getEmailTemplate(tipo, data).subject })
      return { success: true, messageId: 'simulated-' + Date.now() }
    }
    
    const template = getEmailTemplate(tipo, data)
    
    const msg = {
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@crm-energie.com',
      subject: template.subject,
      html: template.html
    }
    
    const result = await sgMail.send(msg)
    return { 
      success: true, 
      messageId: result[0]?.headers?.['x-message-id'] || 'unknown'
    }
  } catch (error) {
    console.error('Errore invio email:', error)
    return { success: false, error: error.message }
  }
}

// Funzione per inviare SMS
export const sendSMS = async (to, tipo, data) => {
  try {
    if (!twilioClient) {
      return { success: false, error: 'Twilio non configurato' }
    }
    
    const message = getSMSTemplate(tipo, data)
    
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    })
    
    return { success: true }
  } catch (error) {
    console.error('Errore invio SMS:', error)
    return { success: false, error: error.message }
  }
}

// Funzione per inviare WhatsApp
export const sendWhatsApp = async (to, tipo, data) => {
  try {
    if (!twilioClient) {
      return { success: false, error: 'Twilio non configurato' }
    }
    
    const message = getSMSTemplate(tipo, data)
    
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to}`
    })
    
    return { success: true }
  } catch (error) {
    console.error('Errore invio WhatsApp:', error)
    return { success: false, error: error.message }
  }
}

// Funzione principale per inviare notifiche (nuovo formato)
export const sendNotification = async (to, tipo, data, channel = 'EMAIL') => {
  switch (channel) {
    case 'EMAIL':
      return await sendEmail(to, tipo, data)
    case 'SMS':
      return await sendSMS(to, tipo, data)
    case 'WHATSAPP':
      return await sendWhatsApp(to, tipo, data)
    case 'DASHBOARD':
      return { success: true } // Le notifiche dashboard sono gestite nel DB
    default:
      return { success: false, error: 'Canale non supportato' }
  }
}

// Funzione legacy per compatibilità
export const sendNotificationLegacy = async (channel, to, tipo, cliente, contratto, fornitore) => {
  const data = {
    cliente,
    contratto,
    fornitore,
    nomeCliente: `${cliente.nome} ${cliente.cognome}`,
    ragioneSocialeFornitore: fornitore.ragioneSociale
  }
  return await sendNotification(to, tipo, data, channel)
}