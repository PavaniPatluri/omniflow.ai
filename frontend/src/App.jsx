import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, Inbox, Users, Activity, Sliders, Settings, Database, 
  Phone, Calendar, FileText, Send, UserPlus, Shield, Sparkles, LogOut, 
  Menu, X, Check, ArrowRight, Play, Square, Volume2, Plus, Trash2, 
  Filter, Search, Tag, AlertTriangle, AlertCircle, ArrowUpRight, BarChart2,
  TrendingUp, CreditCard, Key, Upload, Globe, Link, HelpCircle, ChevronRight, Download, Save,
  Eye, EyeOff, Instagram, Facebook, Linkedin, Mail, Smartphone, MessageCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomNode = ({ data }) => {
  return (
    <div className="bg-slate-900 border border-white/10 p-4 rounded-xl w-64 text-center shadow-lg relative glow-purple hover:border-brand-500/40 transition">
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-500" />
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full absolute -top-2.5 left-4 uppercase ${
        data.type === 'trigger' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
        data.type === 'condition' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
        'bg-brand-500/10 text-brand-400 border border-brand-500/20'
      }`}>
        {data.type}
      </span>
      <div className="text-xs font-bold text-white mt-1">{data.label}</div>
      <div className="text-[10px] text-slate-500 mt-1">{data.desc}</div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-brand-500" />
    </div>
  );
};

const nodeTypes = { customNode: CustomNode };

export default function App() {
  // Navigation & Core States
  const [currentView, setCurrentView] = useState('landing'); // landing, dashboard
  const [activeTab, setActiveTab] = useState('inbox'); // inbox, crm, workflow, voice, kb, analytics, settings
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState(null); // Auth State: null or { name, email, role, businessName }
  const [authMode, setAuthMode] = useState('login'); // login, signup, forgot
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', businessName: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check auth on load
  useEffect(() => {
    const token = localStorage.getItem('omniflow_token');
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setCurrentView('dashboard');

          // Fetch workflows on load
          fetch(`${API_BASE_URL}/api/workflow/workflows`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(wData => {
            if (wData.workflows && wData.workflows.length > 0) {
              setWorkflows(wData.workflows);
              setSelectedWorkflowId(wData.workflows[0].id);
            }
          })
          .catch(err => console.error('Failed fetching workflows', err));
        }
      })
      .catch(err => console.error('Auth check failed', err));
    }
  }, []);

  // 1. Unified Inbox Database & States
  const [conversations, setConversations] = useState([
    {
      id: 'conv-1',
      channel: 'WHATSAPP',
      status: 'OPEN',
      priority: true,
      sentiment: 'Neutral',
      urgency: 'Medium',
      leadName: 'Jane Cooper',
      content: 'Hey, I checked your product catalog but could not find the pricing for enterprise bulk shipping. Do you have a brochure?',
      timestamp: new Date(Date.now() - 60000 * 5).toISOString(),
      messages: [
        { id: 'm1', senderType: 'USER', senderName: 'Jane Cooper', content: 'Hello there!', timestamp: new Date(Date.now() - 60000 * 15).toISOString() },
        { id: 'm2', senderType: 'AI', senderName: 'OmniFlow AI', content: 'Hi Jane! How can I help you today?', timestamp: new Date(Date.now() - 60000 * 14).toISOString() },
        { id: 'm3', senderType: 'USER', senderName: 'Jane Cooper', content: 'I checked your product catalog but could not find the pricing for enterprise bulk shipping. Do you have a brochure?', timestamp: new Date(Date.now() - 60000 * 5).toISOString() }
      ]
    },
    {
      id: 'conv-2',
      channel: 'INSTAGRAM',
      status: 'PENDING',
      priority: false,
      sentiment: 'Positive',
      urgency: 'Low',
      leadName: 'Alex Mercer',
      content: 'Loving the features on your site! Do you offer a discount for yearly startups subscriptions?',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      messages: [
        { id: 'm4', senderType: 'USER', senderName: 'Alex Mercer', content: 'Loving the features on your site! Do you offer a discount for yearly startups subscriptions?', timestamp: new Date(Date.now() - 3600000).toISOString() }
      ]
    },
    {
      id: 'conv-3',
      channel: 'WEB_CHAT',
      status: 'ESCALATED',
      priority: true,
      sentiment: 'Negative',
      urgency: 'High',
      leadName: 'Marcus Aurelius',
      content: 'The custom webhook workflow failed to send data to our HubSpot contact board. Need developer support ASAP.',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
      messages: [
        { id: 'm5', senderType: 'USER', senderName: 'Marcus Aurelius', content: 'The custom webhook workflow failed to send data to our HubSpot contact board. Need developer support ASAP.', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() }
      ]
    },
    {
      id: 'conv-4',
      channel: 'EMAIL',
      status: 'CLOSED',
      priority: false,
      sentiment: 'Positive',
      urgency: 'Low',
      leadName: 'Elon Musk',
      content: 'Thanks for resolving the booking schedule. The calendar links sync correctly now.',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      messages: [
        { id: 'm6', senderType: 'USER', senderName: 'Elon Musk', content: 'Thanks for resolving the booking schedule. The calendar links sync correctly now.', timestamp: new Date(Date.now() - 3600000 * 24).toISOString() }
      ]
    }
  ]);
  const [selectedConvId, setSelectedConvId] = useState('conv-1');
  const [chatFilter, setChatFilter] = useState('ALL'); // ALL, WHATSAPP, INSTAGRAM, WEB_CHAT, EMAIL, SMS, VOICE_CALL
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, OPEN, PENDING, ESCALATED, CLOSED
  const [chatSearch, setChatSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [aiTakeover, setAiTakeover] = useState(true); // Is AI managing auto-replies or is it human agent?

  // 2. Lead CRM Pipeline & States
  const [leads, setLeads] = useState([
    { id: 'lead-1', name: 'Jane Cooper', email: 'jane@apexlogistics.com', phone: '+1 (555) 902-8812', source: 'WHATSAPP', status: 'NEW', tags: ['Enterprise', 'High Priority'], value: '$12,000' },
    { id: 'lead-2', name: 'Alex Mercer', email: 'alex@startupgrowth.co', phone: '+1 (415) 309-9182', source: 'INSTAGRAM', status: 'QUALIFIED', tags: ['Startup', 'Yearly Plan'], value: '$1,500' },
    { id: 'lead-3', name: 'Marcus Aurelius', email: 'marcus@romeholding.it', phone: '+39 06 123456', source: 'WEB_CHAT', status: 'INTERESTED', tags: ['Webhook User', 'Developer'], value: '$5,000' },
    { id: 'lead-4', name: 'Elon Musk', email: 'elon@spacex.com', phone: '+1 (800) 555-0199', source: 'EMAIL', status: 'CONVERTED', tags: ['VIP Client', 'Enterprise'], value: '$120,000' }
  ]);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', email: '', phone: '', source: 'WEB_CHAT', status: 'NEW', tags: '', value: '' });
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // 2.5 Appointments Booking Calendar State
  const [appointments, setAppointments] = useState([
    { id: 'apt-1', title: 'Platform Demo: Jane Cooper', date: new Date().toISOString().split('T')[0], startTime: '10:00 AM', status: 'CONFIRMED', syncGoogle: true },
    { id: 'apt-2', title: 'Onboarding: Alex Mercer', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], startTime: '02:00 PM', status: 'PENDING', syncGoogle: false }
  ]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], startTime: '09:00 AM', syncGoogle: true });

  // 3. Workflow Automation Builder Canvas States
  const [workflows, setWorkflows] = useState([
    {
      id: 'wf-1',
      name: 'WhatsApp Support Auto-Reply',
      isActive: true,
      triggerType: 'WHATSAPP_INBOUND',
      nodes: [
        { id: 'n-1', type: 'trigger', label: 'Inbound WhatsApp Message', desc: 'Fires when client texts WhatsApp Business' },
        { id: 'n-2', type: 'action', label: 'AI RAG FAQ Lookup', desc: 'Answers queries using training knowledge files' },
        { id: 'n-3', type: 'condition', label: 'Urgent Sentiment?', desc: 'Splits path on angry sentiment' },
        { id: 'n-4', type: 'action', label: 'Escalate to Agent', desc: 'Assigns chat status to Support Agent' },
        { id: 'n-5', type: 'action', label: 'Save Lead to CRM', desc: 'Creates new Lead profile' }
      ]
    },
    {
      id: 'wf-2',
      name: 'Call Booking SMS Reminder',
      isActive: false,
      triggerType: 'APPOINTMENT_BOOKED',
      nodes: [
        { id: 'n-6', type: 'trigger', label: 'Appointment Booked', desc: 'Fires when a slot is booked' },
        { id: 'n-7', type: 'action', label: 'Send SMS Confirmation', desc: 'Dispatches automated reminder SMS' }
      ]
    }
  ]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('wf-1');
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);
  const [newWorkflowData, setNewWorkflowData] = useState({ name: '', triggerType: 'WHATSAPP_INBOUND' });
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Sync ReactFlow nodes when selectedWorkflowId changes
    const wf = workflows.find(w => w.id === selectedWorkflowId);
    if (wf) {
      // Create react-flow compatible nodes if they don't exist yet
      const mappedNodes = wf.nodes.map((n, i) => ({
        id: n.id,
        type: 'customNode',
        position: n.position || { x: 250, y: i * 150 + 50 },
        data: { type: n.type, label: n.label, desc: n.desc }
      }));
      
      const mappedEdges = wf.edges || wf.nodes.slice(0, -1).map((n, i) => ({
        id: `e-${n.id}-${wf.nodes[i+1].id}`,
        source: n.id,
        target: wf.nodes[i+1].id,
        animated: true,
        style: { stroke: '#8b5cf6' }
      }));
      
      setRfNodes(mappedNodes);
      setRfEdges(mappedEdges);
    }
  }, [selectedWorkflowId, workflows, setRfNodes, setRfEdges]);

  const onConnect = useCallback((params) => {
    setRfEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#8b5cf6' } }, eds));
  }, [setRfEdges]);

  // Handle saving the workflow changes
  const handleSaveWorkflow = async () => {
    const wf = workflows.find(w => w.id === selectedWorkflowId);
    if (!wf) return;
    
    // Update local state first
    const updatedNodes = rfNodes.map(rn => ({
      id: rn.id,
      type: rn.type,
      data: rn.data,
      position: rn.position
    }));
    
    const updatedWf = { ...wf, nodes: updatedNodes, edges: rfEdges };
    
    setWorkflows(prev => prev.map(w => w.id === selectedWorkflowId ? updatedWf : w));
    
    // Attempt save to API
    try {
      const response = await fetch(`${API_BASE_URL}/api/workflow/workflows/${selectedWorkflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('omniflow_token')}`
        },
        body: JSON.stringify(updatedWf)
      });
      if (!response.ok) {
        console.warn('Backend not ready, fallback to mock state saving');
      }
    } catch (error) {
      console.warn('Network error saving workflow to backend, mock state saved');
    }
    alert('Workflow saved successfully!');
  };

  // 4. Voice Call Logs & Audio Player States
  const [callLogs, setCallLogs] = useState([
    {
      id: 'call-1',
      externalCallId: 'CA88172c72b2a647d34d3d81999bfcd1a',
      callerNumber: '+1 (555) 902-8812',
      durationSec: 142,
      recordingUrl: 'https://actions.google.com/sounds/v1/ambient/morning_birds.ogg',
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
      durationSec: 88,
      recordingUrl: 'https://actions.google.com/sounds/v1/ambient/morning_birds.ogg',
      transcript: 'Customer: Hi, I ordered a shipping package. Where is it?\nAgent: Can you provide your order ID?\nCustomer: It is OR-9812.\nAgent: It is currently out for delivery in your area and should arrive by 5 PM.',
      summary: 'Caller inquired about shipment tracking for OR-9812. Replied that package is out for delivery today.',
      intentDetected: 'ORDER_TRACKING',
      agentName: 'OmniVoice AI Agent',
      timestamp: new Date(Date.now() - 3600000 * 8).toISOString()
    }
  ]);
  const [selectedCallLog, setSelectedCallLog] = useState(callLogs[0]);
  const [isPlayingCall, setIsPlayingCall] = useState(false);
  const audioRef = useRef(null);

  // Sync audio playback
  useEffect(() => {
    if (audioRef.current) {
      if (isPlayingCall) {
        audioRef.current.play().catch(e => {
          console.error("Audio playback error:", e);
          setIsPlayingCall(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlayingCall]);

  // When changing log, stop playback
  useEffect(() => {
    setIsPlayingCall(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [selectedCallLog]);
  const [callSimulateForm, setCallSimulateForm] = useState({ phoneNumber: '', scriptText: 'Reschedule appointment' });
  const [callStatusMessage, setCallStatusMessage] = useState('');

  // 5. Knowledge Base Files States
  const [kbDocs, setKbDocs] = useState([
    { id: 'kb-1', fileName: 'FAQ_Shipping_And_Returns.pdf', fileType: 'PDF', fileSize: '450 KB', status: 'INDEXED', chunkCount: 24, createdAt: '2026-05-23T14:20:00Z' },
    { id: 'kb-2', fileName: 'https://apexlogistics.com/support-guide', fileType: 'URL', fileSize: 'N/A', status: 'INDEXED', chunkCount: 12, createdAt: '2026-05-22T09:15:00Z' }
  ]);
  const [kbUploadType, setKbUploadType] = useState('file'); // file, url, text
  const [kbUrlInput, setKbUrlInput] = useState('');
  const [kbTextInput, setKbTextInput] = useState('');
  const [kbUploadProgress, setKbUploadProgress] = useState(0);
  const [kbSelectedFile, setKbSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  // 6. Settings, Subscriptions & Keys States
  const [apiKeys, setApiKeys] = useState([
    { id: 'key-1', name: 'Web Chat Widget Key', token: 'sk_test_mock_key_001', createdAt: '2026-05-20' },
    { id: 'key-2', name: 'Meta Webhook Integrator', token: 'sk_test_mock_key_002', createdAt: '2026-05-21' }
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [subscription, setSubscription] = useState({
    planName: 'STARTER',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    limitChats: 5000,
    usedChats: 1248,
    limitVoice: 300,
    usedVoice: 82
  });
  const [teamMembers, setTeamMembers] = useState([
    { id: 't-1', name: 'Sarah Connor', email: 'admin@omniflow.ai', role: 'ADMIN', status: 'Active' },
    { id: 't-2', name: 'John Doe', email: 'john@omniflow.ai', role: 'MANAGER', status: 'Active' },
    { id: 't-3', name: 'Agent Smith', email: 'smith@omniflow.ai', role: 'SUPPORT_AGENT', status: 'Active' }
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('SUPPORT_AGENT');

  // Unified Dashboard Analytics Chart Data
  const hourlyTrafficData = [
    { name: '08:00', WhatsApp: 12, Instagram: 8, WebChat: 18, Email: 5 },
    { name: '10:00', WhatsApp: 24, Instagram: 19, WebChat: 32, Email: 12 },
    { name: '12:00', WhatsApp: 45, Instagram: 34, WebChat: 56, Email: 18 },
    { name: '14:00', WhatsApp: 38, Instagram: 28, WebChat: 48, Email: 22 },
    { name: '16:00', WhatsApp: 52, Instagram: 41, WebChat: 64, Email: 15 },
    { name: '18:00', WhatsApp: 30, Instagram: 22, WebChat: 38, Email: 8 },
    { name: '20:00', WhatsApp: 18, Instagram: 15, WebChat: 24, Email: 4 }
  ];

  const conversionPieData = [
    { name: 'New Leads', value: 340, color: '#3b82f6' },
    { name: 'Qualified', value: 210, color: '#eab308' },
    { name: 'Interested', value: 140, color: '#a855f7' },
    { name: 'Converted', value: 85, color: '#10b981' }
  ];

  // Auto scroll chat to bottom when conversation changes
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvId, conversations]);

  // Real-time chat traffic simulation hook
  useEffect(() => {
    const timer = setInterval(() => {
      const channels = ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'WEB_CHAT', 'EMAIL'];
      const randomChannel = channels[Math.floor(Math.random() * channels.length)];
      const customerNames = ['Bob Miller', 'Carlos Garcia', 'Emma Watson', 'Dave Grohl', 'Sarah Connor'];
      const randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
      
      const simulatedMessages = [
        "Hey! What are your pricing plans for small e-commerce shops?",
        "Do you support custom CRM synchronization with HubSpot?",
        "My automated booking system failed this morning. Can you escalate?",
        "Do you have a Spanish translation AI module active?",
        "Can I schedule a voice demo call tomorrow afternoon?",
        "Is it possible to embed the widget in a Shopify store?"
      ];
      const randomMessage = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)];

      const newConvId = `conv-${Date.now()}`;
      const newConv = {
        id: newConvId,
        channel: randomChannel,
        status: 'OPEN',
        priority: Math.random() > 0.7,
        sentiment: Math.random() > 0.6 ? 'Positive' : Math.random() > 0.4 ? 'Neutral' : 'Negative',
        urgency: Math.random() > 0.7 ? 'High' : 'Medium',
        leadName: randomName,
        content: randomMessage,
        timestamp: new Date().toISOString(),
        messages: [
          { id: `msg-${Date.now()}`, senderType: 'USER', senderName: randomName, content: randomMessage, timestamp: new Date().toISOString() }
        ]
      };

      setConversations(prev => [newConv, ...prev]);

      // Automatically add new lead if not exists
      setLeads(prev => {
        if (!prev.some(l => l.name === randomName)) {
          return [
            {
              id: `lead-${Date.now()}`,
              name: randomName,
              email: `${randomName.toLowerCase().replace(' ', '')}@example.com`,
              phone: '+1 (555) 000-1111',
              source: randomChannel,
              status: 'NEW',
              tags: ['Auto Generated'],
              value: '$1,000'
            },
            ...prev
          ];
        }
        return prev;
      });
    }, 45000); // simulated incoming message frequency (45s)

    return () => clearInterval(timer);
  }, []);

  // Real-time backend socket listener
  useEffect(() => {
    if (!user) return;
    const socket = io(API_BASE_URL, {
      withCredentials: true
    });
    
    // Attempt to join the workspace associated with the authenticated user
    const wsId = user.businessId || 'ws-apex-main';
    socket.emit('join_workspace', wsId);
    
    socket.on('new_message', (data) => {
      const { conversationId, message } = data;
      setConversations(prevConvs => prevConvs.map(c => {
        if (c.id === conversationId) {
          // Avoid duplicate messages if received twice
          if (c.messages.some(m => m.id === message.id)) return c;
          return {
            ...c,
            content: message.content,
            timestamp: message.timestamp || new Date().toISOString(),
            messages: [...c.messages, message]
          };
        }
        return c;
      }));
    });
    
    socket.on('incoming_channel_message', (newConv) => {
      setConversations(prev => {
        if (prev.some(c => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
      // Optionally create a lead if not exists
      setLeads(prev => {
        if (newConv.leadName && !prev.some(l => l.name === newConv.leadName)) {
          return [
            {
              id: `lead-${Date.now()}`,
              name: newConv.leadName,
              email: `contact@${newConv.leadName.toLowerCase().replace(/\s/g, '')}.com`,
              phone: 'N/A',
              source: newConv.channel,
              status: 'NEW',
              tags: ['Incoming', 'Socket Sync'],
              value: '$0'
            },
            ...prev
          ];
        }
        return prev;
      });
    });
    
    return () => socket.disconnect();
  }, [user]);

  // Handle Login Authentication
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    try {
      // 🚨 MOCK DEMO BYPASS: Let the user into the UI even if the backend is down
      if (authMode === 'login' && authForm.email === 'admin@omniflow.ai' && authForm.password === 'admin123') {
        setUser({ name: 'Sarah Connor', email: 'admin@omniflow.ai', role: 'ADMIN', businessName: 'Apex Logistics', id: 'admin-1' });
        setAuthSuccess('Demo login successful! Bypassing backend.');
        setTimeout(() => {
          setCurrentView('dashboard');
          setActiveTab('inbox');
        }, 1000);
        return;
      }

      if (authMode === 'login') {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password })
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('omniflow_token', data.token);
          setUser(data.user);
          setAuthSuccess(`Welcome back, ${data.user.name}!`);
          setTimeout(() => {
            setCurrentView('dashboard');
            setActiveTab('inbox');
          }, 1000);
        } else {
          setAuthError(data.error || 'Invalid credentials.');
        }
      } else if (authMode === 'signup') {
        const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password,
            name: authForm.name,
            businessName: authForm.businessName
          })
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('omniflow_token', data.token);
          setUser(data.user);
          setAuthSuccess('Account created successfully!');
          setTimeout(() => {
            setCurrentView('dashboard');
            setActiveTab('inbox');
          }, 1000);
        } else {
          setAuthError(data.error || 'Failed to create account.');
        }
      } else if (authMode === 'forgot') {
        const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email })
        });
        const data = await res.json();
        if (res.ok) {
          setAuthSuccess(data.message);
        } else {
          setAuthError(data.error || 'Failed to send reset link.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setAuthError(`Network Error: ${err.message}. Target: ${API_BASE_URL}`);
    }
  };

  // Add message to conversation
  const handleSendReply = () => {
    if (!replyText.trim()) return;

    const selectedConv = conversations.find(c => c.id === selectedConvId);
    if (!selectedConv) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      senderType: 'AGENT',
      senderName: user ? user.name : 'Support Agent',
      content: replyText,
      timestamp: new Date().toISOString()
    };

    const updatedConvs = conversations.map(c => {
      if (c.id === selectedConvId) {
        return {
          ...c,
          content: replyText,
          timestamp: new Date().toISOString(),
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    });

    setConversations(updatedConvs);
    setReplyText('');

    // Trigger AI Simulated reply if AI Takeover is active
    if (aiTakeover) {
      setTimeout(() => {
        const aiMsg = {
          id: `msg-ai-${Date.now()}`,
          senderType: 'AI',
          senderName: 'OmniFlow AI',
          content: `Automated reply confirmed! I'm monitoring this ticket under "${selectedConv.channel}" parameters. Context loaded from vectors.`,
          timestamp: new Date().toISOString()
        };
        setConversations(prevConvs => prevConvs.map(c => {
          if (c.id === selectedConvId) {
            return {
              ...c,
              content: aiMsg.content,
              timestamp: new Date().toISOString(),
              messages: [...c.messages, aiMsg]
            };
          }
          return c;
        }));
      }, 2000);
    }
  };

  // Trigger Outbound Call Simulation
  const handleSimulateCall = (e) => {
    e.preventDefault();
    if (!callSimulateForm.phoneNumber) return;
    
    setCallStatusMessage('Initiating Twilio Voice Trunk call connection...');
    setTimeout(() => {
      setCallStatusMessage('Establishing connection to Deepgram & ElevenLabs Streams...');
    }, 2000);

    setTimeout(() => {
      const newCall = {
        id: `call-${Date.now()}`,
        externalCallId: 'CA' + Math.random().toString(36).substring(2, 17),
        callerNumber: '+1 (800) 555-0199',
        durationSec: 104,
        recordingUrl: 'https://actions.google.com/sounds/v1/ambient/morning_birds.ogg',
        transcript: `Agent: Hello, calling from OmniFlow AI concerning your query about: ${callSimulateForm.scriptText}.\nCustomer: Yes! I was checking if this platform connects to Shopify.\nAgent: Yes, we connect natively. I've sent the setup docs to your email.\nCustomer: Perfect. Thank you so much!`,
        summary: `Simulated outbound call concerning "${callSimulateForm.scriptText}". Customer verified Shopify connection. Setup docs emailed.`,
        intentDetected: 'SHOPIFY_INTEGRATION_INFO',
        agentName: 'OmniVoice AI Outbound',
        timestamp: new Date().toISOString()
      };

      setCallLogs(prev => [newCall, ...prev]);
      setSelectedCallLog(newCall);
      setCallStatusMessage('Call Completed successfully! Call logs updated.');
      setCallSimulateForm({ phoneNumber: '', scriptText: 'Reschedule appointment' });
    }, 6000);
  };

  // Handle Knowledge Base Upload Simulator
  const handleKbUpload = (e) => {
    e.preventDefault();
    let fileName = '';
    let fileType = '';
    let fileSize = '';

    if (kbUploadType === 'file') {
      if (kbSelectedFile) {
        fileName = kbSelectedFile.name;
        fileType = fileName.split('.').pop().toUpperCase();
        fileSize = `${(kbSelectedFile.size / 1024 / 1024).toFixed(2)} MB`;
      } else {
        fileName = 'FAQ_Product_Guide_v2.pdf';
        fileType = 'PDF';
        fileSize = '1.2 MB';
      }
    } else if (kbUploadType === 'url') {
      if (!kbUrlInput) return;
      fileName = kbUrlInput;
      fileType = 'URL';
      fileSize = 'N/A';
    } else {
      if (!kbTextInput) return;
      fileName = 'Manual_Text_Doc_' + Date.now().toString().slice(-4);
      fileType = 'TEXT';
      fileSize = `${(kbTextInput.length / 1024).toFixed(1)} KB`;
    }

    setKbUploadProgress(10);
    const interval = setInterval(() => {
      setKbUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          const newDoc = {
            id: `kb-${Date.now()}`,
            fileName,
            fileType,
            fileSize,
            status: 'INDEXED',
            chunkCount: Math.floor(Math.random() * 20) + 8,
            createdAt: new Date().toISOString()
          };
          setKbDocs(prevDocs => [newDoc, ...prevDocs]);
          setKbUrlInput('');
          setKbTextInput('');
          setKbSelectedFile(null);
          setTimeout(() => setKbUploadProgress(0), 1000);
          return 100;
        }
        return prev + 30;
      });
    }, 500);
  };

  // Add lead to CRM
  const handleAddLead = (e) => {
    e.preventDefault();
    if (!newLeadForm.name) return;

    const newLead = {
      id: `lead-${Date.now()}`,
      name: newLeadForm.name,
      email: newLeadForm.email || 'no-email@example.com',
      phone: newLeadForm.phone || 'N/A',
      source: newLeadForm.source,
      status: newLeadForm.status,
      tags: newLeadForm.tags ? newLeadForm.tags.split(',').map(t => t.trim()) : [],
      value: newLeadForm.value ? `$${parseFloat(newLeadForm.value).toLocaleString()}` : '$0'
    };

    setLeads([newLead, ...leads]);
    setNewLeadForm({ name: '', email: '', phone: '', source: 'WEB_CHAT', status: 'NEW', tags: '', value: '' });
    setShowAddLeadModal(false);
  };

  // Delete API Key
  const handleDeleteApiKey = (id) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  // Create API Key
  const handleCreateApiKey = (e) => {
    e.preventDefault();
    if (!newKeyName) return;

    const newKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      token: `sk_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
  };

  // Book Appointment
  const handleBookAppointment = (e) => {
    e.preventDefault();
    if (!bookingForm.title || !bookingForm.date) return;

    const newApt = {
      id: `apt-${Date.now()}`,
      title: bookingForm.title,
      date: bookingForm.date,
      startTime: bookingForm.startTime,
      status: 'CONFIRMED',
      syncGoogle: bookingForm.syncGoogle
    };

    setAppointments(prev => [newApt, ...prev]);
    setShowBookingModal(false);
    setBookingForm({ title: '', date: new Date().toISOString().split('T')[0], startTime: '09:00 AM', syncGoogle: true });
  };

  // Invite Team Member
  const handleInviteTeam = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember = {
      id: `t-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'Pending'
    };

    setTeamMembers([...teamMembers, newMember]);
    setInviteEmail('');
  };

  // Toggle Workflow status
  const handleToggleWorkflow = (id) => {
    setWorkflows(workflows.map(w => {
      if (w.id === id) {
        return { ...w, isActive: !w.isActive };
      }
      return w;
    }));
  };

  // Save new Workflow
  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    if (!newWorkflowData.name) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/workflow/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('omniflow_token')}`
        },
        body: JSON.stringify({
          name: newWorkflowData.name,
          triggerType: newWorkflowData.triggerType
        })
      });

      if (response.ok) {
        const newWf = await response.json();
        setWorkflows([...workflows, newWf]);
        setSelectedWorkflowId(newWf.id);
      } else {
        // Fallback if backend not reachable / errors
        const newWf = {
          id: `wf-${Date.now()}`,
          name: newWorkflowData.name,
          isActive: true,
          triggerType: newWorkflowData.triggerType,
          nodes: [
            { id: 'n-1', type: 'trigger', data: { label: newWorkflowData.triggerType.replace('_', ' '), type: 'trigger' }, position: {x: 250, y: 50} },
            { id: 'n-2', type: 'action', data: { label: 'AI Auto-Response Query', type: 'action' }, position: {x: 250, y: 150} }
          ],
          edges: [
            { id: 'e1-2', source: 'n-1', target: 'n-2' }
          ]
        };
        setWorkflows([...workflows, newWf]);
        setSelectedWorkflowId(newWf.id);
      }
    } catch (error) {
      console.warn("Failed to create workflow remotely, using local state");
    }

    setNewWorkflowData({ name: '', triggerType: 'WHATSAPP_INBOUND' });
    setShowNewWorkflowModal(false);
  };

  // Filter conversations based on current filters
  const filteredConversations = conversations.filter(c => {
    const channelMatches = chatFilter === 'ALL' || c.channel === chatFilter;
    const statusMatches = statusFilter === 'ALL' || c.status === statusFilter;
    const searchMatches = c.leadName.toLowerCase().includes(chatSearch.toLowerCase()) || 
                          c.content.toLowerCase().includes(chatSearch.toLowerCase());
    return channelMatches && statusMatches && searchMatches;
  });

  // Handle CSV Export
  const handleExportCSV = () => {
    const csvData = leads.map(l => ({
      ID: l.id,
      Name: l.name,
      Email: l.email,
      Phone: l.phone,
      Source: l.source,
      Status: l.status,
      Tags: l.tags.join(', '),
      Value: l.value
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `omniflow_leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Handle PDF Export
  const handleExportPDF = async () => {
    const element = document.getElementById('analytics-dashboard');
    if (!element) return;
    
    try {
      // Temporarily hide the export buttons to avoid them being in the PDF
      const buttons = element.querySelectorAll('button');
      buttons.forEach(btn => btn.style.display = 'none');
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#0b0f19',
        logging: false,
        useCORS: true
      });
      
      // Restore buttons
      buttons.forEach(btn => btn.style.display = '');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`omniflow_analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const selectedConvObj = conversations.find(c => c.id === selectedConvId) || conversations[0];

  return (
    <div className="min-h-screen flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* ==================================================== */}
      {/* 1. LANDING & MARKETING PAGES                         */}
      {/* ==================================================== */}
      {currentView === 'landing' && (
        <div className="flex-1 flex flex-col bg-slate-1000 relative">
          {/* Topglow effect */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Navigation Bar */}
          <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-outfit">OmniFlow <span className="text-brand-400">AI</span></span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#demo" className="hover:text-white transition">Live Inbox Demo</a>
              <a href="#pricing" className="hover:text-white transition">Pricing</a>
              <a href="#docs" className="hover:text-white transition">Documentation</a>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={() => { setAuthMode('login'); setCurrentView('auth'); }}
                className="text-sm font-semibold text-slate-300 hover:text-white transition px-4 py-2"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthMode('signup'); setCurrentView('auth'); }}
                className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition duration-300 shadow-md shadow-brand-600/25 flex items-center space-x-1.5"
              >
                <span>Deploy Free App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="px-6 pt-24 pb-20 text-center max-w-5xl mx-auto z-10">
            <div className="inline-flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 px-3.5 py-1.5 rounded-full text-brand-300 text-xs font-semibold tracking-wide mb-6 animate-pulse-slow">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Channel Auto Replies & Conversational AI Voice Calls</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white font-outfit leading-[1.1] mb-6">
              Automate Customer Interactions <br className="hidden md:block"/>
              Across <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-400 to-cyan-400">All Business Channels</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10">
              One unified AI system driving WhatsApp automations, Instagram responses, Facebook DMs, web chat widget, emails, and Twilio-powered Voice Agent calls directly synced to your CRM.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={() => { setAuthMode('signup'); setCurrentView('auth'); }}
                className="w-full sm:w-auto bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl shadow-xl shadow-brand-600/30 transition duration-300 flex items-center justify-center space-x-2"
              >
                <span>Get Started Instantly</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a 
                href="#demo"
                className="w-full sm:w-auto glass-panel glass-panel-hover text-slate-200 font-semibold px-8 py-4 rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 text-brand-400 fill-brand-400" />
                <span>Watch Interactive Sandbox</span>
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-16 border-t border-white/5 text-left">
              <div>
                <span className="text-3xl md:text-4xl font-extrabold text-white">98%</span>
                <p className="text-slate-400 text-sm mt-1">Average Response Speedup</p>
              </div>
              <div>
                <span className="text-3xl md:text-4xl font-extrabold text-white">35%</span>
                <p className="text-slate-400 text-sm mt-1">Lead Conversion Increase</p>
              </div>
              <div>
                <span className="text-3xl md:text-4xl font-extrabold text-white">100M+</span>
                <p className="text-slate-400 text-sm mt-1">Messages Parsed Daily</p>
              </div>
              <div>
                <span className="text-3xl md:text-4xl font-extrabold text-white">4.9/5</span>
                <p className="text-slate-400 text-sm mt-1">G2 Customer Satisfaction</p>
              </div>
            </div>
          </section>

          {/* Interactive Demo Sandbox Dashboard Section */}
          <section id="demo" className="px-6 py-20 bg-slate-950/40 relative border-t border-b border-white/5">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white font-outfit">Explore the Unified Workspace Sandbox</h2>
                <p className="text-slate-400 mt-2">Test drive the exact interface admins use to sync customer messages and track AI calls.</p>
              </div>

              {/* Fake Desktop Mock */}
              <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-brand-500/5 glow-purple">
                {/* Header Chrome bar */}
                <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="bg-slate-950/80 text-xs px-8 py-1 rounded-md text-slate-400 border border-white/5 flex items-center space-x-2">
                    <Globe className="w-3 h-3 text-slate-500" />
                    <span>app.omniflow.ai/dashboard</span>
                  </div>
                  <button 
                    onClick={() => {
                      setUser({ name: 'Sarah Connor', email: 'admin@omniflow.ai', role: 'ADMIN', businessName: 'Apex Logistics' });
                      setCurrentView('dashboard');
                      setActiveTab('inbox');
                    }}
                    className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-md transition"
                  >
                    Enter Live Platform
                  </button>
                </div>

                {/* Dashboard Screenshot Look */}
                <div className="h-[450px] bg-slate-1000 grid grid-cols-12 opacity-90 select-none">
                  {/* Fake Sidebar */}
                  <div className="col-span-3 border-r border-white/5 p-4 space-y-4">
                    <div className="flex items-center space-x-2 bg-brand-500/10 p-2 rounded-lg">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      <span className="text-xs font-semibold text-brand-200">Workspace Active</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2.5 text-xs text-white bg-white/5 p-2 rounded-lg"><Inbox className="w-4 h-4 text-brand-400" /> <span>Unified Inbox</span></div>
                      <div className="flex items-center space-x-2.5 text-xs text-slate-400 p-2"><Users className="w-4 h-4" /> <span>Leads CRM</span></div>
                      <div className="flex items-center space-x-2.5 text-xs text-slate-400 p-2"><Sliders className="w-4 h-4" /> <span>Automation Workflows</span></div>
                      <div className="flex items-center space-x-2.5 text-xs text-slate-400 p-2"><Phone className="w-4 h-4" /> <span>Voice Call Logs</span></div>
                      <div className="flex items-center space-x-2.5 text-xs text-slate-400 p-2"><Database className="w-4 h-4" /> <span>Knowledge Base</span></div>
                    </div>
                  </div>

                  {/* Fake Chat Dashboard */}
                  <div className="col-span-9 grid grid-cols-12">
                    {/* Left chat list */}
                    <div className="col-span-4 border-r border-white/5 p-3 space-y-3 bg-slate-950/20">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Live Feed</div>
                      <div className="space-y-2">
                        <div className="bg-slate-900 border border-brand-500/30 p-2.5 rounded-lg space-y-1">
                          <div className="flex justify-between items-center"><span className="text-xs font-semibold text-white">Jane Cooper</span> <span className="text-[10px] text-brand-400">WhatsApp</span></div>
                          <p className="text-[11px] text-slate-400 truncate">Enterprise bulk shipping pricing...</p>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-lg space-y-1 border border-white/5">
                          <div className="flex justify-between items-center"><span className="text-xs font-semibold text-white">Alex Mercer</span> <span className="text-[10px] text-purple-400">Instagram</span></div>
                          <p className="text-[11px] text-slate-400 truncate">Loving the features on your site...</p>
                        </div>
                      </div>
                    </div>
                    {/* Chat middle view */}
                    <div className="col-span-8 flex flex-col justify-between p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <div>
                            <span className="text-xs font-bold text-white">Jane Cooper</span>
                            <div className="text-[10px] text-slate-500">Channel ID: +1 (555) 902-8812</div>
                          </div>
                          <span className="bg-brand-500/10 text-brand-300 text-[10px] px-2 py-0.5 rounded-full border border-brand-500/20">AI Active</span>
                        </div>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto">
                          <div className="flex flex-col max-w-[80%]">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="text-[9px] font-semibold text-slate-400">Jane Cooper</span>
                            </div>
                            <div className="bg-slate-900/60 p-2.5 rounded-2xl text-[12px] border border-white/5 text-slate-200">
                              Hello there! I checked your product catalog but could not find the pricing for enterprise bulk shipping. Do you have a brochure?
                            </div>
                          </div>
                          <div className="flex flex-col max-w-[80%] ml-auto items-end">
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-brand-400" />
                                OmniFlow AI
                              </span>
                            </div>
                            <div className="bg-indigo-950/50 text-indigo-200 p-2.5 rounded-2xl text-[12px] border border-indigo-500/20 text-left">
                              Hi Jane! Tiers for bulk shipping starts at $12,000/mo. I've fetched standard quote schedules for your business.
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Fake reply text area */}
                      <div className="flex items-center space-x-2 border-t border-white/5 pt-3">
                        <input 
                          type="text" 
                          placeholder="Simulate user message reply here..." 
                          className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs flex-1 text-slate-200 outline-none"
                          disabled
                        />
                        <button className="bg-brand-600 p-2 rounded-lg text-white" disabled><Send className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Core Feature Matrix */}
          <section id="features" className="px-6 py-24 max-w-6xl mx-auto z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-outfit">Built For Omni-Channel Domination</h2>
              <p className="text-slate-400 mt-3 max-w-2xl mx-auto">Deploy AI nodes across seven messaging platforms and automated voice systems with zero coding required.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-panel p-8 rounded-2xl hover:border-brand-500/30 transition duration-300">
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center text-green-400 mb-6"><MessageSquare className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-white mb-2">WhatsApp Automation</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Connect Twilio or Meta WhatsApp Business accounts for answering FAQs, tracking customer orders, bookings, and campaign broadcasts.</p>
              </div>

              <div className="glass-panel p-8 rounded-2xl hover:border-brand-500/30 transition duration-300">
                <div className="w-12 h-12 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center text-pink-400 mb-6"><Sparkles className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Social DM & Story Replies</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Direct automated comment replies, stories feedback triggers, and DM answers for Instagram Business & Facebook Messenger.</p>
              </div>

              <div className="glass-panel p-8 rounded-2xl hover:border-brand-500/30 transition duration-300">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6"><Phone className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-white mb-2">AI Voice Call Agent</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Twilio voice lines integrated with Deepgram speech-to-text, OpenAI Realtime models, and ElevenLabs voice synthesizers.</p>
              </div>

              <div className="glass-panel p-8 rounded-2xl hover:border-brand-500/30 transition duration-300">
                <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400 mb-6"><Database className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Document Knowledge Base</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Train your conversational models by uploading PDFs, text doc files, website scrapers, Notion feeds, or custom FAQ sheets.</p>
              </div>

              <div className="glass-panel p-8 rounded-2xl hover:border-brand-500/30 transition duration-300">
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-6"><Sliders className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Workflow Drag-Builder</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Design multi-step node-based workflows (e.g. IF message matches "quote" → create CRM lead → send automated booking reminder).</p>
              </div>

              <div className="glass-panel p-8 rounded-2xl hover:border-brand-500/30 transition duration-300">
                <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 mb-6"><Shield className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Unified CRM Inbox</h3>
                <p className="text-slate-400 text-sm leading-relaxed">A central command dashboard containing chats assignation filters, live agent takeover, sentiment indicators, and custom tags.</p>
              </div>
            </div>
          </section>

          {/* Pricing Grid */}
          <section id="pricing" className="px-6 py-20 bg-slate-950/20 max-w-6xl mx-auto border-t border-white/5 w-full">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-outfit">SaaS Subscriptions Tiers</h2>
              <p className="text-slate-400 mt-3">Simple pricing scaled to fit your business volume.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free Plan */}
              <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition">
                <div>
                  <h3 className="text-lg font-semibold text-slate-300">Free Tier</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold text-white">$0</span>
                    <span className="text-slate-500 ml-1">/ forever</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-2">Test platform integrations and setups.</p>
                  <ul className="mt-6 space-y-3.5 text-xs text-slate-300">
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>500 Chat Messages / Mo</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>30 Voice Minutes / Mo</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>Web Chat Widget Connect</span></li>
                    <li className="flex items-center space-x-2 text-slate-500"><X className="w-4 h-4" /> <span>WhatsApp Meta API Sync</span></li>
                    <li className="flex items-center space-x-2 text-slate-500"><X className="w-4 h-4" /> <span>Multi-step Automation nodes</span></li>
                  </ul>
                </div>
                <button 
                  onClick={() => { setAuthMode('signup'); setCurrentView('auth'); }}
                  className="mt-8 w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold py-3 rounded-xl transition"
                >
                  Sign Up Free
                </button>
              </div>

              {/* Starter Plan */}
              <div className="glass-panel border-brand-500/30 p-8 rounded-2xl flex flex-col justify-between hover:border-brand-500/50 transition relative">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-brand-600 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">POPULAR</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Starter Tiers</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold text-white">$29</span>
                    <span className="text-slate-500 ml-1">/ month</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-2">Perfect for local retail and startups.</p>
                  <ul className="mt-6 space-y-3.5 text-xs text-slate-300">
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>5,000 Chat Messages / Mo</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>300 Voice Minutes / Mo</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>WhatsApp & Instagram Connect</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>Vector PDF knowledge support</span></li>
                    <li className="flex items-center space-x-2 text-slate-500"><X className="w-4 h-4" /> <span>Stripe Custom Webhooks</span></li>
                  </ul>
                </div>
                <button 
                  onClick={() => { setAuthMode('signup'); setCurrentView('auth'); }}
                  className="mt-8 w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-3 rounded-xl transition"
                >
                  Buy Starter Tiers
                </button>
              </div>

              {/* Pro Plan */}
              <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition">
                <div>
                  <h3 className="text-lg font-semibold text-slate-300">Pro Enterprise</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold text-white">$79</span>
                    <span className="text-slate-500 ml-1">/ month</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-2">For growing businesses needing AI voice.</p>
                  <ul className="mt-6 space-y-3.5 text-xs text-slate-300">
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>50,000 Chat Messages / Mo</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>2,000 Voice Minutes / Mo</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>ElevenLabs Premium Voice Profile</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>Workflow Engine + Webhooks</span></li>
                    <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-green-400" /> <span>HubSpot & Google CRM Sync</span></li>
                  </ul>
                </div>
                <button 
                  onClick={() => { setAuthMode('signup'); setCurrentView('auth'); }}
                  className="mt-8 w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold py-3 rounded-xl transition"
                >
                  Go Premium
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-auto border-t border-white/5 py-12 px-6 bg-slate-1000 text-slate-500 text-xs text-center">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
              <div>© 2026 OmniFlow AI. Built with Gemini & Next.js. All rights reserved.</div>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="hover:text-slate-300">Privacy Policy</a>
                <a href="#" className="hover:text-slate-300">Terms of Service</a>
                <a href="#" className="hover:text-slate-300">Security Architecture</a>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. AUTHENTICATION PAGES (LOGIN / SIGNUP)             */}
      {/* ==================================================== */}
      {currentView === 'auth' && (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-1000 relative">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="w-full max-w-md bg-slate-900/60 border border-white/5 p-8 rounded-2xl glass-panel relative z-10 glow-purple">
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white font-outfit">
                {authMode === 'login' && 'Sign In to OmniFlow'}
                {authMode === 'signup' && 'Create Admin Workspace'}
                {authMode === 'forgot' && 'Reset Password'}
              </h2>
              <p className="text-slate-400 text-xs mt-1 text-center">
                {authMode === 'login' && 'Sign in using credentials or demo account'}
                {authMode === 'signup' && 'Configure workspace settings to launch'}
                {authMode === 'forgot' && 'Provide your account email to dispatch token'}
              </p>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3 rounded-lg flex items-center space-x-2 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-300 text-xs p-3 rounded-lg flex items-center space-x-2 mb-4">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sarah Connor"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-1">Business / Company Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Apex Logistics"
                      value={authForm.businessName}
                      onChange={(e) => setAuthForm({ ...authForm, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="admin@omniflow.ai"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              {authMode !== 'forgot' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-400 text-xs font-semibold">Password</label>
                    {authMode === 'login' && (
                      <button 
                        type="button" 
                        onClick={() => setAuthMode('forgot')} 
                        className="text-[11px] text-brand-400 hover:text-brand-300"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="admin123"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition duration-300 mt-2 shadow-lg shadow-brand-600/20 text-sm"
              >
                {authMode === 'login' && 'Sign In'}
                {authMode === 'signup' && 'Deploy Hub Workspace'}
                {authMode === 'forgot' && 'Dispatch Reset Email'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              {authMode === 'login' ? (
                <div className="text-xs text-slate-400">
                  New to OmniFlow?{' '}
                  <button onClick={() => setAuthMode('signup')} className="text-brand-400 font-semibold hover:text-brand-300">
                    Create free account
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Already have workspace?{' '}
                  <button onClick={() => setAuthMode('login')} className="text-brand-400 font-semibold hover:text-brand-300">
                    Sign in here
                  </button>
                </div>
              )}
              
              <div className="mt-4 text-[11px] text-slate-500 bg-slate-950/40 p-2 rounded-lg border border-white/5">
                💡 Demo Credentials: <strong className="text-slate-300">admin@omniflow.ai</strong> / <strong className="text-slate-300">admin123</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. CORE APPLICATION DASHBOARD LAYOUT                  */}
      {/* ==================================================== */}
      {currentView === 'dashboard' && (
        <div className="flex-1 flex overflow-hidden">
          
          {/* A. NAVIGATIONAL SIDEBAR */}
          <aside className={`bg-slate-950 border-r border-white/5 transition-all duration-300 flex flex-col justify-between ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
            <div>
              {/* Sidebar Header */}
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                {isSidebarOpen ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold tracking-tight text-white text-sm font-outfit">OmniFlow <span className="text-brand-400 text-xs">Admin</span></span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center mx-auto">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4 mx-auto" />}
                </button>
              </div>

              {/* Sidebar Links */}
              <nav className="p-3 space-y-1">
                {[
                  { id: 'inbox', label: 'Unified Inbox', icon: Inbox, badge: conversations.filter(c => c.status === 'OPEN').length },
                  { id: 'crm', label: 'Leads CRM', icon: Users },
                  { id: 'appointments', label: 'Booking Calendar', icon: Calendar },
                  { id: 'omnichannels', label: 'Omni Channels', icon: Globe },
                  { id: 'workflow', label: 'Workflows Builder', icon: Sliders },
                  { id: 'voice', label: 'Voice Call Logs', icon: Phone },
                  { id: 'kb', label: 'Knowledge Base', icon: Database },
                  { id: 'analytics', label: 'Analytics Insights', icon: Activity, hidden: user?.role === 'SUPPORT_AGENT' },
                  { id: 'settings', label: 'Workspace Settings', icon: Settings, hidden: user?.role === 'SUPPORT_AGENT' }
                ].filter(i => !i.hidden).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center py-2.5 px-3.5 rounded-xl text-sm font-medium transition ${
                      activeTab === item.id 
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                    {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                    {isSidebarOpen && item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center space-x-3 mb-4">
                {isSidebarOpen && (
                  <div className="truncate">
                    <div className="text-xs font-semibold text-white">{user?.name || 'Sarah Connor'}</div>
                    <div className="text-[10px] text-slate-500">{user?.role || 'ADMIN'}</div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => { localStorage.removeItem('omniflow_token'); setUser(null); setCurrentView('landing'); }}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 text-red-400 rounded-xl text-xs transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isSidebarOpen && <span>Disconnect Portal</span>}
              </button>
            </div>
          </aside>

          {/* B. MAIN INTERFACE FRAME */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-1000 relative">
            {/* Top Bar Workspace Metrics */}
            <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-semibold text-slate-400">Business Scope:</span>
                <div className="bg-slate-900 text-xs px-3.5 py-1.5 rounded-xl border border-white/5 text-slate-200 font-bold">
                  🏢 {user?.businessName || 'Apex Logistics'}
                </div>
              </div>

              <div className="flex-1 max-w-md mx-8 hidden md:block">
                <div className="relative group">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search messages, leads, workflows... (Press '/')" 
                    className="w-full bg-slate-950/50 hover:bg-slate-900 border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-slate-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-slate-400 font-medium">Auto API Sync Active</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="text-xs text-slate-500">Workspace Id: <code className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-white/5">demo-workspace</code></div>
              </div>
            </header>

            {/* Dashboard Router Tabs Content */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* ========================================== */}
              {/* 3.1 UNIFIED INBOX TAB                      */}
              {/* ========================================== */}
              {activeTab === 'inbox' && (
                <div className="h-full flex flex-col gap-6">
                  {/* Stats Ribbon */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Pending Chats', val: conversations.filter(c => c.status === 'PENDING').length, color: 'text-yellow-400' },
                      { label: 'AI Active Threads', val: conversations.filter(c => c.status === 'OPEN').length, color: 'text-brand-400' },
                      { label: 'Escalated Tickets', val: conversations.filter(c => c.status === 'ESCALATED').length, color: 'text-red-400' },
                      { label: 'Closed Cases', val: conversations.filter(c => c.status === 'CLOSED').length, color: 'text-green-400' }
                    ].map((st, i) => (
                      <div key={i} className="glass-panel p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 font-semibold">{st.label}</span>
                          <div className={`text-2xl font-bold ${st.color} mt-1`}>{st.val}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Core Inbox Grid */}
                  <div className="flex-1 grid grid-cols-12 gap-6 min-h-[500px] max-h-[650px]">
                    {/* Left Chat Thread list */}
                    <div className="col-span-12 md:col-span-4 bg-slate-950/60 border border-white/5 rounded-xl flex flex-col overflow-hidden">
                      {/* Search and Filters */}
                      <div className="p-4 border-b border-white/5 space-y-3 bg-slate-900/40">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input 
                            type="text" 
                            placeholder="Search chats & messages..." 
                            value={chatSearch}
                            onChange={(e) => setChatSearch(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <select 
                            value={chatFilter}
                            onChange={(e) => setChatFilter(e.target.value)}
                            className="bg-slate-950 border border-white/10 text-[11px] text-slate-300 rounded-lg px-2 py-1 flex-1 outline-none"
                          >
                            <option value="ALL">All Channels</option>
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="INSTAGRAM">Instagram</option>
                            <option value="FACEBOOK">Facebook</option>
                            <option value="WEB_CHAT">Web Chat</option>
                            <option value="EMAIL">Email</option>
                          </select>
                          <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-950 border border-white/10 text-[11px] text-slate-300 rounded-lg px-2 py-1 flex-1 outline-none"
                          >
                            <option value="ALL">All Statuses</option>
                            <option value="OPEN">Open</option>
                            <option value="PENDING">Pending</option>
                            <option value="ESCALATED">Escalated</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </div>
                      </div>

                      {/* Chat Items */}
                      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                        {filteredConversations.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-xs">No active chats match current filter parameters.</div>
                        ) : (
                          filteredConversations.map((conv) => (
                            <div 
                              key={conv.id}
                              onClick={() => setSelectedConvId(conv.id)}
                              className={`p-4 cursor-pointer transition flex flex-col gap-1.5 ${
                                selectedConvId === conv.id 
                                  ? 'bg-brand-500/10 border-l-4 border-brand-500' 
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-white">{conv.leadName}</span>
                                  {conv.priority && (
                                    <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded">PRIORITY</span>
                                  )}
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  conv.channel === 'WHATSAPP' ? 'bg-green-500/10 text-green-400' :
                                  conv.channel === 'INSTAGRAM' ? 'bg-pink-500/10 text-pink-400' :
                                  conv.channel === 'WEB_CHAT' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {conv.channel}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2">{conv.content}</p>
                              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                                <span>{new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className={`font-semibold ${
                                  conv.status === 'OPEN' ? 'text-brand-400' :
                                  conv.status === 'PENDING' ? 'text-yellow-400' :
                                  conv.status === 'ESCALATED' ? 'text-red-400' : 'text-slate-400'
                                }`}>{conv.status}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Middle Chat Panel */}
                    <div className="col-span-12 md:col-span-5 bg-slate-950/60 border border-white/5 rounded-xl flex flex-col overflow-hidden">
                      {/* Chat Header */}
                      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/20">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white">{selectedConvObj.leadName}</span>
                            <span className="text-[10px] text-slate-400">({selectedConvObj.channel})</span>
                          </div>
                          <div className="text-[10px] text-slate-500">ID: {selectedConvObj.id}</div>
                        </div>

                        {/* AI Takeover switch */}
                        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-white/5">
                          <button 
                            onClick={() => setAiTakeover(true)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${aiTakeover ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            <Sparkles className="w-3 h-3" />
                            AI Agent
                          </button>
                          <button 
                            onClick={() => setAiTakeover(false)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${!aiTakeover ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${!aiTakeover ? 'bg-emerald-300' : 'bg-slate-500'}`} />
                            Live Agent
                          </button>
                        </div>
                      </div>

                      {/* Chat body messages list */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/40">
                        {selectedConvObj.messages.map((m) => (
                          <div 
                            key={m.id}
                            className={`flex flex-col max-w-[85%] ${m.senderType === 'USER' ? '' : 'ml-auto items-end'}`}
                          >
                            <div className="flex items-center space-x-1.5 mb-1">
                              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                {m.senderType === 'AI' && <Sparkles className="w-3 h-3 text-brand-400" />}
                                {m.senderType === 'AGENT' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                                {m.senderName}
                              </span>
                              <span className="text-[9px] text-slate-600">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`p-3 rounded-2xl text-xs ${
                              m.senderType === 'USER' 
                                ? 'bg-slate-900 text-slate-200 border border-white/5' 
                                : m.senderType === 'AI'
                                  ? 'bg-indigo-950/50 text-indigo-200 border border-indigo-500/20'
                                  : 'bg-emerald-950/50 text-emerald-200 border border-emerald-500/20'
                            }`}>
                              {m.content}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Message input */}
                      <div className="p-4 border-t border-white/5 bg-slate-900/30">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="text" 
                            placeholder={aiTakeover ? "AI is handling replies... Type to override." : "Type a manual reply as Live Agent..."}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                          />
                          <button 
                            onClick={handleSendReply}
                            className="bg-brand-600 hover:bg-brand-500 p-3 rounded-xl text-white transition flex-shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Meta details sidebar */}
                    <div className="col-span-12 md:col-span-3 bg-slate-950/60 border border-white/5 rounded-xl p-4 flex flex-col justify-between overflow-hidden">
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Customer Profile</h3>
                          <div className="space-y-1.5 text-xs">
                            <div className="text-white font-semibold">{selectedConvObj.leadName}</div>
                            <div className="text-slate-500">{selectedConvObj.channel} contact</div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Insights</h3>
                          <div className="space-y-2">
                            <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl space-y-1.5">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400">Sentiment:</span>
                                <span className={`font-bold ${
                                  selectedConvObj.sentiment === 'Positive' ? 'text-green-400' :
                                  selectedConvObj.sentiment === 'Negative' ? 'text-red-400' : 'text-slate-400'
                                }`}>{selectedConvObj.sentiment}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400">Urgency:</span>
                                <span className={`font-bold ${
                                  selectedConvObj.urgency === 'High' ? 'text-red-400 font-extrabold' : 'text-slate-400'
                                }`}>{selectedConvObj.urgency}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quick CRM Tags</h3>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="bg-brand-500/10 border border-brand-500/20 text-brand-300 text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <Tag className="w-2.5 h-2.5" />
                              <span>Active Demo</span>
                            </span>
                            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1">
                              <Tag className="w-2.5 h-2.5" />
                              <span>SaaS Client</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <button 
                          onClick={() => {
                            setConversations(conversations.map(c => {
                              if (c.id === selectedConvObj.id) {
                                return { ...c, status: 'CLOSED' };
                              }
                              return c;
                            }));
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition"
                        >
                          Resolve & Close Thread
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* 3.2 CRM PIPELINE VIEW                      */}
              {/* ========================================== */}
              {activeTab === 'crm' && (
                <div className="space-y-6">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white font-outfit">Lead Management CRM Pipeline</h2>
                      <p className="text-slate-400 text-xs mt-1">Convert multichannel chats into structured sales pipeline opportunities.</p>
                    </div>

                    <button 
                      onClick={() => setShowAddLeadModal(true)}
                      className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-brand-600/15"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Sales Lead</span>
                    </button>
                  </div>

                  {/* Kanban Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {['NEW', 'QUALIFIED', 'INTERESTED', 'CONVERTED'].map((stage) => {
                      const stageLeads = leads.filter(l => l.status === stage);
                      return (
                        <div key={stage} className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                          {/* Column Header */}
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-xs font-bold text-white tracking-wider uppercase">{stage}</span>
                            <span className="bg-slate-900 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5 font-semibold">
                              {stageLeads.length}
                            </span>
                          </div>

                          {/* Stage Cards List */}
                          <div className="space-y-3 flex-1 min-h-[350px]">
                            {stageLeads.map((ld) => (
                              <div 
                                key={ld.id}
                                onClick={() => setSelectedLead(ld)}
                                className="bg-slate-900/60 border border-white/5 p-4 rounded-xl space-y-2 hover:border-brand-500/30 cursor-pointer transition select-none"
                              >
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-white">{ld.name}</span>
                                  <span className="text-[10px] text-slate-500 bg-slate-950 border border-white/5 px-2 py-0.5 rounded">
                                    {ld.source}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400">{ld.email}</div>
                                <div className="flex justify-between items-center pt-2 text-[10px]">
                                  <span className="text-brand-300 font-bold">{ld.value || '$0'}</span>
                                  <div className="flex gap-1">
                                    {ld.status !== 'CONVERTED' && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nextStage = stage === 'NEW' ? 'QUALIFIED' : stage === 'QUALIFIED' ? 'INTERESTED' : 'CONVERTED';
                                          setLeads(leads.map(l => l.id === ld.id ? { ...l, status: nextStage } : l));
                                        }}
                                        className="bg-brand-600 hover:bg-brand-500 text-white font-extrabold px-2 py-0.5 rounded transition text-[9px]"
                                      >
                                        Advance →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Lead Modal */}
                  {showAddLeadModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                        <button 
                          onClick={() => setShowAddLeadModal(false)}
                          className="text-slate-400 hover:text-white absolute top-4 right-4"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold text-white mb-4">Add Sales Lead</h3>
                        <form onSubmit={handleAddLead} className="space-y-4">
                          <div>
                            <label className="block text-slate-400 text-xs font-semibold mb-1">Lead Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Alice Cooper"
                              value={newLeadForm.name}
                              onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-slate-400 text-xs font-semibold mb-1">Email</label>
                              <input 
                                type="email" 
                                placeholder="alice@example.com"
                                value={newLeadForm.email}
                                onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 text-xs font-semibold mb-1">Phone</label>
                              <input 
                                type="text" 
                                placeholder="+1 (555) 902-8812"
                                value={newLeadForm.phone}
                                onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-slate-400 text-xs font-semibold mb-1">Channel Source</label>
                              <select 
                                value={newLeadForm.source}
                                onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                              >
                                <option value="WEB_CHAT">Web Chat</option>
                                <option value="WHATSAPP">WhatsApp</option>
                                <option value="INSTAGRAM">Instagram</option>
                                <option value="FACEBOOK">Facebook</option>
                                <option value="EMAIL">Email</option>
                                <option value="VOICE_CALL">Voice Call</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-400 text-xs font-semibold mb-1">Initial Value (USD)</label>
                              <input 
                                type="number" 
                                placeholder="5000"
                                value={newLeadForm.value}
                                onChange={(e) => setNewLeadForm({ ...newLeadForm, value: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <button 
                            type="submit"
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition text-xs"
                          >
                            Save Lead to CRM
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Lead Detail Side Sheet */}
                  {selectedLead && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
                      <div className="bg-slate-900 border-l border-white/10 w-full max-w-md p-6 h-full flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-bold text-white">{selectedLead.name}</h3>
                              <span className="text-[10px] text-slate-400">Database Entry Id: {selectedLead.id}</span>
                            </div>
                            <button 
                              onClick={() => setSelectedLead(null)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-4 text-xs">
                            <div className="bg-slate-950 p-4 rounded-xl space-y-2.5 border border-white/5">
                              <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="text-slate-200">{selectedLead.email}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Phone:</span> <span className="text-slate-200">{selectedLead.phone}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Source:</span> <span className="text-brand-300 font-bold">{selectedLead.source}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Status Stage:</span> <span className="text-yellow-400 font-bold">{selectedLead.status}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Deal Value:</span> <span className="text-green-400 font-bold">{selectedLead.value}</span></div>
                            </div>

                            <div>
                              <span className="text-slate-400 font-semibold">CRM Tags</span>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {selectedLead.tags.map((tag, idx) => (
                                  <span key={idx} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                          <button 
                            onClick={() => {
                              setLeads(leads.filter(l => l.id !== selectedLead.id));
                              setSelectedLead(null);
                            }}
                            className="w-full bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 text-red-400 text-xs font-semibold py-2.5 rounded-xl transition"
                          >
                            Delete Lead Record
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* 3.2.5 APPOINTMENTS CALENDAR TAB             */}
              {/* ========================================== */}
              {activeTab === 'appointments' && (
                <div className="space-y-6">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white font-outfit">Booking Calendar</h2>
                      <p className="text-slate-400 text-xs mt-1">Manage scheduled calls and sync with Google Calendar.</p>
                    </div>
                    <button 
                      onClick={() => setShowBookingModal(true)}
                      className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-brand-600/15"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Book Appointment</span>
                    </button>
                  </div>

                  {/* Calendar Grid View */}
                  <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-6 min-h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-white font-bold text-lg">Upcoming Appointments</h3>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span>Google Calendar Sync Active</span>
                      </div>
                    </div>

                    {/* Simple list rendering for MVP calendar layout */}
                    <div className="space-y-3">
                      {appointments.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-xs">No upcoming appointments scheduled.</div>
                      ) : (
                        appointments.map(apt => (
                          <div key={apt.id} className="bg-slate-900 border border-white/5 rounded-xl p-4 flex justify-between items-center hover:border-brand-500/50 transition">
                            <div className="flex items-center space-x-4">
                              <div className="bg-brand-500/10 text-brand-400 p-3 rounded-lg flex flex-col items-center justify-center min-w-[60px]">
                                <Calendar className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold">{new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-sm">{apt.title}</h4>
                                <div className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
                                  <span>{apt.startTime}</span>
                                  {apt.syncGoogle && (
                                    <span className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-semibold border border-blue-500/20">Google Sync</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${apt.status === 'CONFIRMED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {apt.status}
                              </span>
                              <button onClick={() => setAppointments(appointments.filter(a => a.id !== apt.id))} className="text-slate-500 hover:text-red-400 transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Booking Modal */}
                  {showBookingModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center">
                      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                        <button onClick={() => setShowBookingModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                          <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold text-white mb-4">Book New Appointment</h3>
                        <form onSubmit={handleBookAppointment} className="space-y-4">
                          <div>
                            <label className="block text-slate-400 text-xs font-semibold mb-1">Appointment Title / Lead Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Discovery Call: Sarah"
                              value={bookingForm.title}
                              onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-slate-400 text-xs font-semibold mb-1">Date</label>
                              <input 
                                type="date" 
                                value={bookingForm.date}
                                onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none [color-scheme:dark]"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 text-xs font-semibold mb-1">Time</label>
                              <input 
                                type="time" 
                                value={bookingForm.startTime.split(' ')[0]}
                                onChange={(e) => {
                                  // Simplified time handler for MVP
                                  const [hours, minutes] = e.target.value.split(':');
                                  const ampm = hours >= 12 ? 'PM' : 'AM';
                                  const formatted = `${hours % 12 || 12}:${minutes} ${ampm}`;
                                  setBookingForm({ ...bookingForm, startTime: formatted });
                                }}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none [color-scheme:dark]"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 pt-2">
                            <input 
                              type="checkbox" 
                              id="syncGoogle"
                              checked={bookingForm.syncGoogle}
                              onChange={(e) => setBookingForm({ ...bookingForm, syncGoogle: e.target.checked })}
                              className="w-4 h-4 rounded bg-slate-950 border border-white/10 accent-brand-500"
                            />
                            <label htmlFor="syncGoogle" className="text-xs text-slate-400">Sync with Google Calendar</label>
                          </div>
                          <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition text-xs mt-2">
                            Confirm Booking
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* 3.3 WORKFLOW AUTOMATION BUILDER             */}
              {/* ========================================== */}
              {activeTab === 'workflow' && (
                <div className="space-y-6">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white font-outfit">Multi-Channel Automation Workflows</h2>
                      <p className="text-slate-400 text-xs mt-1">Configure drag-and-drop trigger-action matrices to handle messages without manual agent input.</p>
                    </div>

                    <button 
                      onClick={() => setShowNewWorkflowModal(true)}
                      className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-brand-600/15"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Flow Trigger</span>
                    </button>
                  </div>

                  {/* List of flows */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Flow sidebar list */}
                    <div className="col-span-1 bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Automations Configured</div>
                      {workflows.map((wf) => (
                        <div 
                          key={wf.id}
                          onClick={() => setSelectedWorkflowId(wf.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition space-y-3 ${
                            selectedWorkflowId === wf.id 
                              ? 'bg-brand-500/10 border-brand-500/50' 
                              : 'bg-slate-900/40 border-white/5 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white">{wf.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              wf.isActive ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'
                            }`}>{wf.isActive ? 'ACTIVE' : 'DRAFT'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Trigger: {wf.triggerType}</div>
                          <div className="flex justify-between items-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleWorkflow(wf.id);
                              }}
                              className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg transition ${
                                wf.isActive ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-brand-600 text-white hover:bg-brand-500'
                              }`}
                            >
                              {wf.isActive ? 'Pause' : 'Activate'}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setWorkflows(workflows.filter(w => w.id !== wf.id));
                              }}
                              className="text-slate-500 hover:text-red-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Canvas middle view */}
                    <div className="col-span-2 bg-slate-950/60 border border-white/5 rounded-2xl p-6 flex flex-col justify-between grid-bg relative min-h-[500px]">
                      {/* Flow Header */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-4 z-10">
                        <div>
                          <span className="text-xs text-slate-400 font-semibold">Workflow Canvas</span>
                          <h3 className="text-sm font-bold text-white mt-0.5">
                            {workflows.find(w => w.id === selectedWorkflowId)?.name || 'Default Automation'}
                          </h3>
                        </div>
                        <span className="bg-slate-900 border border-white/5 text-[11px] text-slate-300 px-3 py-1.5 rounded-xl font-medium">
                          Nodes: {workflows.find(w => w.id === selectedWorkflowId)?.nodes.length || 0}
                        </span>
                      </div>

                      {/* React Flow Canvas layout */}
                      <div className="flex-1 flex flex-col w-full h-[400px] py-4 space-y-6 z-10 relative bg-slate-950 rounded-xl overflow-hidden">
                        <ReactFlow
                          nodes={rfNodes}
                          edges={rfEdges}
                          onNodesChange={onNodesChange}
                          onEdgesChange={onEdgesChange}
                          onConnect={onConnect}
                          nodeTypes={nodeTypes}
                          fitView
                        >
                          <Background color="#1e293b" gap={16} />
                          <Controls className="!bg-slate-900 !border-white/10 !fill-white" />
                        </ReactFlow>
                      </div>

                      {/* Canvas controls */}
                      <div className="flex justify-between items-center border-t border-white/5 pt-4 z-10">
                        <div className="text-[11px] text-slate-500">💡 Drag connection nodes to automate customer paths.</div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              const activeWf = workflows.find(w => w.id === selectedWorkflowId);
                              if (activeWf) {
                                const newNodeId = `n-${Date.now()}`;
                                const newNodePosition = { x: 250, y: (rfNodes.length * 150) + 50 };
                                const newNode = {
                                  id: newNodeId,
                                  type: 'customNode',
                                  position: newNodePosition,
                                  data: {
                                    type: 'action',
                                    label: 'Dispatched Twilio SMS Alert',
                                    desc: 'SMS reminder message auto dispatched'
                                  }
                                };
                                setRfNodes([...rfNodes, newNode]);
                                if (rfNodes.length > 0) {
                                  const lastNode = rfNodes[rfNodes.length - 1];
                                  setRfEdges([...rfEdges, {
                                    id: `e-${lastNode.id}-${newNodeId}`,
                                    source: lastNode.id,
                                    target: newNodeId,
                                    animated: true,
                                    style: { stroke: '#8b5cf6' }
                                  }]);
                                }
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Node</span>
                          </button>
                          <button 
                            onClick={handleSaveWorkflow}
                            className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center space-x-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Flow</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* New Workflow Modal */}
                  {showNewWorkflowModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                        <button 
                          onClick={() => setShowNewWorkflowModal(false)}
                          className="text-slate-400 hover:text-white absolute top-4 right-4"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold text-white mb-4">Create Workflow Automation</h3>
                        <form onSubmit={handleCreateWorkflow} className="space-y-4">
                          <div>
                            <label className="block text-slate-400 text-xs font-semibold mb-1">Workflow Label / Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Lead Auto-Responder"
                              value={newWorkflowData.name}
                              onChange={(e) => setNewWorkflowData({ ...newWorkflowData, name: e.target.value })}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-xs font-semibold mb-1">Trigger Event</label>
                            <select 
                              value={newWorkflowData.triggerType}
                              onChange={(e) => setNewWorkflowData({ ...newWorkflowData, triggerType: e.target.value })}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                            >
                              <option value="WHATSAPP_INBOUND">Inbound WhatsApp Message</option>
                              <option value="INSTAGRAM_INBOUND">Inbound Instagram DM</option>
                              <option value="APPOINTMENT_BOOKED">Appointment Slot Scheduled</option>
                              <option value="WEB_CHAT_INBOUND">Web Chat Session Init</option>
                            </select>
                          </div>
                          <button 
                            type="submit"
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition text-xs"
                          >
                            Save Workflow Configuration
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* 3.4 AI VOICE CALL LOGS TAB                 */}
              {/* ========================================== */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-semibold">Total Automated Calls</span>
                        <div className="text-2xl font-bold text-white mt-1">482</div>
                      </div>
                      <Phone className="w-8 h-8 text-brand-400/25" />
                    </div>
                    <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-semibold">Average Duration</span>
                        <div className="text-2xl font-bold text-white mt-1">1m 45s</div>
                      </div>
                      <Activity className="w-8 h-8 text-green-400/25" />
                    </div>
                    <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-semibold">Call Budget Limit</span>
                        <div className="text-2xl font-bold text-white mt-1">{subscription.usedVoice} / {subscription.limitVoice} mins</div>
                      </div>
                      <CreditCard className="w-8 h-8 text-yellow-400/25" />
                    </div>
                  </div>

                  {/* Core layout grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Outbound Trigger Simulator */}
                    <div className="col-span-1 bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outbound Call Simulator</div>
                      
                      {callStatusMessage && (
                        <div className="bg-slate-900 border border-white/5 text-[11px] text-brand-300 p-3.5 rounded-xl flex items-start space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping mt-1" />
                          <span>{callStatusMessage}</span>
                        </div>
                      )}

                      <form onSubmit={handleSimulateCall} className="space-y-4">
                        <div>
                          <label className="block text-slate-400 text-xs font-semibold mb-1">Target Phone Number</label>
                          <input 
                            type="text" 
                            placeholder="e.g. +1 (555) 902-8812"
                            value={callSimulateForm.phoneNumber}
                            onChange={(e) => setCallSimulateForm({ ...callSimulateForm, phoneNumber: e.target.value })}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-xs font-semibold mb-1">Call AI Intent Prompt</label>
                          <textarea 
                            rows={3}
                            placeholder="Introduce Apex Logistics discount offer..."
                            value={callSimulateForm.scriptText}
                            onChange={(e) => setCallSimulateForm({ ...callSimulateForm, scriptText: e.target.value })}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none resize-none"
                          />
                        </div>
                        <button 
                          type="submit"
                          className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition text-xs flex items-center justify-center space-x-1.5"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Trigger Twilio Trunk Call</span>
                        </button>
                      </form>
                    </div>

                    {/* Middle logs list & Right detail panel */}
                    <div className="col-span-2 grid grid-cols-12 gap-6">
                      {/* Call list */}
                      <div className="col-span-5 bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/20">Call History Logs</div>
                        <div className="divide-y divide-white/5 flex-1 overflow-y-auto max-h-[350px]">
                          {callLogs.map((log) => (
                            <div 
                              key={log.id}
                              onClick={() => setSelectedCallLog(log)}
                              className={`p-3.5 cursor-pointer transition space-y-1 ${
                                selectedCallLog.id === log.id ? 'bg-brand-500/10 border-l-4 border-brand-500' : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="flex justify-between items-center text-xs font-bold text-white">
                                <span>{log.callerNumber}</span>
                                <span className="text-[10px] text-slate-500">{log.durationSec}s</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex justify-between">
                                <span>{log.intentDetected}</span>
                                <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Call details player */}
                      <div className="col-span-7 bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-start border-b border-white/5 pb-2">
                          <div>
                            <span className="text-xs font-bold text-white">{selectedCallLog.callerNumber}</span>
                            <div className="text-[10px] text-slate-500">Twilio Sid: {selectedCallLog.externalCallId.slice(0, 15)}...</div>
                          </div>
                          <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-500/20">
                            Intent: {selectedCallLog.intentDetected}
                          </span>
                        </div>

                        {/* Player */}
                        <div className="bg-slate-900 border border-white/5 p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-300 font-semibold flex items-center space-x-1.5">
                              <Volume2 className="w-4 h-4 text-brand-400" />
                              <span>Play Recording</span>
                            </span>
                            <span className="text-[10px] text-slate-500">Duration: {selectedCallLog.durationSec}s</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => setIsPlayingCall(!isPlayingCall)}
                              className="bg-brand-600 hover:bg-brand-500 p-2.5 rounded-full text-white transition"
                            >
                              {isPlayingCall ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                            </button>
                            <audio 
                              ref={audioRef} 
                              src={selectedCallLog.recordingUrl} 
                              onEnded={() => setIsPlayingCall(false)} 
                              className="hidden" 
                            />
                            {/* Mock Wave form */}
                            <div className="flex-1 flex gap-0.5 items-center h-8">
                              {[30, 80, 50, 90, 60, 40, 70, 50, 90, 40, 80, 50, 70, 30, 60, 80, 40].map((h, i) => (
                                <div 
                                  key={i} 
                                  style={{ height: `${isPlayingCall ? Math.random() * 30 + 10 : h / 3}%` }} 
                                  className={`w-1 rounded-full transition-all duration-300 ${isPlayingCall ? 'bg-brand-500' : 'bg-slate-700'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Transcript */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-400">Transcript Audio Stream</span>
                          <div className="bg-slate-950 p-3 rounded-xl text-[11px] text-slate-300 border border-white/5 font-mono max-h-[120px] overflow-y-auto whitespace-pre-line">
                            {selectedCallLog.transcript}
                          </div>
                        </div>

                        {/* AI Call Highlights */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-400">AI Call Summary</span>
                          <div className="bg-slate-900 border border-white/5 p-3 rounded-xl text-[11px] text-slate-300">
                            ⚡ {selectedCallLog.summary}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* 3.5 KNOWLEDGE BASE UPLOADS TAB             */}
              {/* ========================================== */}
              {activeTab === 'kb' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white font-outfit">AI Training Knowledge Base</h2>
                    <p className="text-slate-400 text-xs mt-1">Upload company resources to train RAG agents for FAQ auto-responses.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Upload form */}
                    <div className="col-span-1 bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configure Training Source</div>
                      
                      <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-white/5">
                        {['file', 'url', 'text'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setKbUploadType(t)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex-1 transition uppercase ${
                              kbUploadType === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <form onSubmit={handleKbUpload} className="space-y-4">
                        {kbUploadType === 'file' && (
                          <div 
                            className={`border border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
                              kbSelectedFile ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-slate-950/40 hover:border-brand-500/30'
                            }`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                setKbSelectedFile(e.dataTransfer.files[0]);
                              }
                            }}
                          >
                            <input 
                              type="file" 
                              className="hidden" 
                              ref={fileInputRef} 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setKbSelectedFile(e.target.files[0]);
                                }
                              }} 
                            />
                            <Upload className={`w-8 h-8 mx-auto mb-2 ${kbSelectedFile ? 'text-brand-300' : 'text-brand-400'}`} />
                            <span className="text-xs font-semibold text-slate-300 block">
                              {kbSelectedFile ? kbSelectedFile.name : 'Click or Drop PDF / CSV file here'}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              {kbSelectedFile ? `Ready to index (${(kbSelectedFile.size / 1024 / 1024).toFixed(2)} MB)` : 'Maximum size limit: 12MB'}
                            </span>
                          </div>
                        )}

                        {kbUploadType === 'url' && (
                          <div>
                            <label className="block text-slate-400 text-xs font-semibold mb-1">Target Scraper URL</label>
                            <input 
                              type="url" 
                              placeholder="https://apexlogistics.com/shipping-faq"
                              value={kbUrlInput}
                              onChange={(e) => setKbUrlInput(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
                              required
                            />
                          </div>
                        )}

                        {kbUploadType === 'text' && (
                          <div>
                            <label className="block text-slate-400 text-xs font-semibold mb-1">Manual Content Text</label>
                            <textarea 
                              rows={5}
                              placeholder="Type company information, returns policies, customer guide parameters directly here..."
                              value={kbTextInput}
                              onChange={(e) => setKbTextInput(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:border-brand-500 focus:outline-none resize-none"
                              required
                            />
                          </div>
                        )}

                        {kbUploadProgress > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Parsing content vectors...</span>
                              <span>{kbUploadProgress}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                              <div style={{ width: `${kbUploadProgress}%` }} className="h-full bg-brand-500 transition-all duration-300" />
                            </div>
                          </div>
                        )}

                        <button 
                          type="submit"
                          className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition text-xs flex items-center justify-center space-x-1.5"
                        >
                          <Database className="w-4 h-4" />
                          <span>Index & Generate Vectors</span>
                        </button>
                      </form>
                    </div>

                    {/* Right indexed data table */}
                    <div className="col-span-2 bg-slate-950/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-900/20">Active Indexed Documents</div>
                      
                      <div className="divide-y divide-white/5 flex-1 overflow-y-auto">
                        {kbDocs.map((doc) => (
                          <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition">
                            <div className="flex items-center space-x-3.5">
                              <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                                {doc.fileType === 'URL' ? <Link className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-white block">{doc.fileName}</span>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Type: <code className="text-slate-400">{doc.fileType}</code> • Size: {doc.fileSize} • Index Chunks: <code className="text-brand-300 font-bold">{doc.chunkCount}</code>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {doc.status}
                              </span>
                              <button 
                                onClick={() => setKbDocs(kbDocs.filter(d => d.id !== doc.id))}
                                className="text-slate-500 hover:text-red-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* 3.6 ANALYTICS DASHBOARD TAB                */}
              {/* ========================================== */}
              {activeTab === 'analytics' && (
                <div id="analytics-dashboard" className="space-y-6">
                  {/* Analytics Header & Export Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white font-outfit">Platform Analytics & Reports</h2>
                      <p className="text-slate-400 text-xs mt-1">Monitor AI conversation metrics and pipeline growth across all channels.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={handleExportCSV}
                        className="bg-slate-900 border border-white/10 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                      </button>
                      <button 
                        onClick={handleExportPDF}
                        className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-brand-600/15"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Headline cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { label: 'Conversations Handled', val: '18,482', diff: '+12.4%', up: true },
                      { label: 'Average Response Time', val: '14.2s', diff: '-42.3%', up: true },
                      { label: 'AI Accuracy Rating', val: '97.2%', diff: '+0.8%', up: true },
                      { label: 'Total Revenue Generated', val: '$148,200', diff: '+28.2%', up: true }
                    ].map((card, idx) => (
                      <div key={idx} className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
                        <span className="text-xs text-slate-400 font-semibold">{card.label}</span>
                        <div className="flex items-baseline justify-between mt-3">
                          <span className="text-2xl font-bold text-white">{card.val}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            card.up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}>{card.diff}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Graphs Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Hourly Traffic Area Graph */}
                    <div className="col-span-2 bg-slate-950/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Traffic Feed Analysis (Last 24 Hours)</span>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={hourlyTrafficData}>
                            <defs>
                              <linearGradient id="colorWhatsApp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorWebChat" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Area type="monotone" dataKey="WhatsApp" stroke="#10b981" fillOpacity={1} fill="url(#colorWhatsApp)" />
                            <Area type="monotone" dataKey="WebChat" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWebChat)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* CRM stage conversions chart */}
                    <div className="col-span-1 bg-slate-950/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Sales Pipeline Conversion Tiers</span>
                      <div className="h-[220px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={conversionPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {conversionPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legends */}
                      <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-400">
                        {conversionPieData.map((e, i) => (
                          <div key={i} className="flex items-center space-x-1.5">
                            <span style={{ backgroundColor: e.color }} className="w-2.5 h-2.5 rounded-full" />
                            <span className="truncate">{e.name}: {e.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* 3.7 OMNI CHANNELS TAB                      */}
              {/* ========================================== */}
              {activeTab === 'omnichannels' && (
                <div className="space-y-6 max-w-7xl mx-auto pb-20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white font-outfit">Omni Channels Hub</h2>
                      <p className="text-slate-400 text-sm mt-1">Connect and manage all your customer communication channels in one place.</p>
                    </div>
                  </div>
                  
                  {/* Architecture Flow */}
                  <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-6 overflow-hidden">
                    <h3 className="text-sm font-semibold text-slate-300 mb-6">Data Architecture & Routing</h3>
                    <div className="flex flex-col md:flex-row items-center justify-between text-center gap-4">
                      
                      {/* Step 1 */}
                      <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-xl p-4 w-full relative group hover:border-brand-500/50 transition-colors">
                        <Globe className="w-6 h-6 text-slate-400 mx-auto mb-2 group-hover:text-brand-400 transition-colors" />
                        <div className="font-semibold text-white text-sm">8+ Channels</div>
                        <div className="text-[10px] text-slate-500 mt-1">Ingress & Egress</div>
                      </div>

                      <ArrowRight className="w-5 h-5 text-slate-600 hidden md:block" />

                      {/* Step 2 */}
                      <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-xl p-4 w-full relative group hover:border-brand-500/50 transition-colors">
                        <Inbox className="w-6 h-6 text-slate-400 mx-auto mb-2 group-hover:text-brand-400 transition-colors" />
                        <div className="font-semibold text-white text-sm">Unified Inbox</div>
                        <div className="text-[10px] text-slate-500 mt-1">Centralized Queue</div>
                      </div>

                      <ArrowRight className="w-5 h-5 text-slate-600 hidden md:block" />

                      {/* Step 3 */}
                      <div className="flex-1 bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 w-full relative group hover:border-brand-500/50 transition-colors glow-purple">
                        <Sparkles className="w-6 h-6 text-brand-400 mx-auto mb-2" />
                        <div className="font-semibold text-white text-sm">OmniFlow AI Engine</div>
                        <div className="text-[10px] text-brand-300 mt-1">NLP & Auto-Resolution</div>
                      </div>

                      <ArrowRight className="w-5 h-5 text-slate-600 hidden md:block" />

                      {/* Step 4 */}
                      <div className="flex-1 bg-slate-900/50 border border-white/5 rounded-xl p-4 w-full relative group hover:border-brand-500/50 transition-colors">
                        <Database className="w-6 h-6 text-slate-400 mx-auto mb-2 group-hover:text-brand-400 transition-colors" />
                        <div className="font-semibold text-white text-sm">CRM & Analytics</div>
                        <div className="text-[10px] text-slate-500 mt-1">Lead Capture & Insights</div>
                      </div>

                    </div>
                  </div>

                  {/* Channels Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                      { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageCircle, status: 'Connected', msgs: '1,204', leads: '342', ai: 'Active', color: 'text-green-400', bg: 'bg-green-500/10' },
                      { id: 'instagram', name: 'Instagram Direct', icon: Instagram, status: 'Connected', msgs: '856', leads: '189', ai: 'Active', color: 'text-pink-400', bg: 'bg-pink-500/10' },
                      { id: 'facebook', name: 'Facebook Messenger', icon: Facebook, status: 'Connected', msgs: '432', leads: '95', ai: 'Active', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                      { id: 'linkedin', name: 'LinkedIn Messages', icon: Linkedin, status: 'Connected', msgs: '215', leads: '34', ai: 'Active', color: 'text-blue-500', bg: 'bg-blue-600/10' },
                      { id: 'webchat', name: 'Website Widget', icon: Globe, status: 'Connected', msgs: '3,492', leads: '812', ai: 'Active', color: 'text-brand-400', bg: 'bg-brand-500/10' },
                      { id: 'email', name: 'Support Email', icon: Mail, status: 'Connected', msgs: '2,105', leads: '43', ai: 'Active', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                      { id: 'sms', name: 'SMS (Twilio)', icon: Smartphone, status: 'Connected', msgs: '654', leads: '12', ai: 'Inactive', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                      { id: 'aicalls', name: 'AI Voice Agent', icon: Phone, status: 'Connected', msgs: '128', leads: '45', ai: 'Active', color: 'text-orange-400', bg: 'bg-orange-500/10' }
                    ].map(channel => (
                      <div key={channel.id} className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-2.5 rounded-xl ${channel.bg}`}>
                            <channel.icon className={`w-5 h-5 ${channel.color}`} />
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${channel.status === 'Connected' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                              {channel.status}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 flex items-center">
                              AI Engine: 
                              <span className={`ml-1 font-semibold ${channel.ai === 'Active' ? 'text-brand-400' : 'text-slate-500'}`}>{channel.ai}</span>
                            </span>
                          </div>
                        </div>
                        
                        <h3 className="text-sm font-bold text-white mb-4">{channel.name}</h3>
                        
                        <div className="grid grid-cols-2 gap-2 mb-5">
                          <div className="bg-slate-900/50 rounded-lg p-2 border border-white/5">
                            <div className="text-[10px] text-slate-500 mb-0.5">Messages</div>
                            <div className="text-sm font-semibold text-slate-200">{channel.msgs}</div>
                          </div>
                          <div className="bg-slate-900/50 rounded-lg p-2 border border-white/5">
                            <div className="text-[10px] text-slate-500 mb-0.5">Leads Gen.</div>
                            <div className="text-sm font-semibold text-slate-200">{channel.leads}</div>
                          </div>
                        </div>
                        
                        <div className="mt-auto">
                          <button 
                            onClick={() => setSelectedChannel(channel)}
                            className="w-full bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold py-2 rounded-lg transition-colors border border-white/5"
                          >
                            {channel.status === 'Connected' ? 'Configure Channel' : 'Connect Account'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Configure Channel Modal */}
                  {selectedChannel && (
                    <div className="fixed inset-0 bg-slate-1000/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${selectedChannel.bg}`}>
                              <selectedChannel.icon className={`w-5 h-5 ${selectedChannel.color}`} />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">Configure {selectedChannel.name}</h3>
                              <p className="text-xs text-slate-400">Manage webhook keys and AI settings</p>
                            </div>
                          </div>
                          <button onClick={() => setSelectedChannel(null)} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="p-6 space-y-4">
                          <div>
                            <label className="block text-slate-400 text-xs font-semibold mb-1">API Key / Token</label>
                            <input type="password" defaultValue="sk_live_123456789" className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-xs font-semibold mb-1">Webhook URL</label>
                            <input type="text" readOnly value={`https://api.omniflow.ai/webhooks/${selectedChannel.id}`} className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-500 font-mono" />
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-sm font-semibold text-slate-300">Enable AI Auto-Replies</span>
                            <div className={`w-10 h-5 rounded-full relative cursor-pointer ${selectedChannel.ai === 'Active' ? 'bg-brand-500' : 'bg-slate-700'}`}>
                              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all ${selectedChannel.ai === 'Active' ? 'right-0.5' : 'left-0.5'}`}></div>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 border-t border-white/5 flex justify-end space-x-3 bg-slate-950/30">
                          <button onClick={() => setSelectedChannel(null)} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
                          <button 
                            onClick={() => { 
                              alert(`${selectedChannel.name} configuration saved!`); 
                              setSelectedChannel(null); 
                            }} 
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-brand-500/20 transition-all"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ========================================== */}
              {/* 3.7 SETTINGS & TEAMS TAB                   */}
              {/* ========================================== */}
              {activeTab === 'settings' && (
                <div className="space-y-8">
                  {/* Grid section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* API keys manager */}
                    <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-white">Custom API Credentials</h3>
                        <p className="text-slate-500 text-[11px] mt-0.5">Generate access tokens to connect external systems or custom widgets.</p>
                      </div>

                      <form onSubmit={handleCreateApiKey} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. Web Chat Widget"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs flex-1 text-slate-200 outline-none focus:border-brand-500"
                          required
                        />
                        <button 
                          type="submit"
                          className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 rounded-xl transition flex items-center space-x-1"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Generate Token</span>
                        </button>
                      </form>

                      <div className="divide-y divide-white/5 space-y-3 pt-2">
                        {apiKeys.map((key) => (
                          <div key={key.id} className="flex items-center justify-between text-xs pt-3">
                            <div>
                              <span className="text-white font-semibold block">{key.name}</span>
                              <code className="text-slate-500 text-[10px] mt-0.5 block">{key.token}</code>
                            </div>
                            <button 
                              onClick={() => handleDeleteApiKey(key.id)}
                              className="text-slate-500 hover:text-red-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subscription & Stripe integration */}
                    <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-5">
                      <div>
                        <h3 className="text-sm font-bold text-white">SaaS Plans & Billing limits</h3>
                        <p className="text-slate-500 text-[11px] mt-0.5">Manage subscription limits, Stripe plans, and usage quotas.</p>
                      </div>

                      <div className="bg-slate-900 border border-white/5 p-4 rounded-xl space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Current Plan:</span>
                          <span className="bg-brand-500/10 text-brand-300 border border-brand-500/20 text-[10px] font-extrabold px-2.5 py-1 rounded">
                            {subscription.planName} MEMBER
                          </span>
                        </div>

                        {/* Quotas */}
                        <div className="space-y-3 pt-2">
                          {/* Chats limit */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>Chat Quota Usage</span>
                              <span>{subscription.usedChats} / {subscription.limitChats}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                              <div style={{ width: `${(subscription.usedChats / subscription.limitChats) * 100}%` }} className="h-full bg-brand-500" />
                            </div>
                          </div>

                          {/* Voice limit */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>AI Voice Agent Minutes</span>
                              <span>{subscription.usedVoice} / {subscription.limitVoice} mins</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                              <div style={{ width: `${(subscription.usedVoice / subscription.limitVoice) * 100}%` }} className="h-full bg-green-500" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subscription upgrades trigger */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSubscription({ ...subscription, planName: 'PRO', limitChats: 50000, limitVoice: 2000 });
                          }}
                          className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2.5 rounded-xl transition flex-1"
                        >
                          Upgrade to Pro Plan ($79/mo)
                        </button>
                        <button 
                          onClick={() => {
                            setSubscription({ ...subscription, planName: 'STARTER', limitChats: 5000, limitVoice: 300 });
                          }}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition flex-1"
                        >
                          Downgrade to Starter
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Team Workspace Invites */}
                  <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">Team Members & Access Controls</h3>
                      <p className="text-slate-500 text-[11px] mt-0.5">Invite sales agents or customer support administrators to access the dashboard.</p>
                    </div>

                    <form onSubmit={handleInviteTeam} className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="email" 
                        placeholder="agent@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs flex-1 text-slate-200 outline-none focus:border-brand-500"
                        required
                      />
                      <select 
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-brand-500"
                      >
                        <option value="SUPPORT_AGENT">Support Agent</option>
                        <option value="SALES_TEAM">Sales Team</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button 
                        type="submit"
                        className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Send Invitation Link</span>
                      </button>
                    </form>

                    {/* Member table */}
                    <div className="border border-white/5 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left text-slate-400">
                        <thead className="bg-slate-900 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Member Name</th>
                            <th className="px-4 py-3">Email Address</th>
                            <th className="px-4 py-3">Role permissions</th>
                            <th className="px-4 py-3">Invitation Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {teamMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-white/5 transition">
                              <td className="px-4 py-3 font-semibold text-white">{m.name}</td>
                              <td className="px-4 py-3">{m.email}</td>
                              <td className="px-4 py-3"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">{m.role}</span></td>
                              <td className="px-4 py-3">
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${m.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <span className={m.status === 'Active' ? 'text-green-400' : 'text-yellow-400'}>{m.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      )}

    </div>
  );
}
