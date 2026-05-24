(function() {
  const SCRIPT_SRC = document.currentScript.src;
  const SERVER_URL = new URL(SCRIPT_SRC).origin;

  // Load Socket.io script dynamically
  const ioScript = document.createElement('script');
  ioScript.src = `${SERVER_URL}/socket.io/socket.io.js`;
  ioScript.onload = initWidget;
  document.head.appendChild(ioScript);

  // Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #omniflow-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #omniflow-widget-bubble {
      width: 60px;
      height: 60px;
      background-color: #6366f1; /* Brand color */
      border-radius: 50%;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    #omniflow-widget-bubble:hover {
      transform: scale(1.05);
    }
    #omniflow-widget-bubble svg {
      width: 30px;
      height: 30px;
      fill: white;
    }
    #omniflow-widget-chat {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    #omniflow-widget-chat.open {
      display: flex;
    }
    #omniflow-chat-header {
      background: #6366f1;
      color: white;
      padding: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #omniflow-chat-close {
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
    }
    #omniflow-chat-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .omniflow-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
    }
    .omniflow-msg.user {
      align-self: flex-end;
      background: #6366f1;
      color: white;
      border-bottom-right-radius: 2px;
    }
    .omniflow-msg.agent {
      align-self: flex-start;
      background: white;
      color: #1f2937;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 2px;
    }
    #omniflow-chat-footer {
      padding: 16px;
      background: white;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    #omniflow-chat-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      outline: none;
      font-size: 14px;
    }
    #omniflow-chat-input:focus {
      border-color: #6366f1;
    }
    #omniflow-chat-send {
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0 16px;
      cursor: pointer;
      font-weight: 600;
    }
    #omniflow-lead-form {
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .omniflow-input-row {
      display: flex;
      gap: 8px;
    }
    .omniflow-input-row input {
      flex: 1;
      padding: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }
    #omniflow-start-chat {
      background: #6366f1;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  let socket;
  let conversationId = localStorage.getItem('omniflow_conv_id');
  let leadData = JSON.parse(localStorage.getItem('omniflow_lead_data')) || null;

  function initWidget() {
    socket = window.io(SERVER_URL);

    // Create DOM elements
    const container = document.createElement('div');
    container.id = 'omniflow-widget-container';

    const bubble = document.createElement('div');
    bubble.id = 'omniflow-widget-bubble';
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';

    const chatWindow = document.createElement('div');
    chatWindow.id = 'omniflow-widget-chat';

    chatWindow.innerHTML = `
      <div id="omniflow-chat-header">
        <span>OmniFlow Support</span>
        <span id="omniflow-chat-close">&times;</span>
      </div>
      ${!leadData ? `
      <div id="omniflow-lead-form">
        <div style="font-size: 13px; color: #4b5563; text-align: center;">Before we start, please tell us a bit about yourself.</div>
        <div class="omniflow-input-row">
          <input type="text" id="omniflow-lead-name" placeholder="Name" required />
          <input type="email" id="omniflow-lead-email" placeholder="Email" required />
        </div>
        <button id="omniflow-start-chat">Start Chat</button>
      </div>` : ''}
      <div id="omniflow-chat-body">
        <div class="omniflow-msg agent">Hi there! How can we help you today?</div>
      </div>
      <div id="omniflow-chat-footer" style="${!leadData ? 'display: none;' : ''}">
        <input type="text" id="omniflow-chat-input" placeholder="Type a message..." />
        <button id="omniflow-chat-send">Send</button>
      </div>
    `;

    container.appendChild(chatWindow);
    container.appendChild(bubble);
    document.body.appendChild(container);

    // Event Listeners
    bubble.addEventListener('click', () => {
      chatWindow.classList.toggle('open');
    });

    document.getElementById('omniflow-chat-close').addEventListener('click', () => {
      chatWindow.classList.remove('open');
    });

    if (!leadData) {
      document.getElementById('omniflow-start-chat').addEventListener('click', () => {
        const name = document.getElementById('omniflow-lead-name').value;
        const email = document.getElementById('omniflow-lead-email').value;
        if (name && email) {
          leadData = { name, email };
          localStorage.setItem('omniflow_lead_data', JSON.stringify(leadData));
          document.getElementById('omniflow-lead-form').style.display = 'none';
          document.getElementById('omniflow-chat-footer').style.display = 'flex';
          
          socket.emit('widget_init_lead', { ...leadData, workspaceId: 'ws-apex-main' }, (response) => {
            conversationId = response.conversationId;
            localStorage.setItem('omniflow_conv_id', conversationId);
            appendMessage('agent', 'Thanks! An agent or AI will be with you shortly.');
          });
        }
      });
    } else if (conversationId) {
      socket.emit('widget_reconnect', { conversationId });
    }

    const input = document.getElementById('omniflow-chat-input');
    const sendBtn = document.getElementById('omniflow-chat-send');

    function sendMessage() {
      const text = input.value.trim();
      if (text && conversationId) {
        appendMessage('user', text);
        socket.emit('widget_send_message', {
          conversationId,
          content: text,
          senderName: leadData.name
        });
        input.value = '';
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Socket listeners for incoming messages
    socket.on('widget_receive_message', (msg) => {
      appendMessage('agent', msg.content);
    });
  }

  function appendMessage(senderType, text) {
    const body = document.getElementById('omniflow-chat-body');
    const msgDiv = document.createElement('div');
    msgDiv.className = \`omniflow-msg \${senderType}\`;
    msgDiv.textContent = text;
    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight;
  }
})();
