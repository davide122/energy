'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Layout from '../../components/Layout'
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Bell
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati')
      }
      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>Errore: {error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-2 btn-primary"
          >
            Riprova
          </button>
        </div>
      </Layout>
    )
  }

  if (!dashboardData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Nessun dato disponibile</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: it })}
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="btn-secondary flex items-center space-x-2"
          >
            <Clock className="h-4 w-4" />
            <span>Aggiorna</span>
          </button>
        </div>

        {/* Statistiche principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <StatCard
            title="In Scadenza"
            value={statistiche.contrattiInScadenza}
            icon={AlertTriangle}
            color="orange"
          />
        </div>

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

        {/* Grafici */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grafico contratti per mese */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Contratti per Mese
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={grafici.contrattiPerMese}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mese" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="nuovi" stroke="#3B82F6" strokeWidth={2} name="Nuovi" />
                <Line type="monotone" dataKey="scaduti" stroke="#EF4444" strokeWidth={2} name="Scaduti" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuzione fornitori */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top 5 Fornitori
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={grafici.topFornitori}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ragioneSociale" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="contratti" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task da fare e notifiche recenti */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task da fare */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Task da Completare
              </h3>
              <span className="badge badge-info">
                {taskDaFare.length}
              </span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {taskDaFare.length > 0 ? (
                taskDaFare.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Nessun task in sospeso
                </p>
              )}
            </div>
          </div>

          {/* Notifiche recenti */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifiche Recenti
              </h3>
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notificheRecenti.length > 0 ? (
                notificheRecenti.map((notifica) => (
                  <NotificaItem key={notifica.id} notifica={notifica} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Nessuna notifica recente
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contratti in scadenza */}
        {contrattiInScadenza.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Contratti in Scadenza (Prossimi 30 giorni)
            </h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Fornitore</th>
                    <th>Tipo</th>
                    <th>Scadenza</th>
                    <th>Giorni Rimanenti</th>
                  </tr>
                </thead>
                <tbody>
                  {contrattiInScadenza.map((contratto) => {
                    const daysLeft = Math.ceil(
                      (new Date(contratto.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
                    )
                    return (
                      <tr key={contratto.id}>
                        <td>
                          {contratto.cliente.nome} {contratto.cliente.cognome}
                        </td>
                        <td>{contratto.fornitore.ragioneSociale}</td>
                        <td>
                          <span className="badge badge-info">
                            {contratto.fornitore.tipo}
                          </span>
                        </td>
                        <td>
                          {format(new Date(contratto.expiryDate), 'dd/MM/yyyy')}
                        </td>
                        <td>
                          <span className={`badge ${
                            daysLeft <= 7 ? 'badge-danger' : 
                            daysLeft <= 15 ? 'badge-warning' : 'badge-info'
                          }`}>
                            {daysLeft} giorni
                          </span>
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

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  }

  return (
    <div className="card">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function ScadenzeCard({ title, count, items, color, icon: Icon }) {
  const colorClasses = {
    green: 'border-green-200 bg-green-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    red: 'border-red-200 bg-red-50'
  }

  const iconColorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600'
  }

  return (
    <div className={`card border-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Icon className={`h-5 w-5 ${iconColorClasses[color]} mr-2`} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <span className="text-2xl font-bold text-gray-900">{count}</span>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {items.length > 0 ? (
          items.slice(0, 3).map((item) => (
            <div key={item.id} className="text-sm">
              <p className="font-medium">
                {item.cliente.nome} {item.cliente.cognome}
              </p>
              <p className="text-gray-600">{item.fornitore.ragioneSociale}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">Nessuna scadenza oggi</p>
        )}
        {items.length > 3 && (
          <p className="text-xs text-gray-500">+{items.length - 3} altri</p>
        )}
      </div>
    </div>
  )
}

function TaskItem({ task }) {
  const tipoLabels = {
    PENALTY_FREE: 'Penalty Free',
    RECOMMENDED: 'Cambio Consigliato',
    EXPIRY: 'Scadenza'
  }

  const tipoColors = {
    PENALTY_FREE: 'badge-success',
    RECOMMENDED: 'badge-warning',
    EXPIRY: 'badge-danger'
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-sm">
          {task.contratto.cliente.nome} {task.contratto.cliente.cognome}
        </p>
        <p className="text-xs text-gray-600">
          {task.contratto.fornitore.ragioneSociale}
        </p>
      </div>
      <span className={`badge ${tipoColors[task.tipo]}`}>
        {tipoLabels[task.tipo]}
      </span>
    </div>
  )
}

function NotificaItem({ notifica }) {
  const statusColors = {
    SENT: 'badge-success',
    FAILED: 'badge-danger',
    PENDING: 'badge-warning'
  }

  const statusLabels = {
    SENT: 'Inviata',
    FAILED: 'Fallita',
    PENDING: 'In attesa'
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-sm">
          {notifica.contratto.cliente.nome} {notifica.contratto.cliente.cognome}
        </p>
        <p className="text-xs text-gray-600">
          {format(new Date(notifica.createdAt), 'dd/MM/yyyy HH:mm')}
        </p>
      </div>
      <span className={`badge ${statusColors[notifica.status]}`}>
        {statusLabels[notifica.status]}
      </span>
    </div>
  )
}