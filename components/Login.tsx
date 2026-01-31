import React, { useState, useEffect } from 'react';

interface LoginProps {
  onLogin: (role: 'student' | 'staff', name: string) => void;
}

interface StudentAccount {
  id: string;
  name: string;
  passcode: string;
}

const LogoIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5L53 17H65L55 25L58 37L50 30L42 37L45 25L35 17H47L50 5Z" fill="currentColor"/>
    <circle cx="50" cy="45" r="8" fill="currentColor"/>
    <path d="M50 55L35 65C30 70 25 85 50 85C75 85 70 70 65 65L50 55Z" fill="currentColor" opacity="0.8"/>
    <path d="M10 50C10 45 25 40 50 55C75 40 90 45 90 50C90 65 75 75 50 75C25 75 10 65 10 50Z" fill="currentColor" fillRule="evenodd"/>
  </svg>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'student' | 'staff'>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const [credentials, setCredentials] = useState({ id: '', token: '', name: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize accounts if they don't exist
  useEffect(() => {
    const existing = localStorage.getItem('lib50_accounts');
    if (!existing) {
      const defaultStudent: StudentAccount = { id: 'S-2024-001', name: 'Student Researcher', passcode: '12345' };
      localStorage.setItem('lib50_accounts', JSON.stringify([defaultStudent]));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const idUpper = credentials.id.toUpperCase();
      
      if (role === 'staff') {
        if (idUpper === 'CHENGETAI' && credentials.token === '778899') {
          localStorage.setItem('lib50_auth', 'true');
          localStorage.setItem('lib50_role', 'staff');
          localStorage.setItem('lib50_user_name', 'Senior Librarian');
          onLogin('staff', 'Senior Librarian');
        } else {
          setError('Invalid Staff credentials');
          setIsLoading(false);
        }
        return;
      }

      const accounts: StudentAccount[] = JSON.parse(localStorage.getItem('lib50_accounts') || '[]');

      if (isRegistering) {
        // Registration Logic
        if (!idUpper.startsWith('S-')) {
          setError('Student ID must start with S- (e.g. S-123)');
          setIsLoading(false);
          return;
        }
        if (accounts.some(acc => acc.id === idUpper)) {
          setError('Account with this ID already exists');
          setIsLoading(false);
          return;
        }
        
        const newAccount: StudentAccount = { id: idUpper, name: credentials.name, passcode: credentials.token };
        const updated = [...accounts, newAccount];
        localStorage.setItem('lib50_accounts', JSON.stringify(updated));
        
        // Auto-login after registration
        localStorage.setItem('lib50_auth', 'true');
        localStorage.setItem('lib50_role', 'student');
        localStorage.setItem('lib50_user_name', newAccount.name);
        localStorage.setItem('lib50_student_id', newAccount.id);
        onLogin('student', newAccount.name);
      } else {
        // Login Logic
        const found = accounts.find(acc => acc.id === idUpper && acc.passcode === credentials.token);
        if (found) {
          localStorage.setItem('lib50_auth', 'true');
          localStorage.setItem('lib50_role', 'student');
          localStorage.setItem('lib50_user_name', found.name);
          localStorage.setItem('lib50_student_id', found.id);
          onLogin('student', found.name);
        } else {
          setError('Invalid Student ID or Passcode');
          setIsLoading(false);
        }
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-600/5 rounded-full blur-[120px] -ml-64 -mb-64 animate-pulse"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-teal-900/5 border border-zinc-100 text-center animate-in zoom-in-95 duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#136f6f] rounded-2xl shadow-xl shadow-teal-900/20 text-white mb-6">
            <LogoIcon className="w-10 h-10" />
          </div>
          
          <h1 className="text-2xl font-black google-sans text-[#136f6f] mb-2 tracking-tighter uppercase">LibraryStudio 5.0</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-10 opacity-60">Knowledge Access Gateway</p>

          <div className="flex bg-zinc-100 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => { setRole('student'); setError(null); setIsRegistering(false); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === 'student' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}
            >
              Student
            </button>
            <button 
              onClick={() => { setRole('staff'); setError(null); setIsRegistering(false); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === 'staff' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}
            >
              Staff
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && role === 'student' && (
              <div className="text-left animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-4">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={credentials.name}
                  onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 ring-teal-500/5 transition-all"
                />
              </div>
            )}

            <div className="text-left">
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-4">
                {role === 'student' ? 'Student ID' : 'Institutional ID'}
              </label>
              <input
                type="text"
                required
                placeholder={role === 'student' ? "S-2024-001" : "CHENGETAI"}
                value={credentials.id}
                onChange={(e) => setCredentials({ ...credentials, id: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 ring-teal-500/5 transition-all"
              />
            </div>

            <div className="text-left">
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-4">
                {isRegistering ? 'Create Passcode' : 'Access Passcode'}
              </label>
              <input
                type="password"
                required
                placeholder="•••••"
                value={credentials.token}
                onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
                className={`w-full bg-zinc-50 border ${error ? 'border-red-500' : 'border-zinc-200'} rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 ring-teal-500/5 transition-all`}
              />
              {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mt-2 ml-4">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-teal-900/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : isRegistering ? 'Create Account' : 'Enter Library'}
            </button>
          </form>

          {role === 'student' && (
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              className="mt-6 text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline"
            >
              {isRegistering ? 'Already have an account? Login' : 'Need an account? Register Now'}
            </button>
          )}

          <p className="mt-10 text-[9px] font-black text-zinc-300 uppercase tracking-[0.3em]">Built for Education 5.0</p>
        </div>
        
        {!isRegistering && (
          <p className="mt-8 text-center text-[9px] font-black text-zinc-300 uppercase tracking-[0.4em]">
            {role === 'student' ? (
              <span>Default: <span className="text-teal-600">S-2024-001</span> / <span className="text-teal-600">12345</span></span>
            ) : (
              <span>Default: <span className="text-teal-600">CHENGETAI</span> / <span className="text-teal-600">778899</span></span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;