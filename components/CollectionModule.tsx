
import React, { useState, useRef } from 'react';
import { generateSearchGroundedResponse, generateSpeech, decodeAudio, decodeAudioData } from '../services/geminiService';
import { GroundingChunk } from '../types';
import { AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CollectionModule: React.FC = () => {
  const [holdings, setHoldings] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ uri: string, title: string }>>([]);
  const [chartData, setChartData] = useState<Array<{ category: string, demand: number }>>([]);
  const [isPlayingBriefing, setIsPlayingBriefing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleVoiceBriefing = async () => {
    if (!report || isPlayingBriefing) return;
    setIsPlayingBriefing(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      }
      const summaryText = `Here is your Strategic Gap Analysis Briefing. Based on current trends, we recommend the following acquisitions: ${report.substring(0, 500)}... For more details, see the full report on screen.`;
      const base64 = await generateSpeech(summaryText);
      const buffer = await decodeAudioData(decodeAudio(base64), audioContextRef.current, AUDIO_SAMPLE_RATE_OUTPUT, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlayingBriefing(false);
      source.start();
    } catch (e) {
      console.error(e);
      setIsPlayingBriefing(false);
    }
  };

  const analyzeGaps = async () => {
    if (!holdings.trim() || isLoading) return;
    setIsLoading(true);
    setReport(null);
    setChartData([]);

    try {
      const prompt = `
        Analyze this library's current holding summary and identify acquisition gaps based on 2024-2025 global industrial and research trends: "${holdings}".
        
        Provide a comprehensive text report. 
        
        CRITICAL: At the very end of your response, output a JSON array representing the top 5 gap categories and their estimated demand score (0-100).
        The JSON must be wrapped in triple backticks like this:
        \`\`\`json
        [
          {"category": "AI Ethics", "demand": 85},
          {"category": "Green Energy", "demand": 70}
        ]
        \`\`\`
      `;
      const res = await generateSearchGroundedResponse(prompt);
      
      let text = res.text || "Analysis complete.";
      
      // Extract JSON for chart
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsedData = JSON.parse(jsonMatch[1]);
          setChartData(parsedData);
          // Remove the JSON block from display text for cleaner UI
          text = text.replace(jsonMatch[0], '').trim();
        } catch (e) {
          console.error("Failed to parse chart data", e);
        }
      }

      setReport(text);
      
      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = (chunks as GroundingChunk[])
        .filter(c => c.web)
        .map(c => ({ uri: c.web!.uri, title: c.web!.title }));
      setSources(urls);
    } catch (e) {
      setReport("Failed to generate intelligence report.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar">
      <header className="mb-8">
        <h1 className="text-2xl font-bold google-sans flex items-center gap-3">
          <span className="text-indigo-500">📊</span> Collection Intelligence
        </h1>
        <p className="text-zinc-500 text-sm">Strategic gap analysis and acquisition forecasting grounded in industrial trends.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-white/5 p-6 rounded-[2rem]">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Holdings Summary</label>
            <textarea
              value={holdings}
              onChange={(e) => setHoldings(e.target.value)}
              placeholder="Paste current collection stats (e.g., '10k Engineering titles, 500 Quantum Computing journals')..."
              className="w-full h-48 bg-zinc-800 border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-zinc-300"
            />
            <button
              onClick={analyzeGaps}
              disabled={isLoading || !holdings.trim()}
              className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Scanning Global Trends...</span>
                </>
              ) : (
                <>
                  <span>🔍</span> Run Intelligence Scan
                </>
              )}
            </button>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2rem]">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Industrial Trend Indicators</h3>
            <div className="space-y-3">
              {['AI & Ethics', 'Sustainable Energy', 'Biotech Innovation', 'Circular Economy'].map((trend, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{trend}</span>
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px]">High Demand</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {report ? (
            <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-8 animate-in fade-in slide-in-from-right-4 duration-500 relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Gap Analysis Report</h3>
                <button 
                  onClick={handleVoiceBriefing}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 text-[10px] font-bold uppercase transition-all ${isPlayingBriefing ? 'bg-indigo-500 text-white animate-pulse' : 'text-indigo-400 hover:bg-indigo-500/10'}`}
                >
                  {isPlayingBriefing ? 'Playing Briefing...' : '🔊 Listen to Briefing'}
                </button>
              </div>

              {chartData.length > 0 && (
                <div className="mb-8 p-4 bg-black/20 rounded-2xl border border-white/5">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 text-center">Acquisition Priority Matrix</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="category" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#a1a1aa'}} />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#a1a1aa'}} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                          cursor={{fill: '#ffffff10'}}
                        />
                        <Bar dataKey="demand" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="prose prose-invert max-w-none text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap font-mono h-64 overflow-y-auto custom-scrollbar pr-2">
                {report}
              </div>
              
              {sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Market Verification Sources</p>
                  <div className="grid grid-cols-1 gap-2">
                    {sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" className="text-[10px] bg-white/5 p-2 rounded-lg border border-white/5 hover:bg-white/10 transition-colors truncate text-indigo-300 hover:text-indigo-200 block">
                        🌐 {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-white/5 border-dashed rounded-[2rem] opacity-20 p-12 text-center">
              <span className="text-6xl mb-4">📉</span>
              <p className="google-sans text-lg font-medium">Ready for Intelligence Scan</p>
              <p className="text-xs mt-2">Upload holding summaries to see strategic recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionModule;
