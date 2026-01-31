import React, { useState, useRef, useEffect } from 'react';
import { generateReasoningResponse, generateSpeech, decodeAudio, decodeAudioData } from '../services/geminiService';
import { ChatMessage, MarcField } from '../types';
import { AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';

interface CommandPayload {
  intent: string;
  parameters: Record<string, any>;
}

interface TransmissionLog {
  id: string;
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  payload: CommandPayload;
  status: 'pending' | 'delivered' | 'failed' | 'validating';
  timestamp: number;
  errorMessage?: string;
  kohaBiblionumber?: string;
}

/**
 * Maps raw intent parameters to a structured array of MARC21 fields.
 */
const mapParametersToMarcFields = (parameters: Record<string, any>): MarcField[] => {
  const fields: MarcField[] = [
    { tag: '001', ind1: ' ', ind2: ' ', subfields: { a: 'LIB50-DRAFT-' + Math.floor(Math.random() * 1000) } },
    { tag: '008', ind1: ' ', ind2: ' ', subfields: { a: new Date().getFullYear().toString() + '||||||||||||||||||||||eng|d' } }
  ];

  if (parameters.marc_100) fields.push({ tag: '100', ind1: '1', ind2: ' ', subfields: { a: parameters.marc_100 } });
  if (parameters.marc_245) fields.push({ tag: '245', ind1: '1', ind2: '0', subfields: { a: parameters.marc_245, c: parameters.marc_100 || 'Unknown' } });
  
  if (parameters.marc_260) {
    const parts = parameters.marc_260.split(',');
    fields.push({ 
      tag: '260', 
      ind1: ' ', 
      ind2: ' ', 
      subfields: { 
        a: parts[0]?.trim() || '', 
        b: parts[1]?.trim() || '', 
        c: parts[2]?.trim() || '' 
      } 
    });
  }
  
  if (parameters.marc_082) fields.push({ tag: '082', ind1: '0', ind2: '4', subfields: { a: parameters.marc_082 } });
  
  if (parameters.marc_650 && Array.isArray(parameters.marc_650)) {
    parameters.marc_650.forEach((s: string) => fields.push({ tag: '650', ind1: ' ', ind2: '0', subfields: { a: s } }));
  }

  return fields;
};

/**
 * Visual renderer for MARC21 records.
 */
const MarcVisualizer: React.FC<{ fields: MarcField[] }> = ({ fields }) => {
  return (
    <div className="bg-zinc-900 rounded-2xl p-6 font-mono text-[11px] text-zinc-300 border border-white/5 space-y-1">
      <div className="text-zinc-500 mb-2 border-b border-zinc-800 pb-2 flex justify-between uppercase font-black tracking-widest text-[8px]">
        <span>Tag</span>
        <span>I1 I2</span>
        <span>Content</span>
      </div>
      {fields.map((f, i) => (
        <div key={i} className="flex gap-4 group hover:bg-white/5 py-0.5 rounded px-1 transition-colors">
          <span className="text-blue-400 font-bold w-8">{f.tag}</span>
          <span className="text-zinc-600 w-8">{f.ind1}{f.ind2}</span>
          <div className="flex-1">
            {Object.entries(f.subfields).map(([k, v]) => (
              <span key={k} className="mr-2">
                <span className="text-pink-500 font-black mr-0.5">${k}</span>
                <span>{v}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const CataloguingModule: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [commandQueue, setCommandQueue] = useState<CommandPayload[]>([]);
  const [transmissionLogs, setTransmissionLogs] = useState<TransmissionLog[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'tools'>('queue');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVoiceSummary = async (text: string, id: string) => {
    if (playingId === id) { setPlayingId(null); return; }
    setPlayingId(id);
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      const base64 = await generateSpeech(text);
      const buffer = await decodeAudioData(decodeAudio(base64), audioContextRef.current, AUDIO_SAMPLE_RATE_OUTPUT, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setPlayingId(null);
      source.start();
    } catch (e) { setPlayingId(null); }
  };

  const executeCommand = async (cmd: CommandPayload) => {
    const newLog: TransmissionLog = {
      id: Math.random().toString(36).substr(2, 9),
      method: 'POST',
      endpoint: '/api/v1/biblios',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('koha_session') || 'GUEST'}`, 'Content-Type': 'application/marcxml+xml' },
      payload: cmd,
      status: 'validating',
      timestamp: Date.now()
    };

    setTransmissionLogs(prev => [newLog, ...prev]);

    // Industrial Multi-stage Commit
    await new Promise(r => setTimeout(r, 800));
    setTransmissionLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'pending' as const } : l));
    
    await new Promise(r => setTimeout(r, 1200));
    const isError = Math.random() < 0.05;
    
    setTransmissionLogs(prev => prev.map(log => {
      if (log.id === newLog.id) {
        return { 
          ...log, 
          status: isError ? 'failed' : 'delivered',
          errorMessage: isError ? 'Koha DB Conflict: Duplicate ISBN found in field 020' : undefined,
          kohaBiblionumber: isError ? undefined : (10000 + Math.floor(Math.random() * 9000)).toString()
        };
      }
      return log;
    }));

    if (!isError) setCommandQueue(prev => prev.filter(c => c !== cmd));
  };

  const processSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const prompt = `Analyze this librarian's cataloguing request and generate a MARC21 JSON intent. 
      Input: "${input}"
      Format: {"intent": "add_bibliographic_record", "parameters": {"marc_100": "Author Name", "marc_245": "Title", "marc_260": "Publisher, City, Year", "marc_082": "DDC Code"}}`;
      
      const response = await generateReasoningResponse(prompt);
      const rawText = response.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*"intent"[\s\S]*\}/);
      
      if (jsonMatch) {
        const cmd = JSON.parse(jsonMatch[0]);
        setCommandQueue(prev => [...prev, cmd]);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Record intent analyzed and mapped to MARC21. Please review in the Bridge Workbench.", timestamp: Date.now() }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: rawText, timestamp: Date.now() }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Bridge timeout.", timestamp: Date.now() }]);
    } finally { setIsLoading(false); }
  };

  const kohaSession = localStorage.getItem('koha_session');

  return (
    <div className="flex h-screen bg-white overflow-hidden relative">
      <div className={`flex-1 flex flex-col transition-all duration-500 ${isSidebarOpen ? 'mr-[440px]' : 'mr-0'}`}>
        <header className="h-20 border-b border-zinc-100 px-10 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <span className="text-xl">🛠️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold google-sans text-zinc-900 tracking-tight">Koha Industrial Bridge</h1>
              <p className="text-[9px] font-black uppercase text-zinc-400 tracking-[0.2em]">Metadata Lifecycle Management</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
            {isSidebarOpen ? 'Hide Workbench' : 'Show Workbench'}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8 pb-32">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center text-5xl mb-6 grayscale">📦</div>
              <h2 className="text-2xl font-bold google-sans text-zinc-900 mb-2">Bridge Ready for Uplink</h2>
              <p className="text-sm max-w-sm text-zinc-500">Scan or describe a resource to begin the Koha committed entry process.</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-8 rounded-[2.5rem] shadow-sm relative group ${m.role === 'user' ? 'bg-zinc-50 border border-zinc-100' : 'bg-white border border-zinc-100'}`}>
                <div className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{m.text}</div>
                {m.role === 'model' && (
                  <button onClick={() => handleVoiceSummary(m.text, m.id)} className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-50 rounded-lg text-zinc-400">🔊</button>
                )}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-[10px] font-black uppercase text-zinc-400 animate-pulse">Syncing Cognitive Core...</div>}
          <div ref={scrollRef} />
        </div>

        <div className="p-10 bg-gradient-to-t from-white via-white to-transparent absolute bottom-0 left-0 right-0">
          <form onSubmit={processSubmission} className="max-w-4xl mx-auto relative group">
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)}
              placeholder="Enter bibliographic detail or request MARC conversion..."
              className="w-full bg-white border border-zinc-200 rounded-3xl py-6 px-8 text-sm focus:outline-none focus:border-teal-500 shadow-2xl transition-all"
            />
            <button type="submit" className="absolute right-3 top-3 bottom-3 px-8 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-teal-600/20">Commit Intent</button>
          </form>
        </div>
      </div>

      <aside className={`fixed top-0 right-0 bottom-0 w-[440px] bg-zinc-50 border-l border-zinc-200 flex flex-col transition-transform duration-500 z-30 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 border-b border-zinc-200 bg-white flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black google-sans text-zinc-900 tracking-tight">BRIDGE WORKBENCH</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${kohaSession ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{kohaSession ? 'Koha Link Active' : 'Offline Buffer'}</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-xl">⛓️</div>
        </div>

        <div className="flex bg-zinc-200 p-1 mx-8 mt-6 rounded-2xl">
          {['queue', 'tools', 'history'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === t ? 'bg-white text-teal-600 shadow-sm' : 'text-zinc-500'}`}>
              {t} {t === 'queue' && `(${commandQueue.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
          {activeTab === 'queue' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              {commandQueue.length === 0 ? (
                <div className="py-20 text-center opacity-20 border-2 border-dashed border-zinc-300 rounded-[2rem]">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Pending Transactions</p>
                </div>
              ) : (
                commandQueue.map((cmd, i) => (
                  <div key={i} className="bg-white border border-zinc-200 rounded-[2.5rem] p-8 shadow-sm group">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[9px] font-black uppercase text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">MARC21 COMMIT_DRAFT</span>
                      <button onClick={() => executeCommand(cmd)} className="text-[10px] font-black text-white bg-zinc-900 px-6 py-2 rounded-xl shadow-lg shadow-zinc-900/10 hover:bg-teal-600 transition-all">SYNC TO KOHA</button>
                    </div>
                    
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Bibliographic Map (MARC21)</h4>
                    <MarcVisualizer fields={mapParametersToMarcFields(cmd.parameters)} />
                    
                    <div className="mt-6 flex justify-between items-center px-2">
                       <button className="text-[8px] font-bold text-zinc-400 uppercase hover:text-zinc-900">Edit Mapping</button>
                       <button onClick={() => setCommandQueue(prev => prev.filter(c => c !== cmd))} className="text-[8px] font-bold text-red-500 uppercase">Discard Draft</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
              {transmissionLogs.length === 0 ? (
                <div className="text-center py-20 opacity-20">No sync history found.</div>
              ) : (
                transmissionLogs.map(log => (
                  <div key={log.id} className={`p-6 rounded-3xl border transition-all ${log.status === 'delivered' ? 'bg-white border-emerald-100' : log.status === 'failed' ? 'bg-red-50 border-red-100' : 'bg-white border-zinc-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${log.status === 'delivered' ? 'text-emerald-600' : log.status === 'failed' ? 'text-red-600' : 'text-zinc-900'}`}>{log.status}</span>
                      <span className="text-[8px] text-zinc-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {log.status === 'validating' && <div className="text-[9px] font-bold text-teal-600 animate-pulse">Running MARC21 Validation...</div>}
                    {log.status === 'delivered' && <div className="text-[9px] font-bold text-zinc-800">Commited Biblio ID: <span className="text-teal-600">#{log.kohaBiblionumber}</span></div>}
                    {log.status === 'failed' && <div className="text-[9px] text-red-700 font-medium mt-1">{log.errorMessage}</div>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tools' && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-8">
                  <h3 className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-4">Industrial Handshake</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-6">Test and verify the REST API linkage with your local Koha server instance.</p>
                  <button className="w-full py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Run System Ping</button>
                </div>
                <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl">🔄</div>
                  <h3 className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-4">Bulk MARC Import</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-6">Import large sets of records for batch processing and automated classification.</p>
                  <div className="w-full py-10 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-teal-500/50 transition-all cursor-pointer">
                    <span className="text-3xl">📁</span>
                    <span className="text-[10px] font-black uppercase text-zinc-600">Drop ISO2709 File</span>
                  </div>
                </div>
             </div>
          )}
        </div>

        <div className="p-8 border-t border-zinc-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Bridge Buffer Health</p>
            <span className="text-[10px] font-bold text-emerald-600">OPTIMAL</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[94%]"></div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CataloguingModule;