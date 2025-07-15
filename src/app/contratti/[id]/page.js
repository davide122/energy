'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import SendNotificationForm from './SendNotificationForm'
import AINotificationForm from './AINotificationForm'
import AIOffersCard from './AIOffersCard'
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Bell,
  History,
  Zap,
  Flame,
  Phone,
  Mail,
  MapPin,
  Sparkles
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { safeFormatDate } from '@/utils/date'

export default function ContrattoDettaglio() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const contrattoId = params.id
  
  const [contratto, setContratto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [sessionStatus])

  useEffect(() => {
    if (session && contrattoId) {
      fetchContratto()
    }
  }, [session, contrattoId])

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
      setContratto(data)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/contratti/${contrattoId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore nell\'eliminazione del contratto')
      }
      
      router.push('/contratti')
    } catch (error) {
      setError(error.message)
    }
  }

  const getContractStatus = () => {
    if (!contratto) return null
    
    const today = new Date()
    let expiryDate, penaltyFreeDate, recommendedDate;
    try {
      expiryDate = contratto.expiryDate ? new Date(contratto.expiryDate) : null;
      penaltyFreeDate = contratto.penaltyFreeDate ? new Date(contratto.penaltyFreeDate) : null;
      recommendedDate = contratto.recommendedDate ? new Date(contratto.recommendedDate) : null;
      
      // Verifica che le date siano valide
      if (expiryDate && isNaN(expiryDate.getTime())) expiryDate = null;
      if (penaltyFreeDate && isNaN(penaltyFreeDate.getTime())) penaltyFreeDate = null;
      if (recommendedDate && isNaN(recommendedDate.getTime())) recommendedDate = null;
    } catch (error) {
      console.error('Errore nella conversione delle date:', error);
      return { status: 'errore', color: 'badge-danger', icon: AlertTriangle, message: 'Errore date contratto' };
    }
    
    if (!expiryDate) return { status: 'errore', color: 'badge-danger', icon: AlertTriangle, message: 'Data scadenza non valida' };
    
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
    
    if (daysLeft <= 0) return { status: 'scaduto', color: 'badge-danger', icon: AlertTriangle, message: 'Contratto scaduto' }
    if (daysLeft <= 30) return { status: 'in-scadenza', color: 'badge-warning', icon: AlertTriangle, message: `Scade tra ${daysLeft} giorni` }
    if (recommendedDate && today >= recommendedDate) return { status: 'cambio-consigliato', color: 'badge-info', icon: Clock, message: 'Cambio consigliato' }
    if (penaltyFreeDate && today >= penaltyFreeDate) return { status: 'penalty-free', color: 'badge-info', icon: CheckCircle, message: 'Penalty free attivo' }
    return { status: 'attivo', color: 'badge-success', icon: CheckCircle, message: 'Contratto attivo' }
  }

  const getTipoIcon = (tipo) => {
    // Normalizza il tipo in minuscolo per il confronto
    const tipoLower = tipo ? tipo.toLowerCase() : ''
    return tipoLower === 'luce' ? Zap : Flame
  }

  const getTipoColor = (tipo) => {
    // Normalizza il tipo in minuscolo per il confronto
    const tipoLower = tipo ? tipo.toLowerCase() : ''
    return tipoLower === 'luce' ? 'text-yellow-600' : 'text-blue-600'
  }

  const getNotificationStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'badge-success'
      case 'pending': return 'badge-warning'
      case 'failed': return 'badge-danger'
      default: return 'badge-secondary'
    }
  }

  const getNotificationTypeLabel = (tipo) => {
    switch (tipo) {
      case 'penaltyFree': return 'Penalty Free'
      case 'recommended': return 'Cambio Consigliato'
      case 'expiry': return 'Scadenza'
      default: return tipo
    }
  }

  if (sessionStatus === 'loading' || loading) {
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
            <Link href="/contratti" className="btn-primary">
              Torna ai Contratti
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (!contratto) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Contratto non trovato</p>
          <Link href="/contratti" className="btn-primary mt-4">
            Torna ai Contratti
          </Link>
        </div>
      </Layout>
    )
  }

  const status = getContractStatus()
  const StatusIcon = status?.icon
  const TipoIcon = getTipoIcon(contratto.fornitore.tipo)
  const daysToExpiry = differenceInDays(new Date(contratto.expiryDate), new Date())
  const daysToPenaltyFree = differenceInDays(new Date(contratto.penaltyFreeDate), new Date())
  const daysToRecommended = differenceInDays(new Date(contratto.recommendedDate), new Date())

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/contratti" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center space-x-3">
              <TipoIcon className={`h-8 w-8 ${getTipoColor(contratto.fornitore.tipo)}`} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Contratto #{contratto.id}
                </h1>
                <p className="text-gray-600">
                  {contratto.cliente.nome} {contratto.cliente.cognome} - {contratto.fornitore.ragioneSociale}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/contratti/${contrattoId}/modifica`}
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

        {/* Stato del contratto */}
        {status && (
          <div className={`p-4 rounded-lg border-l-4 ${
            status.status === 'scaduto' ? 'bg-red-50 border-red-400' :
            status.status === 'in-scadenza' ? 'bg-orange-50 border-orange-400' :
            status.status === 'cambio-consigliato' ? 'bg-blue-50 border-blue-400' :
            status.status === 'penalty-free' ? 'bg-green-50 border-green-400' :
            'bg-green-50 border-green-400'
          }`}>
            <div className="flex items-center space-x-3">
              <StatusIcon className={`h-6 w-6 ${
                status.status === 'scaduto' ? 'text-red-600' :
                status.status === 'in-scadenza' ? 'text-orange-600' :
                status.status === 'cambio-consigliato' ? 'text-blue-600' :
                'text-green-600'
              }`} />
              <div>
                <p className={`font-semibold ${
                  status.status === 'scaduto' ? 'text-red-800' :
                  status.status === 'in-scadenza' ? 'text-orange-800' :
                  status.status === 'cambio-consigliato' ? 'text-blue-800' :
                  'text-green-800'
                }`}>
                  {status.message}
                </p>
                <p className={`text-sm ${
                  status.status === 'scaduto' ? 'text-red-600' :
                  status.status === 'in-scadenza' ? 'text-orange-600' :
                  status.status === 'cambio-consigliato' ? 'text-blue-600' :
                  'text-green-600'
                }`}>
                  {daysToExpiry > 0 ? `${daysToExpiry} giorni alla scadenza` : 'Contratto scaduto'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informazioni principali */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dettagli contratto */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Dettagli Contratto
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Data inizio:</span>
                <span className="font-medium">
                  {safeFormatDate(contratto.startDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Data scadenza:</span>
                <span className="font-medium">
                  {safeFormatDate(contratto.expiryDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Durata:</span>
                <span className="font-medium">{contratto.durataMesi} mesi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Penalty free dopo:</span>
                <span className="font-medium">{contratto.penaltyFreeAfterMesi} mesi</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Penalty free dal:</span>
                  <span className="font-medium">
                    {safeFormatDate(contratto.penaltyFreeDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600">Cambio consigliato dal:</span>
                  <span className="font-medium">
                    {safeFormatDate(contratto.recommendedDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Informazioni cliente */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Cliente
            </h3>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-lg">
                  {contratto.cliente.nome} {contratto.cliente.cognome}
                </p>
              </div>
              {contratto.cliente.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a 
                    href={`mailto:${contratto.cliente.email}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {contratto.cliente.email}
                  </a>
                </div>
              )}
              {contratto.cliente.telefono && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a 
                    href={`tel:${contratto.cliente.telefono}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {contratto.cliente.telefono}
                  </a>
                </div>
              )}
              {contratto.cliente.indirizzo && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-700">{contratto.cliente.indirizzo}</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200">
                <Link
                  href={`/clienti/${contratto.cliente.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Visualizza profilo cliente →
                </Link>
              </div>
            </div>
          </div>

          {/* Informazioni fornitore */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Fornitore
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <TipoIcon className={`h-5 w-5 ${getTipoColor(contratto.fornitore.tipo)}`} />
                <p className="font-medium text-lg">{contratto.fornitore.ragioneSociale}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  contratto.fornitore.tipo && contratto.fornitore.tipo.toUpperCase() === 'LUCE' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {contratto.fornitore.tipo && contratto.fornitore.tipo.toUpperCase() === 'LUCE' ? 'Energia Elettrica' : 'Gas'}
                </span>
              </div>
              {contratto.fornitore.note && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> {contratto.fornitore.note}
                  </p>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200">
                <Link
                  href={`/fornitori/${contratto.fornitore.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Visualizza profilo fornitore →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline e statistiche */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${
                daysToPenaltyFree <= 0 ? 'bg-green-500' : 'bg-gray-400'
              }`}>
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Penalty Free</p>
                <p className="text-lg font-bold text-gray-900">
                  {daysToPenaltyFree <= 0 ? 'Attivo' : `${daysToPenaltyFree} giorni`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${
                daysToRecommended <= 0 ? 'bg-blue-500' : 'bg-gray-400'
              }`}>
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cambio Consigliato</p>
                <p className="text-lg font-bold text-gray-900">
                  {daysToRecommended <= 0 ? 'Attivo' : `${daysToRecommended} giorni`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${
                daysToExpiry <= 30 ? 'bg-red-500' : daysToExpiry <= 90 ? 'bg-orange-500' : 'bg-green-500'
              }`}>
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scadenza</p>
                <p className="text-lg font-bold text-gray-900">
                  {daysToExpiry <= 0 ? 'Scaduto' : `${daysToExpiry} giorni`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Notifiche</p>
                <p className="text-lg font-bold text-gray-900">
                  {contratto.notifiche?.length || 0}
                </p>
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
                Panoramica
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
                Notifiche ({contratto.notifiche?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('sendNotification')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sendNotification'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Mail className="h-4 w-4 inline mr-2" />
                Invia Notifica
              </button>
              <button
                onClick={() => setActiveTab('aiNotification')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'aiNotification'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Sparkles className="h-4 w-4 inline mr-2" />
                Notifica AI
              </button>
              <button
                onClick={() => setActiveTab('aiOffers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'aiOffers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Sparkles className="h-4 w-4 inline mr-2" />
                Offerte AI
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <History className="h-4 w-4 inline mr-2" />
                Storico
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo Contratto</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Periodo contrattuale</p>
                        <p className="font-medium">
                          {contratto.startDate && !isNaN(new Date(contratto.startDate).getTime()) 
                            ? safeFormatDate(contratto.startDate)
                            : 'Data non valida'} - 
                          {contratto.expiryDate && !isNaN(new Date(contratto.expiryDate).getTime()) 
                            ? safeFormatDate(contratto.expiryDate)
                            : 'Data non valida'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Durata totale</p>
                        <p className="font-medium">{contratto.durataMesi || 0} mesi</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Giorni trascorsi</p>
                        <p className="font-medium">
                          {contratto.startDate && !isNaN(new Date(contratto.startDate).getTime())
                            ? Math.max(0, differenceInDays(new Date(), new Date(contratto.startDate)))
                            : 0} giorni
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Giorni rimanenti</p>
                        <p className="font-medium">
                          {Math.max(0, daysToExpiry || 0)} giorni
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {contratto.cliente.note && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-2">Note Cliente</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-gray-700">{contratto.cliente.note}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifiche</h3>
                
                {contratto.notifiche && contratto.notifiche.length > 0 ? (
                  <div className="space-y-4">
                    {contratto.notifiche.map((notifica) => (
                      <div key={notifica.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Bell className="h-5 w-5 text-gray-400" />
                            <span className="font-medium">
                              {getNotificationTypeLabel(notifica.tipo)}
                            </span>
                            <span className={`badge ${getNotificationStatusColor(notifica.status)}`}>
                              {notifica.status}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {safeFormatDate(notifica.scheduledDate)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>Canale: {notifica.channel}</p>
                          {notifica.sentAt && (
                            <p>Inviata il: {safeFormatDate(notifica.sentAt, 'dd/MM/yyyy HH:mm')}</p>
                          )}
                          {notifica.error && (
                            <p className="text-red-600 mt-1">Errore: {notifica.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nessuna notifica presente</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Storico Modifiche</h3>
                
                {contratto.storicoContratti && contratto.storicoContratti.length > 0 ? (
                  <div className="space-y-4">
                    {contratto.storicoContratti.map((storico) => (
                      <div key={storico.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Modifica contratto</span>
                          <span className="text-sm text-gray-500">
                            {safeFormatDate(storico.createdAt, 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>Fornitore: {storico.fornitore?.ragioneSociale}</p>
                          <p>Periodo: {safeFormatDate(storico.startDate)} - {safeFormatDate(storico.endDate)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nessuno storico disponibile</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'sendNotification' && (
              <SendNotificationForm contratto={contratto} onNotificationSent={fetchContratto} />
            )}
            
            {activeTab === 'aiNotification' && (
              <AINotificationForm contratto={contratto} onNotificationSent={fetchContratto} />
            )}
            
            {activeTab === 'aiOffers' && (
              <AIOffersCard clienteId={contratto.clienteId} contratti={[contratto]} />
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
              Sei sicuro di voler eliminare questo contratto?
              <br />
              <span className="text-red-600 text-sm mt-2 block">
                Questa azione non può essere annullata e rimuoverà anche tutte le notifiche associate.
              </span>
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