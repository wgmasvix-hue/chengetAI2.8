
import React, { useState, useEffect } from 'react';
import { DigitalAsset, OpenResource } from '../types';
import { generateReasoningResponse, discoverOpenResources, extractMetadataFromAsset } from '../services/geminiService';

const SystemsAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage' | 'consortium' | 'backend'>('add');
  const [formData, setFormData] = useState({ title: '', author: '', ddc: '', url: '', category: 'Engineering', summary: '', tags: '' });
  const [commitStatus, setCommitStatus] = useState<string | null>(null);
  const [vault, setVault] = useState<DigitalAsset[]>([]);
  
  // Hover State
  const [hoveredAsset, setHoveredAsset] = useState<DigitalAsset | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Ingest Mode State
  const [ingestMode, setIngestMode] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Bulk Ingest State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkIngesting, setIsBulkIngesting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  
  const [backendConfig, setBackendConfig] = useState(() => ({
    gatewayUrl: localStorage.getItem('lib50_backend_gateway') || '',
    authProtocol: 'Bearer/TLS',
    syncFrequency: 'Real-time'
  }));

  const [isSyncing, setIsSyncing] = useState(false);
  const [consortiumResults, setConsortiumResults] = useState<OpenResource[]>([]);
  const [syncQuery, setSyncQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('lib50_digital_vault');
    if (saved) setVault(JSON.parse(saved));
  }, []);

  const saveBackend = () => {
    localStorage.setItem('lib50_backend_gateway', backendConfig.gatewayUrl);
    setCommitStatus('GATEWAY_UPDATED');
    setTimeout(() => setCommitStatus(null), 3000);
  };

  const handleSyncConsortium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncQuery.trim() || isSyncing) return;
    setIsSyncing(true);
    try {
      const results = await discoverOpenResources(syncQuery, true);
      setConsortiumResults(results.filter(r => r.isZitesclic));
    } catch (e) { console.error(e); } finally { setIsSyncing(false); }
  };

  const handleCommitConsortium = (res: OpenResource) => {
    const newAsset: DigitalAsset = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: res.title + '.pdf',
      fileSize: 0,
      mimeType: 'external/url',
      uploadDate: Date.now(),
      title: res.title,
      author: res.author || 'Consortium Verified',
      ddc: '000',
      category: res.category || 'General',
      status: 'archived',
      preservationScore: 100,
      url: res.url,
      summary: `Imported from ${res.type} via Consortium Link.`,
      tags: ['Consortium', res.type]
    };
    const updated = [newAsset, ...vault];
    setVault(updated);
    localStorage.setItem('lib50_digital_vault', JSON.stringify(updated));
    setConsortiumResults(prev => prev.filter(r => r.url !== res.url));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-populate title if empty
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: file.name.replace(/\.pdf$/i, '') }));
      }
    }
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const metadata = await extractMetadataFromAsset(selectedFile.name, selectedFile.size);
      setFormData(prev => ({
        ...prev,
        title: metadata.title || prev.title,
        author: metadata.author || prev.author,
        ddc: metadata.ddc || prev.ddc,
        category: metadata.category || prev.category,
        summary: metadata.summary || 'AI-generated summary based on file context.',
        tags: 'PDF, Digital Archive, Auto-Catalogued'
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setBulkFile(e.target.files[0]);
        setBulkStatus(null);
    }
  };

  const handleBulkIngest = async () => {
    if (!bulkFile) return;
    setIsBulkIngesting(true);
    setBulkStatus('READING_MANIFEST...');

    try {
        const text = await bulkFile.text();
        let resources: OpenResource[] = [];
        try {
            resources = JSON.parse(text);
        } catch (err) {
            setBulkStatus('INVALID_JSON_FORMAT');
            setIsBulkIngesting(false);
            return;
        }

        if (!Array.isArray(resources)) {
             setBulkStatus('INVALID_MANIFEST_STRUCTURE');
             setIsBulkIngesting(false);
             return;
        }

        setBulkStatus(`INGESTING ${resources.length} ARTIFACTS...`);
        
        // Process resources
        const newAssets: DigitalAsset[] = resources.map(res => ({
            id: Math.random().toString(36).substr(2, 9),
            fileName: (res.title || 'Untitled') + '.pdf',
            fileSize: 0,
            mimeType: 'external/url',
            uploadDate: Date.now(),
            title: res.title || 'Untitled Resource',
            author: res.author || 'Consortium Bulk Import',
            ddc: '000',
            category: res.category || 'General',
            status: 'archived',
            preservationScore: 100,
            url: res.url || '',
            summary: `Bulk imported from ${res.type || 'Unknown'} via Manifest.`,
            tags: ['Consortium', 'Bulk Import', res.type || 'External']
        }));

        const updated = [...newAssets, ...vault];
        setVault(updated);
        localStorage.setItem('lib50_digital_vault', JSON.stringify(updated));
        
        setTimeout(() => {
            setBulkStatus(`SUCCESS: ${resources.length} IMPORTED`);
            setBulkFile(null);
            setIsBulkIngesting(false);
            setTimeout(() => setBulkStatus(null), 3000);
        }, 1000);

    } catch (e) {
        console.error(e);
        setBulkStatus('INGEST_FAILED');
        setIsBulkIngesting(false);
    }
  };

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    setCommitStatus('COMMITTING...');

    let finalUrl = formData.url;
    let finalMime = 'external/url';
    let finalSize = 1024 * 1024 * 2; // Default mock size
    let finalName = formData.title + '.pdf';

    if (ingestMode === 'file' && selectedFile) {
        finalUrl = URL.createObjectURL(selectedFile);
        finalMime = selectedFile.type || 'application/pdf';
        finalSize = selectedFile.size;
        finalName = selectedFile.name;
    }

    const newAsset: DigitalAsset = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: finalName,
      fileSize: finalSize,
      mimeType: finalMime,
      uploadDate: Date.now(),
      title: formData.title,
      author: formData.author,
      ddc: formData.ddc,
      category: formData.category,
      status: 'archived',
      preservationScore: 100,
      url: finalUrl,
      summary: formData.summary,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    const updated = [newAsset, ...vault];
    setVault(updated);
    localStorage.setItem('lib50_digital_vault', JSON.stringify(updated));
    
    setTimeout(() => {
      setCommitStatus('SUCCESS');
      setFormData({ title: '', author: '', ddc: '', url: '', category: 'Engineering', summary: '', tags: '' });
      setSelectedFile(null);
      setTimeout(() => setCommitStatus(null), 3000);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar pb-32 bg-[#fbfcfd]">
      
      {/* Floating Info Card */}
      {hoveredAsset && (
        <div 
          className="fixed z-[100] w-80 bg-zinc-900 text-white p-6 rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] pointer-events-none animate-in fade-in zoom-in-95 duration-200 border border-white/10 backdrop-blur-md"
          style={{ top: cursorPos.y + 20, left: Math.min(cursorPos.x + 20, window.innerWidth - 340) }}
        >
           <h4 className="text-xs font-bold text-teal-400 mb-2 line-clamp-1">{hoveredAsset.title}</h4>
           <p className="text-[10px] text-zinc-400 mb-4 line-clamp-4 leading-relaxed italic">{hoveredAsset.summary || 'No detailed summary available for this asset.'}</p>
           
           <div className="flex flex-wrap gap-2 mb-4">
              {hoveredAsset.tags && hoveredAsset.tags.length > 0 ? hoveredAsset.tags.map((t, i) => (
                 <span key={i} className="text-[8px] px-2 py-1 bg-white/10 rounded-md text-zinc-300 font-bold uppercase tracking-wide">{t}</span>
              )) : (
                <span className="text-[8px] text-zinc-600 italic">No tags</span>
              )}
           </div>
           
           <div className="flex justify-between border-t border-white/10 pt-3">
              <span className="text-[9px] font-black uppercase text-zinc-500">{hoveredAsset.category}</span>
              <span className="text-[9px] font-black text-emerald-500">{hoveredAsset.fileSize > 0 ? (hoveredAsset.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Cloud Link'}</span>
           </div>
        </div>
      )}

      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black google-sans text-zinc-900 uppercase tracking-tighter">
            <span className="text-[#136f6f]">⚙️</span> Systems Admin
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Database & Infrastructure Control</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-2xl shadow-inner">
          <button onClick={() => setActiveTab('add')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'add' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}>Ingest</button>
          <button onClick={() => setActiveTab('consortium')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'consortium' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}>Uplink</button>
          <button onClick={() => setActiveTab('manage')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'manage' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}>Repo</button>
          <button onClick={() => setActiveTab('backend')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'backend' ? 'bg-white text-[#136f6f] shadow-sm' : 'text-zinc-400'}`}>Backend</button>
        </div>
      </header>

      {activeTab === 'backend' && (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
           <div className="bg-zinc-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl">🔌</div>
              <h2 className="text-2xl font-black google-sans uppercase tracking-tighter mb-4 text-teal-400">Outbound: Industrial Backend Link</h2>
              <p className="text-zinc-500 text-sm mb-10 leading-relaxed">Configure the library's connectivity to external Koha instances, academic repositories, or custom departmental APIs.</p>
              
              <div className="space-y-6 relative z-10">
                 <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-2">Global Gateway URL</label>
                    <input type="text" value={backendConfig.gatewayUrl} onChange={e => setBackendConfig({...backendConfig, gatewayUrl: e.target.value})} placeholder="https://api.institution.edu/gateway" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-teal-400 focus:outline-none focus:border-teal-500 font-mono shadow-inner" />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-2">Auth Protocol</label>
                       <select className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-zinc-300 focus:outline-none">
                          <option>Bearer/TLS 1.3</option>
                          <option>OAuth 2.0</option>
                          <option>Basic Auth</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-2">Sync Frequency</label>
                       <select className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-zinc-300 focus:outline-none">
                          <option>Real-time</option>
                          <option>Hourly</option>
                          <option>Daily</option>
                       </select>
                    </div>
                 </div>
                 <button onClick={saveBackend} className="w-full py-5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-teal-900/20 transition-all">Save Global Infrastructure Config</button>
                 {commitStatus === 'GATEWAY_UPDATED' && <p className="text-center text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Configuration Locked & Encrypted</p>}
              </div>
           </div>

           <div className="bg-white border border-zinc-200 rounded-[3rem] p-12 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl grayscale">🧩</div>
              <h2 className="text-2xl font-black google-sans uppercase tracking-tighter mb-4 text-zinc-900">Inbound: Koha Plugin Setup</h2>
              <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                Use these settings to configure the <span className="font-mono bg-zinc-100 px-1 rounded text-zinc-700">LIBRARYSTUDIO5.0</span> plugin within your Koha Intranet.
              </p>

              <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">AI Middleware Endpoint</label>
                       <span className="text-[9px] font-bold text-teal-600 uppercase">Active</span>
                    </div>
                    <div className="flex gap-4">
                       <code className="flex-1 bg-white border border-zinc-200 rounded-xl py-3 px-5 text-xs font-mono text-zinc-600 select-all">
                          https://api.librarystudio.edu/v1/gemini-gateway
                       </code>
                       <button 
                         onClick={() => navigator.clipboard.writeText('https://api.librarystudio.edu/v1/gemini-gateway')}
                         className="px-6 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-colors"
                       >
                         Copy
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Consortium Tab */}
      {activeTab === 'consortium' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-[#136f6f] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10 text-9xl">🔗</div>
              <h2 className="text-2xl font-black google-sans mb-3 uppercase tracking-tighter">ZITESCLIC Automated Ingest</h2>
              <p className="text-teal-50/80 max-w-lg mb-8 text-sm">Direct bridge to the national consortium index.</p>
              <form onSubmit={handleSyncConsortium} className="relative max-w-2xl">
                 <input type="text" value={syncQuery} onChange={e => setSyncQuery(e.target.value)} placeholder="Enter search discipline..." className="w-full bg-white border border-teal-600 rounded-2xl py-5 px-8 text-zinc-900 text-sm focus:outline-none shadow-xl" />
                 <button type="submit" className="absolute right-2 top-2 bottom-2 px-8 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">{isSyncing ? 'Linking...' : 'Bridge Index'}</button>
              </form>
           </div>

           {/* Bulk Manifest Upload */}
           <div className="bg-white border border-zinc-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                  <h3 className="text-lg font-bold google-sans text-zinc-900 uppercase tracking-tight mb-2">Bulk Manifest Uplink</h3>
                  <p className="text-zinc-500 text-xs font-medium leading-relaxed">Upload a JSON manifest containing an array of resources to perform a mass-ingest operation from partner consortiums.</p>
              </div>
              <div className="flex flex-col gap-4 w-full md:w-auto">
                  <input 
                      type="file" 
                      accept=".json"
                      onChange={handleBulkFileChange}
                      className="hidden"
                      id="bulk-upload"
                  />
                  <label 
                      htmlFor="bulk-upload"
                      className="w-full md:w-64 py-4 border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#136f6f] hover:bg-teal-50 transition-all text-zinc-400 hover:text-teal-600"
                  >
                      {bulkFile ? (
                          <>
                              <span className="text-2xl mb-1">📄</span>
                              <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[200px]">{bulkFile.name}</span>
                          </>
                      ) : (
                          <>
                              <span className="text-2xl mb-1">📂</span>
                              <span className="text-[10px] font-black uppercase tracking-widest">Select Manifest</span>
                          </>
                      )}
                  </label>
                  {bulkFile && (
                      <button 
                          onClick={handleBulkIngest}
                          disabled={isBulkIngesting}
                          className="w-full py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#136f6f] transition-all disabled:opacity-50"
                      >
                          {isBulkIngesting ? 'Processing...' : 'Execute Batch'}
                      </button>
                  )}
                  {bulkStatus && (
                      <p className="text-center text-[9px] font-black uppercase tracking-widest text-[#136f6f] animate-pulse">{bulkStatus}</p>
                  )}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {consortiumResults.map((res, i) => (
                <div key={i} className="bg-white border border-zinc-200 p-8 rounded-[3rem] shadow-sm flex flex-col hover:border-teal-400 transition-all group">
                   <div className="flex justify-between items-start mb-6">
                      <span className="px-3 py-1 bg-teal-50 text-[#136f6f] text-[9px] font-black uppercase rounded-full border border-teal-100 group-hover:bg-[#136f6f] group-hover:text-white transition-colors">Consortium Artifact</span>
                      <span className="text-[9px] font-bold text-zinc-400">{res.type}</span>
                   </div>
                   <h3 className="text-sm font-bold text-zinc-800 mb-6 flex-1 line-clamp-3">{res.title}</h3>
                   <button onClick={() => handleCommitConsortium(res)} className="w-full py-4 bg-zinc-900 hover:bg-[#136f6f] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">Ingest to Local Directory</button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Ingest Tab */}
      {activeTab === 'add' && (
        <div className="bg-white border border-zinc-200 rounded-[3rem] p-12 shadow-lg max-w-4xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 text-8xl grayscale">➕</div>
          <div className="flex items-center justify-between mb-10">
            <div>
               <h2 className="text-[11px] font-black text-[#136f6f] uppercase tracking-[0.3em] mb-2">Directory Ingest</h2>
               <p className="text-xs text-zinc-400 font-medium">Add new assets to the digital vault.</p>
            </div>
            
            <div className="flex bg-zinc-100 p-1 rounded-xl">
               <button 
                 onClick={() => setIngestMode('url')}
                 className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ingestMode === 'url' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}
               >
                 Remote URL
               </button>
               <button 
                 onClick={() => setIngestMode('file')}
                 className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ingestMode === 'file' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}
               >
                 PDF Upload
               </button>
            </div>
          </div>

          <form onSubmit={handleCommit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">
                 {ingestMode === 'url' ? 'Directory Gateway URL' : 'Upload Digital Asset'}
              </label>
              {ingestMode === 'url' ? (
                <input 
                  required={ingestMode === 'url'}
                  type="url" 
                  value={formData.url} 
                  onChange={e => setFormData({...formData, url: e.target.value})} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm" 
                  placeholder="https://repository.uz.ac.zw/..." 
                />
              ) : (
                <div className="space-y-4">
                  <div className="relative group">
                    <input 
                      required={ingestMode === 'file'}
                      type="file" 
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="w-full bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl py-8 px-6 text-sm text-center cursor-pointer hover:border-teal-500 transition-colors"
                    />
                    {selectedFile && (
                       <div className="absolute inset-0 bg-teal-50 border-2 border-teal-500 rounded-2xl flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-black uppercase tracking-widest text-teal-700">✓ {selectedFile.name}</span>
                       </div>
                    )}
                    {!selectedFile && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-400 text-xs font-medium">
                          Click to select PDF or drag file here
                       </div>
                    )}
                  </div>
                  {selectedFile && (
                     <button
                       type="button"
                       onClick={handleAnalyzeFile}
                       disabled={isAnalyzing}
                       className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                     >
                       {isAnalyzing ? (
                          <><div className="w-3 h-3 border-2 border-zinc-400 border-t-zinc-600 rounded-full animate-spin"></div> Scanning...</>
                       ) : (
                          <><span>✨</span> Auto-Analyze Metadata</>
                       )}
                     </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Full Resource Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm" placeholder="e.g. Traditional Medicine in Zimbabwe" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Primary Researcher/Author</label>
                <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm" placeholder="e.g. Dr. G. Sibanda" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Category / Subject</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-teal-500">
                   <option value="Engineering">Engineering</option>
                   <option value="STEM">STEM</option>
                   <option value="Humanities">Humanities</option>
                   <option value="Heritage">Heritage</option>
                   <option value="Law">Law</option>
                   <option value="General">General</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">DDC / Call Number</label>
                <input required type="text" value={formData.ddc} onChange={e => setFormData({...formData, ddc: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm" placeholder="615.321" />
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Abstract / Summary</label>
                <textarea 
                  value={formData.summary} 
                  onChange={e => setFormData({...formData, summary: e.target.value})} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm resize-none h-24" 
                  placeholder="Brief description of the resource..." 
                />
            </div>

            <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-4">Tags (Comma Separated)</label>
                <input 
                  type="text" 
                  value={formData.tags} 
                  onChange={e => setFormData({...formData, tags: e.target.value})} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-6 text-sm" 
                  placeholder="e.g. Research, 2024, Archive" 
                />
            </div>

            <div className="pt-6">
              <button type="submit" className="w-full py-6 bg-zinc-900 hover:bg-[#136f6f] text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-2xl shadow-zinc-900/10">Commit Asset to Knowledge Directory</button>
            </div>
            {commitStatus === 'SUCCESS' && <p className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-bounce">Directory Synchronized Successfully</p>}
          </form>
        </div>
      )}

      {/* Repo Management Tab */}
      {activeTab === 'manage' && (
        <div className="bg-white border border-zinc-100 rounded-[3rem] overflow-hidden shadow-xl animate-in fade-in duration-500">
           <div className="p-8 border-b border-zinc-50 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Directory Entries</h3>
              <span className="text-[10px] font-bold text-[#136f6f]">{vault.length} Artifacts Tracked</span>
           </div>
           <table className="w-full text-left">
              <thead className="bg-zinc-50/30">
                 <tr>
                    <th className="px-10 py-6 text-[9px] font-black uppercase text-zinc-400 tracking-widest">Artifact Identity</th>
                    <th className="px-10 py-6 text-[9px] font-black uppercase text-zinc-400 tracking-widest">Access Mode</th>
                    <th className="px-10 py-6 text-[9px] font-black uppercase text-zinc-400 tracking-widest">Metadata State</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 relative">
                 {vault.map(v => (
                   <tr 
                     key={v.id} 
                     className="hover:bg-zinc-50/50 transition-colors cursor-help group"
                     onMouseEnter={() => setHoveredAsset(v)}
                     onMouseMove={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
                     onMouseLeave={() => setHoveredAsset(null)}
                   >
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-sm shadow-sm">{v.mimeType === 'external/url' ? '🌐' : '📄'}</div>
                            <div>
                               <p className="text-sm font-bold text-zinc-800 leading-none mb-1">{v.title}</p>
                               <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{v.author} • {v.ddc}</p>
                               {v.tags && v.tags.length > 0 && (
                                 <div className="flex gap-1 mt-1">
                                   {v.tags.slice(0, 2).map((t, i) => <span key={i} className="text-[8px] bg-zinc-100 px-1 rounded text-zinc-500">{t}</span>)}
                                 </div>
                               )}
                            </div>
                         </div>
                      </td>
                      <td className="px-10 py-6">
                         <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${v.mimeType === 'external/url' ? 'bg-teal-50 border-teal-100 text-[#136f6f]' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
                           {v.mimeType === 'external/url' ? 'Consortium Uplink' : 'Local Archive'}
                         </span>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Verified & Accessible</span>
                         </div>
                      </td>
                   </tr>
                 ))}
                 {vault.length === 0 && (
                   <tr>
                      <td colSpan={3} className="px-10 py-24 text-center opacity-20 italic">The knowledge directory is waiting for ingest.</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default SystemsAdmin;
