'use client'

import { useState } from 'react'
import { Bell, Send, AlertTriangle, CheckCircle } from 'lucide-react'

export default function SendNotificationForm({ contratto, onNotificationSent }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [channel, setChannel] = useState('EMAIL')
  const [messaggio, setMessaggio] = useState('')

  // Verifica se il contratto ha superato il periodo di penalità
  const now = new Date()
  const penaltyFreeDate = contratto.penaltyFreeDate ? new Date(contratto.penaltyFreeDate) : null
  const isPenaltyFree = penaltyFreeDate && now >= penaltyFreeDate

  // Verifica se il cliente ha email o telefono in base al canale selezionato
  const hasEmail = !!contratto.cliente.email
  const hasPhone = !!contratto.cliente.telefono

  // Genera un messaggio predefinito
  const getDefaultMessage = () => {
    return `Gentile ${contratto.cliente.nome} ${contratto.cliente.cognome}, il suo contratto con ${contratto.fornitore.ragioneSociale} è ora modificabile senza penali. Questo è il momento ideale per valutare nuove offerte sul mercato!`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)

    try {
      // Verifica se il contratto ha superato il periodo di penalità
      if (!isPenaltyFree) {
        throw new Error('Il contratto non ha ancora superato il periodo di penalità')
      }

      // Verifica se il cliente ha email o telefono in base al canale selezionato
      if (channel === 'EMAIL' && !hasEmail) {
        throw new Error('Il cliente non ha un indirizzo email')
      }

      if (channel === 'SMS' && !hasPhone) {
        throw new Error('Il cliente non ha un numero di telefono')
      }

      // Invia la notifica
      const response = await fetch(`/api/contratti/${contratto.id}/notifica`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel,
          messaggio: messaggio || getDefaultMessage()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'invio della notifica')
      }

      setSuccess(true)
      setMessaggio('')
      
      // Aggiorna i dati del contratto per mostrare la nuova notifica
      if (onNotificationSent) {
        onNotificationSent()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Invia Notifica Manuale</h3>
      
      {!isPenaltyFree ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
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
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Canale di invio</label>
          <div className="flex space-x-4">
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
          </div>
        </div>

        <div>
          <label htmlFor="messaggio" className="block text-sm font-medium text-gray-700 mb-1">
            Messaggio personalizzato (opzionale)
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

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary flex items-center space-x-2"
            disabled={loading || (!isPenaltyFree) || (channel === 'EMAIL' && !hasEmail) || (channel === 'SMS' && !hasPhone)}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Invio in corso...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Invia Notifica</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}