
import React, { useState, useEffect, useRef } from 'react';
import { getAIClient, generateSpeech, decodeAudio, decodeAudioData, encodeAudio, generateSearchGroundedResponse } from '../services/geminiService';
import { MODELS, AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { LiveServerMessage, Modality, Blob } from '@google/genai';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const KohaGatewayMonitor: React.FC = () => {
  const [throughputData, setThroughputData] = useState<Array<{ time: string, rate: number }>>([]);
  
  useEffect(() => {
    // Simulate real-time throughput data
    const generateData = () => {
      const data = [];
      const now = new Date();
      for (let i = 10; i >= 0; i--) {
        data.push({
          time: new Date(now.getTime() - i * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          rate: Math.floor(Math.random() * 100) + 20
        });
      }
      setThroughputData(data);
    };
    generateData();
    const interval = setInterval(generateData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-10 opacity-5 text-9xl group-hover:rotate-12 transition-transform duration-1000">⛓️</div>
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div>
          <h3 className="text-lg font-bold google-sans tracking-tight">Koha Industrial Gateway</h3>
          <p className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em] mt-1">Institutional Data Bridge v5.0</p>
        </div>
        <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black uppercase text-emerald-500">Uplink Stable</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Transactions</p>
          <p className="text-3xl font-black google-sans">1,244</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Avg. Latency</p>
          <p className="text-3xl font-black google-sans">42ms</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Error Rate</p>
          <p className="text-3xl font-black google-sans text-emerald-500">0.02%</p>
        </div>
      </div>

      <div className="h-48 w-full bg-black/20 rounded-3xl p-6 border border-white/5 relative z-10">
        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Real-time Throughput (req/sec)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={throughputData}>
            <Bar dataKey="rate" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={[0, 150]} />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', fontSize: '10px' }} cursor={{ fill: '#ffffff05' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
         <div className="flex gap-4">
            <div className="text-[9px] font-bold text-zinc-400">REST_ENDPOINT: https://ils.institution.edu/api/v1</div>
            <div className="text-[9px] font-bold text-zinc-400">MARC21_ENCODING: UTF-8</div>
         </div>
         <button className="text-[10px] font-black uppercase text-teal-400 hover:text-teal-300 transition-colors">View API Logs ➔</button>
      </div>
    </div>
  );
};

const VisualTelemetry: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [visionReport, setVisionReport] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const startVisionEngine = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { width: 640, height: 480 } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const ai = getAIClient();
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob: Blob = { data: encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            frameIntervalRef.current = window.setInterval(() => {
              if (canvasRef.current && videoRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  canvasRef.current.width = videoRef.current.videoWidth;
                  canvasRef.current.height = videoRef.current.videoHeight;
                  ctx.drawImage(videoRef.current, 0, 0);
                  canvasRef.current.toBlob((blob) => {
                    if (blob) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                      };
                      reader.readAsDataURL(blob);
                    }
                  }, 'image/jpeg', 0.6);
                }
              }
            }, 1000);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const outCtx = outputCtx;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decodeAudio(audioData), outCtx, AUDIO_SAMPLE_RATE_OUTPUT, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.outputTranscription) setVisionReport(prev => [msg.serverContent!.outputTranscription!.text, ...prev].slice(0, 10));
          },
          onclose: () => stopVisionEngine(),
          onerror: () => stopVisionEngine()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are an Industrial Visual Monitor.',
          outputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { console.error(err); }
  };

  const stopVisionEngine = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    sessionRef.current?.close();
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setIsActive(false);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-[2.5rem] overflow-hidden shadow-xl relative">
      <div className="aspect-video bg-zinc-100 flex items-center justify-center relative group">
        <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-40'}`} />
        <canvas ref={canvasRef} className="hidden" />
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white/40 backdrop-blur-sm">
            <button onClick={startVisionEngine} className="w-20 h-20 rounded-full border border-zinc-200 flex items-center justify-center bg-white shadow-lg">📸</button>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Visual Uplink Standby</p>
          </div>
        )}
      </div>
      <div className="p-8 bg-zinc-50">
        <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Visual Narrative</h3>
        <div className="space-y-3">
          {visionReport.map((line, i) => <p key={i} className="text-xs font-mono text-zinc-700 pl-4 border-l-2 border-blue-400">{line}</p>)}
        </div>
      </div>
    </div>
  );
};

const SmartOperations: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await generateSearchGroundedResponse(`Analyze library industrial ops: ${query}`);
      setAnalysis(res.text || "Report generated.");
    } catch (err) { setAnalysis("Failed."); } finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full px-6 py-8 overflow-y-auto pb-32 bg-zinc-50">
      <header className="mb-12">
        <h1 className="text-3xl font-bold google-sans flex items-center gap-3 text-zinc-900">
          <span className="text-blue-500">🔌</span> Smart Operations
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Real-time Telemetry and Industrial Efficiency Analysis.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-12 mb-12">
        <KohaGatewayMonitor />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <VisualTelemetry />
          <div className="space-y-8">
            <form onSubmit={handleQuery} className="relative">
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Query operational bottlenecks..." className="w-full bg-white border border-zinc-200 rounded-2xl py-6 px-8 text-sm focus:outline-none shadow-xl" />
              <button type="submit" className="absolute right-4 top-4 bottom-4 px-6 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase">Diagnostic</button>
            </form>
            {analysis && (
              <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-10 shadow-xl font-mono text-sm text-zinc-700 whitespace-pre-wrap">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6">Ops Insight</h3>
                {analysis}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartOperations;
