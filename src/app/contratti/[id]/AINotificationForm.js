'use client'

import { useState, useEffect } from 'react'
import { Bell, Send, AlertTriangle, CheckCircle, Sparkles, RefreshCw, Clock } from 'lucide-react'

export default function AINotificationForm({ contratto, onNotificationSent }) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [channel, setChannel] = useState('EMAIL')
  const [messaggio, setMessaggio] = useState('')
  const [suggestedMessages, setSuggestedMessages] = useState([])
  const [selectedTone, setSelectedTone] = useState('professionale')
  const [selectedLength, setSelectedLength] = useState('media')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)

  // Verifica se il contratto ha superato il periodo di penalità
  const now = new Date()
  const penaltyFreeDate = contratto.penaltyFreeDate ? new Date(contratto.penaltyFreeDate) : null
  const isPenaltyFree = penaltyFreeDate && now >= penaltyFreeDate

  // Verifica se il cliente ha email o telefono in base al canale selezionato
  const hasEmail = !!contratto.cliente.email
  const hasPhone = !!contratto.cliente.telefono

  // Determina il tipo di notifica in base allo stato del contratto
  const getNotificationType = () => {
    if (!contratto) return 'GENERIC';
    
    const expiryDate = contratto.expiryDate ? new Date(contratto.expiryDate) : null;
    const recommendedDate = contratto.recommendedDate ? new Date(contratto.recommendedDate) : null;
    
    if (isPenaltyFree && expiryDate && now < expiryDate) {
      return 'PENALTY_FREE';
    } else if (recommendedDate && now >= recommendedDate && expiryDate && now < expiryDate) {
      return 'RECOMMENDED';
    } else if (expiryDate && now >= expiryDate) {
      return 'EXPIRY';
    } else {
      return 'GENERIC';
    }
  };

  // Genera messaggi suggeriti con AI
  const generateSuggestedMessages = async () => {
    setGenerating(true);
    setError(null);
    
    try {
      const notificationType = getNotificationType();
      
      const response = await fetch(`/api/ai/generate-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cliente: contratto.cliente,
          contratto: contratto,
          fornitore: contratto.fornitore,
          tipo: notificationType,
          options: {
            tono: selectedTone,
            lunghezza: selectedLength
          }
        })
      });

      if (!response.ok) {
        throw new Error('Errore nella generazione dei messaggi');
      }

      const data = await response.json();
      setSuggestedMessages(data.messages || []);
    } catch (err) {
      setError(`Errore nella generazione dei messaggi: ${err.message}`);
      console.error('Errore nella generazione dei messaggi:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Seleziona un messaggio suggerito
  const selectSuggestedMessage = (message) => {
    setMessaggio(message);
  };

  // Gestisce l'invio della notifica
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      // Verifica se il contratto ha superato il periodo di penalità
      if (!isPenaltyFree) {
        throw new Error('Il contratto non ha ancora superato il periodo di penalità');
      }

      // Verifica se il cliente ha email o telefono in base al canale selezionato
      if (channel === 'EMAIL' && !hasEmail) {
        throw new Error('Il cliente non ha un indirizzo email');
      }

      if ((channel === 'SMS' || channel === 'WHATSAPP') && !hasPhone) {
        throw new Error('Il cliente non ha un numero di telefono');
      }

      // Prepara i dati per l'invio
      const notificationData = {
        channel,
        messaggio: messaggio || getDefaultMessage(),
      };

      // Aggiungi la data programmata se abilitata
      if (scheduleEnabled && scheduledDate) {
        notificationData.scheduledDate = new Date(scheduledDate).toISOString();
      }

      // Invia la notifica
      const response = await fetch(`/api/contratti/${contratto.id}/notifica`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'invio della notifica');
      }

      setSuccess(true);
      setMessaggio('');
      
      // Aggiorna i dati del contratto per mostrare la nuova notifica
      if (onNotificationSent) {
        onNotificationSent();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Genera un messaggio predefinito
  const getDefaultMessage = () => {
    const notificationType = getNotificationType();
    const nomeCompleto = `${contratto.cliente.nome} ${contratto.cliente.cognome}`;
    const ragioneSociale = contratto.fornitore.ragioneSociale;
    
    switch (notificationType) {
      case 'PENALTY_FREE':
        return `Gentile ${nomeCompleto}, il suo contratto con ${ragioneSociale} è ora modificabile senza penali. Questo è il momento ideale per valutare nuove offerte sul mercato!`;
      case 'RECOMMENDED':
        return `Gentile ${nomeCompleto}, il suo contratto con ${ragioneSociale} si avvicina alla scadenza. Consigliamo di valutare nuove offerte per evitare rinnovi automatici.`;
      case 'EXPIRY':
        return `Gentile ${nomeCompleto}, il suo contratto con ${ragioneSociale} sta per scadere! La invitiamo a contattarci immediatamente per evitare interruzioni del servizio.`;
      default:
        return `Gentile ${nomeCompleto}, la informiamo che ci sono aggiornamenti importanti riguardo il suo contratto con ${ragioneSociale}.`;
    }
  };

  // Calcola la data minima per la programmazione (oggi)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Invia Notifica Intelligente</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Sparkles className="h-3 w-3 mr-1" />
          AI Powered
        </span>
      </div>
      
      {!isPenaltyFree ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Il contratto non ha ancora superato il periodo di penalità. 
                La data di fine penalità è: {contratto.penaltyFreeDate ? new Date(contratto.penaltyFreeDate).toLocaleDateString('it-IT') : 'Non disponibile'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Il contratto ha superato il periodo di penalità ed è ora modificabile senza costi aggiuntivi.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Canale di invio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Canale di invio</label>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-4 w-4 text-blue-600"
                name="channel"
                value="EMAIL"
                checked={channel === 'EMAIL'}
                onChange={() => setChannel('EMAIL')}
              />
              <span className="ml-2">Email {!hasEmail && <span className="text-red-500 text-xs">(non disponibile)</span>}</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-4 w-4 text-blue-600"
                name="channel"
                value="SMS"
                checked={channel === 'SMS'}
                onChange={() => setChannel('SMS')}
              />
              <span className="ml-2">SMS {!hasPhone && <span className="text-red-500 text-xs">(non disponibile)</span>}</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio h-4 w-4 text-blue-600"
                name="channel"
                value="WHATSAPP"
                checked={channel === 'WHATSAPP'}
                onChange={() => setChannel('WHATSAPP')}
              />
              <span className="ml-2">WhatsApp {!hasPhone && <span className="text-red-500 text-xs">(non disponibile)</span>}</span>
            </label>
          </div>
        </div>

        {/* Opzioni AI */}
        <div className="bg-blue-50 p-4 rounded-md">
          <div className="flex items-center mb-3">
            <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
            <h4 className="font-medium text-blue-700">Generazione Intelligente</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tono del messaggio</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
              >
                <option value="professionale">Professionale</option>
                <option value="informale">Informale</option>
                <option value="urgente">Urgente</option>
                <option value="persuasivo">Persuasivo</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lunghezza</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedLength}
                onChange={(e) => setSelectedLength(e.target.value)}
              >
                <option value="breve">Breve</option>
                <option value="media">Media</option>
                <option value="lunga">Dettagliata</option>
              </select>
            </div>
          </div>
          
          <button
            type="button"
            className="w-full flex justify-center items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={generateSuggestedMessages}
            disabled={generating}
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                <span>Generazione in corso...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                <span>Genera Suggerimenti AI</span>
              </>
            )}
          </button>
        </div>

        {/* Messaggi suggeriti */}
        {suggestedMessages.length > 0 && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Messaggi suggeriti dall'AI</h4>
            </div>
            <div className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
              {suggestedMessages.map((message, index) => (
                <div 
                  key={index} 
                  className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => selectSuggestedMessage(message)}
                >
                  <p className="text-sm text-gray-800">{message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messaggio personalizzato */}
        <div>
          <label htmlFor="messaggio" className="block text-sm font-medium text-gray-700 mb-1">
            Messaggio personalizzato
          </label>
          <textarea
            id="messaggio"
            name="messaggio"
            rows="4"
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder={getDefaultMessage()}
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
          ></textarea>
          <p className="mt-1 text-xs text-gray-500">
            Se lasci vuoto questo campo, verrà utilizzato un messaggio predefinito.
          </p>
        </div>

        {/* Programmazione invio */}
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center mb-3">
            <Clock className="h-5 w-5 text-gray-500 mr-2" />
            <h4 className="font-medium text-gray-700">Programmazione invio</h4>
          </div>
          
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="scheduleEnabled"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
            />
            <label htmlFor="scheduleEnabled" className="ml-2 block text-sm text-gray-700">
              Programma l'invio per una data futura
            </label>
          </div>
          
          {scheduleEnabled && (
            <div>
              <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                Data e ora di invio
              </label>
              <input
                type="datetime-local"
                id="scheduledDate"
                name="scheduledDate"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min={getMinDate()}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required={scheduleEnabled}
              />
            </div>
          )}
        </div>

        {/* Messaggi di errore e successo */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">Notifica inviata con successo!</p>
              </div>
            </div>
          </div>
        )}

        {/* Pulsante di invio */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary flex items-center space-x-2"
            disabled={loading || (!isPenaltyFree) || 
              (channel === 'EMAIL' && !hasEmail) || 
              ((channel === 'SMS' || channel === 'WHATSAPP') && !hasPhone) ||
              (scheduleEnabled && !scheduledDate)}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Invio in corso...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>{scheduleEnabled ? 'Programma Notifica' : 'Invia Notifica'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}