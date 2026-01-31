
import React, { useState, useEffect, useRef } from 'react';
import { getAIClient } from '../services/geminiService';
import { MODELS } from '../constants';
import { ChatMessage, DigitalAsset, CustomChatbot, IoTModule } from '../types';

const AIStudio: React.FC = () => {
  const [viewMode, setViewMode] = useState<'agents' | 'iot'>('agents');
  
  // --- Agent State ---
  const [chatbots, setChatbots] = useState<CustomChatbot[]>(() => {
    const saved = localStorage.getItem('lib50_custom_chatbots');
    return saved ? JSON.parse(saved) : [];
  });
  const [vault, setVault] = useState<DigitalAsset[]>([]);
  const [activeBot, setActiveBot] = useState<CustomChatbot | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CustomChatbot | null>(null);
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- IoT State ---
  const [iotModules, setIotModules] = useState<IoTModule[]>(() => {
    const saved = localStorage.getItem('lib50_iot_modules');
    if (saved) return JSON.parse(saved);
    return [
        { id: 'iot-001', name: 'Main Entrance Gate', type: 'RFID Gate', status: 'active', zone: 'Lobby', dataStream: 'FLOW_IN: 12/min', batteryLevel: 100 },
        { id: 'iot-002', name: 'Stack A Humidity', type: 'Environmental', status: 'active', zone: 'Archive Level 1', dataStream: 'HUM: 45%', batteryLevel: 82 },
        { id: 'iot-003', name: 'Study Room 4', type: 'Occupancy', status: 'active', zone: 'Level 2', dataStream: 'OCC: 4/6', batteryLevel: 91 },
    ];
  });
  const [activeModule, setActiveModule] = useState<IoTModule | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem('lib50_custom_chatbots', JSON.stringify(chatbots));
  }, [chatbots]);

  useEffect(() => {
    localStorage.setItem('lib50_iot_modules', JSON.stringify(iotModules));
  }, [iotModules]);

  useEffect(() => {
    const savedVault = localStorage.getItem('lib50_digital_vault');
    if (savedVault) setVault(JSON.parse(savedVault));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate IoT Data Stream
  useEffect(() => {
    const interval = setInterval(() => {
        setIotModules(prev => prev.map(m => {
            let newData = m.dataStream;
            if (m.type === 'Environmental') newData = `HUM: ${(40 + Math.random() * 10).toFixed(1)}% | TMP: ${(20 + Math.random() * 2).toFixed(1)}°C`;
            if (m.type === 'RFID Gate') newData = `FLOW_IN: ${Math.floor(Math.random() * 5)}/min | TAGS: ${Math.floor(Math.random() * 100)}`;
            if (m.type === 'Occupancy') newData = `OCC: ${Math.floor(Math.random() * 10)}/20 | NOISE: ${Math.floor(Math.random() * 40 + 30)}dB`;
            return { ...m, dataStream: newData };
        }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- Agent Handlers ---

  const handleCreateBot = () => {
    const newBot: CustomChatbot = {
      id: 'bot-' + Math.random().toString(36).substr(2, 5),
      name: 'New Academic Bot',
      description: 'A custom chatbot designed for specific library domains.',
      systemInstruction: 'You are a helpful library assistant specialized in academic excellence.',
      category: 'Student Support',
      icon: '🤖',
      version: '1.0.0',
      groundedAssets: [],
      backendUrl: '',
      isPublished: false
    };
    setEditForm(newBot);
    setIsEditing(true);
    setActiveBot(null);
    setSummary(null);
  };

  const handleSaveBot = () => {
    if (!editForm) return;
    setChatbots(prev => {
      const idx = prev.findIndex(b => b.id === editForm.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = editForm;
        return next;
      }
      return [editForm, ...prev];
    });
    setActiveBot(editForm);
    setIsEditing(false);
  };

  const toggleAssetGrounding = (assetId: string) => {
    if (!editForm) return;
    const assets = editForm.groundedAssets.includes(assetId)
      ? editForm.groundedAssets.filter(id => id !== assetId)
      : [...editForm.groundedAssets, assetId];
    setEditForm({ ...editForm, groundedAssets: assets });
  };

  const toggleBotSelection = (id: string) => {
    setSelectedBotIds(prev => 
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  const handleGenerateSummary = async () => {
    if (selectedBotIds.length === 0) return;
    setIsGeneratingSummary(true);
    setActiveBot(null);
    setIsEditing(false);
    setSummary(null);
    
    try {
        const selectedBots = chatbots.filter(b => selectedBotIds.includes(b.id));
        const vaultMap = new Map<string, DigitalAsset>(vault.map(v => [v.id, v] as [string, DigitalAsset]));
        
        const botsData = selectedBots.map(b => {
            const assets = b.groundedAssets.map(aid => vaultMap.get(aid)?.title).filter(Boolean).join(", ");
            return `
            Agent Name: ${b.name}
            Role/Description: ${b.description}
            Category: ${b.category}
            Core Instructions: ${b.systemInstruction}
            Linked Knowledge Assets: ${assets || "None"}
            Backend Integration: ${b.backendUrl || "None"}
            `;
        }).join("\n---\n");

        const prompt = `You are a Senior Systems Architect for Library 5.0. 
        Analyze the following group of AI Chatbots.
        
        Provide a consolidated Executive Summary formatted in Markdown that includes:
        1. **Collective Capability Overview**: What can this fleet of agents do together?
        2. **Knowledge Coverage Analysis**: Analyze the linked assets. Are there gaps?
        3. **Integration Status**: Note any industrial backend links.
        4. **Strategic Recommendations**: How can these agents be improved or better orchestrated?

        Agents Data:
        ${botsData}`;

        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: MODELS.REASONING,
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 4000 } }
        });
        
        setSummary(response.text || "No summary generated.");
    } catch (e) {
        console.error(e);
        setSummary("Failed to generate summary. Please check connection.");
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  const handleTestBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeBot) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = getAIClient();
      const assignedAssetsData = vault.filter(a => activeBot.groundedAssets.includes(a.id));
      const groundingContext = assignedAssetsData.length > 0 
        ? `\n\nKNOWLEDGE BASE:\n${assignedAssetsData.map(a => `- ${a.title} by ${a.author}`).join('\n')}`
        : '';
      const backendContext = activeBot.backendUrl ? `\n\nREMOTE GATEWAY: ${activeBot.backendUrl}` : '';

      const response = await ai.models.generateContent({
        model: MODELS.REASONING,
        contents: [
          { role: 'user', parts: [{ text: `SYSTEM_INSTRUCTION: ${activeBot.systemInstruction}${groundingContext}${backendContext}` }] },
          ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: input }] }
        ],
        config: { thinkingConfig: { thinkingBudget: 16000 } }
      });

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "Cognitive response generated.",
        timestamp: Date.now()
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Cognitive uplink failure.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- IoT Handlers ---

  const handleCreateIoT = () => {
      const newDevice: IoTModule = {
          id: `iot-${Math.random().toString(36).substr(2, 5)}`,
          name: 'New Sensor Module',
          type: 'Environmental',
          status: 'calibrating',
          zone: 'Unassigned',
          dataStream: 'Initializing...',
          batteryLevel: 100
      };
      setIotModules(prev => [...prev, newDevice]);
      setActiveModule(newDevice);
  };

  const handleDeleteIoT = (id: string) => {
      setIotModules(prev => prev.filter(m => m.id !== id));
      if (activeModule?.id === id) setActiveModule(null);
  };

  return (
    <div className="flex h-full bg-[#0c0c0e] overflow-hidden">
      <aside className="w-80 border-r border-white/5 bg-[#09090b] flex flex-col">
        <header className="p-6 border-b border-white/5 bg-black/20">
          <div className="mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Systems Forge</h2>
            <p className="text-sm font-black text-white mt-1">Librarian Console</p>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-xl mb-4">
             <button onClick={() => setViewMode('agents')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'agents' ? 'bg-[#136f6f] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Agents</button>
             <button onClick={() => setViewMode('iot')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'iot' ? 'bg-[#136f6f] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>IoT Grid</button>
          </div>

          <div className="flex justify-between items-center">
             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{viewMode === 'agents' ? 'Deployed Units' : 'Active Sensors'}</span>
             <button 
                onClick={viewMode === 'agents' ? handleCreateBot : handleCreateIoT} 
                className="w-8 h-8 rounded-lg bg-zinc-800 text-teal-500 flex items-center justify-center hover:bg-zinc-700 transition-all text-lg"
             >
                +
             </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {viewMode === 'agents' ? (
              chatbots.map(bot => (
                <div key={bot.id} className="relative group">
                  <button
                    onClick={() => { setActiveBot(bot); setIsEditing(false); setMessages([]); setSummary(null); }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${activeBot?.id === bot.id ? 'bg-[#136f6f]/10 border-teal-500/50 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xl">{bot.icon}</span>
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border ${bot.isPublished ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-zinc-800 border-white/5 text-zinc-500'}`}>
                        {bot.isPublished ? 'Live' : 'Draft'}
                      </span>
                    </div>
                    <h3 className={`text-xs font-bold truncate ${activeBot?.id === bot.id ? 'text-teal-400' : 'text-zinc-200'}`}>{bot.name}</h3>
                  </button>
                  
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                     <input 
                        type="checkbox" 
                        checked={selectedBotIds.includes(bot.id)} 
                        onChange={(e) => { e.stopPropagation(); toggleBotSelection(bot.id); }}
                        className="w-3 h-3 rounded border-zinc-700 bg-zinc-900 text-teal-600 focus:ring-0 cursor-pointer accent-[#136f6f]"
                     />
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                     <button onClick={(e) => { e.stopPropagation(); setEditForm(bot); setIsEditing(true); }} className="p-1.5 hover:bg-white/10 rounded-md bg-black/50 text-zinc-300 text-[10px]">⚙️</button>
                     <button onClick={(e) => { e.stopPropagation(); setChatbots(prev => prev.filter(b => b.id !== bot.id)); if(activeBot?.id === bot.id) setActiveBot(null); }} className="p-1.5 hover:bg-red-500/10 rounded-md bg-black/50 text-red-400 text-[10px]">🗑️</button>
                  </div>
                </div>
              ))
          ) : (
              iotModules.map(mod => (
                  <div key={mod.id} className="relative group">
                    <button
                        onClick={() => setActiveModule(mod)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${activeModule?.id === mod.id ? 'bg-[#136f6f]/10 border-teal-500/50' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xl">{mod.type === 'RFID Gate' ? '🚪' : mod.type === 'Environmental' ? '🌡️' : '📡'}</span>
                            <div className={`w-2 h-2 rounded-full ${mod.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                        </div>
                        <h3 className={`text-xs font-bold truncate ${activeModule?.id === mod.id ? 'text-teal-400' : 'text-zinc-200'}`}>{mod.name}</h3>
                        <p className="text-[9px] text-zinc-500 mt-1 font-mono truncate">{mod.dataStream}</p>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteIoT(mod.id); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-md text-red-400 text-[10px]">🗑️</button>
                  </div>
              ))
          )}
        </div>
        
        {viewMode === 'agents' && selectedBotIds.length > 0 && (
            <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                <button 
                    onClick={handleGenerateSummary}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                    {isGeneratingSummary ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Summarize Selection'}
                </button>
            </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0c0c0e]">
        {viewMode === 'iot' ? (
            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                {activeModule ? (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
                        <header className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black google-sans text-white uppercase tracking-tighter">{activeModule.name}</h2>
                                <p className="text-zinc-500 text-sm font-mono mt-1">ID: {activeModule.id} | ZONE: {activeModule.zone}</p>
                            </div>
                            <div className="px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest">
                                {activeModule.status}
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl">📊</div>
                                <h3 className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-6">Live Telemetry</h3>
                                <div className="text-4xl font-mono text-white mb-2">{activeModule.dataStream}</div>
                                <p className="text-zinc-500 text-xs">Last updated: Just now</p>
                                <div className="mt-8 h-32 flex items-end gap-2">
                                    {[...Array(20)].map((_, i) => (
                                        <div key={i} className="flex-1 bg-teal-500/20 rounded-t-sm transition-all duration-500" style={{ height: `${Math.random() * 100}%` }}></div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8">
                                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Device Health</h3>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-zinc-300">Battery Integrity</span>
                                        <span className="text-xs font-bold text-emerald-400">{activeModule.batteryLevel}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${activeModule.batteryLevel}%` }}></div>
                                    </div>
                                </div>

                                <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8">
                                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Control Plane</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button className="py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-zinc-300">Reboot</button>
                                        <button className="py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-zinc-300">Calibrate</button>
                                        <button className="py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold col-span-2">Emergency Shutdown</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <div className="text-9xl mb-6">📡</div>
                        <h3 className="text-2xl font-black google-sans uppercase text-white">IoT Mesh Network</h3>
                        <p className="text-zinc-400 mt-2">Select a sensor module to view telemetry.</p>
                    </div>
                )}
            </div>
        ) : isEditing ? (
          <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
               <header className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black google-sans text-white uppercase tracking-tighter">Forge Configurator</h2>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Project Name: <span className="text-teal-500 font-black">{editForm?.name}</span></p>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-zinc-900 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Abort</button>
                     <button onClick={handleSaveBot} className="px-8 py-3 bg-[#136f6f] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-teal-900/20">Commit Agent</button>
                  </div>
               </header>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">Display Name</label>
                        <input type="text" value={editForm?.name} onChange={e => setEditForm(prev => prev ? {...prev, name: e.target.value} : null)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm text-zinc-200 focus:outline-none focus:border-teal-500/50" />
                        
                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">Backend Gateway (Optional)</label>
                        <input type="url" value={editForm?.backendUrl} onChange={e => setEditForm(prev => prev ? {...prev, backendUrl: e.target.value} : null)} placeholder="https://api.external-service.edu" className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm text-teal-500 focus:outline-none focus:border-teal-500/50 font-mono" />
                      </div>
                      
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">Emoji Glyph</label>
                        <input type="text" value={editForm?.icon} onChange={e => setEditForm(prev => prev ? {...prev, icon: e.target.value} : null)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm text-zinc-200 text-center" />
                        
                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-2">Public Access</label>
                        <button onClick={() => setEditForm(prev => prev ? {...prev, isPublished: !prev.isPublished} : null)} className={`w-full py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${editForm?.isPublished ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-black/40 border-white/5 text-zinc-600'}`}>
                          {editForm?.isPublished ? 'Visible to Students' : 'Staff Only (Draft)'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 ml-2">Core Logic Template</label>
                      <textarea value={editForm?.systemInstruction} onChange={e => setEditForm(prev => prev ? {...prev, systemInstruction: e.target.value} : null)} placeholder="Behavioral constraints..." className="w-full h-80 bg-[#09090b] border border-white/10 rounded-[2.5rem] p-10 text-sm text-zinc-300 font-mono leading-relaxed focus:outline-none focus:border-teal-500/50" />
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 ml-2">Grounding Library</label>
                    <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6 h-[580px] flex flex-col overflow-hidden shadow-2xl shadow-black">
                       <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                          {vault.map(asset => (
                            <button key={asset.id} onClick={() => toggleAssetGrounding(asset.id)} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${editForm?.groundedAssets.includes(asset.id) ? 'bg-[#136f6f] border-teal-400/30' : 'bg-black/40 border-white/5 hover:border-white/10'}`}>
                              <div className="min-w-0">
                                 <p className={`text-xs font-bold truncate ${editForm?.groundedAssets.includes(asset.id) ? 'text-white' : 'text-zinc-300'}`}>{asset.title}</p>
                                 <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest mt-1">{asset.mimeType === 'external/url' ? 'External' : 'Archive'}</p>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${editForm?.groundedAssets.includes(asset.id) ? 'bg-white border-white' : 'border-zinc-700'}`}>
                                 {editForm?.groundedAssets.includes(asset.id) && <span className="text-[#136f6f] text-[10px] font-black">✓</span>}
                              </div>
                            </button>
                          ))}
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        ) : activeBot ? (
          <div className="flex-1 flex flex-col">
             <div className="p-10 border-b border-white/5 bg-black/20 flex justify-between items-end relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-6">
                   <div className="w-16 h-16 bg-teal-900/40 border border-teal-500/20 rounded-[1.5rem] flex items-center justify-center text-4xl shadow-2xl">{activeBot.icon}</div>
                   <div>
                      <h2 className="text-2xl font-black google-sans text-white uppercase tracking-tighter">{activeBot.name}</h2>
                      <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mt-1">Uplinked: {activeBot.groundedAssets.length} Data Sources Linked</p>
                   </div>
                </div>
                <div className="flex gap-4 relative z-10">
                   <div className="text-right">
                      <p className="text-[9px] font-black text-zinc-600 uppercase">Gateway</p>
                      <p className={`text-[10px] font-bold ${activeBot.backendUrl ? 'text-emerald-500' : 'text-zinc-500'}`}>{activeBot.backendUrl ? 'Industrial' : 'Isolated'}</p>
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar pb-32">
                {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
                      <div className="text-9xl mb-6">{activeBot.icon}</div>
                      <h3 className="text-2xl font-black google-sans uppercase tracking-widest text-zinc-200">Neural Environment Active</h3>
                      <p className="text-sm mt-2 max-w-sm">Test bot functionality grounded in your library data.</p>
                   </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] p-6 rounded-[2rem] shadow-2xl relative ${m.role === 'user' ? 'bg-zinc-800 text-zinc-200 border border-white/10' : 'bg-[#136f6f]/20 border border-teal-500/20 text-teal-50'}`}>
                        <div className="text-[8px] font-black uppercase tracking-widest mb-2 opacity-50">{m.role === 'user' ? 'Librarian (Test)' : activeBot.name}</div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                     </div>
                  </div>
                ))}
                <div ref={scrollRef} />
             </div>

             <div className="p-8 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e] to-transparent absolute bottom-0 left-0 right-0">
                <form onSubmit={handleTestBot} className="max-w-4xl mx-auto relative group">
                   <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={`Interact with ${activeBot.name}...`} className="w-full bg-[#09090b] border border-white/10 rounded-2xl py-5 px-8 text-zinc-200 text-sm focus:outline-none focus:border-teal-500" />
                   <button type="submit" disabled={isLoading} className="absolute right-3 top-3 bottom-3 px-8 bg-[#136f6f] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Execute</button>
                </form>
             </div>
          </div>
        ) : summary ? (
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-12">
             <div className="max-w-4xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header>
                   <div className="flex items-center gap-4 mb-4">
                      <span className="text-4xl">📑</span>
                      <div>
                         <h2 className="text-3xl font-black google-sans text-white uppercase tracking-tighter">Fleet Executive Summary</h2>
                         <p className="text-sm text-zinc-500 mt-1">Analysis of {selectedBotIds.length} selected agents.</p>
                      </div>
                   </div>
                   <div className="h-1 w-24 bg-indigo-600 rounded-full"></div>
                </header>
                
                <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-9xl pointer-events-none">🧠</div>
                   <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                      {summary}
                   </div>
                </div>

                <div className="flex justify-end">
                   <button onClick={() => setSummary(null)} className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Close Report</button>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-30">
             <div className="text-[12rem] mb-8 grayscale animate-pulse">🧪</div>
             <h2 className="text-4xl font-black google-sans text-zinc-200 uppercase tracking-tighter text-white">Institutional AI Forge</h2>
             <p className="text-sm max-w-lg mt-4 font-medium leading-relaxed text-zinc-400">Build specialized cognitive agents for students, researchers, or administrators. Link them to ingested articles for grounded truth.</p>
             <button onClick={handleCreateBot} className="mt-12 px-12 py-5 bg-[#136f6f] text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Initialize New Agent</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AIStudio;
