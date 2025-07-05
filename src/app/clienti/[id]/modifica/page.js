'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, FileText } from 'lucide-react'

export default function ModificaCliente() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id
  
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    indirizzo: '',
    note: ''
  })
  const [originalData, setOriginalData] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session && clienteId) {
      fetchCliente()
    }
  }, [session, clienteId])

  const fetchCliente = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clienti/${clienteId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Cliente non trovato')
        }
        throw new Error('Errore nel caricamento del cliente')
      }
      const cliente = await response.json()
      
      const clienteData = {
        nome: cliente.nome || '',
        cognome: cliente.cognome || '',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        indirizzo: cliente.indirizzo || '',
        note: cliente.note || ''
      }
      
      setFormData(clienteData)
      setOriginalData(clienteData)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Il nome è obbligatorio'
    }
    
    if (!formData.cognome.trim()) {
      newErrors.cognome = 'Il cognome è obbligatorio'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email è obbligatoria'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato email non valido'
    }
    
    if (formData.telefono && !/^[+]?[0-9\s\-()]+$/.test(formData.telefono)) {
      newErrors.telefono = 'Formato telefono non valido'
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

  const hasChanges = () => {
    if (!originalData) return false
    return Object.keys(formData).some(key => formData[key] !== originalData[key])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    if (!hasChanges()) {
      router.push(`/clienti/${clienteId}`)
      return
    }
    
    setSaving(true)
    setSubmitError(null)
    
    try {
      const response = await fetch(`/api/clienti/${clienteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore nell\'aggiornamento del cliente')
      }
      
      router.push(`/clienti/${clienteId}`)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (originalData) {
      setFormData({ ...originalData })
      setErrors({})
      setSubmitError(null)
    }
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

  if (submitError && !originalData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg inline-block">
            <p>{submitError}</p>
          </div>
          <div className="mt-4">
            <Link href="/clienti" className="btn-primary">
              Torna ai Clienti
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href={`/clienti/${clienteId}`} className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifica Cliente</h1>
            <p className="text-gray-600">
              {originalData ? `${originalData.nome} ${originalData.cognome}` : 'Caricamento...'}
            </p>
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

            {/* Informazioni personali */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informazioni Personali
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nome" className="label">
                    Nome *
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className={`input ${errors.nome ? 'border-red-500' : ''}`}
                    placeholder="Inserisci il nome"
                  />
                  {errors.nome && (
                    <p className="text-red-500 text-sm mt-1">{errors.nome}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="cognome" className="label">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    id="cognome"
                    name="cognome"
                    value={formData.cognome}
                    onChange={handleInputChange}
                    className={`input ${errors.cognome ? 'border-red-500' : ''}`}
                    placeholder="Inserisci il cognome"
                  />
                  {errors.cognome && (
                    <p className="text-red-500 text-sm mt-1">{errors.cognome}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contatti */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Informazioni di Contatto
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`input pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="cliente@esempio.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="telefono" className="label">
                    Telefono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="tel"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className={`input pl-10 ${errors.telefono ? 'border-red-500' : ''}`}
                      placeholder="+39 123 456 7890"
                    />
                  </div>
                  {errors.telefono && (
                    <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="indirizzo" className="label">
                    Indirizzo
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                    <textarea
                      id="indirizzo"
                      name="indirizzo"
                      value={formData.indirizzo}
                      onChange={handleInputChange}
                      rows={3}
                      className="input pl-10 resize-none"
                      placeholder="Via, Città, CAP, Provincia"
                    />
                  </div>
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
                  placeholder="Note aggiuntive sul cliente (opzionale)"
                />
              </div>
            </div>

            {/* Pulsanti */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges() || saving}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ripristina
              </button>
              
              <div className="flex space-x-3">
                <Link 
                  href={`/clienti/${clienteId}`} 
                  className="btn-secondary"
                >
                  Annulla
                </Link>
                <button
                  type="submit"
                  disabled={saving || !hasChanges()}
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
            </div>
          </form>
        </div>

        {/* Informazioni aggiuntive */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Informazioni</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• I campi contrassegnati con * sono obbligatori</li>
            <li>• L'email deve essere univoca nel sistema</li>
            <li>• Le modifiche saranno salvate immediatamente</li>
            <li>• Usa "Ripristina" per annullare le modifiche non salvate</li>
          </ul>
        </div>

        {/* Indicatore modifiche */}
        {hasChanges() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
              <span className="text-yellow-800 text-sm font-medium">
                Ci sono modifiche non salvate
              </span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}