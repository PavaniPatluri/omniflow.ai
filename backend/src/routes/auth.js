const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

// Helper Token generator — uses env-validated JWT_SECRET, no fallback
const generateToken = (user, role, businessId) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: role, businessId: businessId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }  // Reduced from 7d for better security
  );
};

// Use shared middleware for token verification
const { verifyToken } = require('../middleware/auth');

// GET /me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teamMemberships: { include: { business: true } } }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const membership = user.teamMemberships[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership?.role || 'SUPPORT_AGENT',
        businessName: membership?.business?.name || 'My Business'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign-Up Endpoint
router.post('/signup', async (req, res) => {
  const { email, password, name, businessName } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User account already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const businessId = `bus-${Date.now()}`;
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        businessesOwned: {
          create: {
            id: businessId,
            name: businessName || 'My New Business'
          }
        }
      }
    });

    await prisma.teamMember.create({
      data: {
        userId: newUser.id,
        businessId: businessId,
        role: 'ADMIN'
      }
    });

    const token = generateToken(newUser, 'ADMIN', businessId);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: 'ADMIN',
        businessName: businessName || 'My New Business',
        businessId: businessId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login Endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { teamMemberships: { include: { business: true } } }
    });

    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const membership = user.teamMemberships[0];
      const role = membership?.role || 'SUPPORT_AGENT';
      const businessId = membership?.business?.id || null;
      const token = generateToken(user, role, businessId);
      
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: role,
          businessName: membership?.business?.name || 'My Business',
          businessId: businessId
        }
      });
    }

    res.status(401).json({ error: 'Invalid authentication credentials' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password Endpoint
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Simulate password reset logic
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    // We would normally send an email here.
    console.log(`[AUTH] Simulated password reset email sent to ${email}`);
  }

  res.json({
    message: `Password reset instructions dispatched to: ${email}. Please check your spam box if not received in 5 minutes.`
  });
});

// Invite Team Member
router.post('/invite', (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: 'Invitation email and access role are required' });
  }

  res.json({
    message: `Invite sent to ${email} for access scope ${role}`,
    inviteCode: `inv-${Math.random().toString(36).substring(5).toUpperCase()}`
  });
});

module.exports = router;
