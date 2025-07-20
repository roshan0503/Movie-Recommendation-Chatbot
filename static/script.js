// CineBot Enhanced Script
let isLoading = false;
let messageCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('message-input').focus();
    
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    const messageInput = document.getElementById('message-input');
    messageInput.addEventListener('input', function() {
        const remaining = 500 - this.value.length;
        if (remaining < 50) {
            this.style.borderColor = remaining < 0 ? '#ef4444' : '#f59e0b';
        } else {
            this.style.borderColor = '';
        }
    });
});

async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message || isLoading) {
        return;
    }
    
    if (message.length > 500) {
        showError('Message is too long. Please keep it under 500 characters.');
        return;
    }
    
    messageInput.value = '';
    setInputState(false);
    
    addMessage(message, 'user');
    showLoading();
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (response.ok && data.status === 'success') {
            addMessage(data.reply, 'ai', data.timestamp);
        } else {
            const errorMsg = data.error || 'Something went wrong. Please try again.';
            addMessage(`❌ ${errorMsg}`, 'ai', null, true);
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideLoading();
        addMessage('❌ Network error. Please check your connection and try again.', 'ai', null, true);
    } finally {
        setInputState(true);
    }
}

function addMessage(content, sender, timestamp = null, isError = false) {
    const messagesContainer = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    
    messageCount++;
    
    const messageClass = sender === 'user' ? 'user-message' : 'ai-message';
    const avatarContent = sender === 'user' ? 
        `<img src="/static/assets/user-avatar.png" alt="User" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="fallback-avatar" style="display: none;"><i class="fas fa-user"></i></div>` :
        `<img src="/static/assets/ai-avatar.png" alt="CineBot" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="fallback-avatar" style="display: none;"><i class="fas fa-film"></i></div>`;
    
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    }) : new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.className = `message ${messageClass} new`;
    messageDiv.innerHTML = `
        <div class="avatar">
            ${avatarContent}
        </div>
        <div class="message-content ${isError ? 'error-message' : ''}">
            ${sender === 'ai' && !isError ? '<div class="bot-name">CineBot</div>' : ''}
            ${formatMessage(content)}
            <small class="timestamp">${timeStr}</small>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    setTimeout(() => {
        messageDiv.classList.remove('new');
    }, 500);
}

function formatMessage(content) {
    // If content already contains HTML (from backend formatting), use it directly
    if (content.includes('<div') || content.includes('<p>') || content.includes('<strong>')) {
        return content;
    }
    
    // Otherwise, convert plain text to paragraphs
    return content
        .split('\n')
        .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '')
        .join('');
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function showLoading() {
    const loadingContainer = document.getElementById('loading-container');
    loadingContainer.style.display = 'block';
    isLoading = true;
    scrollToBottom();
}

function hideLoading() {
    const loadingContainer = document.getElementById('loading-container');
    loadingContainer.style.display = 'none';
    isLoading = false;
}

function setInputState(enabled) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    
    if (enabled) {
        messageInput.focus();
    }
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messages-container');
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

async function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) {
        return;
    }
    
    try {
        const response = await fetch('/clear-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const messagesContainer = document.getElementById('messages-container');
            const welcomeMessage = document.getElementById('welcome-message');
            messagesContainer.innerHTML = '';
            messagesContainer.appendChild(welcomeMessage);
            
            messageCount = 0;
            showSuccess('Chat history cleared! 🧹');
        }
    } catch (error) {
        console.error('Error clearing chat:', error);
        showError('Failed to clear chat history.');
    }
}

function showError(message) {
    addMessage(`❌ ${message}`, 'ai', null, true);
}

function showSuccess(message) {
    addMessage(`✅ ${message}`, 'ai');
}
