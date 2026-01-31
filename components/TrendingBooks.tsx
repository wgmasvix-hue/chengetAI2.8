
import React, { useState, useEffect } from 'react';
import { generateReasoningResponse, generateImage } from '../services/geminiService';

interface SensorEvent {
  id: string;
  time: string;
  shelf: string;
  action: 'picked' | 'returned';
  bookTitle: string;
}

interface TrendingBook {
  title: string;
  author: string;
  score: number;
  coverUrl?: string;
  reason?: string;
  year?: string;
  summary?: string;
}

const BookDetailModal: React.FC<{ book: TrendingBook; onClose: () => void }> = ({ book, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
    <div 
      className="bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300" 
      onClick={e => e.stopPropagation()}
    >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 w-10 h-10 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 z-10 transition-colors"
        >
          ✕
        </button>
        
        {/* Left: Image */}
        <div className="w-full md:w-5/12 bg-zinc-100 relative min-h-[300px]">
            {book.coverUrl ? (
                <img src={book.coverUrl} className="w-full h-full object-cover" alt={book.title} />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl grayscale opacity-30">📖</div>
            )}
        </div>
        
        {/* Right: Content */}
        <div className="w-full md:w-7/12 p-10 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-teal-50 text-teal-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-teal-100">Trending Artifact</span>
                {book.year && <span className="text-[9px] font-bold text-zinc-400 border border-zinc-200 px-2 py-0.5 rounded-md">{book.year}</span>}
            </div>
            
            <h2 className="text-3xl font-black google-sans text-zinc-900 leading-tight mb-2">{book.title}</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-8">By {book.author}</p>
            
            <div className="mb-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
                <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Synopsis</h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  {book.summary || 'No summary available for this title.'}
                </p>
            </div>

            <div className="mt-auto pt-6 border-t border-zinc-100">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Community Interest Score</span>
                    <span className="text-xl font-black text-teal-600">{book.score}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${book.score}%` }}></div>
                </div>
            </div>
        </div>
    </div>
  </div>
);

const TrendingBooks: React.FC = () => {
  const [events, setEvents] = useState<SensorEvent[]>([]);
  const [trending, setTrending] = useState<TrendingBook[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<TrendingBook | null>(null);

  // Initial trending list
  useEffect(() => {
    const initialTrending: TrendingBook[] = [
      { 
        title: "The Great Zimbabwe Secrets", 
        author: "C. Munhu", 
        score: 98,
        year: "2019",
        summary: "A groundbreaking archaeological study revealing the advanced engineering techniques and trade networks of the Great Zimbabwe civilization, challenging historical misconceptions."
      },
      { 
        title: "Modern Farming with AI", 
        author: "Dr. T. Moyo", 
        score: 85,
        year: "2023",
        summary: "Integrating autonomous drones and soil sensors with traditional Zimbabwean agricultural practices to maximize crop yield in changing climates. A definitive guide for the modern agritech era."
      },
      { 
        title: "Stories of our Elders", 
        author: "S. Nyoni", 
        score: 72,
        year: "2015",
        summary: "An anthology of oral traditions, folktales, and wisdom passed down through generations in the Matabeleland region, preserved in print for the first time."
      },
    ];
    setTrending(initialTrending);

    // Generate covers for trending books
    initialTrending.forEach(async (book, i) => {
      try {
        const url = await generateImage(`Beautiful book cover for "${book.title}" by ${book.author}, high quality design, modern library style.`);
        if (url) {
          setTrending(prev => {
            const next = [...prev];
            next[i] = { ...next[i], coverUrl: url };
            return next;
          });
        }
      } catch (e) {}
    });
  }, []);

  // Simulate real-time sensor activity
  useEffect(() => {
    const interval = setInterval(() => {
      const bookTitles = ["The Great Zimbabwe Secrets", "Modern Farming with AI", "Stories of our Elders", "Engineering for Zimbabwe", "Local Herbs Guide"];
      const shelves = ["Shelf A", "Shelf B", "Reference Area", "Community Corner"];
      const newEvent: SensorEvent = {
        id: Math.random().toString(36).substr(2, 5),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        shelf: shelves[Math.floor(Math.random() * shelves.length)],
        action: Math.random() > 0.5 ? 'picked' : 'returned',
        bookTitle: bookTitles[Math.floor(Math.random() * bookTitles.length)]
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 10));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getAISensorInsight = async () => {
    setIsAnalyzing(true);
    setAiInsight(null);
    try {
      const eventLog = events.map(e => `${e.time}: Book "${e.bookTitle}" was ${e.action} from ${e.shelf}`).join('\n');
      const prompt = `
        Look at these library sensor readings:
        ${eventLog}

        Using common language, tell us:
        1. What do these readings mean for our library community today?
        2. Which topics are people most interested in right now?
        3. One helpful suggestion for the librarian.
      `;
      const res = await generateReasoningResponse(prompt);
      setAiInsight(res.text || "The sensors are active and the library is buzzing with learning!");
    } catch (e) {
      setAiInsight("Could not connect to the sensor intelligence right now.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto custom-scrollbar pb-32 bg-[#fbfcfd]">
      {selectedBook && <BookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} />}

      <header className="mb-12">
        <h1 className="text-3xl font-black google-sans text-zinc-900 uppercase tracking-tighter">
          <span className="text-[#136f6f]">📚</span> Popular Right Now
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Live updates from our library's smart book sensors.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Real-time Sensor Feed */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 text-7xl">📡</div>
            <h3 className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em] mb-6">Smart Sensor Activity</h3>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {events.length === 0 ? (
                <p className="text-zinc-600 text-xs italic">Waiting for shelf activity...</p>
              ) : (
                events.map(event => (
                  <div key={event.id} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 animate-in slide-in-from-right duration-500">
                    <div className={`w-2 h-2 rounded-full mt-1 ${event.action === 'picked' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`}></div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase">{event.time} • {event.shelf}</p>
                      <p className="text-xs font-bold text-zinc-200 mt-0.5">
                        {event.action === 'picked' ? 'Someone picked up:' : 'Someone returned:'}
                      </p>
                      <p className="text-xs text-teal-400 font-medium italic mt-1">"{event.bookTitle}"</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={getAISensorInsight}
              disabled={isAnalyzing || events.length === 0}
              className="w-full mt-8 py-4 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-30"
            >
              {isAnalyzing ? (
                <><div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> Thinking...</>
              ) : 'Ask AI to Explain Trends'}
            </button>
          </div>

          {aiInsight && (
            <div className="bg-white border border-teal-100 rounded-[2.5rem] p-8 shadow-lg animate-in fade-in zoom-in-95 duration-500">
              <h4 className="text-[10px] font-black text-[#136f6f] uppercase tracking-widest mb-4">AI Sensor Insight</h4>
              <div className="text-sm text-zinc-700 leading-relaxed italic whitespace-pre-wrap">
                {aiInsight}
              </div>
            </div>
          )}
        </div>

        {/* Trending Books Grid */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trending.map((book, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedBook(book)}
                className="group bg-white border border-zinc-100 p-6 rounded-[3rem] shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col relative overflow-hidden cursor-pointer"
              >
                <div className="aspect-[3/4] bg-zinc-100 rounded-2xl mb-6 overflow-hidden relative">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={book.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl grayscale">📖</div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-zinc-100 flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#136f6f]">#{i + 1}</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-zinc-900 group-hover:text-[#136f6f] transition-colors leading-tight mb-1">{book.title}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-6 uppercase tracking-wider">By {book.author}</p>
                
                <div className="mt-auto pt-4 border-t border-zinc-50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-zinc-300 uppercase">Popularity Score</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 w-20 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500" style={{ width: `${book.score}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black text-[#136f6f]">{book.score}%</span>
                    </div>
                  </div>
                  <button className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-[#136f6f] transition-colors">Details ➔</button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Call to Action */}
          <div className="mt-12 bg-[#136f6f] rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 L100 100 L0 100 Z" fill="white" />
              </svg>
            </div>
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-3xl font-black google-sans tracking-tighter uppercase mb-2">Build the Future of Learning</h2>
              <p className="text-teal-50 text-sm font-medium opacity-80 max-w-md">Our sensors help us understand what you love, so we can bring in even more of it.</p>
            </div>
            <button className="relative z-10 px-10 py-5 bg-white text-[#136f6f] rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-teal-50 transition-all active:scale-95">
              Suggest a Book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendingBooks;
