'use client'

import { useState, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Layout from '../../components/Layout'
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Bell,
  Eye,
  CheckSquare,
  CheckSquare2,
  Sparkles,
  BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// Lazy load dei grafici per migliorare le performance
const LazyCharts = lazy(() => import('./components/Charts'))
const LazyPredictiveAnalysisCard = lazy(() => import('./PredictiveAnalysisCard'))

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState(null)
  const [adminAlerts, setAdminAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      fetchDashboardData()
      if (session.user.role === 'ADMIN') {
        fetchAdminAlerts()
      }
    }
  }, [session])

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      const response = await fetch('/api/dashboard?' + new Date().getTime())
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati')
      }
      
      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      setError(error.message)
      console.error('Errore nel caricamento dei dati della dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const fetchAdminAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/contratti-alert?' + new Date().getTime())
      if (response.ok) {
        const data = await response.json()
        setAdminAlerts(data.stats)
      } else {
        console.error('Risposta non valida per gli alert admin:', response.status)
      }
    } catch (error) {
      console.error('Errore nel caricamento degli alert admin:', error)
    }
  }, [])

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
            <div className="absolute top-0 left-0 animate-spin rounded-full h-16 w-16 border-t-4 border-primary-600"></div>
          </div>
          <p className="text-gray-500 animate-pulse">Caricamento dashboard...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="card border-2 border-red-200 bg-red-50 animate-fade">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">Si è verificato un errore</h3>
              <p className="text-red-700">{error}</p>
            </div>
            <button 
              onClick={() => fetchDashboardData(false)}
              className="btn-primary flex items-center space-x-2"
              aria-label="Riprova a caricare i dati"
            >
              <Clock className="h-4 w-4" />
              <span>Riprova</span>
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!dashboardData) {
    return (
      <Layout>
        <div className="card border-2 border-gray-200 bg-gray-50 animate-fade">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Nessun dato disponibile</h3>
            <p className="text-gray-500 mb-4">Non sono stati trovati dati per la dashboard</p>
            <button 
              onClick={() => fetchDashboardData(false)}
              className="btn-primary flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>Aggiorna</span>
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const { scadenzeOdierne, statistiche, contrattiInScadenza, notificheRecenti, taskDaFare, grafici } = dashboardData

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header con data */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 animate-fade">Dashboard</h1>
            <p className="text-gray-600">
              {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: it })}
            </p>
          </div>
          <button
            onClick={() => {
              fetchDashboardData(true)
              if (session?.user?.role === 'ADMIN') {
                fetchAdminAlerts()
              }
            }}
            disabled={refreshing}
            className={`btn-secondary flex items-center space-x-2 ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
            aria-label="Aggiorna dashboard"
          >
            <Clock className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Aggiornamento...' : 'Aggiorna'}</span>
          </button>
        </div>

        {/* Alert Admin per contratti che richiedono attenzione */}
        {session?.user?.role === 'ADMIN' && adminAlerts && (
          <AdminContrattiAlert alerts={adminAlerts} />
        )}

        {/* Statistiche principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Clienti Totali"
            value={statistiche.clienti}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Fornitori"
            value={statistiche.fornitori}
            icon={Building2}
            color="green"
          />
          <StatCard
            title="Contratti Attivi"
            value={statistiche.contrattiAttivi}
            icon={FileText}
            color="purple"
          />
        </div>

        {/* Statistiche dettagliate sui contratti */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Da Gestire"
            value={statistiche.contrattiInScadenza}
            icon={AlertTriangle}
            color="orange"
          />
          <StatCard
            title="Penalty Free"
            value={statistiche.contrattiPenaltyFree || 0}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Cambio Consigliato"
            value={statistiche.contrattiRecommended || 0}
            icon={TrendingUp}
            color="yellow"
          />
          <StatCard
            title="Scaduti"
            value={statistiche.contrattiScaduti || 0}
            icon={AlertOctagon}
            color="red"
          />
        </div>

        {/* Analisi Predittiva AI */}
        <Suspense fallback={
          <div className="card border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        }>
          <LazyPredictiveAnalysisCard />
        </Suspense>

        {/* Scadenze odierne */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ScadenzeCard
            title="Penalty Free Oggi"
            count={scadenzeOdierne.penaltyFree.length}
            items={scadenzeOdierne.penaltyFree}
            color="green"
            icon={CheckCircle}
          />
          <ScadenzeCard
            title="Cambio Consigliato"
            count={scadenzeOdierne.recommended.length}
            items={scadenzeOdierne.recommended}
            color="yellow"
            icon={TrendingUp}
          />
          <ScadenzeCard
            title="Scadenze Definitive"
            count={scadenzeOdierne.expiry.length}
            items={scadenzeOdierne.expiry}
            color="red"
            icon={AlertTriangle}
          />
        </div>

        {/* Grafici con lazy loading */}
        <Suspense fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="card">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        }>
          <LazyCharts grafici={grafici} />
        </Suspense>

        {/* Task da fare e notifiche recenti */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task da fare */}
          <div className="card border border-gray-200 animate-fade">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CheckSquare2 className="h-5 w-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Task da Completare
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                {taskDaFare.length}
              </span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
              {taskDaFare.length > 0 ? (
                taskDaFare.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                  <p className="text-gray-500 font-medium">
                    Nessun task in sospeso
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Tutti i task sono stati completati
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notifiche recenti */}
          <div className="card border border-gray-200 animate-fade">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifiche Recenti
                </h3>
              </div>
              {notificheRecenti.length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                </span>
              )}
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
              {notificheRecenti.length > 0 ? (
                notificheRecenti.map((notifica) => (
                  <NotificaItem key={notifica.id} notifica={notifica} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Bell className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-gray-500 font-medium">
                    Nessuna notifica recente
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Sarai notificato quando ci saranno aggiornamenti
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contratti in scadenza e scaduti */}
        {contrattiInScadenza.length > 0 && (
          <div className="card border border-gray-200 animate-fade">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Contratti da Gestire
                </h3>
              </div>
              <div className="flex space-x-2">
                <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                  Prossimi 30 giorni
                </span>
                <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                  Scaduti recenti
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fornitore
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scadenza
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giorni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contrattiInScadenza.map((contratto, index) => {
                    // Verifica che la data di scadenza sia valida
                    const expiryDate = new Date(contratto.expiryDate);
                    const isValidDate = !isNaN(expiryDate.getTime());
                    const now = new Date();
                    
                    // Calcola i giorni rimanenti o passati dalla scadenza
                    const daysLeft = isValidDate ? 
                      Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : 0;
                    
                    // Determina lo stato del contratto
                    const getStatus = () => {
                      if (!isValidDate) return { label: 'Errore data', color: 'bg-red-100 text-red-800 border-red-200' };
                      if (daysLeft < 0) return { label: 'Scaduto', color: 'bg-red-100 text-red-800 border-red-200' };
                      if (daysLeft <= 7) return { label: 'Urgente', color: 'bg-red-100 text-red-800 border-red-200' };
                      if (daysLeft <= 15) return { label: 'Attenzione', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
                      return { label: 'In scadenza', color: 'bg-blue-100 text-blue-800 border-blue-200' };
                    };
                    
                    const status = getStatus();
                    const daysText = daysLeft < 0 ? `${Math.abs(daysLeft)} giorni fa` : `${daysLeft} giorni`;
                    
                    return (
                      <tr 
                        key={contratto.id}
                        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                              {contratto.cliente.nome.charAt(0)}{contratto.cliente.cognome.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {contratto.cliente.nome} {contratto.cliente.cognome}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-gray-900">{contratto.fornitore.ragioneSociale}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-primary-100 text-primary-800">
                            {contratto.fornitore.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {isValidDate ? (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {format(expiryDate, 'dd/MM/yyyy')}
                            </div>
                          ) : (
                            <span className="text-red-500">Data non valida</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isValidDate ? (
                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full border ${status.color}`}>
                              {daysText}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                              Data non valida
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

const StatCard = memo(({ title, value, icon: Icon, color }) => {
  const colorClasses = useMemo(() => ({
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: 'text-green-600'
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: 'text-purple-600'
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: 'text-orange-600'
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: 'text-red-600'
    },
    yellow: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: 'text-amber-600'
    }
  }), [])

  return (
    <div className={`card border-2 ${colorClasses[color].border} animate-fade`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${colorClasses[color].text}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color].bg}`}>
          <Icon className={`h-6 w-6 ${colorClasses[color].icon}`} />
        </div>
      </div>
    </div>
  )
})

StatCard.displayName = 'StatCard'

const ScadenzeCard = memo(({ title, count, items, color, icon: Icon }) => {
  const colorClasses = useMemo(() => ({
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      title: 'text-green-800',
      count: 'bg-green-100 text-green-700',
      item: 'bg-green-50 border-green-100'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-800',
      count: 'bg-yellow-100 text-yellow-700',
      item: 'bg-yellow-50 border-yellow-100'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-800',
      count: 'bg-red-100 text-red-700',
      item: 'bg-red-50 border-red-100'
    }
  }), [])
  
  // Filtra gli elementi con date valide
  const validItems = useMemo(() => items.filter(item => {
    // Verifica che l'item abbia tutte le proprietà necessarie
    if (!item || !item.cliente || !item.fornitore) return false;
    return true;
  }), [items])

  return (
    <div className={`card border-2 ${colorClasses[color].border} ${colorClasses[color].bg} animate-fade`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`p-2 rounded-full ${colorClasses[color].bg} mr-3`}>
            <Icon className={`h-5 w-5 ${colorClasses[color].icon}`} />
          </div>
          <h3 className={`text-lg font-semibold ${colorClasses[color].title}`}>{title}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClasses[color].count}`}>
          {validItems.length}
        </span>
      </div>
      <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin pr-1">
        {validItems.length > 0 ? (
          validItems.slice(0, 3).map((item) => (
            <div 
              key={item.id} 
              className={`p-3 rounded-lg border text-sm ${colorClasses[color].item} transition-medium hover:shadow-sm`}
            >
              <p className="font-medium flex items-center justify-between">
                <span>{item.cliente.nome} {item.cliente.cognome}</span>
                {item.expiryDate && (
                  <span className="text-xs opacity-75">
                    {format(new Date(item.expiryDate), 'dd/MM/yyyy')}
                  </span>
                )}
              </p>
              <p className="text-gray-600 text-xs mt-1">{item.fornitore.ragioneSociale}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Nessuna scadenza oggi</p>
          </div>
        )}
        {validItems.length > 3 && (
          <button className={`w-full text-center py-2 text-xs font-medium ${colorClasses[color].icon} hover:underline`}>
            +{validItems.length - 3} altri
          </button>
        )}
      </div>
    </div>
  )
})

ScadenzeCard.displayName = 'ScadenzeCard'

const TaskItem = memo(({ task }) => {
  const tipoLabels = {
    PENALTY_FREE: 'Penalty Free',
    RECOMMENDED: 'Cambio Consigliato',
    EXPIRY: 'Scadenza'
  }

  const tipoConfig = {
    PENALTY_FREE: {
      badge: 'badge-success',
      icon: CheckCircle,
      bg: 'bg-green-50',
      border: 'border-green-100'
    },
    RECOMMENDED: {
      badge: 'badge-warning',
      icon: TrendingUp,
      bg: 'bg-yellow-50',
      border: 'border-yellow-100'
    },
    EXPIRY: {
      badge: 'badge-danger',
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-100'
    },
    UNKNOWN: {
      badge: 'badge-secondary',
      icon: Clock,
      bg: 'bg-gray-50',
      border: 'border-gray-100'
    }
  }
  
  // Verifica che il task e i suoi dati siano validi
  const hasValidData = task && task.contratto && 
                      task.contratto.cliente && 
                      task.contratto.fornitore && 
                      task.tipo;
  
  // Ottieni il tipo di task o usa un valore di fallback
  const taskTipo = task?.tipo || 'UNKNOWN';
  const tipoLabel = tipoLabels[taskTipo] || 'Sconosciuto';
  const config = tipoConfig[taskTipo] || tipoConfig.UNKNOWN;
  const TaskIcon = config.icon;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${config.bg} ${config.border} transition-medium hover:shadow-sm animate-fade`}>
      <div className="flex items-center">
        <div className="mr-3">
          <TaskIcon className="h-5 w-5 text-gray-500" />
        </div>
        <div>
          <p className="font-medium text-sm">
            {hasValidData ? 
              `${task.contratto.cliente.nome} ${task.contratto.cliente.cognome}` : 
              'Cliente non disponibile'}
          </p>
          <p className="text-xs text-gray-600">
            {hasValidData ? 
              task.contratto.fornitore.ragioneSociale : 
              'Fornitore non disponibile'}
          </p>
        </div>
      </div>
      <span className={`badge ${config.badge}`}>
        {hasValidData ? tipoLabel : 'Tipo sconosciuto'}
      </span>
    </div>
  )
})

TaskItem.displayName = 'TaskItem'

const NotificaItem = memo(({ notifica }) => {
  const statusConfig = {
    SENT: {
      badge: 'badge-success',
      icon: CheckCircle,
      bg: 'bg-green-50',
      border: 'border-green-100',
      label: 'Inviata'
    },
    FAILED: {
      badge: 'badge-danger',
      icon: AlertTriangle,
      bg: 'bg-red-50',
      border: 'border-red-100',
      label: 'Fallita'
    },
    PENDING: {
      badge: 'badge-warning',
      icon: Clock,
      bg: 'bg-yellow-50',
      border: 'border-yellow-100',
      label: 'In attesa'
    },
    UNKNOWN: {
      badge: 'badge-secondary',
      icon: Bell,
      bg: 'bg-gray-50',
      border: 'border-gray-100',
      label: 'Sconosciuto'
    }
  }
  
  // Verifica che la notifica e i suoi dati siano validi
  const hasValidData = notifica && notifica.contratto && 
                      notifica.contratto.cliente && 
                      notifica.status;
  
  // Verifica che la data di creazione sia valida
  const createdAt = notifica?.createdAt ? new Date(notifica.createdAt) : null;
  const isValidDate = createdAt && !isNaN(createdAt.getTime());
  
  // Ottieni la configurazione in base allo stato
  const status = notifica?.status || 'UNKNOWN';
  const config = statusConfig[status] || statusConfig.UNKNOWN;
  const StatusIcon = config.icon;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${config.bg} ${config.border} transition-medium hover:shadow-sm animate-fade`}>
      <div className="flex items-center">
        <div className="mr-3">
          <StatusIcon className="h-5 w-5 text-gray-500" />
        </div>
        <div>
          <div className="flex items-center">
            <p className="font-medium text-sm">
              {hasValidData ? 
                `${notifica.contratto.cliente.nome} ${notifica.contratto.cliente.cognome}` : 
                'Cliente non disponibile'}
            </p>
            <span className={`badge ml-2 ${config.badge}`}>
              {hasValidData ? config.label : 'Errore'}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            {isValidDate ? 
              format(createdAt, 'dd/MM/yyyy HH:mm') : 
              'Data non disponibile'}
          </p>
        </div>
      </div>
      {notifica.tipo && (
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {notifica.tipo}
        </span>
      )}
    </div>
  )
})

NotificaItem.displayName = 'NotificaItem'

const AdminContrattiAlert = memo(({ alerts }) => {
  const router = useRouter()
  
  const totalAlerts = alerts.modificabili + alerts.inScadenza + alerts.scaduti
  
  if (totalAlerts === 0) {
    return (
      <div className="card border-2 border-green-200 bg-green-50 animate-fade">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">Tutto sotto controllo</h3>
              <p className="text-green-700">Non ci sono contratti che richiedono attenzione immediata.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="card border-2 border-red-200 bg-red-50 animate-fade">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-red-100 mr-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Contratti che richiedono attenzione</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {alerts.modificabili > 0 && (
                <span className="badge badge-danger">
                  {alerts.modificabili} modificabili
                </span>
              )}
              {alerts.inScadenza > 0 && (
                <span className="badge badge-warning">
                  {alerts.inScadenza} in scadenza
                </span>
              )}
              {alerts.scaduti > 0 && (
                <span className="badge badge-danger">
                  {alerts.scaduti} scaduti
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/admin/contratti-alert')}
          className="btn-primary flex items-center space-x-2 transition-medium hover:shadow-md"
          aria-label="Gestisci contratti che richiedono attenzione"
        >
          <Eye className="h-4 w-4" />
          <span>Gestisci</span>
        </button>
      </div>
    </div>
  )
})

AdminContrattiAlert.displayName = 'AdminContrattiAlert'