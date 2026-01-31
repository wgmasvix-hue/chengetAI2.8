
import React, { useState, useEffect } from 'react';
import { AppView, User, DigitalAsset } from './types';
import Layout from './components/Layout';
import CataloguingModule from './components/CataloguingModule';
import CirculationModule from './components/CirculationModule';
import DigitizationModule from './components/DigitizationModule'; 
import SmartOperations from './components/SmartOperations';
import CommunityModule from './components/CommunityModule';
import ResearchHub from './components/ResearchHub';
import OpenAccessPortal from './components/OpenAccessPortal';
import ChatBot from './components/ChatBot';
import CollectionModule from './components/CollectionModule';
import DiscourseHub from './components/DiscourseHub';
import KohaDashboard from './components/KohaDashboard';
import TrendingBooks from './components/TrendingBooks';
import StudentPortal from './components/StudentPortal';
import SystemsAdmin from './components/SystemsAdmin';
import DigitalResourcesPanel from './components/DigitalResourcesPanel';
import AIStudio from './components/AIStudio';
import PDFReader from './components/PDFReader';
import Login from './components/Login';
import ApiKeyGate from './components/ApiKeyGate';
import { generateSearchGroundedResponse } from './services/geminiService';

const FullLogo = ({ className = "" }: { className?: string }) => (
  <div className={`flex flex-col items-center gap-4 ${className}`}>
    <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#136f6f]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 0L54 18H72L58 28L63 46L50 36L37 46L42 28L28 18H46L50 0Z" fill="currentColor"/>
      <circle cx="50" cy="55" r="10" fill="currentColor"/>
      <path d="M50 70L30 85C25 90 20 100 50 100C80 100 75 90 70 85L50 70Z" fill="currentColor" opacity="0.8"/>
      <path d="M0 65C0 58 20 50 50 75C80 50 100 58 100 65C100 85 80 95 50 95C20 95 0 85 0 65Z" fill="currentColor"/>
    </svg>
    <h2 className="text-3xl font-black tracking-tighter text-[#136f6f] google-sans uppercase">LibraryStudio 5.0</h2>
  </div>
);

const FeatureCard: React.FC<{ title: string; icon: string; desc: string; specs: string[] }> = ({ title, icon, desc, specs }) => (
  <div className="group relative bg-white border border-zinc-100 p-8 rounded-[3rem] shadow-sm hover:shadow-2xl hover:border-teal-200 transition-all duration-500 overflow-hidden flex flex-col h-full text-left">
    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity text-9xl pointer-events-none">
      {icon}
    </div>
    <div className="text-4xl mb-6 relative z-10">{icon}</div>
    <h4 className="text-2xl font-black google-sans text-zinc-900 mb-3 tracking-tight relative z-10 uppercase">{title}</h4>
    <p className="text-sm text-zinc-500 leading-relaxed font-medium mb-8 relative z-10 flex-1">{desc}</p>
    
    <div className="space-y-2 relative z-10">
      <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mb-2 border-b border-teal-50 pb-1">Core Capability</p>
      {specs.map((spec, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-1 h-1 bg-teal-400 rounded-full"></div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{spec}</span>
        </div>
      ))}
    </div>
  </div>
);

const Overview: React.FC<{ setView: (v: AppView) => void, userRole?: string }> = ({ setView, userRole }) => {
  const [news, setNews] = useState<string>('Initializing collective intelligence...');
  const [recentIngests, setRecentIngests] = useState<DigitalAsset[]>([]);
  const [pulse, setPulse] = useState({ artifacts: 14205, checkouts: 912, activeUplinks: 43 });

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await generateSearchGroundedResponse("Summarize why Library 5.0 is critical for Zimbabwe's industrialization goals in one sentence.");
        setNews(res.text || "Bridging digital gaps for academic and industrial excellence.");
      } catch (e) {
        setNews("Knowledge-driven innovation for our community.");
      }
    };
    fetchNews();

    const vault: DigitalAsset[] = JSON.parse(localStorage.getItem('lib50_digital_vault') || '[]');
    setRecentIngests(vault.slice(0, 3));

    const interval = setInterval(() => {
      setPulse(p => ({
        artifacts: p.artifacts + Math.floor(Math.random() * 2),
        checkouts: p.checkouts + (Math.random() > 0.7 ? 1 : 0),
        activeUplinks: 40 + Math.floor(Math.random() * 10)
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-white custom-scrollbar scroll-smooth">
      <section className="relative px-6 py-20 md:px-16 md:py-40 bg-[#fbfcfd] border-b border-zinc-100 overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-teal-500/5 rounded-full blur-[140px] -mr-96 -mt-96 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-[#136f6f]/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-16 animate-in fade-in slide-in-from-top-10 duration-1000">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 text-white text-[10px] font-black rounded-full tracking-[0.2em] uppercase shadow-xl">Uplink Active</div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 border border-teal-100 text-[#136f6f] text-[10px] font-black rounded-full tracking-[0.2em] uppercase">V5.0.4-INDUSTRIAL</div>
            </div>
            <div className="flex-1 bg-white/50 backdrop-blur-md border border-zinc-200 rounded-full px-6 py-2 overflow-hidden shadow-inner flex items-center gap-3">
               <span className="text-teal-600 animate-pulse font-black text-xs">●</span>
               <p className="text-[11px] text-zinc-500 truncate font-black uppercase tracking-widest">{news}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 animate-in fade-in slide-in-from-left-10 duration-1000 delay-200">
              <h1 className="text-4xl md:text-[5.5rem] font-black google-sans mb-4 leading-[0.9] text-zinc-900 tracking-tighter uppercase">
                INSTITUTIONAL<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#136f6f] to-teal-400">INTELLIGENCE</span><br />
                REDEFINED.
              </h1>
              <p className="text-2xl text-zinc-500 max-w-2xl mb-16 leading-relaxed font-medium">LibraryStudio 5.0 is a production-grade workspace for digital heritage, consortium journals, and predictive knowledge systems.</p>
              
              <div className="flex flex-wrap gap-6">
                <button onClick={() => setView(userRole === 'student' ? AppView.STUDENT_PORTAL : AppView.ASSISTANT)} className="group px-12 py-7 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-[2rem] font-black transition-all shadow-2xl shadow-teal-900/30 flex items-center gap-6 text-sm uppercase tracking-widest active:scale-95">
                  <span className="group-hover:rotate-12 transition-transform text-2xl">⚡</span> {userRole === 'student' ? 'My Knowledge Hub' : 'Connect with Taurai'}
                </button>
                <button onClick={() => setView(AppView.DIGITAL_RESOURCES)} className="px-12 py-7 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 rounded-[2rem] font-black transition-all flex items-center gap-6 shadow-xl text-sm uppercase tracking-widest active:scale-95">
                  <span className="opacity-50 text-2xl">📀</span> Open Vault
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 hidden lg:flex flex-col gap-6 animate-in fade-in slide-in-from-right-10 duration-1000 delay-500">
               <div className="bg-zinc-900 p-8 rounded-[3rem] shadow-2xl text-white border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl group-hover:scale-110 transition-transform duration-700">📜</div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Recent Directory Ingests</p>
                  <div className="space-y-4 relative z-10">
                    {recentIngests.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic">No recent directory activity.</p>
                    ) : recentIngests.map(asset => (
                      <div key={asset.id} className="flex items-center gap-4 group/item cursor-pointer" onClick={() => setView(AppView.DIGITAL_RESOURCES)}>
                         <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl group-hover/item:bg-[#136f6f] transition-colors border border-white/5">📄</div>
                         <div className="min-w-0">
                            <p className="text-xs font-bold truncate group-hover/item:text-teal-400 transition-colors">{asset.title}</p>
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{asset.author}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setView(AppView.DIGITAL_RESOURCES)} className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5">View Full Repository ➔</button>
               </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-32 md:px-16 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-xs font-black text-[#136f6f] uppercase tracking-[0.5em] mb-4">Core Ecosystem</h2>
            <h3 className="text-5xl font-black google-sans text-zinc-900 tracking-tighter uppercase">Industrial Library Pillars</h3>
            <div className="w-24 h-1 bg-teal-500 mx-auto mt-8 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              title="Agent Forge" 
              icon="🧪" 
              desc="Deploy custom specialized chatbots grounded in institutional articles for students and researchers."
              specs={['Subject Specialists', 'Neural Grounding', 'Public/Staff modes']}
            />
            <FeatureCard 
              title="Consortium Sync" 
              icon="🔗" 
              desc="Real-time ingestion of external academic data from the national strategic consortium hub."
              specs={['Live REST Linking', 'ISO2709 Support', 'DDC Automated Mapping']}
            />
            <FeatureCard 
              title="Vault Analytics" 
              icon="📊" 
              desc="Deep reasoning analytics on collection health, patron usage trends, and industrial gaps."
              specs={['Predictive Analysis', 'Report Synthesis', 'Industrial Scorecards']}
            />
          </div>
        </div>
      </section>

      <footer className="px-6 py-20 text-center bg-white border-t border-zinc-100">
        <FullLogo className="opacity-20 grayscale" />
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<'student' | 'staff' | null>(() => {
    return localStorage.getItem('lib50_role') as 'student' | 'staff' | null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('lib50_auth') === 'true';
  });
  const [currentView, setCurrentView] = useState<AppView>(() => {
    return (localStorage.getItem('libra_view') as AppView) || AppView.OVERVIEW;
  });
  const [activePdf, setActivePdf] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('libra_view', currentView);
  }, [currentView]);

  const handleLogin = (role: 'student' | 'staff', name: string) => {
    setUserRole(role);
    setIsAuthenticated(true);
    setCurrentView(role === 'student' ? AppView.STUDENT_PORTAL : AppView.OVERVIEW);
  };

  const handleLogout = () => {
    localStorage.removeItem('lib50_auth');
    localStorage.removeItem('lib50_role');
    localStorage.removeItem('lib50_user_name');
    localStorage.removeItem('lib50_student_id');
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentView(AppView.OVERVIEW);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.TEACHING: return <CirculationModule />;
      case AppView.RESEARCH: return <ResearchHub />;
      case AppView.COMMUNITY: return <CommunityModule />;
      case AppView.INnovation: return <DigitizationModule onOpenPdf={(asset) => setActivePdf({ url: asset.url || '', title: asset.title })} />;
      case AppView.INDUSTRIALIZATION: return <SmartOperations />;
      case AppView.OPEN_ACCESS: return <OpenAccessPortal />;
      case AppView.DIGITAL_RESOURCES: return <DigitalResourcesPanel onOpenPdf={(asset) => setActivePdf({ url: asset.url || '', title: asset.title })} />;
      case AppView.AI_STUDIO: return <AIStudio />;
      case AppView.CATALOGUING: return <CataloguingModule />;
      case AppView.ASSISTANT: return <ChatBot />;
      case AppView.COLLECTION: return <CollectionModule />;
      case AppView.DISCOURSE: return <DiscourseHub />;
      case AppView.KOHA_DASHBOARD: return <KohaDashboard />;
      case AppView.TRENDING: return <TrendingBooks />;
      case AppView.STUDENT_PORTAL: return <StudentPortal onOpenPdf={(asset) => setActivePdf({ url: asset.url || '', title: asset.title })} />;
      case AppView.SYSTEMS_ADMIN: return <SystemsAdmin />;
      default: return <Overview setView={setCurrentView} userRole={userRole || undefined} />;
    }
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <ApiKeyGate>
      <Layout activeView={currentView} setView={setCurrentView} onLogout={handleLogout} userRole={userRole || undefined}>
        {renderView()}
        {activePdf && <PDFReader url={activePdf.url} title={activePdf.title} onClose={() => setActivePdf(null)} />}
      </Layout>
    </ApiKeyGate>
  );
};

export default App;
