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
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Bell
} from 'lucide-react'
import { safeFormatDate } from '@/utils/date'

export default function ClienteDettaglio() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const clienteId = params?.id
  
  const [cliente, setCliente] = useState(null)
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
      const data = await response.json()
      setCliente(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/clienti/${clienteId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore nell\'eliminazione del cliente')
      }
      
      router.push('/clienti')
    } catch (error) {
      setError(error.message)
    }
  }

  // Funzione per ottenere lo stato del contratto con gestione sicura delle date
  const getContractStatus = (contratto) => {
    try {
      const now = new Date()
      
      // Verifica che le date siano valide
      let expiryDate, penaltyFreeDate, recommendedDate
      
      try {
        expiryDate = contratto.expiryDate ? new Date(contratto.expiryDate) : null
        penaltyFreeDate = contratto.penaltyFreeDate ? new Date(contratto.penaltyFreeDate) : null
        recommendedDate = contratto.recommendedDate ? new Date(contratto.recommendedDate) : null
        
        // Verifica che le date siano valide
        if (expiryDate && isNaN(expiryDate.getTime())) expiryDate = null
        if (penaltyFreeDate && isNaN(penaltyFreeDate.getTime())) penaltyFreeDate = null
        if (recommendedDate && isNaN(recommendedDate.getTime())) recommendedDate = null
      } catch (error) {
        console.error('Errore nella conversione delle date:', error)
        return { status: 'errore-data', color: 'badge-danger' }
      }
      
      // Se la data di scadenza non è valida, mostriamo un errore
      if (!expiryDate) return { status: 'data-invalida', color: 'badge-danger' }
      
      if (now > expiryDate) return { status: 'scaduto', color: 'badge-danger' }
      if (recommendedDate && now >= recommendedDate) return { status: 'cambio-consigliato', color: 'badge-warning' }
      if (penaltyFreeDate && now >= penaltyFreeDate) return { status: 'penalty-free', color: 'badge-info' }
      return { status: 'attivo', color: 'badge-success' }
    } catch (error) {
      console.error('Errore nel calcolo dello stato del contratto:', error)
      return { status: 'errore', color: 'badge-danger' }
    }
  }

  const getNotificationTypeLabel = (tipo) => {
    const labels = {
      PENALTY_FREE: 'Penalty Free',
      RECOMMENDED: 'Cambio Consigliato',
      EXPIRY: 'Scadenza'
    }
    return labels[tipo] || tipo
  }

  const getNotificationStatusColor = (status) => {
    const colors = {
      SENT: 'badge-success',
      FAILED: 'badge-danger',
      PENDING: 'badge-warning'
    }
    return colors[status] || 'badge-secondary'
  }

  const getNotificationStatusLabel = (status) => {
    const labels = {
      SENT: 'Inviata',
      FAILED: 'Fallita',
      PENDING: 'In attesa'
    }
    return labels[status] || status
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
            <Link href="/clienti" className="btn-primary">
              Torna ai Clienti
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (!cliente) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cliente non trovato</p>
          <Link href="/clienti" className="btn-primary mt-4">
            Torna ai Clienti
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/clienti" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {cliente.nome} {cliente.cognome}
              </h1>
              <p className="text-gray-600">Dettagli cliente e contratti</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/clienti/${clienteId}/modifica`}
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

        {/* Informazioni principali */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dati cliente */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Cliente</h3>
            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <Mail className="h-4 w-4 mr-3" />
                <span>{cliente.email}</span>
              </div>
              {cliente.telefono && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-3" />
                  <span>{cliente.telefono}</span>
                </div>
              )}
              {cliente.indirizzo && (
                <div className="flex items-start text-gray-600">
                  <MapPin className="h-4 w-4 mr-3 mt-0.5" />
                  <span>{cliente.indirizzo}</span>
                </div>
              )}
              {cliente.note && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> {cliente.note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contratto attivo */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contratto Attivo</h3>
            {cliente.contrattoAttivo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Fornitore:</span>
                  <span className="font-medium">{cliente.contrattoAttivo.fornitore.ragioneSociale}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="badge badge-info">{cliente.contrattoAttivo.fornitore.tipo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Inizio:</span>
                  <span>{safeFormatDate(cliente.contrattoAttivo.startDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Scadenza:</span>
                  <span>{safeFormatDate(cliente.contrattoAttivo.expiryDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Stato:</span>
                  <span className={`badge ${getContractStatus(cliente.contrattoAttivo).color}`}>
                    {getContractStatus(cliente.contrattoAttivo).status}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <Link
                    href={`/contratti/${cliente.contrattoAttivo.id}`}
                    className="btn-secondary w-full text-center"
                  >
                    Visualizza Contratto
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">Nessun contratto attivo</p>
                <Link
                  href={`/contratti/nuovo?clienteId=${clienteId}`}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nuovo Contratto</span>
                </Link>
              </div>
            )}
          </div>

          {/* Statistiche */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiche</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contratti Totali:</span>
                <span className="font-medium">{cliente.contrattiTotali}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contratti Attivi:</span>
                <span className="font-medium">{cliente.contrattiAttivi}</span>
              </div>
              {cliente.prossimaScadenza && cliente.prossimaScadenza !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Prossima Scadenza:</span>
                  <span className="font-medium">
                    {safeFormatDate(cliente.prossimaScadenza)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cliente dal:</span>
                <span className="font-medium">
                  {safeFormatDate(cliente.createdAt)}
                </span>
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
                Storico Contratti
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Bell className="h-4 w-4 inline mr-2" />
                Notifiche
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Storico Contratti</h3>
                  <Link
                    href={`/contratti/nuovo?clienteId=${clienteId}`}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nuovo Contratto</span>
                  </Link>
                </div>
                
                {cliente.contratti && cliente.contratti.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Fornitore</th>
                          <th>Tipo</th>
                          <th>Periodo</th>
                          <th>Durata</th>
                          <th>Stato</th>
                          <th>Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cliente.contratti.map((contratto) => {
                          const status = getContractStatus(contratto)
                          return (
                            <tr key={contratto.id}>
                              <td>
                                <div className="flex items-center">
                                  <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                                  <span className="font-medium">
                                    {contratto.fornitore.ragioneSociale}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-info">
                                  {contratto.fornitore.tipo}
                                </span>
                              </td>
                              <td>
                                <div className="text-sm">
                                  <div>{safeFormatDate(contratto.startDate)}</div>
                                  <div className="text-gray-500">
                                    {safeFormatDate(contratto.expiryDate)}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="text-sm">{contratto.durataMesi} mesi</span>
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
                    <p className="text-gray-500 mb-4">Nessun contratto trovato</p>
                    <Link
                      href={`/contratti/nuovo?clienteId=${clienteId}`}
                      className="btn-primary"
                    >
                      Crea il primo contratto
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifiche</h3>
                
                {cliente.notifiche && cliente.notifiche.length > 0 ? (
                  <div className="space-y-4">
                    {cliente.notifiche.map((notifica) => (
                      <div key={notifica.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">
                              {getNotificationTypeLabel(notifica.tipo)}
                            </span>
                            <span className={`badge ${getNotificationStatusColor(notifica.status)}`}>
                              {getNotificationStatusLabel(notifica.status)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {safeFormatDate(notifica.createdAt, 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>Contratto: {notifica.contratto.fornitore.ragioneSociale}</p>
                          <p>Canale: {notifica.channel}</p>
                          {notifica.scheduledDate && (
                            <p>Programmata per: {safeFormatDate(notifica.scheduledDate, 'dd/MM/yyyy HH:mm')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nessuna notifica trovata</p>
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
              Sei sicuro di voler eliminare il cliente <strong>{cliente.nome} {cliente.cognome}</strong>?
              Questa azione eliminerà anche tutti i contratti e le notifiche associate.
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