
import React, { useState, useRef, useEffect } from 'react';
import { generateReasoningResponse } from '../services/geminiService';
import { ChatMessage } from '../types';

const ReasoningChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateReasoningResponse(input);
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I couldn't generate a response.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Error connecting to the advanced reasoning engine.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-6">
      <header className="py-8">
        <h1 className="text-3xl font-bold google-sans flex items-center gap-3">
          <span className="text-blue-500">🧠</span> Advanced Reasoning
        </h1>
        <p className="text-zinc-400 mt-2">High-fidelity cognitive processing enabled for industrial queries.</p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-6 pb-24 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-3xl border border-white/10">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-3xl mb-4">💡</div>
            <h3 className="text-xl font-medium mb-2">Start a Deep Reasoning Session</h3>
            <p className="text-zinc-500 max-w-sm">Ask complex logic questions, mathematical problems, or architecture design queries.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                : 'bg-zinc-800/50 border border-white/5 text-zinc-200'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-50">
                {m.role === 'user' ? 'You' : 'Intelligence Engine'}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-sm text-zinc-400">Processing complex reasoning...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d] to-transparent">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your complex query..."
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-xl"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 w-12 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl flex items-center justify-center transition-colors"
          >
            <span className="text-xl">➔</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReasoningChat;
