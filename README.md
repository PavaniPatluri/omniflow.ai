# OmniFlow AI — Multi-Channel SMB Auto Reply & Business Automation System

OmniFlow AI is a production-grade SaaS platform enabling SMBs to automate customer support, lead generation, appointments scheduling, and multi-channel marketing campaigns across WhatsApp, Instagram, Facebook Messenger, email, SMS, and Twilio-powered conversational voice calls.

---

## ⚡ Architecture Blueprint

OmniFlow AI utilizes a decoupled full-stack architecture:
```
               ┌───────────────────────────────────────┐
               │         Vite + React Client           │
               │   (Unified Inbox, CRM, Analytics, KB)  │
               └───────────────────┬───────────────────┘
                                   │
                           HTTP / WebSockets
                                   │
                                   ▼
               ┌───────────────────────────────────────┐
               │       Express Node.js Server          │
               │   (AI RAG Router, Telephony Connect)  │
               └───────┬───────────┬───────────┬───────┘
                       │           │           │
                       ▼           ▼           ▼
                 ┌──────────┐ ┌──────────┐ ┌───────────┐
                 │PostgreSQL│ │  Redis   │ │ ChromaDB  │
                 │ (Prisma) │ │ (Queues) │ │ (Vectors) │
                 └──────────┘ └──────────┘ └───────────┘
```

- **Frontend Client**: SPA React interface running Tailwind CSS, Lucide UI indicators, and Recharts graphical metrics.
- **Backend Service**: REST API and WebSockets server managing live data syncing, LLM integrations, and Twilio voice streams.
- **Data Layers**: PostgreSQL relational schema mapping user tables, Redis caching for queue handling, and ChromaDB vector indexes for RAG documents search.

---

## 📁 Repository Structure

```
omniflow-ai/
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # CI/CD lint & test actions
├── backend/
│   ├── prisma/
│   │   └── schema.prisma     # PostgreSQL ER schema
│   ├── src/
│   │   ├── routes/           # REST API Route Handlers
│   │   │   ├── ai.js         # RAG vectors and embeddings
│   │   │   ├── auth.js       # Authentication logins
│   │   │   ├── crm.js        # Sales pipelines
│   │   │   ├── stripe.js     # Subscription billing
│   │   │   ├── voice.js      # Twilio voice agent hooks
│   │   │   └── workflow.js   # Automation flow diagrams
│   │   └── server.js         # Express & Socket.io server entry
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Master dashboard SPA component
│   │   ├── index.css         # Styling system base & scrollbars
│   │   └── main.jsx          # DOM rendering initiator
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── Dockerfile
├── .env.example              # Configuration environment values
└── docker-compose.yml        # Multi-container local deployment
```

---

## 🚀 Local Quickstart Deployment

### 1. Set Up Environment Properties
Duplicate the configuration template file and enter your API keys (Twilio, ElevenLabs, Gemini, etc.):
```bash
cp .env.example .env
```

### 2. Multi-Container Launch (Docker Compose)
To compile and coordinate the database, cache, vector store, backend API, and frontend client concurrently:
```bash
docker-compose up --build -d
```
- **React Portal**: Access at `http://localhost:3000`
- **Express Server**: Access at `http://localhost:5000`
- **PostgreSQL Database**: Port `5432`
- **Redis Cache**: Port `6379`
- **ChromaDB**: Port `8000`

---

## 🛣️ Core API Routes Reference

### Authentication Routing (`/api/v1/auth`)
* `POST /signup`: Creates standard admin workspaces.
* `POST /login`: Authenticates credentials; returns signed tokens.
* `POST /forgot-password`: Triggers password reset sequence.
* `POST /invite`: Invites supporting agents to business accounts.

### RAG Automation Router (`/api/v1/ai`)
* `POST /query`: Submits queries to RAG logic, fetching vector facts.
* `POST /upload`: Embeds documents (PDFs, URLs) inside vector databases.
* `GET /documents`: Returns lists of training reference files.

### Twilio Conversational Voice (`/api/v1/voice`)
* `POST /twilio/inbound`: Responds with TwiML XML to socket stream call.
* `POST /outbound`: Initializes Twilio trunk outbound dialing.
* `GET /logs`: Fetches voice transcript databases.

### Pipeline CRM Manager (`/api/v1/crm`)
* `GET /leads`: Returns lead records.
* `PUT /leads/:id/status`: Advances lead pipelines (e.g. Qualified → Converted).
* `POST /leads`: Saves manually generated leads.
