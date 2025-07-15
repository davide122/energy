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
  User,
  Building2,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  Zap,
  Flame
} from 'lucide-react'
import { format, addMonths } from 'date-fns'
import { it } from 'date-fns/locale'

export default function ModificaContratto() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const contrattoId = params.id
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [clienti, setClienti] = useState([])
  const [fornitori, setFornitori] = useState([])
  
  const [formData, setFormData] = useState({
    clienteId: '',
    fornitoreId: '',
    startDate: '',
    durataMesi: 12,
    penaltyFreeAfterMesi: 6
  })
  
  const [originalData, setOriginalData] = useState({})
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
    if (session && contrattoId) {
      fetchContratto()
      fetchData()
    }
  }, [session, contrattoId])

  useEffect(() => {
    // Controlla se ci sono modifiche
    const hasFormChanges = Object.keys(formData).some(
      key => formData[key] !== originalData[key]
    )
    setHasChanges(hasFormChanges)
  }, [formData, originalData])

  // Calcola le date del contratto
  useEffect(() => {
    if (formData.startDate && formData.durataMesi) {
      try {
        // Verifica che la data di inizio sia valida
        const start = new Date(formData.startDate)
        if (isNaN(start.getTime())) {
          console.error('Data di inizio non valida');
          return;
        }
        
        // Converti i valori a numeri interi
        const durataMesi = parseInt(formData.durataMesi) || 12;
        const penaltyFreeAfterMesi = parseInt(formData.penaltyFreeAfterMesi) || 6;
        
        // Crea nuove istanze di Date per evitare riferimenti condivisi
        const penaltyFreeDate = new Date(start)
        penaltyFreeDate.setMonth(start.getMonth() + penaltyFreeAfterMesi)
        
        const recommendedDate = new Date(start)
        // Il cambio consigliato è 2 mesi prima della scadenza o dopo il penalty free, il più recente dei due
        const mesiRecommended = Math.max(penaltyFreeAfterMesi, durataMesi - 2)
        recommendedDate.setMonth(start.getMonth() + mesiRecommended)
        
        const expiryDate = new Date(start)
        expiryDate.setMonth(start.getMonth() + durataMesi)
        
        // Verifica che le date calcolate siano valide
        if (isNaN(penaltyFreeDate.getTime()) || isNaN(recommendedDate.getTime()) || isNaN(expiryDate.getTime())) {
          console.error('Errore nel calcolo delle date');
          return;
        }
        
        setCalculatedDates({
          penaltyFreeDate: format(penaltyFreeDate, 'yyyy-MM-dd'),
          recommendedDate: format(recommendedDate, 'yyyy-MM-dd'),
          expiryDate: format(expiryDate, 'yyyy-MM-dd')
        })
      } catch (error) {
        console.error('Errore nel calcolo delle date:', error);
      }
    }
  }, [formData.startDate, formData.durataMesi, formData.penaltyFreeAfterMesi])

  const fetchContratto = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/contratti/${contrattoId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contratto non trovato')
        }
        throw new Error('Errore nel caricamento del contratto')
      }
      const data = await response.json()
      
      const contrattoData = {
        clienteId: data.cliente.id,
        fornitoreId: data.fornitore.id,
        startDate: format(new Date(data.startDate), 'yyyy-MM-dd'),
        durataMesi: data.durataMesi,
        penaltyFreeAfterMesi: data.penaltyFreeAfterMesi
      }
      
      setFormData(contrattoData)
      setOriginalData(contrattoData)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
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
    }
  }

  // Funzione per calcolare le date - non più utilizzata, sostituita dall'useEffect

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
      setSaving(true)
      setError(null)
      
      // Verifica che la data di inizio sia valida
      const startDate = new Date(formData.startDate)
      if (isNaN(startDate.getTime())) {
        throw new Error('Data di inizio non valida')
      }
      
      // Converti i valori a numeri interi
      const durataMesi = parseInt(formData.durataMesi)
      const penaltyFreeAfterMesi = parseInt(formData.penaltyFreeAfterMesi)
      
      if (isNaN(durataMesi) || durataMesi <= 0) {
        throw new Error('Durata mesi non valida')
      }
      
      if (isNaN(penaltyFreeAfterMesi) || penaltyFreeAfterMesi < 0) {
        throw new Error('Periodo penalty free non valido')
      }
      
      // Converti la data nel formato ISO datetime
      const dataToSend = {
        ...formData,
        durataMesi,
        penaltyFreeAfterMesi,
        startDate: startDate.toISOString()
      }
      
      const response = await fetch(`/api/contratti/${contrattoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nell\'aggiornamento del contratto')
      }
      
      router.push(`/contratti/${contrattoId}`)
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('Ci sono modifiche non salvate. Sei sicuro di voler uscire?')) {
        router.push(`/contratti/${contrattoId}`)
      }
    } else {
      router.push(`/contratti/${contrattoId}`)
    }
  }

  const getTipoIcon = (tipo) => {
    // Normalizza il tipo in maiuscolo per il confronto
    const tipoUpper = tipo ? tipo.toUpperCase() : ''
    return tipoUpper === 'LUCE' ? Zap : Flame
  }

  const getTipoColor = (tipo) => {
    // Normalizza il tipo in maiuscolo per il confronto
    const tipoUpper = tipo ? tipo.toUpperCase() : ''
    return tipoUpper === 'LUCE' ? 'text-yellow-600' : 'text-blue-600'
  }

  const selectedCliente = clienti.find(c => c.id === formData.clienteId)
  const selectedFornitore = fornitori.find(f => f.id === formData.fornitoreId)

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (error && !formData.clienteId) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg inline-block">
            <p>{error}</p>
          </div>
          <div className="mt-4">
            <Link href="/contratti" className="btn-primary">
              Torna ai Contratti
            </Link>
          </div>
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
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Modifica Contratto #{contrattoId}
              </h1>
              <p className="text-gray-600">
                {selectedCliente && selectedFornitore && (
                  `${selectedCliente.nome} ${selectedCliente.cognome} - ${selectedFornitore.ragioneSociale}`
                )}
              </p>
            </div>
          </div>
          
          {hasChanges && (
            <div className="flex items-center space-x-2 text-orange-600">
              <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              <span className="text-sm font-medium">Modifiche non salvate</span>
            </div>
          )}
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
                  <select
                    id="clienteId"
                    name="clienteId"
                    value={formData.clienteId}
                    onChange={handleInputChange}
                    className={`input ${validationErrors.clienteId ? 'border-red-500' : ''}`}
                    required
                  >
                    <option value="">Seleziona un cliente</option>
                    {clienti.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} {cliente.cognome} - {cliente.email}
                      </option>
                    ))}
                  </select>
                  {validationErrors.clienteId && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.clienteId}</p>
                  )}
                </div>

                {/* Selezione Fornitore */}
                <div>
                  <label htmlFor="fornitoreId" className="label">
                    Fornitore *
                  </label>
                  <select
                    id="fornitoreId"
                    name="fornitoreId"
                    value={formData.fornitoreId}
                    onChange={handleInputChange}
                    className={`input ${validationErrors.fornitoreId ? 'border-red-500' : ''}`}
                    required
                  >
                    <option value="">Seleziona un fornitore</option>
                    {fornitori.map(fornitore => (
                      <option key={fornitore.id} value={fornitore.id}>
                        {fornitore.ragioneSociale} ({fornitore.tipo})
                      </option>
                    ))}
                  </select>
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
                      {format(new Date(formData.startDate), 'dd/MM/yyyy', { locale: it })}
                    </span>
                  </div>
                  
                  {calculatedDates.penaltyFreeDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Penalty Free:</span>
                      <span className="font-medium text-green-600">
                        {format(new Date(calculatedDates.penaltyFreeDate), 'dd/MM/yyyy', { locale: it })}
                      </span>
                    </div>
                  )}
                  
                  {calculatedDates.recommendedDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Cambio Consigliato:</span>
                      <span className="font-medium text-blue-600">
                        {format(new Date(calculatedDates.recommendedDate), 'dd/MM/yyyy', { locale: it })}
                      </span>
                    </div>
                  )}
                  
                  {calculatedDates.expiryDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Scadenza:</span>
                      <span className="font-medium text-red-600">
                        {format(new Date(calculatedDates.expiryDate), 'dd/MM/yyyy', { locale: it })}
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
                    {selectedFornitore.tipo && selectedFornitore.tipo.toUpperCase() === 'LUCE' ? (
                      <Zap className={`h-4 w-4 ${getTipoColor(selectedFornitore.tipo)}`} />
                    ) : (
                      <Flame className={`h-4 w-4 ${getTipoColor(selectedFornitore.tipo)}`} />
                    )}
                    <p className="font-medium">{selectedFornitore.ragioneSociale}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedFornitore.tipo && selectedFornitore.tipo.toUpperCase() === 'LUCE' ? 'Energia Elettrica' : 'Gas'}
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
                  <p className="font-medium mb-2">Attenzione:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Le modifiche alle date ricalcoleranno automaticamente le notifiche</li>
                    <li>Il cambio di fornitore verificherà i vincoli di storico</li>
                    <li>Le notifiche già inviate non verranno modificate</li>
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