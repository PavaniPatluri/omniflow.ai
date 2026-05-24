const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Clearing existing data...');
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Creating users...');

  const adminHash    = await bcrypt.hash('admin123', 10);
  const managerHash  = await bcrypt.hash('manager123', 10);
  const agentHash    = await bcrypt.hash('agent123', 10);

  const businessId  = 'bus-apex-logistics';
  const workspaceId = 'ws-apex-main';

  // Admin
  const admin = await prisma.user.create({
    data: {
      id: 'user-admin',
      email: 'admin@omniflow.ai',
      name: 'Sarah Connor',
      passwordHash: adminHash,
      businessesOwned: {
        create: {
          id: businessId,
          name: 'Apex Logistics',
          workspaces: {
            create: { id: workspaceId, name: 'Main Workspace' }
          },
          subscription: {
            create: {
              planName: 'PRO',
              status: 'ACTIVE',
              billingCycle: 'MONTHLY',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
              usageLimitChats: 5000,
              usageUsedChats: 342,
              usageLimitVoice: 120,
              usageUsedVoice: 28
            }
          }
        }
      }
    }
  });

  // Manager
  const manager = await prisma.user.create({
    data: { id: 'user-manager', email: 'manager@omniflow.ai', name: 'John Doe', passwordHash: managerHash }
  });

  // Agent
  const agent = await prisma.user.create({
    data: { id: 'user-agent', email: 'agent@omniflow.ai', name: 'Agent Smith', passwordHash: agentHash }
  });

  // Team Members
  const adminMember = await prisma.teamMember.create({
    data: { id: 'tm-admin', userId: admin.id, businessId, role: 'ADMIN' }
  });
  const managerMember = await prisma.teamMember.create({
    data: { id: 'tm-manager', userId: manager.id, businessId, role: 'MANAGER' }
  });
  const agentMember = await prisma.teamMember.create({
    data: { id: 'tm-agent', userId: agent.id, businessId, role: 'SUPPORT_AGENT' }
  });

  console.log('🏢 Created: 1 Business, 1 Workspace, 3 Users');

  // API Key
  await prisma.apiKey.create({
    data: {
      businessId,
      name: 'Production Widget Key',
      tokenHash: 'omf_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
    }
  });

  console.log('📋 Creating leads...');

  const leads = await Promise.all([
    prisma.lead.create({ data: { id: 'lead-1', workspaceId, name: 'Alice Johnson',    email: 'alice@codetech.io',         phone: '+1 (555) 902-8812', source: 'WHATSAPP',   status: 'NEW',       tags: 'Ecommerce,High Priority' } }),
    prisma.lead.create({ data: { id: 'lead-2', workspaceId, name: 'Carlos Garcia',    email: 'carlos@garciasupply.com',   phone: '+1 (415) 309-9182', source: 'WEB_CHAT',   status: 'INTERESTED', tags: 'Enterprise,Warm Lead' } }),
    prisma.lead.create({ data: { id: 'lead-3', workspaceId, name: 'Emma Watson',      email: 'emma@spellbound.co.uk',     phone: '+44 7911 123456',   source: 'INSTAGRAM',  status: 'QUALIFIED',  tags: 'Creator,Agency' } }),
    prisma.lead.create({ data: { id: 'lead-4', workspaceId, name: 'David Beckham',    email: 'david@legendbrands.com',    phone: '+1 (800) 555-0199', source: 'VOICE_CALL', status: 'CONVERTED',  tags: 'VIP,Signed' } }),
    prisma.lead.create({ data: { id: 'lead-5', workspaceId, name: 'Priya Sharma',     email: 'priya@innovatetech.in',     phone: '+91 98765 43210',   source: 'EMAIL',      status: 'NEW',        tags: 'SaaS,Trial' } }),
    prisma.lead.create({ data: { id: 'lead-6', workspaceId, name: 'Marcus Thompson',  email: 'marcus@buildwright.co',     phone: '+1 (312) 555-7890', source: 'FACEBOOK',   status: 'INTERESTED', tags: 'Construction,Mid-Market' } }),
  ]);

  console.log(`✅ Created ${leads.length} leads`);
  console.log('💬 Creating conversations and messages...');

  // Conversation 1 — WhatsApp, OPEN, assigned to agent
  const conv1 = await prisma.conversation.create({
    data: {
      id: 'conv-1', workspaceId, leadId: 'lead-1',
      channel: 'WHATSAPP', status: 'OPEN', priority: true,
      assigneeId: agentMember.id, sentiment: 'Positive', urgency: 'High',
      externalId: 'wa_msg_001'
    }
  });
  await prisma.message.createMany({ data: [
    { conversationId: conv1.id, senderType: 'USER',  senderName: 'Alice Johnson',      content: 'Hi! I need pricing details for bulk shipping. We do about 500 orders/month.' },
    { conversationId: conv1.id, senderType: 'AI',    senderName: 'OmniFlow AI',         content: 'Hi Alice! Great to hear from you. Based on your volume of ~500 orders/month, I can offer you our Enterprise Bulk tier at $1,200/month which includes priority pickup slots. Would you like a detailed quote sent to your email?' },
    { conversationId: conv1.id, senderType: 'USER',  senderName: 'Alice Johnson',       content: 'Yes please! Also do you support same-day delivery in California?' },
    { conversationId: conv1.id, senderType: 'AGENT', senderName: 'Agent Smith',         content: 'Absolutely Alice! We cover all major CA cities for same-day. I\'m sending you the full rate card right now via email.' },
  ]});

  // Conversation 2 — Web Chat, PENDING
  const conv2 = await prisma.conversation.create({
    data: {
      id: 'conv-2', workspaceId, leadId: 'lead-2',
      channel: 'WEB_CHAT', status: 'PENDING', priority: false,
      assigneeId: agentMember.id, sentiment: 'Neutral', urgency: 'Medium'
    }
  });
  await prisma.message.createMany({ data: [
    { conversationId: conv2.id, senderType: 'USER', senderName: 'Carlos Garcia',  content: 'Does your platform integrate with HubSpot CRM?' },
    { conversationId: conv2.id, senderType: 'AI',   senderName: 'OmniFlow AI',    content: 'Yes! OmniFlow integrates natively with HubSpot via OAuth2. Leads are synced automatically upon status changes. Would you like me to walk you through the setup?' },
    { conversationId: conv2.id, senderType: 'USER', senderName: 'Carlos Garcia',  content: 'How long does the setup take?' },
  ]});

  // Conversation 3 — Instagram, ESCALATED
  const conv3 = await prisma.conversation.create({
    data: {
      id: 'conv-3', workspaceId, leadId: 'lead-3',
      channel: 'INSTAGRAM', status: 'ESCALATED', priority: true,
      assigneeId: managerMember.id, sentiment: 'Negative', urgency: 'High',
      externalId: 'ig_dm_8821'
    }
  });
  await prisma.message.createMany({ data: [
    { conversationId: conv3.id, senderType: 'USER',  senderName: 'Emma Watson',    content: 'My booking confirmation never arrived and my event is tomorrow!' },
    { conversationId: conv3.id, senderType: 'AI',    senderName: 'OmniFlow AI',    content: 'I sincerely apologize, Emma. I can see your booking ID #BK-2291 in our system. The confirmation email seems to have been filtered as spam. Let me resend it immediately and also have a manager contact you.' },
    { conversationId: conv3.id, senderType: 'AGENT', senderName: 'John Doe',       content: 'Hi Emma, this is John — the team manager. I\'ve personally resent your confirmation to emma@spellbound.co.uk. Your slot for tomorrow at 3PM is 100% confirmed. I\'m very sorry for the inconvenience.' },
  ]});

  // Conversation 4 — Email, CLOSED
  const conv4 = await prisma.conversation.create({
    data: {
      id: 'conv-4', workspaceId, leadId: 'lead-5',
      channel: 'EMAIL', status: 'CLOSED', priority: false,
      sentiment: 'Positive', urgency: 'Low'
    }
  });
  await prisma.message.createMany({ data: [
    { conversationId: conv4.id, senderType: 'USER',  senderName: 'Priya Sharma',   content: 'Can I get a 14-day free trial extension? We are still evaluating the platform.' },
    { conversationId: conv4.id, senderType: 'AI',    senderName: 'OmniFlow AI',    content: 'Hi Priya! Absolutely — I\'ve applied a 14-day extension to your trial. Your new trial end date is June 7th. Is there anything specific you\'d like help with during the evaluation?' },
    { conversationId: conv4.id, senderType: 'USER',  senderName: 'Priya Sharma',   content: 'Thank you so much! This is really helpful.' },
  ]});

  // Conversation 5 — Facebook, OPEN, unassigned (chatbot widget demo)
  const conv5 = await prisma.conversation.create({
    data: {
      id: 'conv-5', workspaceId, leadId: 'lead-6',
      channel: 'FACEBOOK', status: 'OPEN', priority: false,
      sentiment: 'Neutral', urgency: 'Medium'
    }
  });
  await prisma.message.createMany({ data: [
    { conversationId: conv5.id, senderType: 'USER', senderName: 'Marcus Thompson', content: 'Hello, what construction project management integrations do you support?' },
  ]});

  console.log('✅ Created 5 conversations with messages');
  console.log('📅 Creating appointments...');

  await prisma.appointment.createMany({ data: [
    {
      workspaceId, leadId: 'lead-2', assigneeId: agentMember.id,
      title: 'HubSpot Integration Demo Call',
      description: 'Walk Carlos through the HubSpot OAuth setup and CRM sync workflow.',
      startTime: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 10 * 3600 * 1000), // 2 days from now, 10AM
      endTime:   new Date(Date.now() + 2 * 24 * 3600 * 1000 + 11 * 3600 * 1000),
      status: 'SCHEDULED', calendarType: 'INTERNAL'
    },
    {
      workspaceId, leadId: 'lead-3', assigneeId: managerMember.id,
      title: 'Agency Partnership Discussion',
      description: 'Explore white-label agency partnership terms with Emma.',
      startTime: new Date(Date.now() + 5 * 24 * 3600 * 1000 + 14 * 3600 * 1000),
      endTime:   new Date(Date.now() + 5 * 24 * 3600 * 1000 + 15 * 3600 * 1000),
      status: 'SCHEDULED', calendarType: 'INTERNAL'
    },
    {
      workspaceId, leadId: 'lead-4',
      title: 'Onboarding Session — David Beckham',
      description: 'Onboarding call for the signed VIP client.',
      startTime: new Date(Date.now() - 3 * 24 * 3600 * 1000 + 9 * 3600 * 1000),
      endTime:   new Date(Date.now() - 3 * 24 * 3600 * 1000 + 10 * 3600 * 1000),
      status: 'COMPLETED', calendarType: 'INTERNAL'
    },
  ]});

  console.log('✅ Created 3 appointments');
  console.log('📞 Creating call logs...');

  await prisma.callLog.createMany({ data: [
    {
      workspaceId, externalCallId: 'CA_twilio_001',
      callerNumber: '+1 (800) 555-0199', receiverNumber: '+1 (888) OMNI-AI',
      durationSec: 247, agentName: 'OmniVoice Agent',
      transcript: 'Caller: Hi, I want to discuss the enterprise plan.\nAgent: Welcome to Apex Logistics! I can help you with enterprise pricing...',
      summary: 'Client enquired about enterprise pricing. Expressed interest in the PRO plan. Follow-up scheduled.',
      intentDetected: 'PRICING_ENQUIRY',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000)
    },
    {
      workspaceId, externalCallId: 'CA_twilio_002',
      callerNumber: '+44 7911 123456', receiverNumber: '+1 (888) OMNI-AI',
      durationSec: 183, agentName: 'OmniVoice Agent',
      transcript: 'Caller: My shipment tracking is not updating.\nAgent: I can look into that for you...',
      summary: 'Customer reported shipment tracking issue. Ticket raised. Resolution ETA 24 hours.',
      intentDetected: 'SUPPORT_ISSUE',
      timestamp: new Date(Date.now() - 5 * 3600 * 1000)
    },
    {
      workspaceId, externalCallId: 'CA_twilio_003',
      callerNumber: '+91 98765 43210', receiverNumber: '+1 (888) OMNI-AI',
      durationSec: 312, agentName: 'OmniVoice Agent',
      transcript: 'Caller: Can you schedule a platform demo for next week?\nAgent: Absolutely! Let me check available slots...',
      summary: 'Demo scheduled for next Tuesday at 2PM IST. Confirmation sent to priya@innovatetech.in.',
      intentDetected: 'DEMO_REQUEST',
      timestamp: new Date(Date.now() - 24 * 3600 * 1000)
    },
  ]});

  console.log('✅ Created 3 call logs');
  console.log('📄 Creating knowledge base documents...');

  await prisma.document.createMany({ data: [
    {
      workspaceId, fileName: 'FAQ_Shipping_And_Returns.pdf', fileType: 'PDF',
      fileSize: 450200, status: 'INDEXED', chunkCount: 24,
      textContent: `SHIPPING FAQ\n\nQ: What are your pricing tiers?\nA: Free plan (up to 50 orders), Starter $29/mo (up to 500 orders), Pro $79/mo (unlimited). Enterprise custom pricing available.\n\nQ: Do you offer same-day delivery?\nA: Yes, same-day delivery available in California, New York, Texas, and Florida for orders placed before 12PM local time.\n\nQ: What is your refund policy?\nA: 30-day money-back guarantee. Refunds processed within 3-5 business days.\n\nQ: Do you integrate with HubSpot?\nA: Yes, native HubSpot and Salesforce integration via OAuth2. Leads sync automatically on status changes.\n\nQ: What channels do you support?\nA: WhatsApp, Instagram, Facebook, LinkedIn, Email, SMS, Web Chat, and Voice Calls.`
    },
    {
      workspaceId, fileName: 'https://apexlogistics.com/support-guide', fileType: 'URL',
      fileSize: null, status: 'INDEXED', chunkCount: 12,
      textContent: `SUPPORT GUIDE\n\nGetting Started: Login at app.apexlogistics.com. Complete onboarding checklist in Settings.\n\nIntegrations: Navigate to Settings > Integrations. Click Connect next to HubSpot/Salesforce. Authorize via OAuth.\n\nWorkflow Builder: Go to Workflows tab. Click New Workflow. Choose trigger (e.g., New WhatsApp Message). Add actions (Send AI Reply, Create Lead, Notify Agent).\n\nKnowledge Base: Upload PDFs, paste URLs, or type text content. Documents are indexed for AI retrieval within 2-3 minutes.\n\nVoice Agent: Configure in Settings > Voice. Add your Twilio credentials. Assign a phone number.`
    },
    {
      workspaceId, fileName: 'Product_Features_2024.pdf', fileType: 'PDF',
      fileSize: 892000, status: 'INDEXED', chunkCount: 38,
      textContent: `PRODUCT FEATURES\n\nUnified Inbox: All channels in one place. Real-time socket updates. AI auto-replies.\n\nCRM Pipeline: Kanban lead management. Lead scoring. Custom fields. CSV export.\n\nWorkflow Automation: Visual drag-and-drop builder. 20+ trigger types. Webhook support.\n\nAI Voice Agents: 24/7 inbound call handling. Call recording. Transcript generation. Intent detection.\n\nAnalytics: Real-time dashboards. Channel performance. Lead conversion funnel. Export to PDF/CSV.\n\nSecurity: JWT authentication. Role-based access. API key management. Rate limiting.`
    },
  ]});

  console.log('✅ Created 3 knowledge base documents');

  console.log('\n🎉 Seed complete! Summary:');
  console.log('   Users:         admin, manager, agent');
  console.log('   Business:      Apex Logistics (PRO plan)');
  console.log('   Leads:         6 leads across all stages');
  console.log('   Conversations: 5 threads (WhatsApp, Web, Instagram, Email, Facebook)');
  console.log('   Appointments:  3 (2 upcoming, 1 completed)');
  console.log('   Call Logs:     3 Twilio call records');
  console.log('   KB Docs:       3 indexed documents');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
