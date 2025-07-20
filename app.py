from flask import Flask, render_template, request, jsonify, session
import openai
import os
from datetime import datetime
import uuid

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this in production

# OpenAI API Key
openai.api_key = "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"

# System prompt for GPT-4
SYSTEM_PROMPT = """You are a friendly movie assistant. Your tone is casual and short. Reply with emojis where appropriate. 
Suggest movies by genre, platform, year, and mood. Keep responses under 200 words and always include emojis. 
Format your suggestions with numbers or bullet points for easy reading."""

@app.route('/')
def index():
    """Serve the main chat interface"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        session['chat_history'] = []
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages and return GPT-4 responses"""
    try:
        # Get user message from request
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Initialize chat history if not exists
        if 'chat_history' not in session:
            session['chat_history'] = []
        
        # Add user message to history
        session['chat_history'].append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now().isoformat()
        })
        
        # Prepare messages for OpenAI API
        messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
        
        # Add recent chat history (last 10 messages to maintain context)
        recent_history = session['chat_history'][-10:]
        for msg in recent_history:
            if msg['role'] in ['user', 'assistant']:
                messages.append({
                    'role': msg['role'],
                    'content': msg['content']
                })
        
        # Call OpenAI GPT-4 API
        response = openai.ChatCompletion.create(
            model="gpt-4",  # or "gpt-4-turbo" if available
            messages=messages,
            max_tokens=300,
            temperature=0.7,
            top_p=1.0,
            frequency_penalty=0.0,
            presence_penalty=0.0
        )
        
        # Extract AI response
        ai_reply = response.choices[0].message.content.strip()
        
        # Add AI response to history
        session['chat_history'].append({
            'role': 'assistant',
            'content': ai_reply,
            'timestamp': datetime.now().isoformat()
        })
        
        # Save session
        session.modified = True
        
        return jsonify({
            'reply': ai_reply,
            'status': 'success',
            'timestamp': datetime.now().isoformat()
        })
        
    except openai.error.AuthenticationError:
        return jsonify({
            'error': 'OpenAI API authentication failed. Please check your API key.',
            'status': 'error'
        }), 401
        
    except openai.error.RateLimitError:
        return jsonify({
            'error': 'OpenAI API rate limit exceeded. Please try again later.',
            'status': 'error'
        }), 429
        
    except openai.error.APIError as e:
        return jsonify({
            'error': f'OpenAI API error: {str(e)}',
            'status': 'error'
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/clear-chat', methods=['POST'])
def clear_chat():
    """Clear chat history"""
    session['chat_history'] = []
    session.modified = True
    return jsonify({'status': 'success', 'message': 'Chat history cleared'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
