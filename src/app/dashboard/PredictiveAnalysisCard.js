'use client'

import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, RefreshCw, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

export default function PredictiveAnalysisCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [predictions, setPredictions] = useState(null)

  // Carica le analisi predittive
  const loadPredictiveAnalysis = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/predictive-analysis', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Errore nel caricamento delle analisi predittive')
      }

      const data = await response.json()
      setPredictions(data)
    } catch (err) {
      console.error('Errore nel caricamento delle analisi predittive:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Carica le analisi all'inizializzazione
  useEffect(() => {
    loadPredictiveAnalysis()
  }, [])

  // Determina l'icona e il colore in base al trend
  const getTrendIcon = (trend) => {
    if (trend > 0) return { icon: TrendingUp, color: 'text-green-500' }
    if (trend < 0) return { icon: TrendingDown, color: 'text-red-500' }
    return { icon: BarChart3, color: 'text-blue-500' }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-indigo-500 mr-2" />
          <h3 className="text-lg leading-6 font-medium text-gray-900">Analisi Predittiva AI</h3>
        </div>
        <button
          onClick={loadPredictiveAnalysis}
          disabled={loading}
          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-1"></div>
              <span>Analisi in corso...</span>
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
                <h3 className="text-sm font-medium text-red-800">Errore nell'analisi predittiva</h3>
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <span className="ml-2 text-gray-500">Generazione analisi predittiva in corso...</span>
            </div>
          </div>
        )}

        {!loading && !error && !predictions && (
          <div className="p-6 text-center text-gray-500">
            <p>Nessuna analisi predittiva disponibile al momento.</p>
            <button
              onClick={loadPredictiveAnalysis}
              className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              <span>Genera Analisi</span>
            </button>
          </div>
        )}

        {!loading && !error && predictions && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Rinnovi Previsti (30 giorni)</h4>
                <div className="flex items-baseline">
                  <span className="text-2xl font-semibold text-gray-900">{predictions.renewalPrediction?.count || 0}</span>
                  <span className="ml-2 text-sm text-gray-500">contratti</span>
                  
                  {predictions.renewalPrediction?.trend !== undefined && (
                    <div className="ml-auto flex items-center">
                      {(() => {
                        const { icon: TrendIcon, color } = getTrendIcon(predictions.renewalPrediction.trend)
                        return (
                          <>
                            <TrendIcon className={`h-4 w-4 ${color} mr-1`} />
                            <span className={`text-sm ${color}`}>
                              {Math.abs(predictions.renewalPrediction.trend)}%
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
                {predictions.renewalPrediction?.message && (
                  <p className="mt-1 text-xs text-gray-600">{predictions.renewalPrediction.message}</p>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Tasso di Conversione Stimato</h4>
                <div className="flex items-baseline">
                  <span className="text-2xl font-semibold text-gray-900">{predictions.conversionRate?.rate || 0}%</span>
                  
                  {predictions.conversionRate?.trend !== undefined && (
                    <div className="ml-auto flex items-center">
                      {(() => {
                        const { icon: TrendIcon, color } = getTrendIcon(predictions.conversionRate.trend)
                        return (
                          <>
                            <TrendIcon className={`h-4 w-4 ${color} mr-1`} />
                            <span className={`text-sm ${color}`}>
                              {Math.abs(predictions.conversionRate.trend)}%
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
                {predictions.conversionRate?.message && (
                  <p className="mt-1 text-xs text-gray-600">{predictions.conversionRate.message}</p>
                )}
              </div>
            </div>
            
            <h4 className="text-sm font-medium text-gray-700 mb-3">Contratti a Rischio</h4>
            {predictions.atRiskContracts && predictions.atRiskContracts.length > 0 ? (
              <div className="space-y-3">
                {predictions.atRiskContracts.map((contract, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">{contract.clientName}</h5>
                        <p className="text-xs text-gray-500">{contract.fornitore} - Scadenza: {contract.expiryDate}</p>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Rischio: {contract.riskScore}%
                        </span>
                      </div>
                    </div>
                    {contract.reason && (
                      <p className="mt-1 text-xs text-gray-600">{contract.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nessun contratto a rischio identificato</p>
            )}
            
            {predictions.insights && predictions.insights.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Insights</h4>
                <ul className="space-y-2">
                  {predictions.insights.map((insight, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <Sparkles className="h-4 w-4 text-indigo-500 mr-2 mt-0.5" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}