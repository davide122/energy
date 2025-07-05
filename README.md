# CRM Gestione Energie

Un sistema CRM completo per la gestione di clienti, fornitori e contratti energetici con notifiche automatiche per scadenze e periodi penalty-free.

## 🚀 Caratteristiche Principali

- **Gestione Clienti**: Anagrafica completa con storico contratti
- **Gestione Fornitori**: Catalogazione fornitori di energia elettrica e gas
- **Gestione Contratti**: Monitoraggio completo con calcolo automatico delle date importanti
- **Sistema di Notifiche**: Avvisi automatici per scadenze, penalty-free e cambi raccomandati
- **Dashboard Analitica**: Statistiche e grafici per il monitoraggio del business
- **Autenticazione Sicura**: Sistema di login con NextAuth.js
- **Design Responsivo**: Interfaccia moderna e mobile-friendly

## 🛠️ Tecnologie Utilizzate

- **Frontend**: Next.js 15, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL con Prisma ORM
- **Autenticazione**: NextAuth.js
- **UI Components**: Lucide React Icons
- **Grafici**: Recharts
- **Styling**: Tailwind CSS con componenti personalizzati

## 📋 Prerequisiti

- Node.js 18+ 
- PostgreSQL 12+
- npm o yarn

## 🔧 Installazione

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd crm-gestione-energie
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   
   Crea un file `.env.local` nella root del progetto:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/crm_energie"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # Optional: Email notifications
   SENDGRID_API_KEY="your-sendgrid-api-key"
   
   # Optional: SMS notifications
   TWILIO_ACCOUNT_SID="your-twilio-sid"
   TWILIO_AUTH_TOKEN="your-twilio-token"
   TWILIO_PHONE_NUMBER="your-twilio-phone"
   ```

4. **Configura il database**
   ```bash
   # Genera il client Prisma
   npm run db:generate
   
   # Esegui le migrazioni
   npm run db:push
   
   # Popola il database con dati di esempio
   npm run db:seed
   ```

5. **Avvia l'applicazione**
   ```bash
   npm run dev
   ```

   L'applicazione sarà disponibile su `http://localhost:3000`

## 👤 Accesso Iniziale

Dopo aver eseguito il seed del database, puoi accedere con:
- **Email**: `admin@crm-energie.it`
- **Password**: `admin123`

## 📁 Struttura del Progetto

```
src/
├── app/                    # App Router di Next.js
│   ├── api/               # API Routes
│   │   ├── auth/          # Autenticazione NextAuth
│   │   ├── clienti/       # API per clienti
│   │   ├── contratti/     # API per contratti
│   │   ├── fornitori/     # API per fornitori
│   │   ├── notifiche/     # API per notifiche
│   │   └── dashboard/     # API per dashboard
│   ├── auth/              # Pagine di autenticazione
│   ├── clienti/           # Pagine gestione clienti
│   ├── contratti/         # Pagine gestione contratti
│   ├── fornitori/         # Pagine gestione fornitori
│   ├── notifiche/         # Pagine notifiche
│   └── dashboard/         # Dashboard principale
├── components/            # Componenti React riutilizzabili
│   ├── Layout.js         # Layout principale con sidebar
│   └── Providers.js      # Provider per sessioni
└── lib/                   # Utilities e configurazioni
    ├── auth.js           # Configurazione NextAuth
    ├── prisma.js         # Client Prisma
    └── notifications.js  # Sistema notifiche
```

## 🔄 Funzionalità del Sistema

### Gestione Contratti
- **Calcolo Automatico Date**: Il sistema calcola automaticamente:
  - Data Penalty Free (data fine - periodo gratis)
  - Data Cambio Raccomandato (data fine - 30 giorni)
  - Stato del contratto (Attivo, In Scadenza, Scaduto)

### Sistema di Notifiche
- **Notifiche Automatiche**: Il sistema genera notifiche per:
  - Contratti che entrano nel periodo penalty-free
  - Contratti per cui è raccomandato il cambio
  - Contratti in scadenza
  - Eventi informativi

### Dashboard Analitica
- **Statistiche in Tempo Reale**:
  - Numero totale clienti, fornitori, contratti
  - Contratti attivi e in scadenza
  - Scadenze odierne
  - Grafici andamento contratti
  - Top fornitori per numero contratti

## 🔧 Comandi Utili

```bash
# Sviluppo
npm run dev              # Avvia in modalità sviluppo
npm run build            # Build per produzione
npm run start            # Avvia in produzione

# Database
npm run db:generate      # Genera client Prisma
npm run db:push          # Sincronizza schema con DB
npm run db:migrate       # Crea nuova migrazione
npm run db:studio        # Apri Prisma Studio
npm run db:seed          # Popola DB con dati esempio

# Linting
npm run lint             # Esegui ESLint
```

## 🚀 Deploy in Produzione

### Vercel (Raccomandato)
1. Connetti il repository a Vercel
2. Configura le variabili d'ambiente
3. Deploy automatico ad ogni push

### Docker
```bash
# Build dell'immagine
docker build -t crm-energie .

# Avvia il container
docker run -p 3000:3000 crm-energie
```

## 🔐 Sicurezza

- **Autenticazione**: Sistema sicuro con NextAuth.js
- **Password Hashing**: Bcrypt per l'hashing delle password
- **Validazione Input**: Validazione lato server per tutti gli input
- **CORS**: Configurazione CORS appropriata
- **Environment Variables**: Gestione sicura delle chiavi API

## 📊 Monitoraggio

- **Logging**: Sistema di logging per errori e attività
- **Performance**: Ottimizzazioni per caricamento veloce
- **SEO**: Meta tag e struttura ottimizzata

## 🤝 Contribuire

1. Fork del progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 📞 Supporto

Per supporto o domande:
- Apri un issue su GitHub
- Contatta il team di sviluppo

---

**Sviluppato con ❤️ per la gestione efficiente dei contratti energetici**
