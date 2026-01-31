
import React, { useState, useRef } from 'react';
import { generateSearchGroundedResponse, generateSpeech, decodeAudio, decodeAudioData } from '../services/geminiService';
import { GroundingChunk } from '../types';
import { AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';

const ResearchHub: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleDeepSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setReport(null);
    setSources([]);

    try {
      const res = await generateSearchGroundedResponse(`Perform a deep investigative research report on: ${query}. Include recent data, industrial standards, and current global trends.`);
      setReport(res.text || "No insights found.");
      
      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setSources(chunks as GroundingChunk[]);
    } catch (err) {
      console.error(err);
      setReport("The Global Intelligence Engine failed to retrieve data. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSummary = async () => {
    if (!report || isPlaying) return;
    setIsPlaying(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      }
      // Prepare a concise briefing for TTS if the report is very long
      const speechText = report.length > 1200 ? report.substring(0, 1200) + "... [Briefing continues in the written report]." : report;
      const base64 = await generateSpeech(speechText);
      const buffer = await decodeAudioData(decodeAudio(base64), audioContextRef.current, AUDIO_SAMPLE_RATE_OUTPUT, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (e) {
      console.error("Audio generation failed:", e);
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full px-6 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold google-sans mb-3 flex items-center gap-4">
          <span className="text-blue-500">🌐</span> Global Research Hub
        </h1>
        <p className="text-zinc-500 max-w-2xl">
          Harness the power of live web grounding to discover up-to-the-minute industrial data, academic standards, and Education 5.0 innovations.
        </p>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto pr-4 scrollbar-hide">
        <form onSubmit={handleDeepSearch} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search industrial standards (e.g., 'ISO standards for digital archiving 2025')..."
            className="relative w-full bg-zinc-900 border border-white/10 rounded-2xl py-6 px-8 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xl transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-4 top-4 bottom-4 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Scanning Web...</span>
              </div>
            ) : (
              'Initiate Discovery'
            )}
          </button>
        </form>

        {report && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-zinc-900/80 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl relative">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.3em]">Grounded Intelligence Report</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleVoiceSummary}
                    disabled={isPlaying}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold uppercase transition-all ${
                      isPlaying 
                        ? 'bg-blue-600 border-blue-500 text-white animate-pulse' 
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isPlaying ? '🔊 Playing Audio Briefing...' : '🔈 Listen to Report'}
                  </button>
                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black rounded-full uppercase">Verified</span>
                </div>
              </div>
              <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                {report}
              </div>
            </div>

            {sources.length > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Source Verification Layer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sources.map((source, idx) => {
                    const item = source.web;
                    if (!item) return null;
                    return (
                      <a
                        key={idx}
                        href={item.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col gap-3 p-5 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl border border-white/5 transition-all group overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">🌐</span>
                          <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate text-zinc-200 group-hover:text-white transition-colors">
                            {item.title || 'Live Resource'}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate mt-1">{item.uri}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchHub;
