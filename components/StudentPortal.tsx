
import React, { useState, useEffect } from 'react';
import { DigitalAsset, CustomChatbot, ChatMessage } from '../types';
import { generateReasoningResponse, getAIClient } from '../services/geminiService';
import { MODELS } from '../constants';

const StudentPortal: React.FC<{ onOpenPdf?: (a: DigitalAsset) => void }> = ({ onOpenPdf }) => {
  const [vault, setVault] = useState<DigitalAsset[]>([]);
  const [staffBots, setStaffBots] = useState<CustomChatbot[]>([]);
  const [activeAgent, setActiveAgent] = useState<CustomChatbot | null>(null);
  
  const studentId = localStorage.getItem('lib50_student_id') || 'GUEST';
  const studentName = localStorage.getItem('lib50_user_name') || 'Student';
  const shelfKey = `lib50_shelf_${studentId}`;

  const [myBooks, setMyBooks] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem(shelfKey) || '[]');
  });
  const [activeTab, setActiveTab] = useState<'bookshelf' | 'library' | 'agents'>('library');
  const [aiInsight, setAiInsight] = useState<Record<string, string>>({});
  const [loadingInsight, setLoadingInsight] = useState<string | null>(null);

  // Chat agent state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    const savedVault = localStorage.getItem('lib50_digital_vault');
    if (savedVault) setVault(JSON.parse(savedVault));

    const savedBots = localStorage.getItem('lib50_custom_chatbots');
    if (savedBots) {
      const bots: CustomChatbot[] = JSON.parse(savedBots);
      setStaffBots(bots.filter(b => b.isPublished));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(shelfKey, JSON.stringify(myBooks));
  }, [myBooks, shelfKey]);

  const addToBookshelf = (id: string) => {
    if (!myBooks.includes(id)) setMyBooks(prev => [...prev, id]);
  };

  const removeFromBookshelf = (id: string) => {
    setMyBooks(prev => prev.filter(bId => bId !== id));
  };

  const handleAgentChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading || !activeAgent) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const ai = getAIClient();
      const assignedAssetsData = vault.filter(a => activeAgent.groundedAssets.includes(a.id));
      const groundingContext = assignedAssetsData.length > 0 
        ? `\n\nYOUR KNOWLEDGE BASE (Local Library Articles):\n${assignedAssetsData.map(a => `- ${a.title} by ${a.author}`).join('\n')}`
        : '';

      const response = await ai.models.generateContent({
        model: MODELS.REASONING,
        contents: [
          { role: 'user', parts: [{ text: `SYSTEM_INSTRUCTION: ${activeAgent.systemInstruction}${groundingContext}` }] },
          ...chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: chatInput }] }
        ],
        config: { thinkingConfig: { thinkingBudget: 16000 } }
      });

      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I am analyzing the resource data.",
        timestamp: Date.now()
      }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { id: 'err', role: 'model', text: "Agent connection failure.", timestamp: Date.now() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar pb-32 bg-[#fbfcfd]">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black google-sans text-zinc-900 uppercase tracking-tighter">Mhoroi, {studentName}!</h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-black opacity-60">ID: {studentId} • Learning Portal</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-2xl shadow-inner">
          <button onClick={() => setActiveTab('library')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'library' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}>Directory</button>
          <button onClick={() => setActiveTab('bookshelf')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bookshelf' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}>My Bookshelf ({myBooks.length})</button>
          <button onClick={() => setActiveTab('agents')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'agents' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}>AI Agents ({staffBots.length})</button>
        </div>
      </header>

      {activeTab === 'library' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <section className="bg-zinc-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl group-hover:rotate-12 transition-all">📀</div>
             <h2 className="text-3xl font-black google-sans tracking-tighter uppercase mb-2 text-teal-400">The Digital Vault</h2>
             <p className="text-zinc-400 max-w-xl text-sm leading-relaxed mb-8">Access institutional repositories, consortium journals, and archived indigenous knowledge. All articles listed here have been vetted for Education 5.0 alignment.</p>
             <div className="flex gap-10">
                <div className="flex flex-col">
                  <span className="text-3xl font-black">{vault.length}</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Ingests</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black">{vault.filter(a => a.mimeType === 'external/url').length}</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">External Articles</span>
                </div>
             </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vault.map(asset => (
              <div key={asset.id} className="group bg-white border border-zinc-100 p-8 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${asset.mimeType === 'external/url' ? 'bg-teal-50 text-teal-600' : 'bg-zinc-50 text-zinc-400'}`}>
                    {asset.mimeType === 'external/url' ? '🌐' : '📄'}
                  </div>
                  <span className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em]">{asset.ddc}</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-1 group-hover:text-[#136f6f] transition-colors">{asset.title}</h3>
                <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest mb-6">Author: {asset.author}</p>
                <div className="mt-auto flex justify-between items-center pt-6 border-t border-zinc-50">
                  <button onClick={() => addToBookshelf(asset.id)} className={`text-[10px] font-black uppercase tracking-widest ${myBooks.includes(asset.id) ? 'text-emerald-500' : 'text-[#136f6f] hover:underline'}`}>
                    {myBooks.includes(asset.id) ? '✓ Saved' : '+ Bookmark'}
                  </button>
                  <button onClick={() => onOpenPdf?.(asset)} className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl">Open Resource</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 h-[700px]">
          <div className="lg:col-span-4 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 px-4">Subject Specialists</h3>
            {staffBots.map(bot => (
              <button 
                key={bot.id} 
                onClick={() => { setActiveAgent(bot); setChatMessages([]); }}
                className={`w-full text-left p-6 rounded-[2.5rem] border transition-all ${activeAgent?.id === bot.id ? 'bg-[#136f6f] border-[#136f6f] text-white shadow-2xl' : 'bg-white border-zinc-100 text-zinc-900 hover:border-teal-200 shadow-sm'}`}
              >
                <div className="text-3xl mb-4">{bot.icon}</div>
                <h4 className="text-base font-bold mb-1">{bot.name}</h4>
                <p className={`text-xs mb-4 line-clamp-2 ${activeAgent?.id === bot.id ? 'text-teal-50' : 'text-zinc-500'}`}>{bot.description}</p>
                <div className={`text-[8px] font-black uppercase tracking-widest ${activeAgent?.id === bot.id ? 'text-teal-200' : 'text-[#136f6f]'}`}>
                  {bot.groundedAssets.length} Resources Linked
                </div>
              </button>
            ))}
            {staffBots.length === 0 && (
              <div className="p-12 text-center opacity-30 italic text-sm">No specialized AI agents have been published by library staff yet.</div>
            )}
          </div>

          <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-[3.5rem] shadow-xl flex flex-col overflow-hidden">
            {activeAgent ? (
              <>
                <header className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{activeAgent.icon}</span>
                    <div>
                      <h4 className="text-lg font-bold text-zinc-900 leading-none">{activeAgent.name}</h4>
                      <p className="text-[10px] font-black text-[#136f6f] uppercase tracking-widest mt-1">Specialized Academic Agent</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveAgent(null)} className="text-xs text-zinc-400 hover:text-zinc-900">Close Session</button>
                </header>
                <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar pb-24">
                  {chatMessages.map(m => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] p-6 rounded-[2rem] shadow-sm ${m.role === 'user' ? 'bg-[#136f6f] text-white' : 'bg-zinc-50 border border-zinc-100 text-zinc-800'}`}>
                          <p className="text-sm leading-relaxed">{m.text}</p>
                       </div>
                    </div>
                  ))}
                  {isChatLoading && <div className="text-[9px] font-black uppercase text-zinc-300 animate-pulse px-4">Consulting Knowledge Base...</div>}
                </div>
                <div className="p-8 bg-white border-t border-zinc-50">
                  <form onSubmit={handleAgentChat} className="relative group">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`Query ${activeAgent.name}...`} className="w-full bg-zinc-50 border border-zinc-200 rounded-3xl py-5 px-8 text-sm focus:outline-none focus:border-teal-500 shadow-inner" />
                    <button type="submit" className="absolute right-3 top-3 bottom-3 px-8 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase">Send</button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-20">
                <div className="text-9xl mb-8">🤖</div>
                <h3 className="text-2xl font-black google-sans uppercase tracking-tighter">Academic Intelligence Desk</h3>
                <p className="text-sm mt-4 max-w-sm">Select an AI Subject Specialist to start a research session grounded in verified library articles.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bookshelf' && (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
           {/* Fixed typo: changed 'myLibraryBooks' to 'myBooks' as defined in state */}
           {myBooks.length === 0 ? (
             <div className="py-32 text-center opacity-20 flex flex-col items-center">
                <div className="text-8xl mb-6">🏷️</div>
                <h3 className="text-xl font-bold google-sans uppercase">Private Shelf Inactive</h3>
                <p className="text-sm mt-2">Discover resources in the vault and save them here for offline reasoning.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {vault.filter(a => myBooks.includes(a.id)).map(asset => (
                  <div key={asset.id} className="bg-white border-2 border-teal-100 p-10 rounded-[3.5rem] shadow-xl relative group overflow-hidden">
                    <button onClick={() => removeFromBookshelf(asset.id)} className="absolute top-8 right-8 text-zinc-300 hover:text-red-500 transition-colors">✕</button>
                    <div className="w-16 h-16 bg-[#136f6f] rounded-[1.2rem] flex items-center justify-center text-3xl text-white shadow-lg mb-8">📄</div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-2 leading-tight">{asset.title}</h3>
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-10 tracking-[0.1em]">{asset.author}</p>
                    <button onClick={() => onOpenPdf?.(asset)} className="w-full py-5 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl transition-all">Resume Reading</button>
                  </div>
                ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default StudentPortal;
