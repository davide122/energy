"use client"
import {
  Home,
  Users,
  Building2,
  FileText,
  Bell,
  Zap,
  Shield,
  AlertTriangle,
  User
} from 'lucide-react'
import ClientLayout from './ClientLayout'
import Link from 'next/link'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Clienti', href: '/clienti', icon: Users },
  { name: 'Fornitori', href: '/fornitori', icon: Building2 },
  { name: 'Contratti', href: '/contratti', icon: FileText },
  { name: 'Notifiche', href: '/notifiche', icon: Bell },
]

const adminNavigation = [
  { name: 'Alert Contratti', href: '/admin/contratti-alert', icon: AlertTriangle },
  { name: 'Disinstalla Service Worker', href: '/unregister-service-worker.html', icon: Shield },
]

// Server Component - Layout principale
export default function Layout({ children }) {
  return (
    <ClientLayout 
      navigation={navigation} 
      adminNavigation={adminNavigation}
    >
      {children}
    </ClientLayout>
  )
}

// Rimosso SidebarContent duplicato che causava errori di hydration