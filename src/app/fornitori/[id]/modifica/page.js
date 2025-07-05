'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import {
  ArrowLeft,
  Save,
  X,
  Building2,
  Zap,
  Flame,
  FileText
} from 'lucide-react'

export default function ModificaFornitore() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const fornitoreId = params.id
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  const [formData, setFormData] = useState({
    ragioneSociale: '',
    tipo: 'luce',
    note: ''
  })
  
  const [originalData, setOriginalData] = useState({})
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session && fornitoreId) {
      fetchFornitore()
    }
  }, [session, fornitoreId])

  useEffect(() => {
    // Controlla se ci sono modifiche
    const hasFormChanges = Object.keys(formData).some(
      key => formData[key] !== originalData[key]
    )
    setHasChanges(hasFormChanges)
  }, [formData, originalData])

  const fetchFornitore = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/fornitori/${fornitoreId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Fornitore non trovato')
        }
        throw new Error('Errore nel caricamento del fornitore')
      }
      const data = await response.json()
      
      const fornitoreData = {
        ragioneSociale: data.ragioneSociale || '',
        tipo: data.tipo || 'luce',
        note: data.note || ''
      }
      
      setFormData(fornitoreData)
      setOriginalData(fornitoreData)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.ragioneSociale.trim()) {
      errors.ragioneSociale = 'La ragione sociale è obbligatoria'
    }
    
    if (!formData.tipo) {
      errors.tipo = 'Il tipo è obbligatorio'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Rimuovi l'errore di validazione per questo campo
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`/api/fornitori/${fornitoreId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nell\'aggiornamento del fornitore')
      }
      
      router.push(`/fornitori/${fornitoreId}`)
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('Ci sono modifiche non salvate. Sei sicuro di voler uscire?')) {
        router.push(`/fornitori/${fornitoreId}`)
      }
    } else {
      router.push(`/fornitori/${fornitoreId}`)
    }
  }

  const getTipoIcon = (tipo) => {
    return tipo === 'luce' ? Zap : Flame
  }

  const getTipoColor = (tipo) => {
    return tipo === 'luce' ? 'text-yellow-600' : 'text-blue-600'
  }

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (error && !formData.ragioneSociale) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg inline-block">
            <p>{error}</p>
          </div>
          <div className="mt-4">
            <Link href="/fornitori" className="btn-primary">
              Torna ai Fornitori
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  const TipoIcon = getTipoIcon(formData.tipo)

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <TipoIcon className={`h-8 w-8 ${getTipoColor(formData.tipo)}`} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Modifica Fornitore
                </h1>
                <p className="text-gray-600">
                  {formData.ragioneSociale || 'Nuovo fornitore'}
                </p>
              </div>
            </div>
          </div>
          
          {hasChanges && (
            <div className="flex items-center space-x-2 text-orange-600">
              <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              <span className="text-sm font-medium">Modifiche non salvate</span>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Ragione Sociale */}
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
                className={`input ${validationErrors.ragioneSociale ? 'border-red-500' : ''}`}
                placeholder="Inserisci la ragione sociale"
                required
              />
              {validationErrors.ragioneSociale && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.ragioneSociale}</p>
              )}
            </div>

            {/* Tipo */}
            <div>
              <label htmlFor="tipo" className="label">
                Tipo Fornitore *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="tipo"
                    value="luce"
                    checked={formData.tipo === 'luce'}
                    onChange={handleInputChange}
                    className="text-blue-600"
                  />
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium">Energia Elettrica</span>
                </label>
                
                <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="tipo"
                    value="gas"
                    checked={formData.tipo === 'gas'}
                    onChange={handleInputChange}
                    className="text-blue-600"
                  />
                  <Flame className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Gas</span>
                </label>
              </div>
              {validationErrors.tipo && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.tipo}</p>
              )}
            </div>

            {/* Note */}
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
                className="input"
                placeholder="Note aggiuntive sul fornitore (opzionale)"
              />
            </div>

            {/* Azioni */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary flex items-center space-x-2"
                disabled={saving}
              >
                <X className="h-4 w-4" />
                <span>Annulla</span>
              </button>
              
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Salva Modifiche</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Informazioni aggiuntive */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Informazioni importanti:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>La ragione sociale deve essere univoca nel sistema</li>
                <li>Il tipo di fornitore (luce/gas) non può essere modificato se ci sono contratti attivi</li>
                <li>Le modifiche saranno applicate immediatamente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}