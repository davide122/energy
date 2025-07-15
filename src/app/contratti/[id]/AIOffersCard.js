'use client'

import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, ChevronRight, RefreshCw, Zap } from 'lucide-react'

export default function AIOffersCard({ clienteId, contratti }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [offers, setOffers] = useState([])

  // Carica le offerte personalizzate
  const loadPersonalizedOffers = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai/personalized-offers?clienteId=${clienteId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Errore nel caricamento delle offerte personalizzate')
      }

      const data = await response.json()
      setOffers(data.offers || [])
    } catch (err) {
      console.error('Errore nel caricamento delle offerte:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Carica le offerte all'inizializzazione
  useEffect(() => {
    if (clienteId) {
      loadPersonalizedOffers()
    }
  }, [clienteId])

  // Calcola il colore del badge in base alla percentuale di risparmio
  const getSavingBadgeColor = (percentage) => {
    if (percentage >= 20) return 'bg-green-100 text-green-800'
    if (percentage >= 10) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg leading-6 font-medium text-gray-900">Offerte Personalizzate AI</h3>
        </div>
        <button
          onClick={loadPersonalizedOffers}
          disabled={loading}
          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-1"></div>
              <span>Caricamento...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              <span>Aggiorna</span>
            </>
          )}
        </button>
      </div>

      <div className="border-t border-gray-200">
        {error && (
          <div className="p-4 bg-red-50">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Errore nel caricamento delle offerte</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && !error && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-500">Generazione offerte personalizzate in corso...</span>
            </div>
          </div>
        )}

        {!loading && !error && offers.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            <p>Nessuna offerta personalizzata disponibile al momento.</p>
            <button
              onClick={loadPersonalizedOffers}
              className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              <span>Genera Suggerimenti</span>
            </button>
          </div>
        )}

        {!loading && !error && offers.length > 0 && (
          <ul className="divide-y divide-gray-200">
            {offers.map((offer, index) => (
              <li key={index} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-base font-medium text-gray-900">{offer.titolo}</h4>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSavingBadgeColor(offer.risparmioStimato)}`}>
                        <Zap className="h-3 w-3 mr-1" />
                        {offer.risparmioStimato}% risparmio
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{offer.descrizione}</p>
                    
                    <div className="mt-2">
                      <ul className="flex flex-wrap gap-2">
                        {offer.caratteristiche.map((feature, idx) => (
                          <li key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <button className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}