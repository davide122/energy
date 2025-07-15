'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Layout from '../../../components/Layout'
import {
  AlertTriangle,
  Clock,
  Mail,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Building2,
  Send,
  RefreshCw,
  Filter,
  Eye,
  Download
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function AdminContrattiAlert() {
  const { data: session, status } = useSession()
  const [contratti, setContratti] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedContratti, setSelectedContratti] = useState([])
  const [sendingEmails, setSendingEmails] = useState(false)
  const [emailResults, setEmailResults] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('tutti')
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
    if (session && session.user.role !== 'ADMIN') {
      redirect('/dashboard')
    }
  }, [status, session])

  useEffect(() => {
    if (session && session.user.role === 'ADMIN') {
      fetchContrattiAlert()
    }
  }, [session])

  const fetchContrattiAlert = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/contratti-alert')
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati')
      }
      const data = await response.json()
      setContratti(data.contratti)
      setStats(data.stats)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectContratto = (contrattoId) => {
    setSelectedContratti(prev => 
      prev.includes(contrattoId)
        ? prev.filter(id => id !== contrattoId)
        : [...prev, contrattoId]
    )
  }

  const handleSelectAll = () => {
    const contrattiFiltered = getContrattiFiltered()
    const contrattiDaInviare = contrattiFiltered.filter(c => c.actionRequired && !c.emailSent)
    
    if (selectedContratti.length === contrattiDaInviare.length) {
      setSelectedContratti([])
    } else {
      setSelectedContratti(contrattiDaInviare.map(c => c.id))
    }
  }

  const handleSendEmails = async () => {
    if (selectedContratti.length === 0) return
    
    setSendingEmails(true)
    try {
      const response = await fetch('/api/admin/contratti-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'send-emails',
          contrattoIds: selectedContratti
        })
      })
      
      if (!response.ok) {
        throw new Error('Errore nell\'invio delle email')
      }
      
      const data = await response.json()
      setEmailResults(data.risultati)
      setShowEmailModal(true)
      setSelectedContratti([])
      
      // Ricarica i dati
      await fetchContrattiAlert()
    } catch (error) {
      setError(error.message)
    } finally {
      setSendingEmails(false)
    }
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      'scaduto': { 
        label: 'Scaduto', 
        color: 'bg-red-100 text-red-800', 
        icon: AlertTriangle,
        priority: 1
      },
      'in-scadenza': { 
        label: 'In Scadenza', 
        color: 'bg-orange-100 text-orange-800', 
        icon: AlertTriangle,
        priority: 1
      },
      'modificabile': { 
        label: 'Modificabile', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Clock,
        priority: 2
      },
      'cambio-consigliato': { 
        label: 'Cambio Consigliato', 
        color: 'bg-blue-100 text-blue-800', 
        icon: Clock,
        priority: 2
      },
      'penalty-free': { 
        label: 'Penalty Free', 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle,
        priority: 2
      },
      'attivo': { 
        label: 'Attivo', 
        color: 'bg-gray-100 text-gray-800', 
        icon: CheckCircle,
        priority: 3
      }
    }
    return statusMap[status] || statusMap['attivo']
  }

  const getContrattiFiltered = () => {
    if (filtroStatus === 'tutti') return contratti
    if (filtroStatus === 'action-required') return contratti.filter(c => c.actionRequired)
    if (filtroStatus === 'email-da-inviare') return contratti.filter(c => c.actionRequired && !c.emailSent)
    return contratti.filter(c => c.status === filtroStatus)
  }

  const exportToCSV = () => {
    const contrattiFiltered = getContrattiFiltered()
    const csvContent = [
      ['Cliente', 'Email', 'Fornitore', 'Tipo', 'Data Inizio', 'Scadenza', 'Stato', 'Mesi Attivi', 'Email Inviata'].join(','),
      ...contrattiFiltered.map(c => [
        `"${c.cliente.nome} ${c.cliente.cognome}"`,
        c.cliente.email || '',
        `"${c.fornitore.ragioneSociale}"`,
        c.fornitore.tipo,
        format(new Date(c.startDate), 'dd/MM/yyyy'),
        format(new Date(c.expiryDate), 'dd/MM/yyyy'),
        getStatusInfo(c.status).label,
        c.monthsFromStart,
        c.emailSent ? 'Sì' : 'No'
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contratti-alert-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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

  const contrattiFiltered = getContrattiFiltered()
  const contrattiDaInviare = contrattiFiltered.filter(c => c.actionRequired && !c.emailSent)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alert Contratti Admin</h1>
            <p className="text-gray-600">
              Gestione contratti che richiedono attenzione
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToCSV}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Esporta CSV</span>
            </button>
            <button
              onClick={fetchContrattiAlert}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Aggiorna</span>
            </button>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totaleContratti}</div>
            <div className="text-sm text-gray-600">Totale Contratti</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.modificabili}</div>
            <div className="text-sm text-gray-600">Modificabili</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.inScadenza}</div>
            <div className="text-sm text-gray-600">In Scadenza</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">{stats.scaduti}</div>
            <div className="text-sm text-gray-600">Scaduti</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{stats.penaltyFree}</div>
            <div className="text-sm text-gray-600">Penalty Free</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.emailDaInviare}</div>
            <div className="text-sm text-gray-600">Email da Inviare</div>
          </div>
        </div>

        {/* Alert principale */}
        {stats.emailDaInviare > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Azione Richiesta
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Ci sono {stats.emailDaInviare} clienti che devono essere contattati per i loro contratti.
                  </p>
                </div>
              </div>
              {selectedContratti.length > 0 && (
                <button
                  onClick={handleSendEmails}
                  disabled={sendingEmails}
                  className="btn-primary flex items-center space-x-2"
                >
                  {sendingEmails ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>
                    {sendingEmails ? 'Invio...' : `Invia ${selectedContratti.length} Email`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filtri */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="input"
              >
                <option value="tutti">Tutti i contratti</option>
                <option value="action-required">Richiedono azione</option>
                <option value="email-da-inviare">Email da inviare</option>
                <option value="modificabile">Modificabili</option>
                <option value="in-scadenza">In scadenza</option>
                <option value="scaduto">Scaduti</option>
                <option value="penalty-free">Penalty Free</option>
              </select>
            </div>
            
            {contrattiDaInviare.length > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedContratti.length === contrattiDaInviare.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedContratti.length} selezionati
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabella contratti */}
        <div className="card">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {contrattiFiltered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedContratti.length === contrattiDaInviare.length && contrattiDaInviare.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th>Cliente</th>
                    <th>Fornitore</th>
                    <th>Periodo</th>
                    <th>Stato</th>
                    <th>Mesi Attivi</th>
                    <th>Email</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {contrattiFiltered.map((contratto) => {
                    const statusInfo = getStatusInfo(contratto.status)
                    const StatusIcon = statusInfo.icon
                    const canSelect = contratto.actionRequired && !contratto.emailSent
                    
                    return (
                      <tr 
                        key={contratto.id} 
                        className={`hover:bg-gray-50 ${
                          contratto.priority === 1 ? 'bg-red-50' : 
                          contratto.priority === 2 ? 'bg-yellow-50' : 'bg-white'
                        }`}
                      >
                        <td>
                          {canSelect && (
                            <input
                              type="checkbox"
                              checked={selectedContratti.includes(contratto.id)}
                              onChange={() => handleSelectContratto(contratto.id)}
                              className="rounded border-gray-300"
                            />
                          )}
                        </td>
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
                              contratto.fornitore.tipo === 'LUCE' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {contratto.fornitore.tipo}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <div>{format(new Date(contratto.startDate), 'dd/MM/yyyy', { locale: it })}</div>
                            <div className="text-gray-500">
                              {format(new Date(contratto.expiryDate), 'dd/MM/yyyy', { locale: it })}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm font-medium">
                            {contratto.monthsFromStart} mesi
                          </span>
                          {contratto.canChange && (
                            <div className="text-xs text-yellow-600 font-medium">
                              Modificabile!
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            {contratto.emailSent ? (
                              <span className="inline-flex items-center text-green-600">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span className="text-xs">Inviata</span>
                              </span>
                            ) : contratto.actionRequired ? (
                              <span className="inline-flex items-center text-orange-600">
                                <Clock className="h-4 w-4 mr-1" />
                                <span className="text-xs">Da inviare</span>
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">Non necessaria</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => window.open(`/contratti/${contratto.id}`, '_blank')}
                              className="text-blue-600 hover:text-blue-800"
                              title="Visualizza contratto"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nessun contratto trovato per i filtri selezionati.
            </div>
          )}
        </div>
      </div>

      {/* Modal risultati email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Risultati Invio Email</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              {emailResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{result.cliente}</p>
                      <p className="text-sm text-gray-600">{result.email}</p>
                    </div>
                    <div className="flex items-center">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  {result.error && (
                    <p className="text-sm text-red-600 mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="btn-primary"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}