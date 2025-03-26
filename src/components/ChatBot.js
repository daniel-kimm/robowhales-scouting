import React, { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

function ChatBot() {
  // Initialize messages from localStorage or use default
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem('chatHistory');
    return savedMessages ? JSON.parse(savedMessages) : [
      { 
        role: 'assistant', 
        content: 'Hi! I\'m the RoboWhales Scout Assistant. Ask me about team performance, match data, or strategy recommendations!' 
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format message content with minimal line spacing
  const formatMessage = (content) => {
    if (!content) return '';
    
    // Replace headers with styled elements
    content = content.replace(/### (.*?)(?:\n|$)/g, '<div class="message-heading-3">$1</div>');
    content = content.replace(/## (.*?)(?:\n|$)/g, '<div class="message-heading-2">$1</div>');
    content = content.replace(/# (.*?)(?:\n|$)/g, '<div class="message-heading-1">$1</div>');
    
    // Format numbered lists with minimal spacing
    content = content.replace(/(\d+\.\s+)([^\n]+)/g, '<div class="list-item">$1$2</div>');
    
    // Format bullet points with minimal spacing
    content = content.replace(/- (.*?)(?:\n|$)/g, '<div class="list-item-bullet">• $1</div>');
    
    // Convert line breaks to span tags for better control
    content = content.replace(/\n/g, '<br class="compact-break">');
    
    // Remove asterisks completely
    content = content.replace(/\*/g, '');
    
    return content;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Get conversation history (excluding the initial greeting)
      const conversationHistory = messages.length > 1 ? messages : [];
      
      // Use different API URL based on environment
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3002/api/chat'
        : '/api/chat';
      
      console.log("Sending request to:", apiUrl);
      
      // Call the API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input,
          conversationHistory: conversationHistory
        }),
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        let errorMessage = 'API request failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("API error details:", errorData);
        } catch (e) {
          console.error("Couldn't parse error response:", e);
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("API response:", data);
      
      const aiMessage = { 
        role: 'assistant', 
        content: data.response,
        context: data.context
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error in chat:', error);
      setError(error.message || 'An unknown error occurred');
      
      // Add error message to chat
      const errorMessage = { 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${error.message}. Please try again later.`
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // clear chat history
  const clearChatHistory = () => {
    const initialMessage = { 
      role: 'assistant', 
      content: 'Hi! I\'m the RoboWhales Scout Assistant. Ask me about team performance, match data, or strategy recommendations!' 
    };
    setMessages([initialMessage]);
  };

  return (
    <div className="container">
      <div className="chatbot-header">
        <h2 className="chatbot-title">Scout Assistant</h2>
        <button 
          className="clear-chat-button" 
          onClick={clearChatHistory}
          title="Clear chat history"
        >
          Clear Chat
        </button>
      </div>
      <div className="chatbot-container">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div 
                className="message-content"
                dangerouslySetInnerHTML={{ __html: 
                  message.role === 'assistant' 
                    ? formatMessage(message.content) 
                    : message.content 
                }}
              />
              {message.context && (
                <div className="message-context">
                  {message.context.teamsAnalyzed?.length > 0 && (
                    <small>Teams analyzed: {message.context.teamsAnalyzed.join(', ')}</small>
                  )}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about team performance, strategy, or match analysis..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatBot; 