
import React, { useState, useRef } from 'react';
import { generateSearchGroundedResponse, generateSpeech, decodeAudio, decodeAudioData } from '../services/geminiService';
import { GroundingChunk } from '../types';
import { AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';

const SearchGrounding: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);
    setSources([]);

    try {
      const res = await generateSearchGroundedResponse(query);
      setResponse(res.text || "No response found.");
      
      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setSources(chunks as GroundingChunk[]);
    } catch (err) {
      console.error(err);
      setResponse("Failed to connect to Google Search grounding.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSummary = async () => {
    if (!response || isPlaying) return;
    setIsPlaying(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      }
      const base64 = await generateSpeech(response);
      const buffer = await decodeAudioData(decodeAudio(base64), audioContextRef.current, AUDIO_SAMPLE_RATE_OUTPUT, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (e) {
      console.error("Audio failed:", e);
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-6 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold google-sans mb-2">Live Web Intelligence</h1>
        <p className="text-zinc-500">Real-time information retrieval grounded by Google Search and Maps.</p>
      </header>

      <div className="flex-1 space-y-8">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recent news, events, or local places..."
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-6 px-8 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xl"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-4 top-4 bottom-4 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {response && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Grounded Insight</h3>
                <button
                  onClick={handleVoiceSummary}
                  className={`p-2 rounded-full border border-white/10 hover:bg-white/10 transition-all ${isPlaying ? 'text-blue-400 animate-pulse' : 'text-zinc-500'}`}
                >
                  {isPlaying ? '🔊' : '🔈'}
                </button>
              </div>
              <div className="prose prose-invert max-w-none leading-relaxed text-zinc-300">
                {response}
              </div>
            </div>

            {sources.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Verification Sources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources.map((source, idx) => {
                    const item = source.web || source.maps;
                    if (!item) return null;
                    return (
                      <a
                        key={idx}
                        href={item.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-white/5 transition-all group"
                      >
                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-blue-500/10">
                          {source.web ? '🌐' : '📍'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-zinc-300">{item.title || 'Untitled Source'}</p>
                          <p className="text-xs text-zinc-500 truncate">{item.uri}</p>
                        </div>
                        <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
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

export default SearchGrounding;
