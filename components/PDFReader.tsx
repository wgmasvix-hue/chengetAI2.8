import React, { useState, useEffect, useRef } from 'react';
import { 
  generateReasoningResponse, 
  getAIClient, 
  encodeAudio, 
  decodeAudio, 
  decodeAudioData 
} from '../services/geminiService';
import { MODELS, AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { LiveServerMessage, Modality, Blob } from '@google/genai';

interface PDFReaderProps {
  url: string;
  title: string;
  onClose: () => void;
}

interface SmartBriefing {
  summary: string;
  objectives: string[];
  concepts: string[];
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  note?: string;
}

type ReaderTheme = 'onyx' | 'sepia' | 'light';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';

const PDFReader: React.FC<PDFReaderProps> = ({ url, title, onClose }) => {
  const [activeTab, setActiveTab] = useState<'briefing' | 'interrogate' | 'voice' | 'bookmarks'>('briefing');
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [briefing, setBriefing] = useState<SmartBriefing | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  
  // Preferences State
  const [theme, setTheme] = useState<ReaderTheme>(() => (localStorage.getItem('reader_theme') as ReaderTheme) || 'onyx');
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('reader_font_size') as FontSize) || 'base');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => JSON.parse(localStorage.getItem('lib50_bookmarks') || '[]'));
  const [isPrefMenuOpen, setIsPrefMenuOpen] = useState(false);

  // Live Voice Refs
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('reader_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('reader_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('lib50_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Initial Briefing Generation
  useEffect(() => {
    const generateBriefing = async () => {
      try {
        const prompt = `Act as a Senior Academic Registrar. Provide a structured "Smart Briefing" for the book "${title}". 
        Format as JSON: {
          "summary": "1-paragraph academic summary",
          "objectives": ["Goal 1", "Goal 2", "Goal 3"],
          "concepts": ["Term 1", "Term 2", "Term 3"]
        }`;
        const res = await generateReasoningResponse(prompt);
        const data = JSON.parse(res.text?.match(/\{.*\}/s)?.[0] || '{}');
        setBriefing(data);
      } catch (e) {
        console.error("Briefing failed", e);
      }
    };
    generateBriefing();
  }, [title]);

  const handleInterrogate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const prompt = `Using the context of the book "${title}", answer: "${query}". Be highly academic and precise.`;
      const res = await generateReasoningResponse(prompt);
      setAiResponse(res.text || "Insight generation failed.");
    } catch (err) {
      setAiResponse("Cognitive link error.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addBookmark = () => {
    const newB: Bookmark = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      url,
      timestamp: Date.now()
    };
    setBookmarks(prev => [newB, ...prev]);
    setActiveTab('bookmarks');
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const startLiveTutor = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = getAIClient();
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      audioContextRef.current = { input: inCtx, output: outCtx };

      const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob: Blob = { data: encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decodeAudio(audioData), outCtx, AUDIO_SAMPLE_RATE_OUTPUT, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: () => setIsLiveActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are an expert academic tutor for the book "${title}". Use the user's voice input to explain concepts, clarify chapters, and encourage critical thinking. Be supportive and scholarly.`,
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { console.error(err); }
  };

  const stopLiveTutor = () => {
    sessionRef.current?.close();
    setIsLiveActive(false);
  };

  // Theme Styles
  const themes = {
    onyx: {
      bg: 'bg-[#09090b]',
      sidebarBg: 'bg-[#0c0c0e]',
      text: 'text-zinc-100',
      mutedText: 'text-zinc-500',
      accent: 'text-teal-500',
      border: 'border-white/5',
      input: 'bg-white/[0.03]',
      card: 'bg-zinc-900',
      btn: 'bg-zinc-800'
    },
    sepia: {
      bg: 'bg-[#f4ecd8]',
      sidebarBg: 'bg-[#ebe2c9]',
      text: 'text-[#5b4636]',
      mutedText: 'text-[#8c7862]',
      accent: 'text-[#136f6f]',
      border: 'border-[#dcd2b8]',
      input: 'bg-black/[0.03]',
      card: 'bg-[#dfd5bc]',
      btn: 'bg-[#dfd5bc]'
    },
    light: {
      bg: 'bg-[#f8f9fa]',
      sidebarBg: 'bg-white',
      text: 'text-zinc-900',
      mutedText: 'text-zinc-400',
      accent: 'text-[#136f6f]',
      border: 'border-zinc-200',
      input: 'bg-zinc-50',
      card: 'bg-white',
      btn: 'bg-zinc-100'
    }
  };

  const currentTheme = themes[theme];
  const fontSizes = { sm: 'text-xs', base: 'text-sm', lg: 'text-lg', xl: 'text-xl' };

  return (
    <div className={`fixed inset-0 z-[200] ${currentTheme.bg} flex flex-col animate-in fade-in duration-500`}>
      {/* Unified Header */}
      <header className={`h-20 ${currentTheme.bg} border-b ${currentTheme.border} px-8 flex items-center justify-between shadow-2xl relative z-[210]`}>
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose}
            className={`w-12 h-12 flex items-center justify-center ${currentTheme.mutedText} hover:text-current hover:bg-current/5 rounded-2xl transition-all`}
          >
            <span className="text-xl">✕</span>
          </button>
          <div className={`h-10 w-[1px] ${currentTheme.border}`}></div>
          <div>
            <h2 className={`text-base font-black ${currentTheme.text} truncate max-w-lg tracking-tight google-sans`}>{title}</h2>
            <div className="flex items-center gap-3 mt-1">
               <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#136f6f]/10 text-[#136f6f]`}>Smart Reader Pro</span>
               <span className={`text-[9px] font-bold ${currentTheme.mutedText} uppercase tracking-widest`}>Theme: {theme}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className={`flex items-center gap-2 ${currentTheme.btn} p-1 rounded-2xl border ${currentTheme.border}`}>
            <button onClick={() => setActiveTab('briefing')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'briefing' ? 'bg-[#136f6f] text-white' : currentTheme.mutedText}`}>Brief</button>
            <button onClick={() => setActiveTab('interrogate')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'interrogate' ? 'bg-[#136f6f] text-white' : currentTheme.mutedText}`}>Scholar</button>
            <button onClick={() => setActiveTab('voice')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'voice' ? 'bg-[#136f6f] text-white' : currentTheme.mutedText}`}>Talk</button>
            <button onClick={() => setActiveTab('bookmarks')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bookmarks' ? 'bg-[#136f6f] text-white' : currentTheme.mutedText}`}>Saved</button>
          </div>

          <div className="h-8 w-[1px] bg-zinc-800/20 mx-2"></div>

          <div className="relative">
            <button 
              onClick={() => setIsPrefMenuOpen(!isPrefMenuOpen)}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl border ${currentTheme.border} ${currentTheme.text} hover:scale-105 transition-all`}
              title="Reading Preferences"
            >
              <span className="text-lg">Aa</span>
            </button>
            
            {isPrefMenuOpen && (
              <div className={`absolute top-16 right-0 w-64 ${currentTheme.card} border ${currentTheme.border} rounded-3xl p-6 shadow-2xl animate-in zoom-in-95`}>
                <div className="mb-6">
                  <p className={`text-[10px] font-black ${currentTheme.mutedText} uppercase tracking-widest mb-3`}>Theme</p>
                  <div className="flex gap-2">
                    {(['onyx', 'sepia', 'light'] as ReaderTheme[]).map(t => (
                      <button 
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`flex-1 aspect-square rounded-xl border-2 transition-all ${theme === t ? 'border-[#136f6f]' : 'border-transparent'} ${t === 'onyx' ? 'bg-zinc-900' : t === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className={`text-[10px] font-black ${currentTheme.mutedText} uppercase tracking-widest mb-3`}>Sidebar Font Size</p>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                    {(['sm', 'base', 'lg', 'xl'] as FontSize[]).map(s => (
                      <button 
                        key={s}
                        onClick={() => setFontSize(s)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${fontSize === s ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500'}`}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={addBookmark}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-[#136f6f] text-white shadow-xl hover:scale-110 transition-all`}
            title="Bookmark this Page"
          >
            <span className="text-xl">🔖</span>
          </button>
        </div>
      </header>

      {/* Main split-screen layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Rendering Zone */}
        <div className={`flex-1 relative flex items-center justify-center p-6 ${theme === 'sepia' ? 'bg-[#dfd5bc]' : theme === 'light' ? 'bg-zinc-200' : 'bg-[#121214]'}`}>
          <div className={`w-full h-full max-w-5xl ${currentTheme.card} rounded-[2rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border ${currentTheme.border}`}>
            <iframe 
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-none opacity-95"
              title="Academic Content"
            />
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <aside className={`w-[450px] ${currentTheme.sidebarBg} border-l ${currentTheme.border} flex flex-col shadow-2xl`}>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
            {activeTab === 'briefing' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <section>
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 ${currentTheme.accent}`}>Executive Summary</h3>
                  {briefing ? (
                    <p className={`${fontSizes[fontSize]} ${currentTheme.text} leading-relaxed italic opacity-80`}>{briefing.summary}</p>
                  ) : (
                    <div className="space-y-2 animate-pulse">
                      <div className={`h-3 ${currentTheme.btn} rounded-full w-full`}></div>
                      <div className={`h-3 ${currentTheme.btn} rounded-full w-[90%]`}></div>
                      <div className={`h-3 ${currentTheme.btn} rounded-full w-[40%]`}></div>
                    </div>
                  )}
                </section>

                <section>
                   <h3 className={`text-[10px] font-black ${currentTheme.mutedText} uppercase tracking-[0.4em] mb-6`}>Learning Objectives</h3>
                   <div className="space-y-3">
                     {briefing?.objectives.map((obj, i) => (
                       <div key={i} className={`flex gap-4 p-4 ${currentTheme.input} border ${currentTheme.border} rounded-2xl`}>
                         <span className={`${currentTheme.accent} font-black`}>0{i+1}</span>
                         <span className={`${fontSizes[fontSize]} ${currentTheme.text} font-medium opacity-80`}>{obj}</span>
                       </div>
                     ))}
                   </div>
                </section>

                <section>
                   <h3 className={`text-[10px] font-black ${currentTheme.mutedText} uppercase tracking-[0.4em] mb-6`}>Core Concepts</h3>
                   <div className="flex flex-wrap gap-2">
                     {briefing?.concepts.map((concept, i) => (
                       <span key={i} className={`px-3 py-1.5 ${currentTheme.btn} ${currentTheme.text} rounded-lg text-[10px] font-bold uppercase tracking-wider border ${currentTheme.border} hover:scale-105 transition-transform cursor-help`}>
                         {concept}
                       </span>
                     ))}
                   </div>
                </section>
              </div>
            )}

            {activeTab === 'interrogate' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <header>
                   <h3 className={`text-xl font-bold ${currentTheme.text} google-sans mb-2`}>Interrogate the Text</h3>
                   <p className={`text-xs ${currentTheme.mutedText}`}>Ask deep reasoning questions grounded in this specific document's domain.</p>
                </header>

                <form onSubmit={handleInterrogate} className="space-y-4">
                  <textarea 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Compare this text's approach to industrialization with modern benchmarks..."
                    className={`w-full ${currentTheme.input} border ${currentTheme.border} rounded-[2rem] p-6 text-sm ${currentTheme.text} focus:outline-none focus:border-[#136f6f] resize-none h-40 shadow-inner`}
                  />
                  <button 
                    type="submit"
                    disabled={isAnalyzing || !query.trim()}
                    className="w-full py-5 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-30"
                  >
                    {isAnalyzing ? 'Analyzing Document Architecture...' : 'Submit to Reasoning Engine'}
                  </button>
                </form>

                {aiResponse && (
                  <div className={`p-8 ${currentTheme.card} border ${currentTheme.border} rounded-[2.5rem] animate-in slide-in-from-bottom-4 shadow-2xl relative overflow-hidden group`}>
                     <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-6xl group-hover:scale-110 transition-transform">🎓</div>
                     <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></div>
                        <span className={`text-[10px] font-black ${currentTheme.accent} uppercase tracking-widest`}>Synthetic Insight</span>
                     </div>
                     <div className={`${fontSizes[fontSize]} ${currentTheme.text} leading-relaxed font-mono whitespace-pre-wrap opacity-90`}>
                        {aiResponse}
                     </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-in zoom-in-95 duration-500">
                <div className="relative">
                   <div className={`absolute inset-0 bg-teal-500/10 rounded-full blur-[80px] transition-all duration-1000 ${isLiveActive ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}></div>
                   <button 
                      onClick={isLiveActive ? stopLiveTutor : startLiveTutor}
                      className={`relative w-48 h-48 rounded-[3rem] flex flex-col items-center justify-center transition-all duration-500 border-4 shadow-2xl ${isLiveActive ? 'bg-white border-white/20 text-[#136f6f] scale-105' : currentTheme.input + ' border-' + currentTheme.border + ' ' + currentTheme.mutedText + ' hover:text-current'}`}
                   >
                      <span className="text-6xl mb-3">{isLiveActive ? '✨' : '🎙️'}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isLiveActive ? 'Stop Tutor' : 'Start Live Tutor'}</span>
                   </button>
                </div>
                
                <div className="space-y-4 max-w-sm">
                   <h3 className={`text-lg font-bold ${currentTheme.text} google-sans uppercase tracking-tighter`}>Hands-Free Discussion</h3>
                   <p className={`text-xs ${currentTheme.mutedText} leading-relaxed italic`}>
                     "Activate the Live Tutor to discuss complex theories verbally while you read. The AI is primed with this book's specific knowledge."
                   </p>
                </div>
              </div>
            )}

            {activeTab === 'bookmarks' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <header>
                   <h3 className={`text-xl font-bold ${currentTheme.text} google-sans mb-2`}>Reading Vault</h3>
                   <p className={`text-xs ${currentTheme.mutedText}`}>Quick access to your saved scholarly artifacts.</p>
                </header>

                <div className="space-y-4">
                  {bookmarks.length === 0 ? (
                    <div className="py-20 text-center opacity-20">
                      <span className="text-6xl">📖</span>
                      <p className={`text-xs font-black uppercase tracking-widest mt-4 ${currentTheme.mutedText}`}>No Bookmarks Saved</p>
                    </div>
                  ) : (
                    bookmarks.map(b => (
                      <div key={b.id} className={`p-6 ${currentTheme.card} border ${currentTheme.border} rounded-3xl shadow-sm group hover:border-[#136f6f] transition-all`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`text-sm font-bold ${currentTheme.text} line-clamp-2`}>{b.title}</h4>
                          <button onClick={() => removeBookmark(b.id)} className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                        <p className={`text-[10px] font-black ${currentTheme.mutedText} uppercase tracking-widest`}>{new Date(b.timestamp).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <footer className={`p-10 border-t ${currentTheme.border} flex justify-between items-center bg-black/5`}>
             <div>
               <p className={`text-[10px] font-black ${currentTheme.mutedText} uppercase tracking-widest`}>Cognitive State</p>
               <p className={`text-[10px] font-bold ${currentTheme.accent} uppercase`}>Learning Cycle Active</p>
             </div>
             <div className="text-right">
               <p className={`text-[8px] font-black ${currentTheme.mutedText} uppercase tracking-[0.4em]`}>LibraryStudio Core 5.0</p>
             </div>
          </footer>
        </aside>
      </div>
    </div>
  );
};

export default PDFReader;