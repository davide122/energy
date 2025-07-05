'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { ArrowLeft, Save, Building2, Zap, Flame, FileText } from 'lucide-react'

export default function NuovoFornitore() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    ragioneSociale: '',
    tipo: '',
    note: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.ragioneSociale.trim()) {
      newErrors.ragioneSociale = 'La ragione sociale è obbligatoria'
    }
    
    if (!formData.tipo) {
      newErrors.tipo = 'Il tipo di fornitore è obbligatorio'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Rimuovi l'errore per questo campo se presente
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setSubmitError(null)
    
    try {
      const response = await fetch('/api/fornitori', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore nella creazione del fornitore')
      }
      
      const fornitore = await response.json()
      router.push(`/fornitori/${fornitore.id}`)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/fornitori" className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuovo Fornitore</h1>
            <p className="text-gray-600">Aggiungi un nuovo fornitore di energia</p>
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Errore generale */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {submitError}
              </div>
            )}

            {/* Informazioni aziendali */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Informazioni Aziendali
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="ragioneSociale" className="label">
                    Ragione Sociale *
                  </label>
                  <input
                    type="text"
                    id="ragioneSociale"
                    name="ragioneSociale"
                    value={formData.ragioneSociale}
                    onChange={handleInputChange}
                    className={`input ${errors.ragioneSociale ? 'border-red-500' : ''}`}
                    placeholder="Es. Enel Energia S.p.A."
                  />
                  {errors.ragioneSociale && (
                    <p className="text-red-500 text-sm mt-1">{errors.ragioneSociale}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="tipo" className="label">
                    Tipo di Fornitore *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.tipo === 'luce' 
                        ? 'border-yellow-500 bg-yellow-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="tipo"
                        value="luce"
                        checked={formData.tipo === 'luce'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <Zap className={`h-6 w-6 mr-3 ${
                          formData.tipo === 'luce' ? 'text-yellow-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900">Energia Elettrica</p>
                          <p className="text-sm text-gray-600">Fornitore di luce</p>
                        </div>
                      </div>
                      {formData.tipo === 'luce' && (
                        <div className="absolute top-2 right-2 h-4 w-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <div className="h-2 w-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </label>
                    
                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.tipo === 'gas' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="tipo"
                        value="gas"
                        checked={formData.tipo === 'gas'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <Flame className={`h-6 w-6 mr-3 ${
                          formData.tipo === 'gas' ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900">Gas</p>
                          <p className="text-sm text-gray-600">Fornitore di gas</p>
                        </div>
                      </div>
                      {formData.tipo === 'gas' && (
                        <div className="absolute top-2 right-2 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="h-2 w-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </label>
                  </div>
                  {errors.tipo && (
                    <p className="text-red-500 text-sm mt-1">{errors.tipo}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Note Aggiuntive
              </h3>
              
              <div>
                <label htmlFor="note" className="label">
                  Note
                </label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows={4}
                  className="input resize-none"
                  placeholder="Note aggiuntive sul fornitore (opzionale)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Es. Informazioni sui piani tariffari, contatti commerciali, note operative
                </p>
              </div>
            </div>

            {/* Pulsanti */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Link href="/fornitori" className="btn-secondary">
                Annulla
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Salva Fornitore</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Informazioni aggiuntive */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Informazioni</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• I campi contrassegnati con * sono obbligatori</li>
            <li>• La ragione sociale deve essere univoca nel sistema</li>
            <li>• Scegli il tipo di energia fornita (luce o gas)</li>
            <li>• Dopo aver creato il fornitore, potrai associarlo ai contratti</li>
          </ul>
        </div>

        {/* Anteprima */}
        {(formData.ragioneSociale || formData.tipo) && (
          <div className="card">
            <h4 className="font-semibold text-gray-900 mb-3">Anteprima</h4>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {formData.tipo === 'luce' && <Zap className="h-5 w-5 text-yellow-600 mr-3" />}
                {formData.tipo === 'gas' && <Flame className="h-5 w-5 text-blue-600 mr-3" />}
                {!formData.tipo && <Building2 className="h-5 w-5 text-gray-400 mr-3" />}
                <div>
                  <p className="font-medium text-gray-900">
                    {formData.ragioneSociale || 'Nome fornitore'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formData.tipo ? (
                      formData.tipo === 'luce' ? 'Energia Elettrica' : 'Gas'
                    ) : (
                      'Tipo non selezionato'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}