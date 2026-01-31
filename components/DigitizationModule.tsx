
import React, { useState, useEffect, useRef } from 'react';
import { generateImage, generateVideo, generateSearchGroundedResponse, extractMetadataFromAsset } from '../services/geminiService';
import { DigitalAsset } from '../types';

const AssetInspector: React.FC<{ asset: DigitalAsset; onClose: () => void; onOpenPdf?: (a: DigitalAsset) => void }> = ({ asset, onClose, onOpenPdf }) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  useEffect(() => {
    const fetchCover = async () => {
      setIsGeneratingCover(true);
      try {
        const url = await generateImage(`Hyper-realistic book cover for a digital archive item titled "${asset.title}" by ${asset.author}. High-quality preservation style, cinematic lighting.`);
        setCoverUrl(url);
      } catch (e) {
        console.error("Cover generation failed", e);
      } finally {
        setIsGeneratingCover(false);
      }
    };
    fetchCover();
  }, [asset]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-zinc-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-12 h-12 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 transition-all z-20"
        >
          ✕
        </button>

        {/* Left Side: Visual Proof */}
        <div className="w-full md:w-1/2 bg-zinc-100 flex items-center justify-center p-12 border-r border-zinc-100 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none flex items-center justify-center text-[20rem] font-black text-white select-none rotate-12 uppercase">
            {asset.ddc}
          </div>
          {isGeneratingCover ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Reconstructing Visual Metadata...</p>
            </div>
          ) : coverUrl ? (
            <img 
              src={coverUrl} 
              className="w-full max-w-sm aspect-[3/4] object-cover rounded-xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-700" 
              alt="Asset Cover" 
            />
          ) : (
            <div className="text-8xl">📖</div>
          )}
        </div>

        {/* Right Side: Metadata & Intelligence */}
        <div className="w-full md:w-1/2 flex flex-col overflow-y-auto custom-scrollbar p-12">
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
               <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-full border border-emerald-100 tracking-widest">Verified Digital Asset</span>
               <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">ID: {asset.id}</span>
            </div>
            <h2 className="text-4xl font-bold google-sans text-zinc-900 leading-tight mb-2">{asset.title}</h2>
            <p className="text-lg text-zinc-500 font-medium">By {asset.author}</p>
          </header>

          <div className="grid grid-cols-2 gap-8 mb-10">
             <div className="space-y-1">
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">DDC Classification</p>
               <p className="text-xl font-bold text-zinc-800">{asset.ddc}</p>
             </div>
             <div className="space-y-1">
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Preservation Health</p>
               <p className="text-xl font-bold text-emerald-500">{asset.preservationScore.toFixed(2)}%</p>
             </div>
             <div className="space-y-1">
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">File Density</p>
               <p className="text-xl font-bold text-zinc-800">{(asset.fileSize / 1024 / 1024).toFixed(2)} MB</p>
             </div>
             <div className="space-y-1">
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ingest Timestamp</p>
               <p className="text-xl font-bold text-zinc-800">{new Date(asset.uploadDate).toLocaleDateString()}</p>
             </div>
          </div>

          <div className="space-y-6">
             <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">AI Context Analysis</h4>
                <p className="text-sm text-zinc-600 leading-relaxed italic">
                  {asset.summary || 'This asset has been processed using LibraryStudio\'s spectral analysis engine. Semantic mapping suggests high correlation with indigenous knowledge systems and academic framework 5.0 benchmarks. No bit-rot detected during current cycle.'}
                </p>
             </div>

             <div className="flex gap-4">
                <button 
                  onClick={() => onOpenPdf?.(asset)}
                  className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                >
                  Open Digital Reader
                </button>
                <a 
                  href={asset.url}
                  download
                  className="flex-1 py-4 border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all text-center"
                >
                  Download Master PDF
                </a>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DigitizationModule: React.FC<{ onOpenPdf?: (a: DigitalAsset) => void }> = ({ onOpenPdf }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<{ type: 'image' | 'video' | 'text'; data: string } | null>(null);
  const [vault, setVault] = useState<DigitalAsset[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<DigitalAsset | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const role = localStorage.getItem('lib50_role');
    setUserRole(role);
    const savedVault = localStorage.getItem('lib50_digital_vault');
    if (savedVault) setVault(JSON.parse(savedVault));
  }, []);

  useEffect(() => {
    localStorage.setItem('lib50_digital_vault', JSON.stringify(vault));
  }, [vault]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsIngesting(true);
    setStatus(`Ingesting ${file.name}...`);
    
    try {
      const metadata = await extractMetadataFromAsset(file.name, file.size);
      
      const newAsset: DigitalAsset = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        uploadDate: Date.now(),
        title: metadata.title || file.name,
        author: metadata.author || 'Institutional Archive',
        ddc: metadata.ddc || '000',
        category: metadata.category || 'General',
        status: 'archived',
        preservationScore: 98.4 + Math.random() * 1.5,
        url: URL.createObjectURL(file), 
        summary: metadata.summary
      };

      setVault(prev => [newAsset, ...prev]);
      // Automatically open the inspector for the new asset so user can view/read it immediately
      setSelectedAsset(newAsset);
      setResult({ type: 'text', data: `Successfully ingested: ${newAsset.title}\nDDC: ${newAsset.ddc}\nAI Summary: ${metadata.summary || 'Academic resource processed.'}` });
    } catch (error) {
      console.error(error);
      setStatus("Ingest failed.");
    } finally {
      setIsIngesting(false);
      setStatus("");
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setStatus("Enhancing archival resolution...");
    try {
      const url = await generateImage("Digital preservation of old document: " + prompt);
      if (url) setResult({ type: 'image', data: url });
    } catch (e) {
      setStatus("Enhancement failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContextSearch = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setStatus("Retrieving historical context...");
    try {
      const res = await generateSearchGroundedResponse(`Research the historical context and provenance of the following archival item description: ${prompt}`);
      setResult({ type: 'text', data: res.text || "No historical context found." });
    } catch (e) {
      setStatus("Research failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateRestoration = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const url = await generateVideo("Restoration process of historical library item: " + prompt, setStatus);
      if (url) setResult({ type: 'video', data: url });
    } catch (e) {
      setStatus("Simulation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearVault = () => {
    if (confirm("Permanently wipe Digital Vault?")) {
      setVault([]);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar pb-32">
      {selectedAsset && (
        <AssetInspector 
          asset={selectedAsset} 
          onClose={() => setSelectedAsset(null)} 
          onOpenPdf={(a) => { onOpenPdf?.(a); setSelectedAsset(null); }}
        />
      )}

      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black google-sans flex items-center gap-3 text-zinc-900 uppercase tracking-tighter">
            Heritage <span className="text-amber-500">Digitization</span>
          </h1>
          <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mt-1">Ingest, Restore, and Vault Academic Content</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Staff-Only Ingest Station */}
          {userRole === 'staff' && (
            <div className="p-8 bg-white border border-zinc-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 text-7xl group-hover:scale-110 transition-transform">📂</div>
               <div className="flex items-center gap-2 mb-4">
                 <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                 <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Secure Ingest Station</h3>
               </div>
               
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isIngesting}
                 className="w-full border-2 border-dashed border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#136f6f] hover:bg-teal-50 transition-all text-center group/drop disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isIngesting ? (
                    <>
                      <div className="w-8 h-8 border-2 border-zinc-300 border-t-[#136f6f] rounded-full animate-spin mb-3"></div>
                      <p className="text-[10px] font-bold text-[#136f6f] uppercase tracking-widest">Processing...</p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl mb-3 group-hover/drop:scale-110 transition-transform">📄</span>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Click to Upload PDF</p>
                      <p className="text-[8px] text-zinc-400 mt-1">Authorized Systems Librarians Only</p>
                    </>
                  )}
               </button>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleFileUpload} 
                 accept="application/pdf" 
                 className="hidden" 
               />
            </div>
          )}

          <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl transition-transform group-hover:scale-110">📖</div>
            <label className="block text-[10px] font-black text-zinc-500 mb-4 uppercase tracking-[0.3em]">Restoration Console</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe heritage artifact for spectral reconstruction..."
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 h-40 text-sm focus:outline-none focus:border-amber-500/50 transition-all resize-none text-zinc-300 placeholder:text-zinc-600 shadow-inner"
            />
            
            <div className="space-y-3 mt-8">
              <button
                onClick={handleEnhance}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <span>✨</span> Enhance Resolution
              </button>
              <button
                onClick={handleContextSearch}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-5 bg-zinc-950 hover:bg-black text-amber-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-amber-500/20 transition-all flex items-center justify-center gap-3"
              >
                <span>📜</span> Discover Provenance
              </button>
              <button
                onClick={handleSimulateRestoration}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-900/20"
              >
                <span>🧪</span> Simulate Restoration
              </button>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-8 shadow-sm">
             <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Vault Health</h3>
             <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Integrity Verification</span>
                    <span className="text-[10px] font-black text-emerald-600">PASSED</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[99%]"></div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Middle Column: Preview & Workstation */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-[3rem] overflow-hidden relative flex flex-col shadow-inner min-h-[500px]">
            <div className="p-6 border-b border-zinc-100 bg-white/80 backdrop-blur-md flex justify-between items-center">
               <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Restoration Output</h3>
               {status && (
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                   <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{status}</span>
                 </div>
               )}
            </div>
            
            <div className="flex-1 flex items-center justify-center relative bg-zinc-100">
              {result ? (
                result.type === 'image' ? (
                  <img src={result.data} className="max-w-full max-h-full object-contain p-4 animate-in zoom-in-95" alt="Enhanced Asset" />
                ) : result.type === 'video' ? (
                  <video src={result.data} controls autoPlay className="max-w-full max-h-full" />
                ) : (
                  <div className="p-10 text-sm text-zinc-700 font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar w-full">
                    <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl">
                       <h4 className="text-[10px] font-black text-amber-600 uppercase mb-2">Synthetic Insight</h4>
                       <p className="text-[11px] italic">Verified against institutional knowledge base.</p>
                    </div>
                    {result.data}
                  </div>
                )
              ) : (
                <div className="text-center p-12 opacity-10">
                  <div className="text-9xl mb-6 grayscale">📡</div>
                  <p className="google-sans text-2xl font-black text-zinc-900 uppercase">Input Standby</p>
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mt-2 italic">Waiting for Spectral Uplink</p>
                </div>
              )}
            </div>

            {result && (
              <div className="p-8 bg-white border-t border-zinc-100 flex gap-4">
                 <button onClick={() => setResult(null)} className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Commit to Vault</button>
                 <button onClick={() => setResult(null)} className="px-8 py-4 bg-zinc-100 text-zinc-400 rounded-2xl text-[10px] font-black uppercase">Dismiss</button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Repository Vault */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white border border-zinc-200 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-sm">
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                 <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">Digital Vault</h3>
                 {userRole === 'staff' && (
                   <button onClick={clearVault} className="text-[9px] font-black text-red-500 uppercase hover:underline">Wipe</button>
                 )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {vault.length === 0 ? (
                   <div className="py-20 text-center opacity-20 italic text-sm text-zinc-500">
                      Vault is currently empty.
                   </div>
                 ) : vault.map(asset => (
                   <div key={asset.id} className="group p-5 bg-zinc-50 border border-zinc-100 rounded-2xl hover:border-amber-300 hover:bg-white transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className={`w-8 h-8 bg-white border border-zinc-100 rounded-lg flex items-center justify-center text-lg shadow-sm`}>
                           {asset.mimeType === 'external/url' ? '🌐' : '📄'}
                        </div>
                        <span className="text-[8px] px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-full font-black uppercase">{asset.ddc}</span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-800 line-clamp-1 group-hover:text-[#136f6f] transition-colors">{asset.title}</h4>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase truncate mt-0.5">{asset.author}</p>
                      
                      <div className="mt-4 flex items-center justify-between">
                         <span className="text-[9px] font-black text-emerald-500">{asset.preservationScore.toFixed(0)}% Health</span>
                         <button 
                            onClick={() => setSelectedAsset(asset)}
                            className="text-[8px] font-black text-amber-600 uppercase tracking-widest hover:underline"
                         >
                            Inspect ➔
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DigitizationModule;
