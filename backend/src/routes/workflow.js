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

// ── GET /api/workflow/workflows ──────────────────────────────────────────────
router.get('/workflows', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const workflows = await prisma.workflow.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Parse JSON fields
    const formatted = workflows.map(w => ({
      ...w,
      nodes: w.nodes ? JSON.parse(w.nodes) : [],
      edges: w.edges ? JSON.parse(w.edges) : []
    }));

    res.json({ workflows: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// ── POST /api/workflow/workflows ─────────────────────────────────────────────
router.post('/workflows', verifyToken, async (req, res) => {
  try {
    const { name, triggerType } = req.body;
    if (!name) return res.status(400).json({ error: 'Workflow name is required' });

    const workspaceId = await getWorkspace(req);

    // Create default nodes based on trigger
    const initialNodes = [
      { id: 'trigger-1', type: 'trigger', data: { label: `Trigger: ${triggerType}` }, position: { x: 250, y: 50 } },
      { id: 'action-1', type: 'action', data: { label: 'Send AI Reply' }, position: { x: 250, y: 150 } }
    ];
    const initialEdges = [
      { id: 'e1-2', source: 'trigger-1', target: 'action-1' }
    ];

    const wf = await prisma.workflow.create({
      data: {
        workspaceId,
        name,
        isActive: true,
        nodes: JSON.stringify(initialNodes),
        edges: JSON.stringify(initialEdges)
      }
    });

    res.status(201).json({
      ...wf,
      nodes: initialNodes,
      edges: initialEdges
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// ── PUT /api/workflow/workflows/:id ──────────────────────────────────────────
router.put('/workflows/:id', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const { name, isActive, nodes, edges } = req.body;
    
    const existing = await prisma.workflow.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });

    const data = {};
    if (name !== undefined) data.name = name;
    if (isActive !== undefined) data.isActive = isActive;
    if (nodes !== undefined) data.nodes = JSON.stringify(nodes);
    if (edges !== undefined) data.edges = JSON.stringify(edges);

    const wf = await prisma.workflow.update({
      where: { id: req.params.id },
      data
    });

    res.json({
      ...wf,
      nodes: wf.nodes ? JSON.parse(wf.nodes) : [],
      edges: wf.edges ? JSON.parse(wf.edges) : []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// ── DELETE /api/workflow/workflows/:id ───────────────────────────────────────
router.delete('/workflows/:id', verifyToken, async (req, res) => {
  try {
    const workspaceId = await getWorkspace(req);
    const existing = await prisma.workflow.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });

    await prisma.workflow.delete({ where: { id: req.params.id } });
    res.json({ message: 'Workflow deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

module.exports = router;
