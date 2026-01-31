
import React, { useState, useEffect, useRef } from 'react';
import { DigitalAsset } from '../types';
import { generateReasoningResponse, generateImage, extractMetadataFromAsset } from '../services/geminiService';

const ResourcePreviewModal: React.FC<{ 
  asset: DigitalAsset; 
  onClose: () => void; 
  onOpenReader: (asset: DigitalAsset) => void;
}> = ({ asset, onClose, onOpenReader }) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  useEffect(() => {
    const fetchCover = async () => {
      // Generate specific cover based on metadata for the preview
      setIsGeneratingCover(true);
      try {
        const url = await generateImage(`Hyper-realistic book cover for a digital archive item titled "${asset.title}" by ${asset.author}. High-quality academic style.`);
        setCoverUrl(url);
      } catch (e) {
        console.error("Cover generation failed", e);
      } finally {
        setIsGeneratingCover(false);
      }
    };
    
    if (asset.mimeType !== 'external/url') {
        fetchCover();
    }
  }, [asset]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-full max-h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 transition-all z-20"
        >
          ✕
        </button>

        {/* Visual Side */}
        <div className="w-full md:w-5/12 bg-zinc-50 flex items-center justify-center p-8 border-r border-zinc-100 relative overflow-hidden">
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center text-[15rem] font-black text-zinc-900 select-none -rotate-12 uppercase">
            {asset.ddc.split('.')[0]}
          </div>
          {isGeneratingCover ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin"></div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Retrieving Cover...</p>
            </div>
          ) : (
            <div className={`relative rounded-xl overflow-hidden shadow-2xl ${asset.mimeType === 'external/url' ? 'w-full h-full flex items-center justify-center bg-teal-50' : 'w-48 aspect-[2/3]'}`}>
                {asset.mimeType === 'external/url' ? (
                    <div className="text-center p-6">
                        <span className="text-6xl mb-4 block">🌐</span>
                        <span className="text-teal-600 font-bold uppercase text-xs tracking-widest">External Resource</span>
                    </div>
                ) : coverUrl ? (
                    <img src={coverUrl} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                    <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-4xl">📖</div>
                )}
            </div>
          )}
        </div>

        {/* Content Side */}
        <div className="w-full md:w-7/12 flex flex-col p-10 overflow-y-auto custom-scrollbar">
           <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                 <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full tracking-widest ${asset.mimeType === 'external/url' ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-500'}`}>
                    {asset.mimeType === 'external/url' ? 'External Link' : 'Digital Archive'}
                 </span>
                 <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">ID: {asset.id}</span>
              </div>
              <h2 className="text-3xl font-bold google-sans text-zinc-900 leading-tight mb-2">{asset.title}</h2>
              <p className="text-base text-zinc-500 font-medium">By {asset.author}</p>
           </div>

           <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
              <div>
                 <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Classification</p>
                 <p className="text-sm font-bold text-zinc-800">{asset.ddc}</p>
              </div>
              <div>
                 <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Category</p>
                 <p className="text-sm font-bold text-zinc-800">{asset.category}</p>
              </div>
              <div>
                 <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">File Size</p>
                 <p className="text-sm font-bold text-zinc-800">{(asset.fileSize / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div>
                 <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Ingested</p>
                 <p className="text-sm font-bold text-zinc-800">{new Date(asset.uploadDate).toLocaleDateString()}</p>
              </div>
           </div>

           <div className="mb-8 flex-1">
              <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Contextual Summary</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                 {asset.summary || "No summary available for this asset."}
              </p>
              
              {asset.tags && (
                  <div className="flex flex-wrap gap-2 mt-6">
                      {asset.tags.map((t, i) => (
                          <span key={i} className="px-2 py-1 bg-white border border-zinc-200 rounded-md text-[8px] font-bold text-zinc-500 uppercase">{t}</span>
                      ))}
                  </div>
              )}
           </div>

           <div className="flex gap-4 mt-auto">
              <button 
                onClick={() => onOpenReader(asset)}
                className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-[#136f6f] transition-all active:scale-95"
              >
                {asset.mimeType === 'external/url' ? 'Open Link' : 'Open in Reader'}
              </button>
              {asset.url && asset.mimeType !== 'external/url' && (
                  <a 
                    href={asset.url} 
                    download 
                    className="px-8 py-4 border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center justify-center"
                  >
                    Download
                  </a>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const ResourceCard: React.FC<{ asset: DigitalAsset; onClick: (a: DigitalAsset) => void }> = ({ asset, onClick }) => {
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    const fetchCover = async () => {
      // Use placeholder icon for external URLs to save on generation, or generate for archived assets
      if (asset.mimeType === 'external/url') return; 
      
      try {
        const url = await generateImage(`Professional minimalist academic book cover titled "${asset.title}". Scholar style.`);
        setCover(url);
      } catch (e) {}
    };
    fetchCover();
  }, [asset]);

  return (
    <div 
        onClick={() => onClick(asset)}
        className="group bg-white border border-zinc-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 flex flex-col relative overflow-hidden cursor-pointer"
    >
      <div className={`aspect-[3/4] rounded-2xl mb-6 overflow-hidden relative border border-zinc-100 ${asset.mimeType === 'external/url' ? 'bg-[#136f6f]/5' : 'bg-zinc-50'}`}>
        {cover ? (
          <img src={cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={asset.title} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-5xl">
             <span className="grayscale opacity-20">{asset.mimeType === 'external/url' ? '🌐' : '📖'}</span>
             {asset.mimeType === 'external/url' && <span className="text-[10px] font-black text-[#136f6f] uppercase tracking-widest mt-4">Consortium Link</span>}
          </div>
        )}
        <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full border border-zinc-100 shadow-sm">
          <span className="text-[9px] font-black text-[#136f6f] uppercase tracking-widest">{asset.ddc}</span>
        </div>
      </div>
      
      <h3 className="text-base font-bold text-zinc-900 line-clamp-2 mb-1 group-hover:text-[#136f6f] transition-colors">{asset.title}</h3>
      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-4">By {asset.author}</p>
      
      {asset.tags && asset.tags.length > 0 && (
         <div className="flex flex-wrap gap-1 mb-6">
            {asset.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[8px] bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-md text-zinc-500 uppercase font-bold">{tag}</span>
            ))}
         </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-50">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-zinc-300 uppercase tracking-widest">Type</span>
          <span className={`text-[10px] font-black uppercase ${asset.mimeType === 'external/url' ? 'text-teal-600' : 'text-zinc-500'}`}>
            {asset.mimeType === 'external/url' ? 'Article' : 'Archive'}
          </span>
        </div>
        <button 
          className="px-6 py-2.5 bg-zinc-100 group-hover:bg-zinc-900 group-hover:text-white text-zinc-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
        >
          View
        </button>
      </div>
    </div>
  );
};

const DigitalResourcesPanel: React.FC<{ onOpenPdf: (a: DigitalAsset) => void }> = ({ onOpenPdf }) => {
  const [vault, setVault] = useState<DigitalAsset[]>([]);
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<'All' | 'Archive' | 'Articles'>('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [suggestQuery, setSuggestQuery] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<DigitalAsset | null>(null);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lib50_digital_vault');
    if (saved) setVault(JSON.parse(saved));
    setUserRole(localStorage.getItem('lib50_role'));
  }, []);

  const categories = ['All', 'STEM', 'Engineering', 'Humanities', 'Heritage', 'Law'];

  const filteredVault = vault.filter(a => {
    const term = search.toLowerCase();
    const matchesSearch = a.title.toLowerCase().includes(term) || 
                          a.author.toLowerCase().includes(term) ||
                          (a.summary && a.summary.toLowerCase().includes(term)) ||
                          (a.tags && a.tags.some(t => t.toLowerCase().includes(term)));
    
    const matchesType = activeView === 'All' 
      ? true 
      : activeView === 'Articles' 
        ? a.mimeType === 'external/url' 
        : a.mimeType !== 'external/url';

    const matchesCategory = activeCategory === 'All' || (a.category && a.category.includes(activeCategory)); 
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const handleTauraiSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestQuery.trim() || isSuggesting) return;
    setIsSuggesting(true);
    setSuggestion(null);

    try {
      const prompt = `Based on the library digital vault containing items like ${vault.slice(0, 5).map(v => v.title).join(', ')}, suggest a research path for: "${suggestQuery}". Mention specific digital articles or books.`;
      const res = await generateReasoningResponse(prompt);
      setSuggestion(res.text || "Explore our repository for academic excellence.");
    } catch (e) {
      setSuggestion("I suggest browsing the STEM collection for technical insights.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const metadata = await extractMetadataFromAsset(file.name, file.size);
      
      const newAsset: DigitalAsset = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        uploadDate: Date.now(),
        title: metadata.title || file.name.replace('.pdf', ''),
        author: metadata.author || 'Local Upload',
        ddc: metadata.ddc || '000',
        category: metadata.category || 'General',
        status: 'archived',
        preservationScore: 100,
        url: URL.createObjectURL(file),
        summary: metadata.summary || 'Quick upload via Digital Resources Panel.',
        tags: ['Quick Upload', 'User Content']
      };

      const updated = [newAsset, ...vault];
      setVault(updated);
      localStorage.setItem('lib50_digital_vault', JSON.stringify(updated));
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar pb-32">
      {selectedAsset && (
        <ResourcePreviewModal 
            asset={selectedAsset} 
            onClose={() => setSelectedAsset(null)} 
            onOpenReader={(asset) => {
                onOpenPdf(asset);
                // Optionally close modal if opening reader navigates away or covers it
                // But for now keeping it open or letting parent handle navigation
                setSelectedAsset(null);
            }} 
        />
      )}

      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black google-sans text-zinc-900 uppercase tracking-tighter">
            Knowledge <span className="text-[#136f6f]">Vault</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Unified Access to Archived Heritage & Ingested Research</p>
        </div>
        
        <div className="flex gap-4">
           {/* Upload Button - Admin/Staff Only */}
           {userRole === 'staff' && (
             <>
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading}
                 className="px-6 py-2.5 bg-zinc-900 hover:bg-[#136f6f] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all disabled:opacity-70"
               >
                 {isUploading ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Analyzing...</>
                 ) : (
                    <><span>+</span> Ingest PDF</>
                 )}
               </button>
               <input 
                 type="file" 
                 ref={fileInputRef}
                 onChange={handleFileUpload}
                 accept="application/pdf"
                 className="hidden"
               />
             </>
           )}

           <div className="flex bg-zinc-100 p-1 rounded-2xl shadow-inner">
             <input 
               type="text" 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Search knowledge..."
               className="bg-transparent px-6 py-2.5 text-xs focus:outline-none w-48 md:w-64"
             />
             <button className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">
               Search
             </button>
           </div>
        </div>
      </header>

      {/* AI Suggestion Bar */}
      <section className="mb-12">
        <div className="bg-zinc-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl group-hover:rotate-12 transition-transform duration-1000">✨</div>
          <div className="relative z-10">
            <h2 className="text-xl font-black google-sans uppercase tracking-tighter mb-2">Synthetic Navigator</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-8">Grounding AI on repository context</p>
            
            <form onSubmit={handleTauraiSuggestion} className="flex gap-4 max-w-3xl">
              <input 
                type="text" 
                value={suggestQuery}
                onChange={(e) => setSuggestQuery(e.target.value)}
                placeholder="I'm looking for research on indigenous architecture..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-8 text-sm focus:outline-none focus:border-teal-500 transition-all placeholder:text-zinc-600"
              />
              <button 
                type="submit" 
                disabled={isSuggesting}
                className="px-10 bg-[#136f6f] hover:bg-teal-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-teal-900/20 active:scale-95 disabled:opacity-50"
              >
                {isSuggesting ? 'Thinking...' : 'Locate Path'}
              </button>
            </form>

            {suggestion && (
              <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-3xl animate-in slide-in-from-top-2">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></div>
                   <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest">AI Context Match</span>
                 </div>
                 <p className="text-sm text-zinc-300 leading-relaxed font-mono italic">
                   "{suggestion}"
                 </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tab Switcher & Category Filters */}
      <div className="flex flex-col gap-6 mb-12">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
           <div className="flex gap-8">
              {(['All', 'Archive', 'Articles'] as const).map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveView(tab)}
                  className={`text-[10px] font-black uppercase tracking-widest pb-4 border-b-2 transition-all ${activeView === tab ? 'text-[#136f6f] border-[#136f6f]' : 'text-zinc-400 border-transparent hover:text-zinc-600'}`}
                >
                  {tab === 'Articles' ? 'Digital Ingested Articles' : tab === 'Archive' ? 'Preserved Heritage' : 'Unified Repository'}
                </button>
              ))}
           </div>
           <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">{filteredVault.length} items visible</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeCategory === cat 
                  ? 'bg-[#136f6f] text-white border-[#136f6f] shadow-md' 
                  : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      {filteredVault.length === 0 ? (
        <div className="py-32 text-center opacity-20 flex flex-col items-center">
          <div className="text-9xl mb-6">📀</div>
          <h3 className="text-2xl font-black google-sans uppercase tracking-tighter text-zinc-900">Repository Segment Empty</h3>
          <p className="text-sm mt-2 text-zinc-500">No content matches the current filter for {activeView}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredVault.map(asset => (
            <ResourceCard key={asset.id} asset={asset} onClick={setSelectedAsset} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DigitalResourcesPanel;
