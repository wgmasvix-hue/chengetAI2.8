
import React, { useState, useEffect, useRef } from 'react';
import { summarizeDiscussion } from '../services/geminiService';
import { DiscussionPanel, DiscussionMessage } from '../types';

const INITIAL_PANELS: DiscussionPanel[] = [
  { id: '1', title: 'Indigenous Knowledge Preservation', category: 'Cultural Heritage', participantCount: 12, lastActive: Date.now(), description: 'Strategies for capturing and digitizing oral histories in regional Shona dialects.' },
  { id: '2', title: 'AI Ethics in Academic Libraries', category: 'Technology', participantCount: 24, lastActive: Date.now() - 3600000, description: 'Balancing automation with human-centered reference services in EDU 5.0.' },
  { id: '3', title: 'Zim Education 5.0 Roadmap', category: 'Policy', participantCount: 18, lastActive: Date.now() - 7200000, description: 'Aligning library resource acquisition with new industrialization benchmarks.' },
];

const DiscourseHub: React.FC = () => {
  const [panels, setPanels] = useState<DiscussionPanel[]>(INITIAL_PANELS);
  const [activePanel, setActivePanel] = useState<DiscussionPanel | null>(null);
  const [messages, setMessages] = useState<Record<string, DiscussionMessage[]>>({
    '1': [
      { id: 'm1', sender: 'Librarian_Chuma', role: 'expert', content: 'We need to define a consistent metadata schema for audio recordings of village elders.', timestamp: Date.now() - 100000 },
      { id: 'm2', sender: 'TechLead_Zim', role: 'user', content: 'I suggest using a hybrid of Dublin Core and local thematic descriptors.', timestamp: Date.now() - 50000 },
    ],
    '2': [
      { id: 'm3', sender: 'Patron_A', role: 'user', content: 'Should AI assistants disclose they are not human immediately?', timestamp: Date.now() - 200000 },
    ]
  });
  const [panelSummaries, setPanelSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activePanel, messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePanel || !input.trim()) return;

    const newMessage: DiscussionMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'You',
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => ({
      ...prev,
      [activePanel.id]: [...(prev[activePanel.id] || []), newMessage]
    }));
    setInput('');
  };

  const handleSummarizePanel = async (e: React.MouseEvent, panel: DiscussionPanel) => {
    e.stopPropagation();
    if (loadingSummaries[panel.id]) return;

    setLoadingSummaries(prev => ({ ...prev, [panel.id]: true }));
    try {
      const thread = messages[panel.id] || [];
      if (thread.length === 0) {
        setPanelSummaries(prev => ({ ...prev, [panel.id]: "No messages to summarize yet." }));
        return;
      }
      const summary = await summarizeDiscussion(panel.title, thread);
      setPanelSummaries(prev => ({ ...prev, [panel.id]: summary || "Analysis yielded no results." }));
    } catch (err) {
      setPanelSummaries(prev => ({ ...prev, [panel.id]: "Error connecting to AI service." }));
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [panel.id]: false }));
    }
  };

  const handleSynthesize = async () => {
    if (!activePanel || isSynthesizing) return;
    setIsSynthesizing(true);
    setAiInsight(null);
    try {
      const thread = messages[activePanel.id] || [];
      const summary = await summarizeDiscussion(activePanel.title, thread);
      setAiInsight(summary || "Insufficient context for synthesis.");
    } catch (e) {
      setAiInsight("Synthesis engine unreachable.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const createPanel = () => {
    const title = prompt("Enter Discussion Topic:");
    if (!title) return;
    const newPanel: DiscussionPanel = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      category: 'General',
      participantCount: 1,
      lastActive: Date.now(),
      description: 'A newly initiated discourse on ' + title
    };
    setPanels(prev => [newPanel, ...prev]);
    setActivePanel(newPanel);
  };

  return (
    <div className="flex h-full bg-[#f8f9fa] overflow-hidden">
      {/* Side: Panels List */}
      <aside className="w-96 border-r border-zinc-200 bg-white flex flex-col">
        <header className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Discussion Panels</h2>
          <button onClick={createPanel} className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-lg hover:bg-zinc-800 transition-all">+</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {panels.map(p => (
            <div
              key={p.id}
              onClick={() => { setActivePanel(p); setAiInsight(null); }}
              className={`group w-full text-left p-5 rounded-[1.5rem] border transition-all cursor-pointer relative ${activePanel?.id === p.id ? 'bg-teal-50 border-teal-200 shadow-sm' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-teal-600 bg-white px-2 py-0.5 rounded-full border border-teal-100">{p.category}</span>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={(e) => handleSummarizePanel(e, p)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${loadingSummaries[p.id] ? 'bg-zinc-100 text-zinc-400' : 'bg-[#136f6f]/10 text-[#136f6f] hover:bg-[#136f6f] hover:text-white'}`}
                   >
                     {loadingSummaries[p.id] ? '⌛' : '✨'} Summarize
                   </button>
                   <span className="text-[9px] font-bold text-zinc-400">👤 {p.participantCount}</span>
                </div>
              </div>
              
              <h3 className={`text-sm font-bold leading-snug mb-1 ${activePanel?.id === p.id ? 'text-[#136f6f]' : 'text-zinc-900'}`}>{p.title}</h3>
              
              {panelSummaries[p.id] && (
                <div className="mt-3 p-3 bg-zinc-900/5 rounded-xl border-l-2 border-[#136f6f] text-[10px] text-[#136f6f] italic animate-in fade-in slide-in-from-top-1 leading-relaxed">
                   <span className="font-black uppercase text-[7px] block mb-1 text-zinc-400 tracking-wider">AI Discussion Digest:</span>
                   {panelSummaries[p.id]}
                </div>
              )}

              <p className="text-[10px] text-zinc-400 mt-2 line-clamp-1">{p.description}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* Main: Discourse Agora */}
      <main className="flex-1 flex flex-col relative bg-[#f8f9fa]">
        {activePanel ? (
          <>
            <header className="h-20 border-b border-zinc-200 bg-white px-8 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-xl border border-teal-100">🗨️</div>
                <div>
                  <h2 className="text-lg font-bold google-sans text-zinc-900 leading-none">{activePanel.title}</h2>
                  <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mt-1">{activePanel.description}</p>
                </div>
              </div>
              <button 
                onClick={handleSynthesize}
                disabled={isSynthesizing}
                className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-[#136f6f] transition-all"
              >
                {isSynthesizing ? '⚡ Synthesizing...' : '✨ AI Insight'}
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar pb-32">
              {(messages[activePanel.id] || []).map(m => (
                <div key={m.id} className={`flex ${m.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-6 rounded-[2rem] shadow-sm relative group ${m.sender === 'You' ? 'bg-[#136f6f] text-white' : 'bg-white border border-zinc-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                       <span className={`text-[8px] font-black uppercase tracking-widest ${m.sender === 'You' ? 'text-teal-200' : 'text-zinc-400'}`}>{m.sender} {m.role === 'expert' && '💎'}</span>
                       <span className={`text-[8px] font-bold ${m.sender === 'You' ? 'text-teal-400' : 'text-zinc-300'}`}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* AI Insight Sidebar / Modal Overlay */}
            {aiInsight && (
              <div className="absolute top-24 right-8 w-80 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl animate-in slide-in-from-right-10 duration-500 z-20">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Cognitive Synthesis</span>
                  <button onClick={() => setAiInsight(null)} className="text-zinc-500 text-xs">✕</button>
                </div>
                <div className="text-[11px] text-zinc-300 font-mono leading-relaxed italic whitespace-pre-wrap">
                  {aiInsight}
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800">
                   <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Powered by Advanced Intelligence</p>
                </div>
              </div>
            )}

            <div className="p-8 bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent absolute bottom-0 left-0 right-0">
               <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Contribute to the discourse..."
                    className="w-full bg-white border border-zinc-200 rounded-3xl py-6 px-8 text-sm focus:outline-none focus:border-teal-500 shadow-xl transition-all"
                  />
                  <button type="submit" className="absolute right-3 top-3 bottom-3 px-8 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Post Message</button>
               </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <div className="text-9xl mb-8 grayscale animate-pulse">🏛️</div>
            <h2 className="text-3xl font-bold google-sans text-zinc-900 uppercase tracking-tighter">Academic Agora</h2>
            <p className="text-sm max-w-sm font-medium mt-2">Select a discussion panel to enter the collective intelligence stream.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DiscourseHub;
