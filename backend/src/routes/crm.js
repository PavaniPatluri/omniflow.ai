const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { verifyToken } = require('../middleware/auth');

// Helper to get workspace dynamically
const getWorkspace = async (req) => {
  let workspace = await prisma.workspace.findFirst({ where: { businessId: req.user.businessId } });
  if (!workspace) {
    workspace = await prisma.workspace.create({ data: { name: 'Default', businessId: req.user.businessId } });
  }
  return workspace.id;
};

// ── GET /api/crm/leads ──────────────────────────────────────────────────────
router.get('/leads', verifyToken, async (req, res) => {
  try {
    const { search, status, source, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 50, 100); // cap at 100
    const workspaceId = await getWorkspace(req);
    
    const where = { workspaceId };
    if (status)  where.status = status;
    if (source)  where.source = source;
    if (search)  where.OR = [
      { name:  { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { tags:  { contains: search } }
    ];

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          conversations: {
            select: { id: true, channel: true, status: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 1
          },
          appointments: {
            select: { id: true, title: true, startTime: true, status: true },
            orderBy: { startTime: 'asc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip:  (parseInt(page) - 1) * parseInt(safeLimit),
        take:  parseInt(safeLimit)
      }),
      prisma.lead.count({ where })
    ]);

    const formatted = leads.map(l => ({
      ...l,
      tags: l.tags ? l.tags.split(',').filter(Boolean) : [],
      customFields: l.customFields ? JSON.parse(l.customFields) : {},
      lastInteraction: l.conversations[0]?.updatedAt || l.createdAt,
      lastChannel:     l.conversations[0]?.channel   || l.source
    }));

    res.json({ leads: formatted, total, page: parseInt(page), limit: parseInt(safeLimit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// ── GET /api/crm/leads/:id ──────────────────────────────────────────────────
router.get('/leads/:id', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, workspaceId },
      include: {
        conversations: {
          include: { messages: { orderBy: { timestamp: 'asc' } } },
          orderBy: { updatedAt: 'desc' }
        },
        appointments: { orderBy: { startTime: 'asc' } }
      }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({
      ...lead,
      tags:         lead.tags ? lead.tags.split(',').filter(Boolean) : [],
      customFields: lead.customFields ? JSON.parse(lead.customFields) : {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// ── POST /api/crm/leads ─────────────────────────────────────────────────────
router.post('/leads', verifyToken, async (req, res) => {
  try {
    const { name, email, phone, source, status, tags, notes, assigneeId } = req.body;
    if (!name || !source) return res.status(400).json({ error: 'Name and source are required' });

    const workspaceId = await getWorkspace(req);
    const customFields = {};
    if (notes) customFields.notes = notes;

    const lead = await prisma.lead.create({
      data: {
        workspaceId,
        name, email, phone, source,
        status:       status || 'NEW',
        tags:         Array.isArray(tags) ? tags.join(',') : (tags || ''),
        customFields: JSON.stringify(customFields)
      }
    });
    res.status(201).json({
      ...lead,
      tags: lead.tags ? lead.tags.split(',').filter(Boolean) : [],
      customFields: JSON.parse(lead.customFields || '{}')
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// ── PUT /api/crm/leads/:id ──────────────────────────────────────────────────
router.put('/leads/:id', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const { name, email, phone, status, tags, notes, assigneeId, source } = req.body;
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const existingCustom = existing.customFields ? JSON.parse(existing.customFields) : {};
    if (notes !== undefined) existingCustom.notes = notes;

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        ...(name   !== undefined && { name }),
        ...(email  !== undefined && { email }),
        ...(phone  !== undefined && { phone }),
        ...(source !== undefined && { source }),
        ...(status !== undefined && { status }),
        ...(tags   !== undefined && { tags: Array.isArray(tags) ? tags.join(',') : tags }),
        customFields: JSON.stringify(existingCustom)
      }
    });
    res.json({
      ...lead,
      tags: lead.tags ? lead.tags.split(',').filter(Boolean) : [],
      customFields: JSON.parse(lead.customFields || '{}')
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// ── PUT /api/crm/leads/:id/status ──────────────────────────────────────────
router.put('/leads/:id/status', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const { status } = req.body;
    const valid = ['NEW', 'QUALIFIED', 'INTERESTED', 'CONVERTED', 'CLOSED'];
    if (!valid.includes(status)) return res.status(400).json({ error: `Invalid status. Must be: ${valid.join(', ')}` });

    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data:  { status }
    });
    res.json({ message: 'Status updated', lead: { ...lead, tags: lead.tags?.split(',').filter(Boolean) || [] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

// ── DELETE /api/crm/leads/:id ───────────────────────────────────────────────
router.delete('/leads/:id', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// ── POST /api/crm/leads/:id/notes ──────────────────────────────────────────
router.post('/leads/:id/notes', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const { note } = req.body;
    if (!note) return res.status(400).json({ error: 'Note text required' });

    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const custom = lead.customFields ? JSON.parse(lead.customFields) : {};
    const notes  = custom.notes_history || [];
    notes.push({ text: note, createdAt: new Date().toISOString() });
    custom.notes_history = notes;
    custom.notes = note; // latest

    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data:  { customFields: JSON.stringify(custom) }
    });
    res.json({ message: 'Note added', notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// ── GET /api/crm/analytics ──────────────────────────────────────────────────
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const leads = await prisma.lead.findMany({ where: { workspaceId } });

    const byStatus = leads.reduce((a, l) => { a[l.status] = (a[l.status] || 0) + 1; return a; }, {});
    const bySource = leads.reduce((a, l) => { a[l.source] = (a[l.source] || 0) + 1; return a; }, {});

    const conversations = await prisma.conversation.count({ where: { workspaceId } });
    const appointments  = await prisma.appointment.count({ where: { workspaceId, status: 'SCHEDULED' } });

    res.json({
      totalLeads:        leads.length,
      conversions:       byStatus.CONVERTED || 0,
      conversionRate:    leads.length ? Math.round(((byStatus.CONVERTED || 0) / leads.length) * 100) : 0,
      activeConversations: conversations,
      upcomingAppointments: appointments,
      byStatus,
      bySource
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ── GET /api/crm/appointments ──────────────────────────────────────────────
router.get('/appointments', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const appointments = await prisma.appointment.findMany({
      where: { workspaceId },
      include: { lead: true, assignee: true },
      orderBy: { startTime: 'asc' }
    });
    res.json({ appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// ── POST /api/crm/appointments ─────────────────────────────────────────────
router.post('/appointments', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const { leadId, assigneeId, title, description, startTime, endTime, calendarType } = req.body;
    if (!leadId || !title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        workspaceId,
        leadId,
        assigneeId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        calendarType: calendarType || 'INTERNAL'
      },
      include: { lead: true, assignee: true }
    });

    res.status(201).json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// ── PUT /api/crm/appointments/:id ──────────────────────────────────────────
router.put('/appointments/:id', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const { status, title, description, startTime, endTime } = req.body;
    
    const existing = await prisma.appointment.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    const data = {};
    if (status !== undefined) data.status = status;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (startTime !== undefined) data.startTime = new Date(startTime);
    if (endTime !== undefined) data.endTime = new Date(endTime);

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
      include: { lead: true, assignee: true }
    });
    res.json({ appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// ── DELETE /api/crm/appointments/:id ───────────────────────────────────────
router.delete('/appointments/:id', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const existing = await prisma.appointment.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;
