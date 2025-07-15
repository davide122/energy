import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '../components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'CRM Gestione Energie',
  description: 'Sistema di gestione contratti luce e gas',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
