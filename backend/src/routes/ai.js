const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { verifyToken } = require('../middleware/auth');

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Basic safety check: reject executables
    if (file.mimetype === 'application/x-msdownload' || file.originalname.match(/\.(exe|sh|bat)$/i)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

// Helper function to chunk text
const chunkText = (text, maxLength = 500) => {
  const chunks = [];
  let currentChunk = '';
  const sentences = text.split(/(?<=[.?!])\s+/);

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLength) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
};

// Document Upload & Chunking Simulator
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { url } = req.body;

    if (!file && !url) {
      return res.status(400).json({ error: 'Either file upload or URL link must be specified' });
    }

    const workspaceId = req.user.businessId; // Fallback to business ID or use a specific workspace
    // Get the first workspace for the business for simplicity
    let workspace = await prisma.workspace.findFirst({ where: { businessId: req.user.businessId } });
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: 'Default Workspace', businessId: req.user.businessId }
      });
    }

    let textContent = '';
    if (file) {
      // Very basic text extraction for MVP. In reality, use pdf-parse or similar
      try {
        textContent = fs.readFileSync(file.path, 'utf8');
      } catch (err) {
        textContent = "Failed to extract text from binary file.";
      }
      // cleanup uploaded file
      fs.unlinkSync(file.path);
    } else if (url) {
      textContent = `Content fetched from ${url}: This is simulated fetched content for the URL.`;
    }

    // Chunk the content
    const textChunks = chunkText(textContent);
    
    // Save to database
    const document = await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        fileName: file ? file.originalname : url,
        fileType: file ? file.mimetype.split('/')[1].toUpperCase() : 'URL',
        fileSize: file ? file.size : null,
        textContent: textContent.substring(0, 500) + '...', // Cache preview
        status: 'INDEXED',
        chunkCount: textChunks.length,
        chunks: {
          create: textChunks.map(chunk => ({
            content: chunk,
            tokenCount: chunk.split(/\s+/).length
          }))
        }
      },
      include: { chunks: true }
    });

    res.status(201).json({
      message: 'File processed and chunked for Vector DB embeddings mapping.',
      document: {
        id: document.id,
        fileName: document.fileName,
        chunkCount: document.chunkCount
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simulated RAG Test Endpoint
router.post('/rag/test', verifyToken, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const startTime = process.hrtime.bigint();

    // Simulating Vector Search using SQLite LIKE operator on chunks
    // We split the query into words to find loose matches
    const keywords = query.split(/\s+/).filter(w => w.length > 3);
    
    let retrievedChunks = [];
    if (keywords.length > 0) {
      const orConditions = keywords.map(kw => ({
        content: { contains: kw }
      }));
      
      retrievedChunks = await prisma.documentChunk.findMany({
        where: { OR: orConditions },
        take: 3,
        include: { document: true }
      });
    } else {
      retrievedChunks = await prisma.documentChunk.findMany({ take: 1, include: { document: true } });
    }

    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1000000;

    let contextRetrieved = retrievedChunks.map(c => c.content).join('\n---\n');
    if (!contextRetrieved) {
      contextRetrieved = "No relevant context found.";
    }

    const answer = `Based on your Knowledge Base, I found ${retrievedChunks.length} relevant chunks in ${latencyMs.toFixed(2)}ms. Query: "${query}". Context: ${contextRetrieved.substring(0, 100)}...`;

    res.json({
      answer,
      ragMetadata: {
        latencyMs: latencyMs.toFixed(2),
        chunksRetrieved: retrievedChunks.length,
        contextRetrieved,
        sources: retrievedChunks.map(c => c.document.fileName)
      }
    });

  } catch (error) {
    console.error('RAG Test Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch documents list
router.get('/documents', verifyToken, async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete document from vector database
router.delete('/documents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.document.delete({ where: { id } });
    res.json({ message: 'Document and associated vector chunks purged successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Maintain the old simulated query for legacy support
router.post('/query', (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query prompt text is required' });

  res.json({
    answer: `Legacy mock response for: ${query}`,
    sentiment: 'Neutral',
    urgency: 'Medium'
  });
});

module.exports = router;
