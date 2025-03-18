import React, { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

function ChatBot() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hi! I\'m the RoboWhales Scout Assistant. Ask me about team performance, match data, or strategy recommendations!' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      
      // Call the API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input,
          conversationHistory: conversationHistory
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }
      
      const data = await response.json();
      
      const aiMessage = { 
        role: 'assistant', 
        content: data.response,
        context: data.context
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling chat API:', error);
      setError(error.message);
      
      // Show error message
      const errorMessage = { 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${error.message}. Please try again later.` 
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle example question clicks
  const handleExampleClick = (question) => {
    setInput(question);
  };

  return (
    <div className="container">
      <h2>Scout Assistant</h2>
      <div className="chatbot-container">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-content">{message.content}</div>
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
      
      <div className="chatbot-help">
        <h3>Example Questions</h3>
        <ul>
          <li onClick={() => handleExampleClick("How did team 9032 perform in their matches?")}>
            How did team 9032 perform in their matches?
          </li>
          <li onClick={() => handleExampleClick("Which teams are best at climbing?")}>
            Which teams are best at climbing?
          </li>
          <li onClick={() => handleExampleClick("What strategy should we use against team 254?")}>
            What strategy should we use against team 254?
          </li>
          <li onClick={() => handleExampleClick("Compare the performance of teams 9032 and 2590")}>
            Compare the performance of teams 9032 and 2590
          </li>
          <li onClick={() => handleExampleClick("What happened in match 15?")}>
            What happened in match 15?
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ChatBot; 