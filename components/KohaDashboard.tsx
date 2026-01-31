
import React, { useState, useEffect } from 'react';
import { analyzeKohaData } from '../services/geminiService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CIRCULATION_DATA = [
  { day: 'Mon', checkouts: 420, returns: 380 },
  { day: 'Tue', checkouts: 550, returns: 510 },
  { day: 'Wed', checkouts: 620, returns: 580 },
  { day: 'Thu', checkouts: 480, returns: 450 },
  { day: 'Fri', checkouts: 710, returns: 680 },
  { day: 'Sat', checkouts: 320, returns: 300 },
  { day: 'Sun', checkouts: 150, returns: 120 },
];

const KohaDashboard: React.FC = () => {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [serverStatus, setServerStatus] = useState<'optimal' | 'syncing' | 'alert'>('optimal');
  const [kohaUrl, setKohaUrl] = useState(localStorage.getItem('koha_url') || 'https://ils.library.edu');
  const [isLinking, setIsLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(!!localStorage.getItem('koha_session'));
  
  // Data Analysis Bench
  const [rawKohaData, setRawKohaData] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (isLinked) {
      // Periodic status check simulation
      const interval = setInterval(() => {
          setServerStatus(Math.random() > 0.8 ? 'syncing' : 'optimal');
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isLinked]);

  const handleLinkKoha = () => {
    setIsLinking(true);
    setTimeout(() => {
      localStorage.setItem('koha_url', kohaUrl);
      localStorage.setItem('koha_session', 'KOHA-' + Math.random().toString(36).substr(2, 9).toUpperCase());
      setIsLinked(true);
      setIsLinking(false);
      setServerStatus('optimal');
    }, 1500);
  };

  const handleUnlink = () => {
    localStorage.removeItem('koha_session');
    setIsLinked(false);
  };

  const runDeepAnalysis = async () => {
    if (!rawKohaData.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await analyzeKohaData(rawKohaData);
      setAnalysisResult(res.text || "Report finished.");
    } catch (e) {
      setAnalysisResult("Could not finish report. Please check the information.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar pb-32 bg-[#fbfcfd]">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black google-sans flex items-center gap-4 text-zinc-900 uppercase tracking-tighter">
            <span className="text-[#136f6f]">📊</span> Koha Library Reports
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Checking how our library is doing</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-3 transition-all ${isLinked ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-100 border-zinc-200'}`}>
            <div className={`w-2 h-2 rounded-full ${isLinked && serverStatus === 'optimal' ? 'bg-emerald-500 animate-pulse' : isLinked ? 'bg-amber-500' : 'bg-zinc-300'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isLinked ? 'text-emerald-700' : 'text-zinc-500'}`}>
              {isLinked ? `Connected` : 'Offline'}
            </span>
          </div>
          {isLinked && (
            <button onClick={handleUnlink} className="text-[9px] font-black text-red-500 uppercase hover:underline">Disconnect</button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Direct Link Panel */}
        <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-8xl transition-transform group-hover:scale-110">🔌</div>
          <h2 className="text-[10px] font-black text-[#136f6f] uppercase tracking-[0.3em] mb-6">Connect to Library System</h2>
          
          <div className="space-y-6 relative z-10">
            <div>
              <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-2">Library Website Address</label>
              <input 
                type="text" 
                value={kohaUrl} 
                onChange={(e) => setKohaUrl(e.target.value)}
                disabled={isLinked}
                placeholder="https://ils.your-library.edu"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 px-5 text-xs focus:outline-none focus:border-[#136f6f] transition-all disabled:opacity-50"
              />
            </div>

            {!isLinked ? (
              <button 
                onClick={handleLinkKoha}
                disabled={isLinking}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all"
              >
                {isLinking ? (
                  <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> connecting...</>
                ) : 'Connect Now'}
              </button>
            ) : (
              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Security Status</span>
                    <span className="text-[9px] font-black text-emerald-700">Protected</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Connection Status</span>
                    <span className="text-[9px] font-black text-emerald-700">Working</span>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Telemetry Graph */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[400px]">
           <div className="absolute top-0 right-0 p-10 opacity-5 text-9xl">📈</div>
           <header className="flex justify-between items-center mb-10 relative z-10">
              <div>
                 <h3 className="text-lg font-bold google-sans tracking-tight">How many people are using books?</h3>
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Live library activity</p>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#136f6f]"></div>
                    <span className="text-[9px] font-black uppercase text-zinc-400">Books Borrowed</span>
                 </div>
              </div>
           </header>
           
           <div className="flex-1 min-h-[250px] relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={CIRCULATION_DATA}>
                    <defs>
                       <linearGradient id="colorCheckouts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#136f6f" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#136f6f" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="day" stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#ffffff20" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="checkouts" stroke="#136f6f" strokeWidth={4} fillOpacity={1} fill="url(#colorCheckouts)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Deep Analysis Bench */}
        <div className="lg:col-span-12 bg-white border border-zinc-200 rounded-[3rem] p-10 shadow-lg relative overflow-hidden group">
           <div className="absolute top-0 left-0 p-10 opacity-[0.02] text-9xl pointer-events-none">🧠</div>
           <header className="flex justify-between items-center mb-8 relative z-10">
              <div>
                 <h3 className="text-xl font-bold google-sans text-zinc-900 tracking-tight">Library Analysis Tool</h3>
                 <p className="text-[10px] font-black text-[#136f6f] uppercase tracking-widest mt-1">Understanding our library better</p>
              </div>
           </header>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 ml-4">Paste Library Report Here</label>
                    <textarea 
                      value={rawKohaData}
                      onChange={(e) => setRawKohaData(e.target.value)}
                      placeholder="Paste your Koha report text here to learn more about it..."
                      className="w-full h-64 bg-zinc-50 border border-zinc-100 rounded-[2rem] p-8 text-xs focus:outline-none focus:border-[#136f6f] transition-all resize-none shadow-inner text-zinc-700 placeholder:text-zinc-300"
                    />
                 </div>
                 <button 
                    onClick={runDeepAnalysis}
                    disabled={isAnalyzing || !rawKohaData.trim()}
                    className="w-full py-6 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-teal-900/30 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Creating Report...</>
                    ) : (
                      <><span>✨</span> Start Analysis</>
                    )}
                 </button>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-10 flex flex-col relative shadow-inner overflow-hidden">
                 <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Your Strategic Briefing</h4>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 relative z-10">
                    {analysisResult ? (
                      <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap italic animate-in fade-in duration-1000">
                         {analysisResult}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                         <div className="text-8xl mb-6 grayscale animate-pulse">🏛️</div>
                         <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Paste some data to begin</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default KohaDashboard;
