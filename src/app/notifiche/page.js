'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'

export default function NotifichePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [notifiche, setNotifiche] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroLetta, setFiltroLetta] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchNotifiche()
  }, [session, status, router])

  const fetchNotifiche = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifiche')
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle notifiche')
      }
      const data = await response.json()
      setNotifiche(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const marcaComeLetta = async (id) => {
    try {
      const response = await fetch(`/api/notifiche/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ letta: true }),
      })
      
      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento della notifica')
      }
      
      setNotifiche(prev => prev.map(notifica => 
        notifica.id === id ? { ...notifica, letta: true } : notifica
      ))
    } catch (err) {
      setError(err.message)
    }
  }

  const marcaTutteComeLette = async () => {
    try {
      const response = await fetch('/api/notifiche/marca-tutte-lette', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento delle notifiche')
      }
      
      setNotifiche(prev => prev.map(notifica => ({ ...notifica, letta: true })))
    } catch (err) {
      setError(err.message)
    }
  }

  const eliminaNotifica = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questa notifica?')) return
    
    try {
      const response = await fetch(`/api/notifiche/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione della notifica')
      }
      
      setNotifiche(prev => prev.filter(notifica => notifica.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'penalty_free':
        return '⚠️'
      case 'recommended':
        return '💡'
      case 'expiry':
        return '🚨'
      case 'info':
        return 'ℹ️'
      default:
        return '📢'
    }
  }

  const getTipoBadge = (tipo) => {
    switch (tipo) {
      case 'penalty_free':
        return 'badge-warning'
      case 'recommended':
        return 'badge-info'
      case 'expiry':
        return 'badge-danger'
      case 'info':
        return 'badge-info'
      default:
        return 'badge-info'
    }
  }

  // Filtri
  const notificheFiltrate = notifiche.filter(notifica => {
    const matchSearch = notifica.messaggio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (notifica.contratto?.cliente?.nome + ' ' + notifica.contratto?.cliente?.cognome)
                         .toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = !filtroTipo || notifica.tipo === filtroTipo
    const matchLetta = filtroLetta === '' || 
                      (filtroLetta === 'letta' && notifica.letta) ||
                      (filtroLetta === 'non_letta' && !notifica.letta)
    
    return matchSearch && matchTipo && matchLetta
  })

  // Paginazione
  const totalPages = Math.ceil(notificheFiltrate.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const notifichePaginate = notificheFiltrate.slice(startIndex, startIndex + itemsPerPage)

  const notificheNonLette = notifiche.filter(n => !n.letta).length

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
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
            <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
            <p className="text-gray-600">
              {notificheNonLette > 0 ? `${notificheNonLette} notifiche non lette` : 'Tutte le notifiche sono state lette'}
            </p>
          </div>
          {notificheNonLette > 0 && (
            <button
              onClick={marcaTutteComeLette}
              className="btn-secondary"
            >
              Marca tutte come lette
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Filtri */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                placeholder="Cerca notifiche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="input"
              >
                <option value="">Tutti i tipi</option>
                <option value="penalty_free">Penalty Free</option>
                <option value="recommended">Cambio Consigliato</option>
                <option value="expiry">Scadenza</option>
                <option value="info">Informazione</option>
              </select>
            </div>
            <div>
              <select
                value={filtroLetta}
                onChange={(e) => setFiltroLetta(e.target.value)}
                className="input"
              >
                <option value="">Tutte</option>
                <option value="non_letta">Non lette</option>
                <option value="letta">Lette</option>
              </select>
            </div>
            <div>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFiltroTipo('')
                  setFiltroLetta('')
                  setCurrentPage(1)
                }}
                className="btn-secondary w-full"
              >
                Reset Filtri
              </button>
            </div>
          </div>
        </div>

        {/* Lista Notifiche */}
        <div className="space-y-4">
          {notifichePaginate.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">Nessuna notifica trovata</p>
            </div>
          ) : (
            notifichePaginate.map((notifica) => (
              <div
                key={notifica.id}
                className={`card hover:shadow-md transition-shadow ${
                  !notifica.letta ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="text-2xl">
                      {getTipoIcon(notifica.tipo)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`badge ${getTipoBadge(notifica.tipo)}`}>
                          {notifica.tipo === 'penalty_free' && 'Penalty Free'}
                          {notifica.tipo === 'recommended' && 'Cambio Consigliato'}
                          {notifica.tipo === 'expiry' && 'Scadenza'}
                          {notifica.tipo === 'info' && 'Informazione'}
                        </span>
                        {!notifica.letta && (
                          <span className="badge badge-info">Nuova</span>
                        )}
                      </div>
                      <p className="text-gray-900 mb-2">{notifica.messaggio}</p>
                      <div className="text-sm text-gray-500 space-y-1">
                        {notifica.contratto && (
                          <p>
                            <strong>Cliente:</strong> {notifica.contratto.cliente.nome} {notifica.contratto.cliente.cognome}
                          </p>
                        )}
                        {notifica.contratto && (
                          <p>
                            <strong>Fornitore:</strong> {notifica.contratto.fornitore.ragioneSociale}
                          </p>
                        )}
                        <p>
                          <strong>Data:</strong> {new Date(notifica.dataCreazione).toLocaleDateString('it-IT', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!notifica.letta && (
                      <button
                        onClick={() => marcaComeLetta(notifica.id)}
                        className="btn-secondary text-sm"
                        title="Marca come letta"
                      >
                        ✓
                      </button>
                    )}
                    {notifica.contratto && (
                      <button
                        onClick={() => router.push(`/contratti/${notifica.contratto.id}`)}
                        className="btn-primary text-sm"
                      >
                        Visualizza Contratto
                      </button>
                    )}
                    <button
                      onClick={() => eliminaNotifica(notifica.id)}
                      className="btn-danger text-sm"
                      title="Elimina notifica"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-secondary disabled:opacity-50"
            >
              Precedente
            </button>
            <span className="flex items-center px-4 py-2 text-gray-700">
              Pagina {currentPage} di {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="btn-secondary disabled:opacity-50"
            >
              Successiva
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}