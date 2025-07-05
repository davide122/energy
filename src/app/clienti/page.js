'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Layout from '../../components/Layout'
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Building2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function ClientiPage() {
  const { data: session, status } = useSession()
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    fornitore: '',
    scadenza: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [showFilters, setShowFilters] = useState(false)
  const [fornitori, setFornitori] = useState([])
  const [deleteModal, setDeleteModal] = useState({ show: false, cliente: null })

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      fetchClienti()
      fetchFornitori()
    }
  }, [session, searchTerm, filters, pagination.page])

  const fetchClienti = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filters.fornitore && { fornitore: filters.fornitore }),
        ...(filters.scadenza && { scadenza: filters.scadenza })
      })

      const response = await fetch(`/api/clienti?${params}`)
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei clienti')
      }
      
      const data = await response.json()
      setClienti(data.clienti)
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages
      }))
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchFornitori = async () => {
    try {
      const response = await fetch('/api/fornitori?limit=100')
      if (response.ok) {
        const data = await response.json()
        setFornitori(data.fornitori)
      }
    } catch (error) {
      console.error('Errore nel caricamento fornitori:', error)
    }
  }

  const handleDelete = async (clienteId) => {
    try {
      const response = await fetch(`/api/clienti/${clienteId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore nell\'eliminazione del cliente')
      }
      
      setDeleteModal({ show: false, cliente: null })
      fetchClienti()
    } catch (error) {
      setError(error.message)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ fornitore: '', scadenza: '' })
    setSearchTerm('')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const getScadenzaStatus = (cliente) => {
    if (!cliente.contrattoAttivo) return null
    
    const today = new Date()
    const expiryDate = new Date(cliente.contrattoAttivo.expiryDate)
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
    
    if (daysLeft <= 0) return { status: 'scaduto', days: daysLeft, color: 'badge-danger' }
    if (daysLeft <= 30) return { status: 'in-scadenza', days: daysLeft, color: 'badge-warning' }
    if (daysLeft <= 90) return { status: 'prossima', days: daysLeft, color: 'badge-info' }
    return { status: 'attivo', days: daysLeft, color: 'badge-success' }
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
            <p className="text-gray-600">
              Gestisci i tuoi clienti e i loro contratti
            </p>
          </div>
          <Link href="/clienti/nuovo" className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nuovo Cliente</span>
          </Link>
        </div>

        {/* Barra di ricerca e filtri */}
        <div className="card">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Ricerca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Cerca per nome, cognome o email..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="input pl-10"
                />
              </div>
            </div>
            
            {/* Toggle filtri */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filtri</span>
            </button>
          </div>

          {/* Filtri espandibili */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        {fornitore.ragioneSociale} ({fornitore.tipo})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="label">Scadenza</label>
                  <select
                    value={filters.scadenza}
                    onChange={(e) => handleFilterChange('scadenza', e.target.value)}
                    className="input"
                  >
                    <option value="">Tutte le scadenze</option>
                    <option value="scaduto">Scaduti</option>
                    <option value="30">Prossimi 30 giorni</option>
                    <option value="90">Prossimi 90 giorni</option>
                    <option value="attivo">Attivi</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="btn-secondary w-full"
                  >
                    Pulisci Filtri
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Errore */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Lista clienti */}
        <div className="card">
          {clienti.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Contatti</th>
                      <th>Contratto Attivo</th>
                      <th>Scadenza</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clienti.map((cliente) => {
                      const scadenzaInfo = getScadenzaStatus(cliente)
                      return (
                        <tr key={cliente.id}>
                          <td>
                            <div>
                              <p className="font-medium">
                                {cliente.nome} {cliente.cognome}
                              </p>
                              {cliente.note && (
                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                  {cliente.note}
                                </p>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="h-3 w-3 mr-1" />
                                <span className="truncate max-w-xs">{cliente.email}</span>
                              </div>
                              {cliente.telefono && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="h-3 w-3 mr-1" />
                                  <span>{cliente.telefono}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {cliente.contrattoAttivo ? (
                              <div>
                                <div className="flex items-center text-sm">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  <span className="font-medium">
                                    {cliente.contrattoAttivo.fornitore.ragioneSociale}
                                  </span>
                                </div>
                                <span className="badge badge-info text-xs">
                                  {cliente.contrattoAttivo.fornitore.tipo}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">Nessun contratto</span>
                            )}
                          </td>
                          <td>
                            {cliente.contrattoAttivo ? (
                              <div className="flex items-center text-sm">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>
                                  {format(new Date(cliente.contrattoAttivo.expiryDate), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">-</span>
                            )}
                          </td>
                          <td>
                            {scadenzaInfo ? (
                              <span className={`badge ${scadenzaInfo.color}`}>
                                {scadenzaInfo.days > 0 ? `${scadenzaInfo.days} giorni` : 'Scaduto'}
                              </span>
                            ) : (
                              <span className="badge badge-secondary">Inattivo</span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/clienti/${cliente.id}`}
                                className="text-blue-600 hover:text-blue-800"
                                title="Visualizza"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link
                                href={`/clienti/${cliente.id}/modifica`}
                                className="text-green-600 hover:text-green-800"
                                title="Modifica"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteModal({ show: true, cliente })}
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
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} di {pagination.total} clienti
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-700">
                      Pagina {pagination.page} di {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
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
              <p className="text-gray-500 mb-4">Nessun cliente trovato</p>
              <Link href="/clienti/nuovo" className="btn-primary">
                Aggiungi il primo cliente
              </Link>
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
              Sei sicuro di voler eliminare il cliente <strong>{deleteModal.cliente?.nome} {deleteModal.cliente?.cognome}</strong>?
              Questa azione non può essere annullata.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, cliente: null })}
                className="btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDelete(deleteModal.cliente.id)}
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