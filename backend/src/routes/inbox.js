const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { verifyToken } = require('../middleware/auth');

// ── GET /api/inbox/conversations ─────────────────────────────────────────────
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const { status, channel, search } = req.query;
    
    // Dynamically fetch workspace based on authenticated user's business
    let workspace = await prisma.workspace.findFirst({ where: { businessId: req.user.businessId } });
    if (!workspace) {
      workspace = await prisma.workspace.create({ data: { name: 'Default', businessId: req.user.businessId } });
    }
    
    const where = { workspaceId: workspace.id };
    
    if (status && status !== 'ALL') where.status = status;
    if (channel && channel !== 'ALL') where.channel = channel;
    
    if (search) {
      where.OR = [
        { lead: { name: { contains: search } } },
        { content: { contains: search } }
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: { lead: true },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = conversations.map(c => ({
      id: c.id,
      channel: c.channel,
      status: c.status,
      priority: c.priority,
      sentiment: c.sentiment,
      urgency: c.urgency,
      leadName: c.lead?.name || 'Unknown',
      content: c.content || 'No messages',
      timestamp: c.updatedAt
    }));

    res.json({ conversations: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ── GET /api/inbox/conversations/:id/messages ──────────────────────────────
router.get('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        messages: { orderBy: { timestamp: 'asc' } }
      }
    });

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    res.json({
      id: conversation.id,
      channel: conversation.channel,
      status: conversation.status,
      priority: conversation.priority,
      sentiment: conversation.sentiment,
      urgency: conversation.urgency,
      leadName: conversation.lead?.name,
      messages: conversation.messages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ── PUT /api/inbox/conversations/:id ─────────────────────────────────────────
router.put('/conversations/:id', verifyToken, async (req, res) => {
  try {
    const { status, priority, assigneeId } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;

    const conv = await prisma.conversation.update({
      where: { id: req.params.id },
      data,
      include: { lead: true }
    });

    res.json({ message: 'Conversation updated', conversation: conv });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// ── POST /api/inbox/conversations/:id/messages ──────────────────────────────
router.post('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const { content, senderName } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const msg = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        content,
        senderType: 'AGENT',
        senderName: senderName || req.user.name || 'Agent'
      }
    });

    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({ message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
