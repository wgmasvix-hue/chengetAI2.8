
import React, { useState, useRef, useEffect } from 'react';
import { getAIClient } from '../services/geminiService';
import { ChatMessage, DigitalAsset } from '../types';
import { MODELS, AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { generateSpeech, decodeAudio, decodeAudioData } from '../services/geminiService';

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [autoVoice, setAutoVoice] = useState<boolean>(() => {
    return localStorage.getItem('libra_taurai_autovoice') === 'true';
  });

  const [isSearchEnabled, setIsSearchEnabled] = useState<boolean>(() => {
    return localStorage.getItem('libra_taurai_search') === 'true';
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  // Function to gather local library context
  const getLibraryContext = () => {
    const vault: DigitalAsset[] = JSON.parse(localStorage.getItem('lib50_digital_vault') || '[]');
    return `
      Library Vault Contents:
      ${vault.length > 0 ? vault.map(a => `- ${a.title} (${a.category})`).join('\n') : 'No items currently in vault.'}
    `;
  };

  const SYSTEM_INSTRUCTION = `
    You are TAURAI, the AI Research Assistant for LibraryStudio 5.0.
    
    Your primary role is to assist students, researchers, and staff by providing accurate information, summarizing resources, and helping with library-related tasks.
    
    Use the following context from the library's digital vault to answer questions:
    ${getLibraryContext()}
    
    If the user asks about topics not in the vault, use your general knowledge to assist them.
    Be helpful, concise, and professional.
  `;

  useEffect(() => {
    localStorage.setItem('libra_taurai_autovoice', autoVoice.toString());
  }, [autoVoice]);

  useEffect(() => {
    localStorage.setItem('libra_taurai_search', isSearchEnabled.toString());
  }, [isSearchEnabled]);

  const startListening = (manualTrigger: boolean = false) => {
    if (isListening) return;

    if ('webkitSpeechRecognition' in window) {
      try {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-ZA';
        
        recognition.onstart = () => setIsListening(true);
        
        recognition.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };
        
        recognition.onerror = (e: any) => {
          if (manualTrigger) console.warn("Speech recognition error:", e);
          setIsListening(false);
        };
        
        recognition.onend = () => setIsListening(false);
        
        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition", e);
        setIsListening(false);
      }
    } else {
      if (manualTrigger) {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: "Hello! I am TAURAI, your library assistant. How can I help you today?",
        timestamp: Date.now()
      }]);
      
      // Auto-start listening on mount
      setTimeout(() => startListening(false), 800);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopAudio = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const speakText = async (text: string) => {
    stopAudio();
    setIsSpeaking(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      }
      const base64 = await generateSpeech(text, 'Kore'); 
      const buffer = await decodeAudioData(decodeAudio(base64), audioContextRef.current, AUDIO_SAMPLE_RATE_OUTPUT, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsSpeaking(false);
      currentSourceRef.current = source;
      source.start();
    } catch (e) {
      console.error("Speech synthesis failed:", e);
      setIsSpeaking(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(true);
    }
  };

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
    stopAudio();

    try {
      const ai = getAIClient();
      
      const response = await ai.models.generateContent({
        model: MODELS.REASONING,
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: input }] }
        ],
        config: {
          thinkingConfig: { thinkingBudget: 16000 },
          tools: isSearchEnabled ? [{ googleSearch: {} }] : undefined
        },
      });

      const textResponse = response.text || "I couldn't generate a response.";
      
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          uri: chunk.web.uri,
          title: chunk.web.title
        }));

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: textResponse,
        timestamp: Date.now(),
        groundingUrls: urls.length > 0 ? urls : undefined
      };
      
      setMessages(prev => [...prev, modelMsg]);

      if (autoVoice) {
        speakText(textResponse);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'model',
        text: "An error occurred while processing your request.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-6 py-8 bg-[#fdfdfb] relative overflow-hidden">
      <header className="mb-8 flex items-center justify-between border-b border-zinc-200 pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 bg-[#136f6f] rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-700 ${isSpeaking ? 'scale-110 ring-8 ring-teal-500/10' : ''}`}>
            {isSpeaking ? '🗣️' : '✨'}
          </div>
          <div>
            <h1 className="text-2xl font-black google-sans text-zinc-900 tracking-tighter uppercase">Taurai <span className="text-[#136f6f]">V5</span></h1>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">AI Research Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSearchEnabled(!isSearchEnabled)}
            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isSearchEnabled ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-200 text-zinc-400'}`}
          >
            Global Search {isSearchEnabled ? 'On' : 'Off'}
          </button>
          <button 
            onClick={() => { setAutoVoice(!autoVoice); if (autoVoice) stopAudio(); }}
            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${autoVoice ? 'bg-[#136f6f] text-white border-[#136f6f]' : 'bg-white border-zinc-200 text-zinc-400'}`}
          >
            Voice {autoVoice ? 'On' : 'Off'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-8 pb-32 custom-scrollbar relative z-10 px-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[2.5rem] p-8 shadow-sm relative group transition-all duration-500 ${
              m.role === 'user' 
                ? 'bg-zinc-900 text-zinc-100 shadow-zinc-900/10' 
                : 'bg-white border border-zinc-100 text-zinc-800'
            }`}>
              {m.role === 'model' && (
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#136f6f] rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#136f6f]">Assistant</span>
                  </div>
                  <button onClick={() => isSpeaking ? stopAudio() : speakText(m.text)} className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-xs opacity-60 hover:opacity-100 transition-opacity">
                    {isSpeaking ? '⏹' : '🔊'}
                  </button>
                </div>
              )}
              <div className="text-sm leading-[1.8] font-medium whitespace-pre-wrap">
                {m.text}
              </div>

              {m.groundingUrls && m.groundingUrls.length > 0 && (
                <div className="mt-8 pt-6 border-t border-zinc-50">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-3">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {m.groundingUrls.map((source, i) => (
                      <a key={i} href={source.uri} target="_blank" className="px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-[9px] font-bold text-[#136f6f] hover:bg-teal-50 transition-colors">
                        {source.title} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-4 p-8 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-[#136f6f] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-[#136f6f] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-[#136f6f] rounded-full animate-bounce"></div>
            </div>
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Processing...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#fdfdfb] via-[#fdfdfb] to-transparent z-20">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center gap-4">
          <button
            type="button"
            onClick={handleMicClick}
            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all shadow-xl ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-zinc-200 text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
          >
            {isListening ? '⏹' : '🎙️'}
          </button>
          <div className="flex-1 relative group">
             <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-white border border-zinc-200 rounded-[1.8rem] py-5 px-10 text-sm focus:outline-none focus:border-[#136f6f] shadow-2xl transition-all pr-20"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-3 bottom-3 w-12 h-12 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-[1.2rem] flex items-center justify-center transition-all shadow-lg disabled:opacity-30"
            >
              ➔
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;
