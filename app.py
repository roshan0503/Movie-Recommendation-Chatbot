from flask import Flask, render_template, request, jsonify, session
import google.generativeai as genai
import os
import re
from datetime import datetime
import uuid

app = Flask(__name__)
app.secret_key = 'cinebot-secret-key-2024'

# Configure Google Gemini 2.0 Flash (FREE!)
GOOGLE_API_KEY = "AIzaSyCHMzFi-b09CUZwbqu9x8oiwpSZw4MvH6c"
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Gemini 2.0 Flash model
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Professional system prompt for CineBot
SYSTEM_PROMPT = """You are CineBot, a professional movie recommendation assistant. Follow these rules strictly:

1. Always respond in a conversational, helpful tone
2. Format movie suggestions as numbered lists with clear structure
3. Include movie year in parentheses
4. Mention streaming platforms when possible
5. Use appropriate emojis sparingly but effectively
6. Keep responses under 200 words
7. NEVER use asterisks (*) or markdown formatting
8. Structure your response like this:

Here are some great [genre] movies for you:

1. [Movie Title] ([Year]) - [Brief description] 
2. [Movie Title] ([Year]) - [Brief description]
3. [Movie Title] ([Year]) - [Brief description]

Available on: Netflix, Prime Video, etc.

Always be professional, concise, and enthusiastic about movies!"""

def format_response(text):
    """Clean and format the AI response for professional display"""
    # Remove any asterisks and clean up formatting
    text = re.sub(r'\*+', '', text)
    
    # Convert numbered lists to proper HTML format
    lines = text.split('\n')
    formatted_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Format numbered movie suggestions
        if re.match(r'^\d+\.', line):
            # Extract movie title and make it bold
            movie_match = re.search(r'^\d+\.\s*([^(]+)\s*\((\d{4})\)', line)
            if movie_match:
                title = movie_match.group(1).strip()
                year = movie_match.group(2)
                rest = line[movie_match.end():].strip()
                if rest.startswith(' - '):
                    rest = rest[3:]
                formatted_line = f"<div class='movie-suggestion'><strong>{title}</strong> ({year}) - {rest}</div>"
            else:
                formatted_line = f"<div class='movie-suggestion'>{line}</div>"
        else:
            formatted_line = f"<p>{line}</p>"
            
        formatted_lines.append(formatted_line)
    
    return ''.join(formatted_lines)

@app.route('/')
def index():
    """Serve the CineBot chat interface"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        session['chat_history'] = []
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages and return CineBot responses"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        if 'chat_history' not in session:
            session['chat_history'] = []
        
        # Create conversation context with movie focus
        conversation_context = SYSTEM_PROMPT + "\n\n"
        
        # Add recent chat history for context (last 6 messages)
        recent_history = session['chat_history'][-6:]
        for msg in recent_history:
            if msg['role'] == 'user':
                conversation_context += f"User: {msg['content']}\n"
            elif msg['role'] == 'assistant':
                conversation_context += f"CineBot: {msg['content']}\n"
        
        # Add current user message
        conversation_context += f"User: {user_message}\nCineBot: "
        
        # Call Gemini 2.0 Flash API
        response = model.generate_content(
            conversation_context,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=300,
                top_p=0.8,
                top_k=40
            )
        )
        
        ai_reply = response.text.strip()
        
        # Format the response professionally
        formatted_reply = format_response(ai_reply)
        
        # Add messages to history
        session['chat_history'].append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now().isoformat()
        })
        
        session['chat_history'].append({
            'role': 'assistant',
            'content': formatted_reply,
            'timestamp': datetime.now().isoformat()
        })
        
        session.modified = True
        
        return jsonify({
            'reply': formatted_reply,
            'status': 'success',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'CineBot error: {str(e)}',
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
