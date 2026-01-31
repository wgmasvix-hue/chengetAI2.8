import React, { useState, useEffect } from 'react';

interface ApiKeyGateProps {
  children: React.ReactNode;
}

const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isAssumingSuccess, setIsAssumingSuccess] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // Check if window.aistudio is available and has selected key
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback for environments without the selection utility
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Rule: Assume success immediately after trigger to mitigate race conditions
        setIsAssumingSuccess(true);
        setHasKey(true);
      } catch (err) {
        console.error("Key selection failed", err);
      }
    }
  };

  if (hasKey === true || isAssumingSuccess) {
    return <>{children}</>;
  }

  if (hasKey === null) {
    return (
      <div className="fixed inset-0 bg-[#09090b] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-[#09090b] flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 opacity-20">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent"></div>
      </div>
      
      <div className="relative w-full max-w-xl bg-[#0c0c0e] border border-white/5 rounded-[3rem] p-12 shadow-2xl text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-teal-900/20 border border-teal-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
           <span className="text-5xl">🔐</span>
        </div>

        <h1 className="text-3xl font-black google-sans text-white uppercase tracking-tighter mb-4">
          Institutional <span className="text-teal-500">Link</span> Required
        </h1>
        
        <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-md mx-auto">
          LibraryStudio 5.0 utilizes high-performance reasoning and video synthesis models. 
          To proceed, you must link a billable API Key from a paid GCP project.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleSelectKey}
            className="w-full py-5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-teal-900/20 transition-all active:scale-95"
          >
            Select Institutional Key
          </button>
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:text-teal-500 transition-colors"
          >
            View Billing Documentation & Guidelines ↗
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
           <div className="flex justify-center gap-6 opacity-30">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">TLS 1.3 SECURED</span>
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">PROXIMITY_LINK_v5</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyGate;