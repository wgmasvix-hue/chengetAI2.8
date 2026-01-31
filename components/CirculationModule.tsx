
import React, { useState, useEffect, useRef } from 'react';
import { getAIClient, encodeAudio, decodeAudio, decodeAudioData, generateSearchGroundedResponse } from '../services/geminiService';
import { MODELS, AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { LiveServerMessage, Modality, Blob } from '@google/genai';

const CirculationModule: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  // Fix: Added 'new' to Set constructor to resolve value callability error.
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim() || isSearching) return;
    setIsSearching(true);
    setSearchResults(null);
    try {
      const res = await generateSearchGroundedResponse(`Act as a library circulation assistant. Find information or status for the following resource query in our academic context: ${searchText}`);
      setSearchResults(res.text || "No records found in local or global index.");
    } catch (err) {
      setSearchResults("Database connection timeout. Please retry.");
    } finally {
      setIsSearching(false);
    }
  };

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = getAIClient();
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      audioContextRef.current = { input: inputAudioContext, output: outputAudioContext };

      const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encodeAudio(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const outCtx = outputAudioContext;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decodeAudio(audioData), outCtx, AUDIO_SAMPLE_RATE_OUTPUT, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.outputTranscription) {
              setTranscriptions(prev => [...prev.slice(-6), `Desk: ${msg.serverContent!.outputTranscription!.text}`]);
            }
            if (msg.serverContent?.inputTranscription) {
               setTranscriptions(prev => [...prev.slice(-6), `User: ${msg.serverContent!.inputTranscription!.text}`]);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsActive(false),
          onerror: () => setIsActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: 'You are an Intelligent Reference Desk Assistant. Help users find resources, explain policies, and support learning. Be professional, academic, and supportive.',
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    setIsActive(false);
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar pb-32 bg-zinc-50">
      <header className="mb-10">
        <h1 className="text-3xl font-bold google-sans flex items-center gap-3 text-zinc-900">
          <span className="text-blue-600">📚</span> Circulation & Reference Desk
        </h1>
        <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-black opacity-60">Integrated Search & Voice Support</p>
      </header>

      {/* Primary Search Interface */}
      <section className="mb-12">
        <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-lg relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="text-8xl">🔎</span>
           </div>
           
           <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-6">Master Resource Search</h2>
           <form onSubmit={handleManualSearch} className="relative">
             <input
               type="text"
               value={searchText}
               onChange={(e) => setSearchText(e.target.value)}
               placeholder="Search for books, patrons, or archival call numbers..."
               className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-6 px-8 text-lg focus:outline-none focus:border-blue-400/50 transition-all placeholder:text-zinc-300 text-zinc-800 shadow-sm"
             />
             <button
               type="submit"
               disabled={isSearching || !searchText.trim()}
               className="absolute right-4 top-4 bottom-4 px-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
             >
               {isSearching ? 'Locating...' : 'Search Record'}
             </button>
           </form>

           {searchResults && (
             <div className="mt-8 p-8 bg-zinc-50 border border-blue-100 rounded-3xl animate-in fade-in slide-in-from-top-4 shadow-inner">
               <div className="flex items-center gap-2 mb-4">
                 <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                 <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ILS Search Result</span>
               </div>
               <div className="text-zinc-700 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                 {searchResults}
               </div>
             </div>
           )}
        </div>
      </section>

      {/* Voice Assistant Secondary Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col items-center justify-center gap-10 bg-white border border-zinc-200 rounded-[2.5rem] p-12 shadow-md">
          <div className="text-center space-y-2">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Interactive Voice Link</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">FOR HANDS-FREE REFERENCE ASSISTANCE</p>
          </div>
          <div className="relative">
            <div className={`absolute inset-0 bg-blue-500/5 rounded-full blur-3xl transition-all duration-700 ${isActive ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`} />
            <button
              onClick={isActive ? stopSession : startSession}
              className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 border-4 shadow-xl ${
                isActive ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <span className="text-4xl mb-1">{isActive ? '⏹' : '🎙️'}</span>
              <span className="text-[10px] font-black uppercase tracking-tighter">{isActive ? 'Stop' : 'Connect'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-400 text-center max-w-xs leading-relaxed italic">
            "Help me find research on African archaeology in the basement archives..."
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-md flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Reference Stream</h3>
            </div>
            <span className="text-[10px] font-bold text-zinc-400">LIVE AUDIO_V1</span>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {transcriptions.map((t, i) => (
              <div key={i} className={`flex gap-3 ${t.startsWith('User:') ? 'flex-row-reverse' : ''}`}>
                 <div className={`px-5 py-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                   t.startsWith('User:') ? 'bg-zinc-100 text-zinc-700' : 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                 }`}>
                   {t.split(': ')[1]}
                 </div>
              </div>
            ))}
            {transcriptions.length === 0 && (
              <div className="text-center py-20 opacity-30">
                <p className="text-zinc-400 text-sm italic">Stream inactive. Initiate voice uplink for live briefing.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CirculationModule;
