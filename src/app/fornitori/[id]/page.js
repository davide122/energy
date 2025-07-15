'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Building2,
  Zap,
  Flame,
  FileText,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
// import { formatDate, safeFormatDate } from '@/utils/date'

export default function FornitoreDettaglio() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const fornitoreId = params.id
  
  const [fornitore, setFornitore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

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
      setFornitore(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/fornitori/${fornitoreId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore nell\'eliminazione del fornitore')
      }
      
      router.push('/fornitori')
    } catch (error) {
      setError(error.message)
    }
  }

  const getContractStatus = (contratto) => {
    const today = new Date()
    
    // Verifica che la data di scadenza sia valida
    let expiryDate;
    try {
      expiryDate = contratto.expiryDate ? new Date(contratto.expiryDate) : null;
      
      // Verifica che la data sia valida
      if (expiryDate && isNaN(expiryDate.getTime())) expiryDate = null;
    } catch (error) {
      console.error('Errore nella conversione della data di scadenza:', error);
      expiryDate = null;
    }
    
    // Calcola i giorni alla scadenza solo se expiryDate è valida
    let daysLeft = 0;
    if (expiryDate) {
      daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    }
    
    if (!expiryDate) return { status: 'data-non-valida', color: 'badge-error', days: 0 }
    if (daysLeft <= 0) return { status: 'scaduto', color: 'badge-danger', days: daysLeft }
    if (daysLeft <= 30) return { status: 'in-scadenza', color: 'badge-warning', days: daysLeft }
    if (daysLeft <= 90) return { status: 'prossima-scadenza', color: 'badge-info', days: daysLeft }
    return { status: 'attivo', color: 'badge-success', days: daysLeft }
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

  const getTipoLabel = (tipo) => {
    // Normalizza il tipo in maiuscolo per il confronto
    const tipoUpper = tipo ? tipo.toUpperCase() : ''
    return tipoUpper === 'LUCE' ? 'Energia Elettrica' : 'Gas'
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

  if (error) {
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

  if (!fornitore) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Fornitore non trovato</p>
          <Link href="/fornitori" className="btn-primary mt-4">
            Torna ai Fornitori
          </Link>
        </div>
      </Layout>
    )
  }

  const TipoIcon = getTipoIcon(fornitore.tipo)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/fornitori" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center space-x-3">
              <TipoIcon className={`h-8 w-8 ${getTipoColor(fornitore.tipo)}`} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {fornitore.ragioneSociale}
                </h1>
                <p className="text-gray-600">{getTipoLabel(fornitore.tipo)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/fornitori/${fornitoreId}/modifica`}
              className="btn-secondary flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Modifica</span>
            </Link>
            <button
              onClick={() => setDeleteModal(true)}
              className="btn-danger flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Elimina</span>
            </button>
          </div>
        </div>

        {/* Statistiche principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Contratti Totali</p>
                <p className="text-2xl font-bold text-gray-900">{fornitore.contrattiTotali}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Contratti Attivi</p>
                <p className="text-2xl font-bold text-gray-900">{fornitore.contrattiAttivi}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-500">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Scadenza</p>
                <p className="text-2xl font-bold text-gray-900">{fornitore.contrattiInScadenza}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clienti Unici</p>
                <p className="text-2xl font-bold text-gray-900">{fornitore.clientiUnici}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informazioni fornitore */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dettagli */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Fornitore</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tipo:</span>
                <div className="flex items-center">
                  <TipoIcon className={`h-4 w-4 mr-2 ${getTipoColor(fornitore.tipo)}`} />
                  <span className="font-medium">{getTipoLabel(fornitore.tipo)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Creato il:</span>
                <span className="font-medium">
                  DEBUG: Data commentata {/* {safeFormatDate(fornitore.createdAt)} */}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ultimo aggiornamento:</span>
                <span className="font-medium">
                  DEBUG: Data commentata {/* {safeFormatDate(fornitore.updatedAt)} */}
                </span>
              </div>
              {fornitore.note && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> {fornitore.note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Azioni rapide */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Azioni Rapide</h3>
            <div className="space-y-3">
              <Link
                href={`/contratti/nuovo?fornitoreId=${fornitoreId}`}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Nuovo Contratto</span>
              </Link>
              <Link
                href={`/contratti?fornitore=${fornitoreId}`}
                className="btn-secondary w-full flex items-center justify-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Visualizza Contratti</span>
              </Link>
              <Link
                href={`/clienti?fornitore=${fornitoreId}`}
                className="btn-secondary w-full flex items-center justify-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Visualizza Clienti</span>
              </Link>
            </div>
          </div>

          {/* Statistiche aggiuntive */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiche</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Durata media contratti:</span>
                <span className="font-medium">{fornitore.durataMediaContratti || 0} mesi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contratti questo mese:</span>
                <span className="font-medium">{fornitore.contrattiQuestoMese || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tasso di rinnovo:</span>
                <span className="font-medium">{fornitore.tassoRinnovo || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Contratti Attivi
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                Storico
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contratti Attivi</h3>
                  <Link
                    href={`/contratti/nuovo?fornitoreId=${fornitoreId}`}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nuovo Contratto</span>
                  </Link>
                </div>
                
                {fornitore.contratti && fornitore.contratti.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Periodo</th>
                          <th>Durata</th>
                          <th>Scadenza</th>
                          <th>Stato</th>
                          <th>Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fornitore.contratti.map((contratto) => {
                          const status = getContractStatus(contratto)
                          return (
                            <tr key={contratto.id}>
                              <td>
                                <div>
                                  <p className="font-medium">
                                    {contratto.cliente.nome} {contratto.cliente.cognome}
                                  </p>
                                  <p className="text-sm text-gray-500">{contratto.cliente.email}</p>
                                </div>
                              </td>
                              <td>
                                <div className="text-sm">
                                  <div>DEBUG: Data commentata {/* {safeFormatDate(contratto.startDate)} */}</div>
                        <div className="text-gray-500">
                          DEBUG: Data commentata {/* {safeFormatDate(contratto.expiryDate)} */}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="text-sm">{contratto.durataMesi} mesi</span>
                              </td>
                              <td>
                                <span className="text-sm">
                                  {status.days > 0 ? `${status.days} giorni` : 'Scaduto'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${status.color}`}>
                                  {status.status}
                                </span>
                              </td>
                              <td>
                                <Link
                                  href={`/contratti/${contratto.id}`}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  Visualizza
                                </Link>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Nessun contratto attivo</p>
                    <Link
                      href={`/contratti/nuovo?fornitoreId=${fornitoreId}`}
                      className="btn-primary"
                    >
                      Crea il primo contratto
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Storico Contratti</h3>
                
                {fornitore.storicoContratti && fornitore.storicoContratti.length > 0 ? (
                  <div className="space-y-4">
                    {fornitore.storicoContratti.map((storico) => (
                      <div key={storico.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">
                              {storico.contratto.cliente.nome} {storico.contratto.cliente.cognome}
                            </span>
                            <span className="badge badge-secondary">
                              Contratto #{storico.contratto.id}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            DEBUG: Data commentata {/* {safeFormatDate(storico.createdAt)} */}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>Periodo: DEBUG: Data commentata {/* {safeFormatDate(storico.startDate)} */} - DEBUG: Data commentata {/* {safeFormatDate(storico.endDate)} */}</p>
                          <p>Durata: {Math.ceil((new Date(storico.endDate) - new Date(storico.startDate)) / (1000 * 60 * 60 * 24 * 30))} mesi</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nessuno storico disponibile</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal di conferma eliminazione */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Conferma Eliminazione
            </h3>
            <p className="text-gray-600 mb-6">
              Sei sicuro di voler eliminare il fornitore <strong>{fornitore.ragioneSociale}</strong>?
              {fornitore.contrattiTotali > 0 && (
                <span className="block mt-2 text-red-600">
                  Attenzione: questo fornitore ha {fornitore.contrattiTotali} contratti associati.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal(false)}
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