'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Layout from '@/components/Layout'
import {
  ArrowLeft,
  Save,
  X,
  User,
  Building2,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  Zap,
  Flame,
  Plus
} from 'lucide-react'
import { format, addMonths } from 'date-fns'

export default function NuovoContratto() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [clienti, setClienti] = useState([])
  const [fornitori, setFornitori] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  
  const [formData, setFormData] = useState({
    clienteId: searchParams.get('clienteId') || '',
    fornitoreId: searchParams.get('fornitoreId') || '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    durataMesi: 12,
    penaltyFreeAfterMesi: 6
  })
  
  const [validationErrors, setValidationErrors] = useState({})
  const [calculatedDates, setCalculatedDates] = useState({
    penaltyFreeDate: '',
    recommendedDate: '',
    expiryDate: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  useEffect(() => {
    calculateDates()
  }, [formData.startDate, formData.durataMesi, formData.penaltyFreeAfterMesi])

  const fetchData = async () => {
    try {
      setLoadingData(true)
      
      // Fetch clienti
      const clientiResponse = await fetch('/api/clienti?limit=1000')
      if (clientiResponse.ok) {
        const clientiData = await clientiResponse.json()
        setClienti(clientiData.clienti || [])
      }
      
      // Fetch fornitori
      const fornitoriResponse = await fetch('/api/fornitori?limit=1000')
      if (fornitoriResponse.ok) {
        const fornitoriData = await fornitoriResponse.json()
        setFornitori(fornitoriData.fornitori || [])
      }
    } catch (error) {
      console.error('Errore nel caricamento dei dati:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const calculateDates = () => {
    if (!formData.startDate) return
    
    const startDate = new Date(formData.startDate)
    const penaltyFreeDate = addMonths(startDate, formData.penaltyFreeAfterMesi)
    const recommendedDate = addMonths(startDate, 10) // Fisso a 10 mesi
    const expiryDate = addMonths(startDate, formData.durataMesi)
    
    setCalculatedDates({
      penaltyFreeDate: format(penaltyFreeDate, 'yyyy-MM-dd'),
      recommendedDate: format(recommendedDate, 'yyyy-MM-dd'),
      expiryDate: format(expiryDate, 'yyyy-MM-dd')
    })
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.clienteId) {
      errors.clienteId = 'Il cliente è obbligatorio'
    }
    
    if (!formData.fornitoreId) {
      errors.fornitoreId = 'Il fornitore è obbligatorio'
    }
    
    if (!formData.startDate) {
      errors.startDate = 'La data di inizio è obbligatoria'
    }
    
    if (!formData.durataMesi || formData.durataMesi < 1) {
      errors.durataMesi = 'La durata deve essere almeno 1 mese'
    }
    
    if (!formData.penaltyFreeAfterMesi || formData.penaltyFreeAfterMesi < 1) {
      errors.penaltyFreeAfterMesi = 'Il periodo penalty free deve essere almeno 1 mese'
    }
    
    if (formData.penaltyFreeAfterMesi >= formData.durataMesi) {
      errors.penaltyFreeAfterMesi = 'Il periodo penalty free deve essere inferiore alla durata del contratto'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'durataMesi' || name === 'penaltyFreeAfterMesi' ? parseInt(value) || 0 : value
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
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/contratti', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nella creazione del contratto')
      }
      
      const contratto = await response.json()
      router.push(`/contratti/${contratto.id}`)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getTipoIcon = (tipo) => {
    return tipo === 'luce' ? Zap : Flame
  }

  const getTipoColor = (tipo) => {
    return tipo === 'luce' ? 'text-yellow-600' : 'text-blue-600'
  }

  const selectedCliente = clienti.find(c => c.id === formData.clienteId)
  const selectedFornitore = fornitori.find(f => f.id === formData.fornitoreId)

  if (status === 'loading' || loadingData) {
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/contratti" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nuovo Contratto</h1>
              <p className="text-gray-600">Crea un nuovo contratto per un cliente</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form principale */}
          <div className="lg:col-span-2">
            <div className="card">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Selezione Cliente */}
                <div>
                  <label htmlFor="clienteId" className="label">
                    Cliente *
                  </label>
                  <div className="flex space-x-2">
                    <select
                      id="clienteId"
                      name="clienteId"
                      value={formData.clienteId}
                      onChange={handleInputChange}
                      className={`input flex-1 ${validationErrors.clienteId ? 'border-red-500' : ''}`}
                      required
                    >
                      <option value="">Seleziona un cliente</option>
                      {clienti.map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome} {cliente.cognome} - {cliente.email}
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/clienti/nuovo"
                      className="btn-secondary flex items-center space-x-1 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Nuovo</span>
                    </Link>
                  </div>
                  {validationErrors.clienteId && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.clienteId}</p>
                  )}
                </div>

                {/* Selezione Fornitore */}
                <div>
                  <label htmlFor="fornitoreId" className="label">
                    Fornitore *
                  </label>
                  <div className="flex space-x-2">
                    <select
                      id="fornitoreId"
                      name="fornitoreId"
                      value={formData.fornitoreId}
                      onChange={handleInputChange}
                      className={`input flex-1 ${validationErrors.fornitoreId ? 'border-red-500' : ''}`}
                      required
                    >
                      <option value="">Seleziona un fornitore</option>
                      {fornitori.map(fornitore => {
                        const TipoIcon = getTipoIcon(fornitore.tipo)
                        return (
                          <option key={fornitore.id} value={fornitore.id}>
                            {fornitore.ragioneSociale} ({fornitore.tipo})
                          </option>
                        )
                      })}
                    </select>
                    <Link
                      href="/fornitori/nuovo"
                      className="btn-secondary flex items-center space-x-1 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Nuovo</span>
                    </Link>
                  </div>
                  {validationErrors.fornitoreId && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.fornitoreId}</p>
                  )}
                </div>

                {/* Data di inizio */}
                <div>
                  <label htmlFor="startDate" className="label">
                    Data di Inizio *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`input ${validationErrors.startDate ? 'border-red-500' : ''}`}
                    required
                  />
                  {validationErrors.startDate && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.startDate}</p>
                  )}
                </div>

                {/* Durata e Penalty Free */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="durataMesi" className="label">
                      Durata Contratto (mesi) *
                    </label>
                    <input
                      type="number"
                      id="durataMesi"
                      name="durataMesi"
                      value={formData.durataMesi}
                      onChange={handleInputChange}
                      min="1"
                      max="60"
                      className={`input ${validationErrors.durataMesi ? 'border-red-500' : ''}`}
                      required
                    />
                    {validationErrors.durataMesi && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.durataMesi}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="penaltyFreeAfterMesi" className="label">
                      Penalty Free Dopo (mesi) *
                    </label>
                    <input
                      type="number"
                      id="penaltyFreeAfterMesi"
                      name="penaltyFreeAfterMesi"
                      value={formData.penaltyFreeAfterMesi}
                      onChange={handleInputChange}
                      min="1"
                      max={formData.durataMesi - 1}
                      className={`input ${validationErrors.penaltyFreeAfterMesi ? 'border-red-500' : ''}`}
                      required
                    />
                    {validationErrors.penaltyFreeAfterMesi && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.penaltyFreeAfterMesi}</p>
                    )}
                  </div>
                </div>

                {/* Azioni */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Link href="/contratti" className="btn-secondary flex items-center space-x-2">
                    <X className="h-4 w-4" />
                    <span>Annulla</span>
                  </Link>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creazione...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Crea Contratto</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar con anteprima */}
          <div className="space-y-6">
            {/* Anteprima date calcolate */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Date Calcolate
              </h3>
              
              {formData.startDate ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Inizio:</span>
                    <span className="font-medium">
                      {format(new Date(formData.startDate), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  
                  {calculatedDates.penaltyFreeDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Penalty Free:</span>
                      <span className="font-medium text-green-600">
                        {format(new Date(calculatedDates.penaltyFreeDate), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  
                  {calculatedDates.recommendedDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Cambio Consigliato:</span>
                      <span className="font-medium text-blue-600">
                        {format(new Date(calculatedDates.recommendedDate), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  
                  {calculatedDates.expiryDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Scadenza:</span>
                      <span className="font-medium text-red-600">
                        {format(new Date(calculatedDates.expiryDate), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Inserisci una data di inizio per vedere le date calcolate</p>
              )}
            </div>

            {/* Anteprima cliente selezionato */}
            {selectedCliente && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Cliente Selezionato
                </h3>
                <div className="space-y-2">
                  <p className="font-medium">
                    {selectedCliente.nome} {selectedCliente.cognome}
                  </p>
                  <p className="text-sm text-gray-600">{selectedCliente.email}</p>
                  {selectedCliente.telefono && (
                    <p className="text-sm text-gray-600">{selectedCliente.telefono}</p>
                  )}
                  <Link
                    href={`/clienti/${selectedCliente.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Visualizza profilo →
                  </Link>
                </div>
              </div>
            )}

            {/* Anteprima fornitore selezionato */}
            {selectedFornitore && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Fornitore Selezionato
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {React.createElement(getTipoIcon(selectedFornitore.tipo), {
                      className: `h-4 w-4 ${getTipoColor(selectedFornitore.tipo)}`
                    })}
                    <p className="font-medium">{selectedFornitore.ragioneSociale}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedFornitore.tipo === 'luce' ? 'Energia Elettrica' : 'Gas'}
                  </p>
                  <Link
                    href={`/fornitori/${selectedFornitore.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Visualizza profilo →
                  </Link>
                </div>
              </div>
            )}

            {/* Informazioni importanti */}
            <div className="card">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">Informazioni importanti:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Il sistema verificherà automaticamente che non ci siano contratti attivi con lo stesso fornitore</li>
                    <li>Le notifiche verranno programmate automaticamente</li>
                    <li>Il cambio consigliato è sempre fissato a 10 mesi dall'inizio</li>
                    <li>Il periodo penalty free deve essere inferiore alla durata totale</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}