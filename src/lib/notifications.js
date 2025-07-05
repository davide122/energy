import sgMail from '@sendgrid/mail'
import twilio from 'twilio'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// Configurazione SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Configurazione Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// Template email
const getEmailTemplate = (tipo, cliente, contratto, fornitore) => {
  const clienteNome = `${cliente.nome} ${cliente.cognome}`
  const dataFormatted = format(new Date(), 'dd MMMM yyyy', { locale: it })
  
  const templates = {
    PENALTY_FREE: {
      subject: `🔔 Contratto ${fornitore.ragioneSociale} - Periodo Penalty Free Attivo`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Contratto senza penali!</h2>
          <p>Gentile <strong>${clienteNome}</strong>,</p>
          <p>Il suo contratto con <strong>${fornitore.ragioneSociale}</strong> è ora modificabile senza penali.</p>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Dettagli contratto:</strong></p>
            <ul>
              <li>Fornitore: ${fornitore.ragioneSociale}</li>
              <li>Tipo: ${fornitore.tipo}</li>
              <li>Data inizio: ${format(contratto.startDate, 'dd/MM/yyyy')}</li>
            </ul>
          </div>
          <p>Questo è il momento ideale per valutare nuove offerte sul mercato!</p>
          <p>Cordiali saluti,<br>Il team CRM Energie</p>
        </div>
      `
    },
    RECOMMENDED: {
      subject: `⚡ Consigliamo il cambio fornitore - ${fornitore.ragioneSociale}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">È il momento di cambiare!</h2>
          <p>Gentile <strong>${clienteNome}</strong>,</p>
          <p>Il suo contratto con <strong>${fornitore.ragioneSociale}</strong> si avvicina alla scadenza.</p>
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Dettagli contratto:</strong></p>
            <ul>
              <li>Fornitore: ${fornitore.ragioneSociale}</li>
              <li>Tipo: ${fornitore.tipo}</li>
              <li>Data scadenza: ${format(contratto.expiryDate, 'dd/MM/yyyy')}</li>
            </ul>
          </div>
          <p>Consigliamo di iniziare a valutare nuove offerte per evitare rinnovi automatici.</p>
          <p>Cordiali saluti,<br>Il team CRM Energie</p>
        </div>
      `
    },
    EXPIRY: {
      subject: `🚨 URGENTE: Contratto in scadenza - ${fornitore.ragioneSociale}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Contratto in scadenza!</h2>
          <p>Gentile <strong>${clienteNome}</strong>,</p>
          <p>Il suo contratto con <strong>${fornitore.ragioneSociale}</strong> scade oggi!</p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Dettagli contratto:</strong></p>
            <ul>
              <li>Fornitore: ${fornitore.ragioneSociale}</li>
              <li>Tipo: ${fornitore.tipo}</li>
              <li>Data scadenza: ${format(contratto.expiryDate, 'dd/MM/yyyy')}</li>
            </ul>
          </div>
          <p><strong>AZIONE RICHIESTA:</strong> Contattaci immediatamente per evitare interruzioni del servizio.</p>
          <p>Cordiali saluti,<br>Il team CRM Energie</p>
        </div>
      `
    }
  }
  
  return templates[tipo]
}

// Template SMS
const getSMSTemplate = (tipo, cliente, contratto, fornitore) => {
  const clienteNome = `${cliente.nome} ${cliente.cognome}`
  
  const templates = {
    PENALTY_FREE: `🔔 ${clienteNome}, il contratto ${fornitore.ragioneSociale} è ora modificabile senza penali! Momento ideale per valutare nuove offerte.`,
    RECOMMENDED: `⚡ ${clienteNome}, il contratto ${fornitore.ragioneSociale} si avvicina alla scadenza (${format(contratto.expiryDate, 'dd/MM/yyyy')}). Consigliamo di valutare nuove offerte.`,
    EXPIRY: `🚨 URGENTE ${clienteNome}: contratto ${fornitore.ragioneSociale} scade oggi! Contattaci immediatamente.`
  }
  
  return templates[tipo]
}

// Funzione per inviare email
export const sendEmail = async (to, tipo, cliente, contratto, fornitore) => {
  try {
    const template = getEmailTemplate(tipo, cliente, contratto, fornitore)
    
    const msg = {
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: template.subject,
      html: template.html
    }
    
    await sgMail.send(msg)
    return { success: true }
  } catch (error) {
    console.error('Errore invio email:', error)
    return { success: false, error: error.message }
  }
}

// Funzione per inviare SMS
export const sendSMS = async (to, tipo, cliente, contratto, fornitore) => {
  try {
    const message = getSMSTemplate(tipo, cliente, contratto, fornitore)
    
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
export const sendWhatsApp = async (to, tipo, cliente, contratto, fornitore) => {
  try {
    const message = getSMSTemplate(tipo, cliente, contratto, fornitore)
    
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

// Funzione principale per inviare notifiche
export const sendNotification = async (channel, to, tipo, cliente, contratto, fornitore) => {
  switch (channel) {
    case 'EMAIL':
      return await sendEmail(to, tipo, cliente, contratto, fornitore)
    case 'SMS':
      return await sendSMS(to, tipo, cliente, contratto, fornitore)
    case 'WHATSAPP':
      return await sendWhatsApp(to, tipo, cliente, contratto, fornitore)
    case 'DASHBOARD':
      return { success: true } // Le notifiche dashboard sono gestite nel DB
    default:
      return { success: false, error: 'Canale non supportato' }
  }
}