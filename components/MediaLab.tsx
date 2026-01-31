
import React, { useState } from 'react';
import { generateImage, generateVideo } from '../services/geminiService';

const MediaLab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'image' | 'video'; url: string } | null>(null);

  const MAX_PROMPT_LENGTH = 1500;

  // Basic sanitization: trim whitespace and remove control characters
  const sanitizeInput = (input: string) => {
    return input.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  };

  const validate = () => {
    const sanitized = sanitizeInput(prompt);
    if (!sanitized) {
      setError("Please enter a description for your visual asset.");
      return null;
    }
    if (sanitized.length < 5) {
      setError("Your prompt is too short. Please provide more detail for better results.");
      return null;
    }
    setError(null);
    return sanitized;
  };

  const handleGenerateImage = async () => {
    const validatedPrompt = validate();
    if (!validatedPrompt || isGenerating) return;

    setIsGenerating(true);
    setStatus("Generating high-fidelity image...");
    setResult(null);

    try {
      const url = await generateImage(validatedPrompt);
      if (url) {
        setResult({ type: 'image', url });
      } else {
        setError("The engine returned an empty result. Please try a different prompt.");
      }
    } catch (e) {
      console.error(e);
      setError("Image generation failed due to a system error.");
      setStatus("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    const validatedPrompt = validate();
    if (!validatedPrompt || isGenerating) return;

    setIsGenerating(true);
    setResult(null);
    try {
      const url = await generateVideo(validatedPrompt, setStatus);
      if (url) {
        setResult({ type: 'video', url });
      } else {
        setError("Video generation failed to return a valid asset.");
      }
    } catch (e) {
      console.error(e);
      setError("Video generation process was interrupted.");
      setStatus("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_PROMPT_LENGTH) {
      setPrompt(val);
      if (error) setError(null);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-6 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-bold google-sans mb-2 text-zinc-900">Multimodal Media Lab</h1>
        <p className="text-zinc-500">Generate professional-grade visual assets with Gemini 2.5 Image and Veo 3.1 Fast.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {/* Prompt Section */}
        <div className="space-y-6">
          <div className="p-8 bg-white border border-zinc-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-[10px] font-black text-zinc-400 mb-3 uppercase tracking-widest">Cinematic Prompt</label>
              <span className={`text-[10px] font-bold ${prompt.length > MAX_PROMPT_LENGTH * 0.9 ? 'text-orange-500' : 'text-zinc-300'}`}>
                {prompt.length} / {MAX_PROMPT_LENGTH}
              </span>
            </div>
            
            <textarea
              value={prompt}
              onChange={handleInputChange}
              placeholder="Describe your vision (e.g., 'A futuristic bioluminescent city under the ocean, drone shot, 8k cinematic')..."
              className={`w-full bg-zinc-50 border ${error ? 'border-red-300 ring-4 ring-red-500/5' : 'border-zinc-200'} rounded-2xl p-6 h-48 text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:border-blue-400 transition-all resize-none shadow-inner`}
            />

            {error && (
              <div className="mt-3 px-4 py-2 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                  <span>⚠️</span> {error}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button
                onClick={handleGenerateImage}
                disabled={isGenerating}
                className="py-5 bg-white hover:bg-zinc-50 text-zinc-800 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-zinc-200 transition-all shadow-sm flex flex-col items-center justify-center gap-2 group/btn"
              >
                <span className="text-3xl group-hover/btn:scale-110 transition-transform">🖼️</span>
                <span>Generate Image</span>
              </button>
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating}
                className="py-5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-zinc-900/20 flex flex-col items-center justify-center gap-2 group/btn"
              >
                <span className="text-3xl group-hover/btn:scale-110 transition-transform">🎬</span>
                <span>Generate Video</span>
              </button>
            </div>
          </div>

          {isGenerating && (
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem] animate-pulse">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Processing Core</h4>
                  <p className="text-sm text-zinc-500 font-medium">{status}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="flex flex-col">
          <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-[2.5rem] overflow-hidden flex flex-col shadow-inner">
            <div className="p-5 border-b border-zinc-100 bg-white/50 backdrop-blur-md flex justify-between items-center px-8">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Master Proof Preview</h3>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${result ? 'bg-emerald-500' : 'bg-zinc-300'}`}></div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  {result ? result.type : 'Standby'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center bg-zinc-100/50 relative">
              {result ? (
                result.type === 'image' ? (
                  <img src={result.url} alt="Generated Asset" className="max-w-full max-h-full object-contain animate-in fade-in duration-1000" />
                ) : (
                  <video src={result.url} controls autoPlay loop className="max-w-full max-h-full animate-in fade-in duration-1000" />
                )
              ) : (
                <div className="text-center p-12 opacity-10">
                  <div className="text-8xl mb-6">👁️</div>
                  <p className="google-sans text-xl font-bold tracking-tight text-zinc-900 uppercase">Awaiting Rendering</p>
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">Initialize engine with a prompt</p>
                </div>
              )}
            </div>

            {result && (
              <div className="p-8 bg-white border-t border-zinc-100">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = result.url;
                    link.download = `lib50-media-${Date.now()}.${result.type === 'image' ? 'png' : 'mp4'}`;
                    link.click();
                  }}
                  className="w-full py-4 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-teal-900/20"
                >
                  Download Master Asset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaLab;
