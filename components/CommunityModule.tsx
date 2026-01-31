
import React, { useState, useRef, useEffect } from 'react';
import { generateImage, generateSpeech, decodeAudio, decodeAudioData, generateMapsGroundedResponse } from '../services/geminiService';
import { AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { GroundingChunk } from '../types';

const CommunityModule: React.FC = () => {
  const [eventDesc, setEventDesc] = useState('Youth AI Literacy Saturday Workshop');
  const [isGenerating, setIsGenerating] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'generating' | 'ready'>('idle');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [partners, setPartners] = useState<GroundingChunk[]>([]);
  const [isFindingPartners, setIsFindingPartners] = useState(false);
  const [partnerResponseText, setPartnerResponseText] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleGenerateMaterials = async () => {
    if (!eventDesc.trim() || isGenerating) return;
    setIsGenerating(true);
    setPosterUrl(null);
    setAudioBase64(null);
    setAudioStatus('generating');
    
    try {
      const [img, speech] = await Promise.all([
        generateImage(`Professional community library event poster for: ${eventDesc}. High resolution, modern design, education focused. Include text about a library 5.0 initiative.`),
        generateSpeech(`Attention community members! We are excited to announce: ${eventDesc}. Join us at your local library to innovate and learn together in the spirit of Library 5.0.`)
      ]);
      
      setPosterUrl(img);
      setAudioBase64(speech);
      setAudioStatus('ready');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const findLocalPartners = async () => {
    setIsFindingPartners(true);
    setPartnerResponseText(null);
    try {
      // Get current position
      const getPosition = (): Promise<GeolocationPosition | undefined> => 
        new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(undefined));
        });

      const pos = await getPosition();
      const location = pos ? { 
        latitude: pos.coords.latitude, 
        longitude: pos.coords.longitude 
      } : undefined;

      // Use Maps Grounding to find educational partners
      const prompt = `Find potential partners for a "${eventDesc}". Specifically list local high schools, community centers, and educational NGOs. Describe why they would be good partners.`;
      const res = await generateMapsGroundedResponse(prompt, location);
      
      setPartnerResponseText(res.text || null);
      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setPartners(chunks as GroundingChunk[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFindingPartners(false);
    }
  };

  const playAnnouncement = async () => {
    if (!audioBase64) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
    }
    const buffer = await decodeAudioData(decodeAudio(audioBase64), audioContextRef.current, AUDIO_SAMPLE_RATE_OUTPUT, 1);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start();
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar pb-32">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold google-sans flex items-center gap-3">
            <span className="text-pink-500">📣</span> Outreach & Event Studio
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Generate multimedia promotional materials and discover local community partners for Education 5.0.</p>
        </div>
        <button 
          onClick={findLocalPartners}
          disabled={isFindingPartners}
          className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${
            isFindingPartners ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-[#136f6f] text-white hover:bg-[#1a8b8b] shadow-teal-900/20'
          }`}
        >
          {isFindingPartners ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
              Locating Partners...
            </>
          ) : (
            <>
              <span>📍</span> Discover Local Partners
            </>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-zinc-200 p-8 rounded-[2.5rem] shadow-sm">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Workshop Description</label>
            <textarea
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              placeholder="Describe the outreach program (e.g., 'Youth AI Literacy Saturday Workshop')..."
              className="w-full h-32 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-sm focus:outline-none focus:border-pink-500/50 transition-all resize-none text-zinc-800 placeholder:text-zinc-300 shadow-inner"
            />
            <button
              onClick={handleGenerateMaterials}
              disabled={isGenerating || !eventDesc.trim()}
              className="w-full mt-6 py-5 bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-200 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-pink-900/10"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Designing Campaign Assets...
                </>
              ) : (
                <>
                  <span>🎨</span> Generate Campaign Assets
                </>
              )}
            </button>
          </div>

          {partners.length > 0 && (
            <div className="bg-white border border-blue-100 p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-top-4 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Local Partnership Hub</h3>
                <span className="text-[8px] px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full border border-blue-100 font-bold">Grounded</span>
              </div>
              
              {partnerResponseText && (
                <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl text-[11px] text-zinc-600 leading-relaxed border border-blue-50 italic">
                  {partnerResponseText}
                </div>
              )}

              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {partners.map((p, i) => {
                  const mapData = p.maps;
                  if (!mapData) return null;
                  return (
                    <div key={i} className="group p-4 bg-zinc-50 border border-zinc-100 rounded-2xl hover:border-blue-300 hover:bg-white transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-zinc-800 group-hover:text-blue-600 transition-colors">{mapData.title || 'Educational Facility'}</p>
                        <a href={mapData.uri} target="_blank" className="text-blue-500 hover:scale-110 transition-transform">
                          <span className="text-sm">📍</span>
                        </a>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">Local entity identified for strategic alignment.</p>
                      <div className="mt-3 flex items-center justify-between">
                         <a 
                           href={mapData.uri} 
                           target="_blank" 
                           className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                         >
                           View on Google Maps ↗
                         </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-7xl translate-x-4 -translate-y-4">📻</div>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Radio Campaign Spot</h3>
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Synthesis Engine:</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${audioStatus === 'ready' ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {audioStatus}
              </span>
            </div>
            <button
              onClick={playAnnouncement}
              disabled={audioStatus !== 'ready'}
              className="w-full py-4 bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 flex items-center justify-center gap-3 active:scale-95"
            >
              <span className="text-xl">🔊</span> Play Broadcast Announcement
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col">
          <div className="flex-1 bg-zinc-100 border-2 border-dashed border-zinc-200 rounded-[3rem] overflow-hidden relative flex items-center justify-center min-h-[500px] shadow-inner group">
            {posterUrl ? (
              <div className="w-full h-full p-4 flex items-center justify-center bg-zinc-200">
                 <img src={posterUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-700" alt="Generated Poster" />
              </div>
            ) : (
              <div className="text-center opacity-10 group-hover:opacity-20 transition-opacity p-12">
                <div className="text-[10rem] mb-6">🎨</div>
                <p className="google-sans text-3xl font-black text-zinc-900 tracking-tighter uppercase">Visual Proof Standby</p>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-600 mt-4 italic">Campaign Assets will appear here</p>
              </div>
            )}
            
            {posterUrl && (
              <div className="absolute bottom-8 right-8 flex gap-4">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = posterUrl;
                    link.download = `library-outreach-${Date.now()}.png`;
                    link.click();
                  }}
                  className="px-8 py-3 bg-[#136f6f] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-[#1a8b8b] transition-all active:scale-95"
                >
                  Download Master Asset
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-8 p-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-zinc-100">📖</div>
               <div>
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Target Demographic</p>
                 <p className="text-xs font-bold text-zinc-800">Local High Schools & Youth Hubs</p>
               </div>
             </div>
             <div className="hidden md:flex gap-2">
                <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-[8px] font-black uppercase tracking-widest text-zinc-400">Education 5.0</span>
                <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-[8px] font-black uppercase tracking-widest text-zinc-400">Indigenous Knowledge</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityModule;
