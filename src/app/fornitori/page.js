'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/Layout'
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Building2,
  Zap,
  Flame,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function FornitoriPage() {
  const { data: session, status } = useSession()
  const [fornitori, setFornitori] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    tipo: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [showFilters, setShowFilters] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ show: false, fornitore: null })
  const [sortBy, setSortBy] = useState('ragioneSociale')
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      fetchFornitori()
    }
  }, [session, searchTerm, filters, pagination.page, sortBy, sortOrder])

  const fetchFornitori = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.tipo && { tipo: filters.tipo })
      })

      const response = await fetch(`/api/fornitori?${params}`)
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei fornitori')
      }
      
      const data = await response.json()
      setFornitori(data.fornitori)
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

  const handleDelete = async (fornitoreId) => {
    try {
      const response = await fetch(`/api/fornitori/${fornitoreId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore nell\'eliminazione del fornitore')
      }
      
      setDeleteModal({ show: false, fornitore: null })
      fetchFornitori()
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ tipo: '' })
    setSearchTerm('')
    setSortBy('ragioneSociale')
    setSortOrder('asc')
    setPagination(prev => ({ ...prev, page: 1 }))
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fornitori</h1>
            <p className="text-gray-600">
              Gestisci i fornitori di energia elettrica e gas
            </p>
          </div>
          <Link href="/fornitori/nuovo" className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nuovo Fornitore</span>
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
                  placeholder="Cerca per ragione sociale..."
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
                  <label className="label">Tipo Fornitore</label>
                  <select
                    value={filters.tipo}
                    onChange={(e) => handleFilterChange('tipo', e.target.value)}
                    className="input"
                  >
                    <option value="">Tutti i tipi</option>
                    <option value="luce">Energia Elettrica</option>
                    <option value="gas">Gas</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">Ordina per</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input"
                  >
                    <option value="ragioneSociale">Ragione Sociale</option>
                    <option value="tipo">Tipo</option>
                    <option value="createdAt">Data Creazione</option>
                    <option value="_count.contratti">Numero Contratti</option>
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

        {/* Lista fornitori */}
        <div className="card">
          {fornitori.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        <button
                          onClick={() => handleSort('ragioneSociale')}
                          className="flex items-center space-x-1 hover:text-blue-600"
                        >
                          <span>Ragione Sociale</span>
                          {sortBy === 'ragioneSociale' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th>
                        <button
                          onClick={() => handleSort('tipo')}
                          className="flex items-center space-x-1 hover:text-blue-600"
                        >
                          <span>Tipo</span>
                          {sortBy === 'tipo' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th>
                        <button
                          onClick={() => handleSort('_count.contratti')}
                          className="flex items-center space-x-1 hover:text-blue-600"
                        >
                          <span>Contratti</span>
                          {sortBy === '_count.contratti' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th>Contratti Attivi</th>
                      <th>In Scadenza</th>
                      <th>
                        <button
                          onClick={() => handleSort('createdAt')}
                          className="flex items-center space-x-1 hover:text-blue-600"
                        >
                          <span>Creato</span>
                          {sortBy === 'createdAt' && (
                            <span className="text-blue-600">
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      </th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornitori.map((fornitore) => {
                      const TipoIcon = getTipoIcon(fornitore.tipo)
                      return (
                        <tr key={fornitore.id}>
                          <td>
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                              <div>
                                <p className="font-medium">{fornitore.ragioneSociale}</p>
                                {fornitore.note && (
                                  <p className="text-sm text-gray-500 truncate max-w-xs">
                                    {fornitore.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center">
                              <TipoIcon className={`h-4 w-4 mr-2 ${getTipoColor(fornitore.tipo)}`} />
                              <span className="capitalize">
                                {fornitore.tipo === 'luce' ? 'Energia Elettrica' : 'Gas'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="font-medium">{fornitore._count?.contratti || 0}</span>
                          </td>
                          <td>
                            <span className="badge badge-success">
                              {fornitore.contrattiAttivi || 0}
                            </span>
                          </td>
                          <td>
                            {fornitore.contrattiInScadenza > 0 ? (
                              <span className="badge badge-warning">
                                {fornitore.contrattiInScadenza}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td>
                            <span className="text-sm text-gray-600">
                              {format(new Date(fornitore.createdAt), 'dd/MM/yyyy')}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/fornitori/${fornitore.id}`}
                                className="text-blue-600 hover:text-blue-800"
                                title="Visualizza"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link
                                href={`/fornitori/${fornitore.id}/modifica`}
                                className="text-green-600 hover:text-green-800"
                                title="Modifica"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteModal({ show: true, fornitore })}
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
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} di {pagination.total} fornitori
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
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nessun fornitore trovato</p>
              <Link href="/fornitori/nuovo" className="btn-primary">
                Aggiungi il primo fornitore
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
              Sei sicuro di voler eliminare il fornitore <strong>{deleteModal.fornitore?.ragioneSociale}</strong>?
              {deleteModal.fornitore?._count?.contratti > 0 && (
                <span className="block mt-2 text-red-600">
                  Attenzione: questo fornitore ha {deleteModal.fornitore._count.contratti} contratti associati.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, fornitore: null })}
                className="btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDelete(deleteModal.fornitore.id)}
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