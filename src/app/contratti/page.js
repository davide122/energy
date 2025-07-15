'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Layout from '../../components/Layout'
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function Contratti() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  
  const [contratti, setContratti] = useState([])
  const [clienti, setClienti] = useState([])
  const [fornitori, setFornitori] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ show: false, contratto: null })
  
  // Filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    cliente: searchParams.get('cliente') || '',
    fornitore: searchParams.get('fornitore') || '',
    stato: '',
    scadenza: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Paginazione
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10
  
  // Ordinamento
  const [sortBy, setSortBy] = useState('startDate')
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      fetchContratti()
      fetchClienti()
      fetchFornitori()
    }
  }, [session, searchTerm, filters, currentPage, sortBy, sortOrder])

  const fetchContratti = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.cliente && { cliente: filters.cliente }),
        ...(filters.fornitore && { fornitore: filters.fornitore }),
        ...(filters.stato && { stato: filters.stato }),
        ...(filters.scadenza && { scadenza: filters.scadenza })
      })
      
      const response = await fetch(`/api/contratti?${params}`)
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei contratti')
      }
      
      const data = await response.json()
      setContratti(data.contratti)
      setTotalPages(data.totalPages)
      setTotalCount(data.totalCount)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchClienti = async () => {
    try {
      const response = await fetch('/api/clienti?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setClienti(data.clienti || [])
      }
    } catch (error) {
      console.error('Errore nel caricamento dei clienti:', error)
    }
  }

  const fetchFornitori = async () => {
    try {
      const response = await fetch('/api/fornitori?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setFornitori(data.fornitori || [])
      }
    } catch (error) {
      console.error('Errore nel caricamento dei fornitori:', error)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.contratto) return
    
    try {
      const response = await fetch(`/api/contratti/${deleteModal.contratto.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore nell\'eliminazione del contratto')
      }
      
      setDeleteModal({ show: false, contratto: null })
      fetchContratti()
    } catch (error) {
      setError(error.message)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      cliente: '',
      fornitore: '',
      stato: '',
      scadenza: ''
    })
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const getContractStatus = (contratto) => {
    const today = new Date()
    const startDate = new Date(contratto.startDate)
    const expiryDate = new Date(contratto.expiryDate)
    const penaltyFreeDate = new Date(contratto.penaltyFreeDate)
    const recommendedDate = new Date(contratto.recommendedDate)
    
    // Verifica che le date siano valide
    const isStartValid = !isNaN(startDate.getTime())
    const isExpiryValid = !isNaN(expiryDate.getTime())
    const isPenaltyFreeValid = !isNaN(penaltyFreeDate.getTime())
    const isRecommendedValid = !isNaN(recommendedDate.getTime())
    
    // Se la data di scadenza non è valida, mostra un errore
    if (!isExpiryValid) {
      return { status: 'errore-data', color: 'badge-danger', icon: AlertTriangle, priority: 4, bgColor: 'bg-red-50', canChange: false }
    }
    
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
    
    // Calcola i mesi dall'inizio del contratto
    let monthsFromStart = 0
    if (isStartValid) {
      const diffTime = today - startDate
      monthsFromStart = diffTime / (1000 * 60 * 60 * 24 * 30.44) // Media giorni per mese
    }
    
    // Priorità: 1 = più alta (giallo - modificabili), 2 = media (rosso - scadenza), 3 = bassa (bianco - nuovi)
    if (daysLeft <= 0) {
      return { status: 'scaduto', color: 'badge-danger', icon: AlertTriangle, priority: 2, bgColor: 'bg-red-100', canChange: false }
    }
    
    if (daysLeft <= 30) {
      return { status: 'in-scadenza', color: 'badge-danger', icon: AlertTriangle, priority: 2, bgColor: 'bg-red-100', canChange: false }
    }
    
    // Contratti modificabili (oltre 6 mesi dall'inizio) - PRIORITÀ MASSIMA
    if (monthsFromStart >= 6) {
      return { status: 'modificabile', color: 'badge-warning', icon: Clock, priority: 1, bgColor: 'bg-yellow-100', canChange: true }
    }
    
    // Altri stati con priorità normale
    if (isRecommendedValid && today >= recommendedDate) {
      return { status: 'cambio-consigliato', color: 'badge-info', icon: Clock, priority: 3, bgColor: 'bg-white', canChange: false }
    }
    
    if (isPenaltyFreeValid && today >= penaltyFreeDate) {
      return { status: 'penalty-free', color: 'badge-info', icon: CheckCircle, priority: 3, bgColor: 'bg-white', canChange: false }
    }
    
    return { status: 'attivo', color: 'badge-success', icon: CheckCircle, priority: 3, bgColor: 'bg-white', canChange: false }
  }

  const getStatusLabel = (status) => {
    const labels = {
      'attivo': 'Attivo',
      'penalty-free': 'Penalty Free',
      'cambio-consigliato': 'Cambio Consigliato',
      'in-scadenza': 'In Scadenza',
      'scaduto': 'Scaduto',
      'errore-data': 'Errore Data',
      'modificabile': 'Modificabile'
    }
    return labels[status] || status
  }

  // Ordina i contratti per priorità
  const sortedContratti = [...contratti].sort((a, b) => {
    const statusA = getContractStatus(a)
    const statusB = getContractStatus(b)
    return statusA.priority - statusB.priority
  })

  // Conta i contratti modificabili per l'alert
  const contrattiModificabili = contratti.filter(contratto => {
    const status = getContractStatus(contratto)
    return status.canChange
  })

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '') || searchTerm !== ''

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contratti</h1>
            <p className="text-gray-600">
              {totalCount} contratti totali
            </p>
          </div>
          <Link href="/contratti/nuovo" className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nuovo Contratto</span>
          </Link>
        </div>

        {/* Alert per contratti modificabili */}
        {contrattiModificabili.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Contratti Modificabili Disponibili
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Hai {contrattiModificabili.length} contratto{contrattiModificabili.length > 1 ? 'i' : ''} che pu{contrattiModificabili.length > 1 ? 'ò' : 'ò'} essere modificat{contrattiModificabili.length > 1 ? 'i' : 'o'} (oltre 6 mesi dall'attivazione).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Barra di ricerca e filtri */}
        <div className="card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Ricerca */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Cerca per cliente, fornitore..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            
            {/* Azioni */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-secondary flex items-center space-x-2 ${
                  hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : ''
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filtri</span>
                {hasActiveFilters && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                    {Object.values(filters).filter(v => v !== '').length + (searchTerm ? 1 : 0)}
                  </span>
                )}
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700"
                  title="Cancella filtri"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Pannello filtri */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Filtro Cliente */}
                <div>
                  <label className="label">Cliente</label>
                  <select
                    value={filters.cliente}
                    onChange={(e) => handleFilterChange('cliente', e.target.value)}
                    className="input"
                  >
                    <option value="">Tutti i clienti</option>
                    {clienti.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} {cliente.cognome}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro Fornitore */}
                <div>
                  <label className="label">Fornitore</label>
                  <select
                    value={filters.fornitore}
                    onChange={(e) => handleFilterChange('fornitore', e.target.value)}
                    className="input"
                  >
                    <option value="">Tutti i fornitori</option>
                    {fornitori.map(fornitore => (
                      <option key={fornitore.id} value={fornitore.id}>
                        {fornitore.ragioneSociale}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro Stato */}
                <div>
                  <label className="label">Stato</label>
                  <select
                    value={filters.stato}
                    onChange={(e) => handleFilterChange('stato', e.target.value)}
                    className="input"
                  >
                    <option value="">Tutti gli stati</option>
                    <option value="modificabile">Modificabile</option>
                    <option value="in-scadenza">In Scadenza</option>
                    <option value="scaduto">Scaduto</option>
                    <option value="attivo">Attivo</option>
                    <option value="penalty-free">Penalty Free</option>
                    <option value="cambio-consigliato">Cambio Consigliato</option>
                  </select>
                </div>
                
                {/* Filtro Scadenza */}
                <div>
                  <label className="label">Scadenza</label>
                  <select
                    value={filters.scadenza}
                    onChange={(e) => handleFilterChange('scadenza', e.target.value)}
                    className="input"
                  >
                    <option value="">Tutte le scadenze</option>
                    <option value="oggi">Oggi</option>
                    <option value="7-giorni">Prossimi 7 giorni</option>
                    <option value="30-giorni">Prossimi 30 giorni</option>
                    <option value="90-giorni">Prossimi 90 giorni</option>
                    <option value="scaduti">Scaduti</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabella contratti */}
        <div className="card">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {contratti.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('cliente')}
                      >
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Cliente</span>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('fornitore')}
                      >
                        <div className="flex items-center space-x-1">
                          <Building2 className="h-4 w-4" />
                          <span>Fornitore</span>
                        </div>
                      </th>
                      <th 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('startDate')}
                      >
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Periodo</span>
                        </div>
                      </th>
                      <th>Durata</th>
                      <th>Scadenza</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedContratti.map((contratto) => {
                      const status = getContractStatus(contratto)
                      const StatusIcon = status.icon
                      
                      // Calcola i giorni rimanenti solo se la data di scadenza è valida
                      let daysLeft = null
                      try {
                        const expiryDate = new Date(contratto.expiryDate)
                        if (!isNaN(expiryDate.getTime())) {
                          daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
                        }
                      } catch (e) {
                        // Errore nel calcolo dei giorni rimanenti
                      }
                      
                      return (
                        <tr key={contratto.id} className={`hover:bg-gray-50 ${status.bgColor} ${status.canChange ? 'border-l-4 border-yellow-400' : ''}`}>
                          <td>
                            <div>
                              <p className="font-medium">
                                {contratto.cliente.nome} {contratto.cliente.cognome}
                              </p>
                              <p className="text-sm text-gray-500">{contratto.cliente.email}</p>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{contratto.fornitore.ragioneSociale}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                contratto.fornitore.tipo && contratto.fornitore.tipo.toUpperCase() === 'LUCE' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {contratto.fornitore.tipo}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="text-sm">
                              <div>
                                {(() => {
                                  try {
                                    const startDate = new Date(contratto.startDate)
                                    if (isNaN(startDate.getTime())) {
                                      return 'Data non valida'
                                    }
                                    return format(startDate, 'dd/MM/yyyy', { locale: it })
                                  } catch (e) {
                                    return 'Data non valida'
                                  }
                                })()}
                              </div>
                              <div className="text-gray-500">
                                {(() => {
                                  try {
                                    const expiryDate = new Date(contratto.expiryDate)
                                    if (isNaN(expiryDate.getTime())) {
                                      return 'Data non valida'
                                    }
                                    return format(expiryDate, 'dd/MM/yyyy', { locale: it })
                                  } catch (e) {
                                    return 'Data non valida'
                                  }
                                })()}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="text-sm">{contratto.durataMesi} mesi</span>
                          </td>
                          <td>
                            <span className="text-sm">
                              {daysLeft === null ? (
                                <span className="text-red-500">Data non valida</span>
                              ) : daysLeft > 0 ? (
                                `${daysLeft} giorni`
                              ) : (
                                'Scaduto'
                              )}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center space-x-2">
                              <StatusIcon className="h-4 w-4" />
                              <span className={`badge ${status.color}`}>
                                {getStatusLabel(status.status)}
                              </span>
                              {status.canChange && (
                                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                                  MODIFICABILE
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/contratti/${contratto.id}`}
                                className="text-blue-600 hover:text-blue-800"
                                title="Visualizza"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link
                                href={`/contratti/${contratto.id}/modifica`}
                                className="text-green-600 hover:text-green-800"
                                title="Modifica"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteModal({ show: true, contratto })}
                                className="text-red-600 hover:text-red-800"
                                title="Elimina"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Paginazione */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} di {totalCount} contratti
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <span className="text-sm text-gray-600">
                      Pagina {currentPage} di {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {hasActiveFilters ? 'Nessun contratto trovato con i filtri applicati' : 'Nessun contratto presente'}
              </p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="btn-secondary">
                  Cancella filtri
                </button>
              ) : (
                <Link href="/contratti/nuovo" className="btn-primary">
                  Crea il primo contratto
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal di conferma eliminazione */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Conferma Eliminazione
            </h3>
            <p className="text-gray-600 mb-6">
              Sei sicuro di voler eliminare il contratto di{' '}
              <strong>
                {deleteModal.contratto?.cliente.nome} {deleteModal.contratto?.cliente.cognome}
              </strong>{' '}
              con <strong>{deleteModal.contratto?.fornitore.ragioneSociale}</strong>?
              <br />
              <span className="text-red-600 text-sm mt-2 block">
                Questa azione non può essere annullata.
              </span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, contratto: null })}
                className="btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}