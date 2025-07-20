// Global variables
let isLoading = false;
let messageCount = 0;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Focus on input
    document.getElementById('message-input').focus();
    
    // Add enter key listener
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize input (optional enhancement)
    const messageInput = document.getElementById('message-input');
    messageInput.addEventListener('input', function() {
        // Limit character count visual feedback could be added here
        const remaining = 500 - this.value.length;
        if (remaining < 50) {
            this.style.borderColor = remaining < 0 ? '#ef4444' : '#f59e0b';
        } else {
            this.style.borderColor = '';
        }
    });
});

// Send message function
async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    // Validation
    if (!message || isLoading) {
        return;
    }
    
    if (message.length > 500) {
        showError('Message is too long. Please keep it under 500 characters.');
        return;
    }
    
    // Clear input and disable
    messageInput.value = '';
    setInputState(false);
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Show loading
    showLoading();
    
    try {
        // Send to backend
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        // Hide loading
        hideLoading();
        
        if (response.ok && data.status === 'success') {
            // Add AI response
            addMessage(data.reply, 'ai', data.timestamp);
        } else {
            // Handle error response
            const errorMsg = data.error || 'Something went wrong. Please try again.';
            addMessage(`❌ ${errorMsg}`, 'ai', null, true);
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideLoading();
        addMessage('❌ Network error. Please check your connection and try again.', 'ai', null, true);
    } finally {
        // Re-enable input
        setInputState(true);
    }
}

// Add message to chat
function addMessage(content, sender, timestamp = null, isError = false) {
    const messagesContainer = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    
    messageCount++;
    
    const messageClass = sender === 'user' ? 'user-message' : 'ai-message';
    const avatarIcon = sender === 'user' ? 'fas fa-user' : 'fas fa-film';
    
    // Format timestamp
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
            <i class="${avatarIcon}"></i>
        </div>
        <div class="message-content ${isError ? 'error-message' : ''}">
            ${formatMessage(content)}
            <small class="timestamp">${timeStr}</small>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    // Remove animation class after animation completes
    setTimeout(() => {
        messageDiv.classList.remove('new');
    }, 500);
}

// Format message content (convert newlines, etc.)
function formatMessage(content) {
    return content
        .split('\n')
        .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '')
        .join('');
}

// Escape HTML to prevent XSS
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

// Show loading animation
function showLoading() {
    const loadingContainer = document.getElementById('loading-container');
    loadingContainer.style.display = 'block';
    isLoading = true;
    scrollToBottom();
}

// Hide loading animation
function hideLoading() {
    const loadingContainer = document.getElementById('loading-container');
    loadingContainer.style.display = 'none';
    isLoading = false;
}

// Set input state (enabled/disabled)
function setInputState(enabled) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    
    if (enabled) {
        messageInput.focus();
    }
}

// Scroll to bottom of messages
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages-container');
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// Clear chat function
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
            // Clear messages except welcome message
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

// Show error message
function showError(message) {
    addMessage(`❌ ${message}`, 'ai', null, true);
}

// Show success message
function showSuccess(message) {
    addMessage(`✅ ${message}`, 'ai');
}

// Handle page visibility change (pause/resume animations if needed)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, could pause animations
    } else {
        // Page is visible, ensure input focus
        if (!isLoading) {
            document.getElementById('message-input').focus();
        }
    }
});

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('message-input').focus();
    }
    
    // Ctrl/Cmd + L to clear chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        clearChat();
    }
});
