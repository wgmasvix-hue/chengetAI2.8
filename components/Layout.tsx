
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  setView: (view: AppView) => void;
  onLogout?: () => void;
  userRole?: 'student' | 'staff';
}

const LogoIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5L53 17H65L55 25L58 37L50 30L42 37L45 25L35 17H47L50 5Z" fill="currentColor"/>
    <circle cx="50" cy="45" r="8" fill="currentColor"/>
    <path d="M50 55L35 65C30 70 25 85 50 85C75 85 70 70 65 65L50 55Z" fill="currentColor" opacity="0.8"/>
    <path d="M10 50C10 45 25 40 50 55C75 40 90 45 90 50C90 65 75 75 50 75C25 75 10 65 10 50Z" fill="currentColor" fillRule="evenodd"/>
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView, onLogout, userRole }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    setUserName(localStorage.getItem('lib50_user_name') || '');
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const staffItems = [
    { id: AppView.OVERVIEW, label: 'Welcome Page', icon: '🏛️' },
    { id: AppView.SYSTEMS_ADMIN, label: 'Systems Admin', icon: '⚙️' },
    { id: AppView.AI_STUDIO, label: 'AI Studio', icon: '🧪' },
    { id: AppView.DIGITAL_RESOURCES, label: 'Digital Assets', icon: '📀' },
    { id: AppView.TRENDING, label: 'Trending Books', icon: '📡' },
    { id: AppView.ASSISTANT, label: 'TAURAI Assistant', icon: '✨' },
    { id: AppView.KOHA_DASHBOARD, label: 'Library Reports', icon: '📊' },
    { id: AppView.COLLECTION, label: 'Book Analysis', icon: '📊' },
    { id: AppView.DISCOURSE, label: 'Community Talk', icon: '🗨️' },
    { id: AppView.TEACHING, label: 'Helping Teachers', icon: '👨‍🏫' },
    { id: AppView.RESEARCH, label: 'Research Hub', icon: '🌐' },
    { id: AppView.COMMUNITY, label: 'Community Work', icon: '📣' },
    { id: AppView.INnovation, label: 'New Ideas', icon: '💡' },
    { id: AppView.INDUSTRIALIZATION, label: 'Work & Tools', icon: '🏭' },
    { id: AppView.OPEN_ACCESS, label: 'Free Resources', icon: '🔓' },
    { id: AppView.CATALOGUING, label: 'Book Info Tool', icon: '🏷️' },
  ];

  const studentItems = [
    { id: AppView.STUDENT_PORTAL, label: 'My Learning Space', icon: '🏠' },
    { id: AppView.DIGITAL_RESOURCES, label: 'Digital Assets', icon: '📀' },
    { id: AppView.ASSISTANT, label: 'TAURAI Help', icon: '✨' },
    { id: AppView.TRENDING, label: 'Popular Books', icon: '📡' },
    { id: AppView.RESEARCH, label: 'Research Hub', icon: '🌐' },
    { id: AppView.OPEN_ACCESS, label: 'Free Reading', icon: '🔓' },
    { id: AppView.DISCOURSE, label: 'Student Talk', icon: '🗨️' },
    { id: AppView.OVERVIEW, label: 'Welcome Home', icon: '🏛️' },
  ];

  const navItems = userRole === 'student' ? studentItems : staffItems;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa]">
      <aside className="w-20 md:w-64 border-r border-zinc-200 flex flex-col bg-white z-20">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#136f6f] rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
              <LogoIcon className="w-7 h-7" />
            </div>
            <span className="hidden md:block font-bold text-lg tracking-tight google-sans text-[#136f6f]">LibraryStudio 5.0</span>
          </div>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeView === item.id 
                  ? 'bg-teal-50 text-[#136f6f] border border-teal-100' 
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="hidden md:block font-medium text-sm truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-3">
          <div className="hidden md:flex flex-col px-3 py-2 bg-white rounded-xl border border-zinc-100 mb-2">
             <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{userRole || 'User'}</p>
             <p className="text-[10px] font-bold text-zinc-800 truncate">{userName}</p>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-4 px-4 py-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <span className="text-xl">🚪</span>
              <span className="hidden md:block font-black text-[9px] uppercase tracking-widest">Sign Out</span>
            </button>
          )}

          <div className="hidden md:flex flex-col gap-2 pt-2 border-t border-zinc-100 px-2">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {isOnline ? 'Active' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
