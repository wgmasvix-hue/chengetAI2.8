
import React, { useState, useEffect, useRef } from 'react';
import { getAIClient, encodeAudio, decodeAudio, decodeAudioData } from '../services/geminiService';
import { MODELS, AUDIO_SAMPLE_RATE_INPUT, AUDIO_SAMPLE_RATE_OUTPUT } from '../constants';
import { LiveServerMessage, Modality, Blob } from '@google/genai';

const LiveVoice: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = getAIClient();
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: AUDIO_SAMPLE_RATE_OUTPUT });
      audioContextRef.current = { input: inputAudioContext, output: outputAudioContext };

      const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encodeAudio(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle output audio
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const outCtx = outputAudioContext;
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

            // Handle transcriptions
            if (msg.serverContent?.outputTranscription) {
              setTranscriptions(prev => [...prev.slice(-4), `Gemini: ${msg.serverContent!.outputTranscription!.text}`]);
            }
            if (msg.serverContent?.inputTranscription) {
               setTranscriptions(prev => [...prev.slice(-4), `You: ${msg.serverContent!.inputTranscription!.text}`]);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => {
            console.error("Live Error:", e);
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: 'You are a highly efficient real-time assistant. Be brief and human-like.',
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start Live API:", err);
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    setIsActive(false);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-6 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold google-sans mb-2">Live Conversational Intelligence</h1>
        <p className="text-zinc-500">Low-latency multimodal voice interaction powered by Gemini 2.5 Flash Native Audio.</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Pulsing Visualizer */}
        <div className="relative mb-12">
          <div className={`absolute inset-0 bg-blue-500/20 rounded-full blur-3xl transition-all duration-1000 ${isActive ? 'scale-150 opacity-100 animate-pulse' : 'scale-0 opacity-0'}`} />
          <button
            onClick={isActive ? stopSession : startSession}
            className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
              isActive ? 'bg-red-500 text-white scale-110 shadow-red-500/30' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            <span className="text-5xl">{isActive ? '⏹' : '🎙️'}</span>
          </button>
        </div>

        <div className="w-full max-w-lg">
          <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5 backdrop-blur-sm min-h-[200px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Live Transcription</h3>
            <div className="space-y-3">
              {transcriptions.map((t, i) => (
                <p key={i} className={`text-sm ${t.startsWith('You:') ? 'text-zinc-400' : 'text-blue-400 font-medium'}`}>
                  {t}
                </p>
              ))}
              {transcriptions.length === 0 && (
                <p className="text-zinc-600 italic">Conversation stream will appear here...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-ping' : 'bg-zinc-700'}`} />
          <span className="text-sm font-medium">{isActive ? 'Engine Online - Listening' : 'Engine Ready'}</span>
        </div>
        <div className="flex gap-2 text-xs text-zinc-500">
          <span className="px-2 py-1 bg-zinc-800 rounded">16kHz In</span>
          <span className="px-2 py-1 bg-zinc-800 rounded">24kHz Out</span>
          <span className="px-2 py-1 bg-zinc-800 rounded">Native Audio</span>
        </div>
      </footer>
    </div>
  );
};

export default LiveVoice;
