'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface MatchChatProps {
  homeTeam: string;
  awayTeam: string;
  eventId: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function MatchChat({ homeTeam, awayTeam, eventId }: MatchChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/match-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          homeTeam,
          awayTeam,
          question: userMessage,
        }),
      });

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response || 'Sorry, please try again.' },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 px-4 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-blue-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Ask AI for More Options
      </button>

      {isOpen && (
        <div className="p-4 bg-gray-50 space-y-3">
          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'}`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="ml-0">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about corners, cards, players..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
