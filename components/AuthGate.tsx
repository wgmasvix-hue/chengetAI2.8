
import React, { useState, useEffect } from 'react';

interface AuthGateProps {
  onUnlock: () => void;
}

const AuthGate: React.FC<AuthGateProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isMounting, setIsMounting] = useState(false);

  useEffect(() => {
    setIsMounting(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'CHENGETAI5.0') {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
      setPassword('');
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-[#0b0b0d] flex items-center justify-center transition-opacity duration-1000 ${isMounting ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative w-full max-w-md px-8 text-center">
        <div className="mb-12 inline-flex items-center justify-center w-20 h-20 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-4xl relative z-10">🔐</span>
        </div>

        <h1 className="text-3xl font-bold google-sans mb-3 tracking-tight">System Gateway</h1>
        <p className="text-zinc-500 text-sm mb-10 leading-relaxed uppercase tracking-[0.2em] font-black">chengetAI LABS SECURITY PROTOCOL</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`relative group transition-transform duration-75 ${error ? 'translate-x-2' : ''}`}>
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-focus-within:opacity-100 transition duration-500 ${error ? 'from-red-600 to-orange-600' : ''}`}></div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ENTER ACCESS KEY"
              autoFocus
              className={`relative w-full bg-[#0b0b0d] border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-2xl py-5 px-6 text-center text-sm font-mono tracking-[0.5em] focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700 placeholder:tracking-widest`}
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] text-zinc-400 hover:text-white transition-all shadow-xl"
          >
            Authenticate Uplink
          </button>
        </form>

        <div className="mt-16 pt-8 border-t border-white/5">
          <p className="text-[9px] font-black tracking-[0.4em] uppercase text-zinc-700">
            LibraStudio 5.0 Industrial Environment
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
