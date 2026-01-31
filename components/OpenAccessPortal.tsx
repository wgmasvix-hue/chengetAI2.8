
import React, { useState, useRef, useEffect } from 'react';
import { getAIClient, discoverOpenResources, searchResourcesFunctionDeclaration, filterResourcesFunctionDeclaration, encodeAudio, decodeAudio, decodeAudioData } from '../services/geminiService';
import { OpenResource } from '../types';
import { MODELS, AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { LiveServerMessage, Modality, Blob } from '@google/genai';

const OpenAccessPortal: React.FC = () => {
  const [query, setQuery] = useState('');
  const [resources, setResources] = useState<OpenResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'IDLE' | 'LISTENING' | 'SEARCHING'>('IDLE');
  const [searchZitesclic, setSearchZitesclic] = useState(true);
  const [searchPaid, setSearchPaid] = useState(false);
  
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startYear, setStartYear] = useState<string>('');
  const [endYear, setEndYear] = useState<string>('');
  const [authorQuery, setAuthorQuery] = useState<string>('');
  const [filterZitesclicOnly, setFilterZitesclicOnly] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const handleDiscovery = async (searchQuery: string) => {
    if (!searchQuery.trim() || isLoading) return;
    setIsLoading(true);
    setVoiceStatus('SEARCHING');
    
    try {
      // If paid is active, disable zitesclic default to broaden scope to global commercial
      const useZitesclic = searchPaid ? false : searchZitesclic;
      const results = await discoverOpenResources(searchQuery, useZitesclic, searchPaid);
      setResources(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setVoiceStatus('LISTENING');
    }
  };

  const startVoicePortal = async () => {
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
            setIsVoiceActive(true);
            setVoiceStatus('LISTENING');
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob: Blob = { data: encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
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
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'find_academic_resources') {
                  handleDiscovery((fc.args as any).topic);
                  sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Searching ZITESCLIC consortium..." } } }));
                }
              }
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => { setIsVoiceActive(false); setVoiceStatus('IDLE'); },
          onerror: () => { setIsVoiceActive(false); setVoiceStatus('IDLE'); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [searchResourcesFunctionDeclaration, filterResourcesFunctionDeclaration] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: `You are the Knowledge Summoner. Assist users in finding ZITESCLIC consortium journals and academic papers.`,
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { console.error(err); }
  };

  const stopVoicePortal = () => { sessionRef.current?.close(); setIsVoiceActive(false); setVoiceStatus('IDLE'); };

  const filteredResources = resources.filter(res => {
    const typeMatch = !selectedType || res.type.toLowerCase().includes(selectedType.toLowerCase());
    const categoryMatch = !selectedCategory || res.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const authorMatch = !authorQuery || (res.author || '').toLowerCase().includes(authorQuery.toLowerCase());
    
    let yearMatch = true;
    const resYear = parseInt(res.year || '0');
    if (startYear && !isNaN(resYear)) yearMatch = yearMatch && (resYear >= parseInt(startYear));
    if (endYear && !isNaN(resYear)) yearMatch = yearMatch && (resYear <= parseInt(endYear));
    
    const zitesclicMatch = !filterZitesclicOnly || !!res.isZitesclic;

    return typeMatch && categoryMatch && authorMatch && yearMatch && zitesclicMatch;
  });

  const uniqueTypes = Array.from(new Set(resources.map(r => r.type)));

  const quickLinks = [
    { name: 'ProQuest', url: 'https://www.proquest.com', color: 'bg-[#0077c8]' },
    { name: 'JSTOR', url: 'https://www.jstor.org', color: 'bg-[#a3221b]' },
    { name: 'EBSCOhost', url: 'https://search.ebscohost.com', color: 'bg-[#1b6b36]' },
    { name: 'ScienceDirect', url: 'https://www.sciencedirect.com', color: 'bg-[#ff6c00]' }
  ];

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full px-6 py-12 bg-white overflow-y-auto custom-scrollbar">
      <header className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold google-sans mb-3 flex items-center gap-4 text-zinc-900">
            <span className={searchPaid ? "text-purple-600" : "text-blue-600"}>
              {searchPaid ? '💎' : '🔓'}
            </span> 
            {searchPaid ? 'Academic Premium Portal' : 'Open Access Portal'}
          </h1>
          <p className="text-zinc-500 max-w-2xl text-sm leading-relaxed">
            {searchPaid 
              ? 'Institutional access to paid high-impact journals and commercial databases.' 
              : <span>Linked with <span className="text-[#136f6f] font-black">ZITESCLIC</span> Journals. Accessing Zimbabwe's strategic academic research.</span>
            }
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => { setSearchPaid(false); setSearchZitesclic(!searchZitesclic); }}
             disabled={searchPaid}
             className={`px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${searchZitesclic && !searchPaid ? 'bg-[#136f6f] text-white border-[#136f6f]' : 'bg-white text-zinc-400 border-zinc-200'} ${searchPaid ? 'opacity-30 cursor-not-allowed' : ''}`}
           >
             Consortium Mode
           </button>
           
           <div className="h-8 w-[1px] bg-zinc-200"></div>

           <button 
             onClick={() => { setSearchPaid(!searchPaid); if(!searchPaid) setSearchZitesclic(false); }}
             className={`px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${searchPaid ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200' : 'bg-white text-zinc-400 border-zinc-200'}`}
           >
             <span>Premium Databases</span>
             {searchPaid && <span className="text-[8px] bg-white/20 px-1.5 rounded">ACTIVE</span>}
           </button>
        </div>
      </header>

      <div className="space-y-12">
        {searchPaid && (
          <section className="animate-in slide-in-from-top-4 duration-500">
             <div className="bg-gradient-to-r from-purple-50 to-white border border-purple-100 rounded-[2rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl text-purple-200 pointer-events-none">🔐</div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></div>
                   <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em]">Institutional Authenticated Access</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                   {quickLinks.map(link => (
                     <a 
                       key={link.name} 
                       href={link.url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="group bg-white border border-purple-100 rounded-xl p-4 flex items-center justify-between hover:shadow-lg transition-all hover:-translate-y-1"
                     >
                       <span className="font-bold text-zinc-700 text-sm">{link.name}</span>
                       <div className={`w-6 h-6 rounded-full ${link.color} flex items-center justify-center text-white text-[10px] opacity-80 group-hover:opacity-100`}>↗</div>
                     </a>
                   ))}
                </div>
             </div>
          </section>
        )}

        <section className="relative">
           <div className={`${searchPaid ? 'bg-purple-700 border-purple-600' : 'bg-[#136f6f] border-teal-600'} border rounded-[3rem] p-12 overflow-hidden shadow-2xl relative group transition-colors duration-500`}>
              <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none text-9xl">
                {searchPaid ? '💎' : '🏛️'}
              </div>
              <div className="flex flex-col items-center justify-center text-center relative z-10">
                <div className="mb-10 relative">
                   <div className={`absolute inset-0 bg-white/20 rounded-full blur-[80px] transition-all duration-1000 ${isVoiceActive ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}></div>
                   <button 
                      onClick={isVoiceActive ? stopVoicePortal : startVoicePortal}
                      className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-500 border-8 shadow-2xl ${isVoiceActive ? 'bg-white border-white/20 scale-105' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                      style={{ color: isVoiceActive ? (searchPaid ? '#7e22ce' : '#136f6f') : 'white' }}
                   >
                      <span className="text-5xl mb-2">{isVoiceActive ? '✨' : '🎙️'}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{searchPaid ? 'Premium Link' : 'Consortium Link'}</span>
                   </button>
                </div>
                <h2 className="text-xl font-bold google-sans text-white mb-2">{searchPaid ? 'Paid Subscription Intelligence' : 'ZITESCLIC Knowledge Hub'}</h2>
                <p className="text-white/60 text-xs font-black uppercase tracking-widest">
                  {searchPaid ? 'ProQuest • JSTOR • EBSCO • IEEE' : 'Bridging Academic Excellence Across Zimbabwe'}
                </p>
              </div>
           </div>
        </section>

        <section className="max-w-4xl mx-auto space-y-6">
          <form onSubmit={(e) => { e.preventDefault(); handleDiscovery(query); }} className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPaid ? "Search paid databases (e.g., 'Quantum Computing IEEE')..." : "Search journals (e.g., 'sustainable agriculture Zimbabwe')..."}
              className={`w-full bg-white border rounded-3xl py-6 px-8 text-lg focus:outline-none shadow-2xl transition-all ${searchPaid ? 'border-purple-200 focus:border-purple-600' : 'border-zinc-200 focus:border-[#136f6f]'}`}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className={`absolute right-3 top-3 bottom-3 px-10 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all ${searchPaid ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 'bg-[#136f6f] shadow-teal-900/20 hover:bg-[#1a8b8b]'}`}
            >
              {isLoading ? 'Uplinking...' : searchPaid ? 'Search Premium' : 'Search Consortium'}
            </button>
          </form>

          {/* Advanced Filter Bench */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-5 gap-4 animate-in slide-in-from-top-2 duration-500">
             <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-2">Filter by Author</label>
                <input 
                  type="text"
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  placeholder="Author name..."
                  className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-[#136f6f]"
                />
             </div>
             <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-2">Year Range</label>
                <div className="flex items-center gap-2">
                   <input 
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    placeholder="Start"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#136f6f]"
                   />
                   <span className="text-zinc-300">-</span>
                   <input 
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    placeholder="End"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#136f6f]"
                   />
                </div>
             </div>
             <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-2">Resource Type</label>
                <select 
                  value={selectedType || ''}
                  onChange={(e) => setSelectedType(e.target.value || null)}
                  className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-[#136f6f] appearance-none"
                >
                  <option value="">All Types</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>
             
             {/* Enhanced Consortium Filter Switch */}
             <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-2">Consortium Filter</label>
                <button 
                  onClick={() => setFilterZitesclicOnly(!filterZitesclicOnly)}
                  disabled={searchPaid}
                  className={`h-full border rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center justify-between ${
                    searchPaid 
                      ? 'opacity-50 cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400' 
                      : filterZitesclicOnly 
                        ? 'border-[#136f6f] bg-teal-50 text-[#136f6f] shadow-sm' 
                        : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  <span className="truncate">ZITESCLIC Only</span>
                  {!searchPaid && (
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${filterZitesclicOnly ? 'bg-[#136f6f] text-white scale-110' : 'bg-zinc-200 text-transparent'}`}>
                      <span className="text-[8px] font-black">✓</span>
                    </div>
                  )}
                </button>
             </div>

             <div className="flex flex-col justify-end">
                <button 
                  onClick={() => {
                    setAuthorQuery('');
                    setStartYear('');
                    setEndYear('');
                    setSelectedType(null);
                    setFilterZitesclicOnly(false);
                  }}
                  className="w-full py-2 border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Reset Filters
                </button>
             </div>
          </div>
        </section>

        {/* Results Info Bar */}
        {resources.length > 0 && (
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#136f6f] rounded-full"></span>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                   Showing {filteredResources.length} of {resources.length} resources
                </p>
             </div>
             {filterZitesclicOnly && (
               <span className="px-3 py-1 bg-teal-50 text-[#136f6f] border border-teal-100 rounded-full text-[9px] font-black uppercase tracking-widest animate-in fade-in zoom-in">
                 Filtered: ZITESCLIC Verified
               </span>
             )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredResources.map((res, i) => (
            <div 
              key={i} 
              className={`p-8 rounded-[2.5rem] border transition-all group animate-in fade-in slide-in-from-bottom-4 shadow-sm ${
                res.accessType === 'Subscription' 
                  ? 'bg-gradient-to-br from-white to-purple-50 border-purple-100' 
                  : res.isZitesclic 
                    ? 'bg-gradient-to-br from-white to-teal-50 border-teal-100' 
                    : 'bg-white border-zinc-100'
              }`} 
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-2">
                  <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border tracking-widest ${
                    res.accessType === 'Subscription'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : res.isZitesclic 
                        ? 'bg-[#136f6f] text-white border-[#136f6f]' 
                        : 'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                    {res.accessType === 'Subscription' ? 'Premium' : res.isZitesclic ? 'ZITESCLIC' : res.type}
                  </span>
                  {res.accessType === 'Subscription' && <span className="text-lg">💎</span>}
                </div>
                <span className="text-[9px] font-bold text-zinc-400">{res.year}</span>
              </div>
              <h3 className={`text-lg font-bold text-zinc-900 mb-2 leading-tight h-16 line-clamp-3 transition-colors ${res.accessType === 'Subscription' ? 'group-hover:text-purple-600' : 'group-hover:text-[#136f6f]'}`}>{res.title}</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">{res.category}</p>
              {res.author && <p className="text-[9px] text-zinc-500 italic mb-6">By {res.author}</p>}
              <a 
                href={res.url} 
                target="_blank" 
                className={`inline-flex items-center gap-2 text-[10px] font-black uppercase border-t pt-4 w-full ${
                  res.accessType === 'Subscription' 
                    ? 'text-purple-600 border-purple-100' 
                    : 'text-[#136f6f] border-zinc-50'
                }`}
              >
                {res.accessType === 'Subscription' ? 'Login via Institution ➔' : 'Uplink to Article ➔'}
              </a>
            </div>
          ))}
          {resources.length > 0 && filteredResources.length === 0 && (
            <div className="col-span-full py-24 text-center opacity-30 flex flex-col items-center">
              <div className="text-8xl mb-6">🔍</div>
              <h3 className="text-xl font-bold uppercase tracking-tighter">No results match your filters</h3>
              <p className="text-xs text-zinc-400 mt-2 font-black uppercase tracking-widest">Adjust criteria or reset filters</p>
            </div>
          )}
          {resources.length === 0 && !isLoading && (
            <div className="col-span-full py-24 text-center opacity-20 flex flex-col items-center">
              <div className="text-9xl mb-6">🏛️</div>
              <h3 className="text-xl font-bold uppercase tracking-tighter">Awaiting {searchPaid ? 'Premium' : 'Consortium'} Input</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenAccessPortal;
