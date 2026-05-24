const express = require('express');
const router = express.Router();

// Mock Call Logs Database
const callLogs = [
  {
    id: 'call-1',
    externalCallId: 'CA88172c72b2a647d34d3d81999bfcd1a',
    callerNumber: '+1 (555) 902-8812',
    receiverNumber: '+1 (800) 555-0199',
    durationSec: 142,
    recordingUrl: 'https://actions.google.com/sounds/v1/ambient/morning_birds.ogg', // Sample playable audio
    transcript: 'Customer: Hello, I want to reschedule my appointment from Tuesday to Thursday.\nAgent: Sure, I can help with that. What time works best?\nCustomer: 3 PM works fine.\nAgent: Done. Your calendar invites have been updated.',
    summary: 'Caller rescheduled appointment from Tuesday to Thursday at 3 PM. Google Calendar successfully synced.',
    intentDetected: 'APPOINTMENT_RESCHEDULE',
    agentName: 'OmniVoice AI Rescheduler',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'call-2',
    externalCallId: 'CA33282f12e8a649d21c2c30009bfef2b',
    callerNumber: '+1 (415) 309-9182',
    receiverNumber: '+1 (800) 555-0199',
    durationSec: 88,
    recordingUrl: 'https://actions.google.com/sounds/v1/ambient/morning_birds.ogg',
    transcript: 'Customer: Hi, I ordered a shipping package. Where is it?\nAgent: Can you provide your order ID?\nCustomer: It is OR-9812.\nAgent: It is currently out for delivery in your area and should arrive by 5 PM.',
    summary: 'Caller inquired about shipment tracking for OR-9812. Replied that package is out for delivery today.',
    intentDetected: 'ORDER_TRACKING',
    agentName: 'OmniVoice AI Agent',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString()
  }
];

// Inbound Twilio Call Webhook Entry point
router.post('/twilio/inbound', (req, res) => {
  const { CallSid, From } = req.body;
  
  // Respond with TwiML XML to hook into ElevenLabs Stream Voice
  res.type('text/xml');
  res.send(`
    <Response>
      <Say voice="alice">Welcome to OmniFlow automated support. Please hold while we initialize our voice agent.</Say>
      <Connect>
        <Stream url="wss://${req.headers.host}/api/v1/voice/stream">
          <Parameter name="callSid" value="${CallSid || 'test-sid'}" />
          <Parameter name="caller" value="${From || 'unknown'}" />
        </Stream>
      </Connect>
    </Response>
  `);
});

// Outbound Call triggers
router.post('/outbound', (req, res) => {
  const { phoneNumber, prompt } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Target phone number is required' });
  }

  const simulatedCallId = 'CA' + Math.random().toString(36).substring(2, 17);
  const newCall = {
    id: `call-${Date.now()}`,
    externalCallId: simulatedCallId,
    callerNumber: '+1 (800) 555-0199',
    receiverNumber: phoneNumber,
    durationSec: 0,
    recordingUrl: null,
    transcript: 'Calling out...',
    summary: 'Outbound AI call initiated to client.',
    intentDetected: 'OUTBOUND_LEAD_NURTURE',
    agentName: 'OmniVoice AI Sales Outbound',
    timestamp: new Date().toISOString()
  };

  callLogs.unshift(newCall);

  // Simulate call completion after 10 seconds
  setTimeout(() => {
    const callObj = callLogs.find(c => c.id === newCall.id);
    if (callObj) {
      callObj.durationSec = 62;
      callObj.recordingUrl = 'https://actions.google.com/sounds/v1/ambient/morning_birds.ogg';
      callObj.transcript = 'Agent: Hi! I am calling from Apex Logistics about the query you sent on WhatsApp.\nCustomer: Oh yes, I wanted to schedule the product demo.\nAgent: Perfect, I have scheduled that for tomorrow at 10 AM. Talk to you then!';
      callObj.summary = 'Outbound call successful. Scheduled product demo tomorrow at 10 AM.';
      callObj.intentDetected = 'DEMO_BOOKING';
    }
  }, 10000);

  res.status(202).json({
    message: 'Outbound voice call initialized.',
    callSid: simulatedCallId,
    details: newCall
  });
});

// Fetch Call Logs
router.get('/logs', (req, res) => {
  res.json({ logs: callLogs });
});

module.exports = router;
