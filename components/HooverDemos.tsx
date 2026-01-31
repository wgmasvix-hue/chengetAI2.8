
import React, { useState } from 'react';

const HooverDemos: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12">
      {/* Demo 1: Neural Indexer */}
      <div className="group relative h-[380px] bg-zinc-900 border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-blue-500/30 hover:shadow-[0_0_50px_rgba(37,99,235,0.1)]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <span className="text-3xl">🧠</span>
            <div className="text-right">
              <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Neural Link</p>
              <p className="text-[10px] font-bold text-zinc-500">v5.0.2</p>
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-zinc-200 mb-2">Neural Indexing</h3>
          <p className="text-xs text-zinc-500 leading-relaxed mb-auto">Auto-generation of semantic metadata and DDC classification strings.</p>
          
          <div className="relative mt-4 h-32 bg-black/40 rounded-2xl border border-white/5 overflow-hidden group-hover:border-blue-500/20 transition-all">
            <div className="p-4 space-y-2">
              <p className="text-[10px] text-zinc-400">INPUT: "The Ethics of Quantum Computing"</p>
              <div className="h-0.5 w-full bg-blue-500/20 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-blue-500 group-hover:translate-x-[300%] transition-transform duration-[2000ms] ease-in-out"></div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-300">
                <p className="text-[10px] text-blue-400 font-mono">DDC: 174.9541 - Prof. Ethics</p>
                <p className="text-[10px] text-blue-400 font-mono">VECTOR_ID: #FF9022A</p>
                <p className="text-[8px] text-zinc-600 mt-2">MAPPING COMPLETE...</p>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-12 -translate-y-full group-hover:animate-[scan_2s_infinite_linear]"></div>
          </div>
        </div>
      </div>

      {/* Demo 2: Koha Industrial Bridge */}
      <div className="group relative h-[380px] bg-zinc-900 border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-emerald-500/30 hover:shadow-[0_0_50px_rgba(16,185,129,0.1)]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <span className="text-3xl">🔗</span>
            <div className="text-right">
              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Koha Sync</p>
              <p className="text-[10px] font-bold text-zinc-500">REST API v2</p>
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-zinc-200 mb-2">Koha ILS Bridge</h3>
          <p className="text-xs text-zinc-500 leading-relaxed mb-auto">Live bidirectional data flow for circulation, patrons, and holdings.</p>
          
          <div className="relative mt-4 h-32 bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col justify-center px-6">
            <div className="flex items-center justify-between mb-4">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold border border-emerald-500/20 animate-pulse">AI</div>
               <div className="flex-1 flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-all" style={{ animationDelay: `${i * 0.1}s` }}></div>
                  ))}
               </div>
               <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500 text-[8px] font-black border border-white/5">KOHA</div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 text-center">
               <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Pushing MARC_082...</p>
               <p className="text-[8px] text-zinc-600 mt-1 uppercase tracking-tighter">SUCCESS: BIBLIO_ID_9901</p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo 3: Archival Deep-Scan */}
      <div className="group relative h-[380px] bg-zinc-900 border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-indigo-500/30">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <span className="text-3xl">📜</span>
            <div className="text-right">
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Spectral Scan</p>
              <p className="text-[10px] font-bold text-zinc-500">PROX: 0.02mm</p>
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-zinc-200 mb-2">Archival Deep-Scan</h3>
          <p className="text-xs text-zinc-500 leading-relaxed mb-auto">High-fidelity restoration and multi-spectral document analysis.</p>
          
          <div className="relative mt-4 h-32 rounded-2xl border border-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1585842155110-384dfd0f882f?auto=format&fit=crop&q=10&w=400')] bg-cover grayscale blur-[2px]"></div>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1585842155110-384dfd0f882f?auto=format&fit=crop&q=80&w=400')] bg-cover opacity-0 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 border border-indigo-500/50 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]"></div>
                <div className="absolute inset-0 animate-spin-slow">
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-indigo-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo 4: Mesh Health */}
      <div className="group relative h-[380px] bg-zinc-900 border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:border-cyan-500/30">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <span className="text-3xl">📡</span>
            <div className="text-right">
              <p className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">Mesh Topology</p>
              <p className="text-[10px] font-bold text-zinc-500">ACTIVE</p>
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-zinc-200 mb-2">IoT Mesh Health</h3>
          <p className="text-xs text-zinc-500 leading-relaxed mb-auto">Real-time telemetry and diagnostic visualization of library sensor grids.</p>
          
          <div className="relative mt-4 h-32 bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center perspective-1000">
            <div className="grid grid-cols-4 gap-2 w-full px-6 transition-transform duration-700 group-hover:rotate-x-12 group-hover:scale-90">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`h-8 rounded-lg border border-white/10 transition-all duration-500 ${
                  i === 3 ? 'bg-cyan-500/40 border-cyan-400 group-hover:animate-pulse' : 'bg-zinc-800'
                }`}>
                   {i === 3 && <div className="absolute -top-6 left-0 text-[8px] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">ALERT: PKT_LOSS</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .perspective-1000 { perspective: 1000px; }
        .rotate-x-12 { transform: rotateX(25deg); }
      `}</style>
    </div>
  );
};

export default HooverDemos;
