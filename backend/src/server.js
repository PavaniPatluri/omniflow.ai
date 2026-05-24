const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

// ── STEP 1: Validate env vars before anything else ───────────────────────────
const { validateEnv } = require('./lib/validateEnv');
validateEnv();

// ── STEP 2: Shared Prisma Singleton ──────────────────────────────────────────
const prisma = require('./lib/prisma');

const authRoutes    = require('./routes/auth');
const aiRoutes      = require('./routes/ai');
const voiceRoutes   = require('./routes/voice');
const crmRoutes     = require('./routes/crm');
const workflowRoutes = require('./routes/workflow');
const stripeRoutes  = require('./routes/stripe');
const inboxRoutes   = require('./routes/inbox');
const webhookRoutes = require('./routes/webhooks');

const app    = express();
const server = http.createServer(app);

// ── CORS — locked to allowed origins in production ───────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin '${origin}' is not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Structured Logging ────────────────────────────────────────────────────────
const pino = require('pino')();
const pinoHttp = require('pino-http')({ logger: pino });
app.use(pinoHttp);

// ── Static files (widget.js) ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in 1 minute.' }
});
app.use('/api/', generalLimiter);

// ── Auth brute-force limiter — FIXED path to match actual routes ─────────────
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Locked for 1 minute.' }
});
app.use('/api/auth/', authLimiter);  // Fixed: was /api/v1/auth/

// ── API Route Handlers ────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/voice',    voiceRoutes);
app.use('/api/crm',      crmRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/stripe',   stripeRoutes);
app.use('/api/inbox',    inboxRoutes);
app.use('/api/webhooks', webhookRoutes);

// ── Health Check — includes DB liveness ─────────────────────────────────────
app.get('/health', async (req, res) => {
  let dbStatus = 'healthy';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = 'unhealthy';
  }

  const status = dbStatus === 'healthy' ? 200 : 503;
  res.status(status).json({
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    service: 'OmniFlow AI API Core',
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'development'
  });
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Real-time Chat socket listeners
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  socket.on('join_workspace', (workspaceId) => {
    socket.join(workspaceId);
    console.log(`[WS] Socket ${socket.id} joined workspace: ${workspaceId}`);
  });

  socket.on('agent_send_message', (payload) => {
    const { conversationId, content, workspaceId, channel } = payload;
    const messageResponse = {
      id: Math.random().toString(36).substring(7),
      conversationId,
      senderType: 'AGENT',
      senderName: 'Support Agent',
      content,
      timestamp: new Date().toISOString()
    };
    io.to(workspaceId).emit('new_message', { conversationId, message: messageResponse });

    // Simulated AI auto-reply
    if (process.env.NODE_ENV !== 'production') {
      setTimeout(() => {
        const aiResponse = {
          id: Math.random().toString(36).substring(7),
          conversationId,
          senderType: 'AI',
          senderName: 'OmniFlow AI Agent',
          content: `Processing your query through the "${channel}" channel. How can I assist further?`,
          timestamp: new Date().toISOString()
        };
        io.to(workspaceId).emit('new_message', { conversationId, message: aiResponse });
      }, 2000);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });

  // ── Widget Events ─────────────────────────────────────────────────────────

  socket.on('widget_init_lead', async (data, callback) => {
    try {
      const { name, email, workspaceId } = data;
      if (!name || !email || !workspaceId) return;

      let lead = await prisma.lead.findFirst({ where: { email, workspaceId } });
      if (!lead) {
        lead = await prisma.lead.create({
          data: { name, email, source: 'WEB_CHAT', status: 'NEW', workspaceId }
        });
      }

      const conv = await prisma.conversation.create({
        data: { workspaceId, leadId: lead.id, channel: 'WEB_CHAT', status: 'OPEN', priority: false }
      });

      socket.join(conv.id);
      if (callback) callback({ conversationId: conv.id });
    } catch (err) {
      console.error('[Widget] init_lead error:', err.message);
    }
  });

  socket.on('widget_reconnect', async (data) => {
    const { conversationId } = data;
    if (conversationId) socket.join(conversationId);
  });

  socket.on('widget_send_message', async (data) => {
    try {
      const { conversationId, content, senderName } = data;
      if (!conversationId || !content) return;

      const msg = await prisma.message.create({
        data: { conversationId, content, senderType: 'USER', senderName }
      });

      const conv = await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
        include: { lead: true }
      });

      io.to(conv.workspaceId).emit('incoming_channel_message', {
        id: conv.id, channel: conv.channel, status: conv.status, priority: conv.priority,
        sentiment: conv.sentiment, urgency: conv.urgency,
        leadName: conv.lead?.name, content: msg.content, timestamp: msg.timestamp
      });

      io.to(conv.workspaceId).emit('new_message', { conversationId, message: msg });

      // AI auto-reply
      setTimeout(async () => {
        try {
          const aiReply = 'Thank you for reaching out! A member of our team will be with you shortly.';
          const aiMsg = await prisma.message.create({
            data: { conversationId, content: aiReply, senderType: 'AI', senderName: 'OmniFlow AI' }
          });
          io.to(conversationId).emit('widget_receive_message', aiMsg);
          io.to(conv.workspaceId).emit('new_message', { conversationId, message: aiMsg });
        } catch (e) {
          console.error('[Widget] AI reply error:', e.message);
        }
      }, 1500);
    } catch (err) {
      console.error('[Widget] send_message error:', err.message);
    }
  });
});

// ── Simulated traffic — ONLY in development ───────────────────────────────────
let trafficInterval;
if (process.env.NODE_ENV === 'development') {
  trafficInterval = setInterval(() => {
    const channels = ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'WEB_CHAT', 'EMAIL'];
    const names = ['Alice Johnson', 'Bob Miller', 'Carlos Garcia', 'Emma Watson', 'Dave Grohl'];
    const messages = [
      'Hey! What are your pricing plans for small e-commerce shops?',
      'Do you support custom CRM synchronization with HubSpot?',
      'My booking system failed this morning. Can you escalate?',
      'Can I schedule a voice demo call tomorrow?',
      'Is it possible to embed the widget in a Shopify store?'
    ];
    io.to('demo-workspace').emit('incoming_channel_message', {
      id: `conv-${Math.floor(Math.random() * 10000)}`,
      channel: channels[Math.floor(Math.random() * channels.length)],
      status: 'OPEN',
      priority: Math.random() > 0.7,
      sentiment: ['Positive', 'Neutral', 'Negative'][Math.floor(Math.random() * 3)],
      urgency: Math.random() > 0.7 ? 'High' : 'Medium',
      leadName: names[Math.floor(Math.random() * names.length)],
      content: messages[Math.floor(Math.random() * messages.length)],
      timestamp: new Date().toISOString()
    });
  }, 15000);
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    pino.info(`OmniFlow AI Server listening on port ${PORT}`);
    pino.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = { app, server, trafficInterval, pino };
