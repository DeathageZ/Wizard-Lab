
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { INITIAL_INGREDIENTS, UNLOCKABLE_INGREDIENTS, CHARACTERS } from './constants';
import { Ingredient, PotionState } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const playSound = (type: 'pop' | 'success' | 'fail' | 'magic') => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'pop') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'success') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'fail') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'magic') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    for (let i = 0; i < 10; i++) {
        osc.frequency.exponentialRampToValueAtTime(Math.random() * 1000 + 400, now + (i * 0.1));
    }
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
    osc.start(now);
    osc.stop(now + 1);
  }
};

const App: React.FC = () => {
  const [character] = useState(CHARACTERS[0]);
  const [housePoints, setHousePoints] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: character.initialMessage }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'lab'>('chat');
  const [potion, setPotion] = useState<PotionState>({
    ingredients: [],
    isStirring: false,
    isComplete: false
  });
  const [brewProgress, setBrewProgress] = useState(0);
  const [masteredPotions, setMasteredPotions] = useState<{ title: string, color: string }[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastUnlockedRef = useRef(0);

  const availableIngredients = useMemo(() => {
    const unlockCount = Math.floor(Math.max(0, housePoints) / 200);
    return [...INITIAL_INGREDIENTS, ...UNLOCKABLE_INGREDIENTS.slice(0, unlockCount)];
  }, [housePoints]);

  useEffect(() => {
    const currentUnlockCount = Math.floor(Math.max(0, housePoints) / 200);
    if (currentUnlockCount > lastUnlockedRef.current) {
      const newIng = UNLOCKABLE_INGREDIENTS[currentUnlockCount - 1];
      if (newIng) {
        playSound('success');
        setNotification(`✨ Unlocked: ${newIng.name} ${newIng.icon}`);
        setTimeout(() => setNotification(null), 4000);
      }
    }
    lastUnlockedRef.current = currentUnlockCount;
  }, [housePoints]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, activeTab]);

  const parsePointsFromText = (text: string) => {
    const awardRegex = /(?:award|gain|get|plus|\+)\s*(\d+)\s*(?:points|house points)/gi;
    const deductRegex = /(?:deduct|minus|lose|take away|remove|-)\s*(\d+)\s*(?:points|house points)/gi;
    const genericRegex = /(\d+)\s*(?:points|house points)/gi;
    let totalChange = 0;
    let match;
    while ((match = deductRegex.exec(text)) !== null) totalChange -= parseInt(match[1], 10);
    while ((match = awardRegex.exec(text)) !== null) totalChange += parseInt(match[1], 10);
    if (totalChange === 0) {
      while ((match = genericRegex.exec(text)) !== null) totalChange += parseInt(match[1], 10);
    }
    return totalChange;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isTyping) return;
    const currentInput = userInput;
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: currentInput }]);
    setIsTyping(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages, { role: 'user', content: currentInput }].map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: character.systemInstruction + ` CURRENT SCORE: ${housePoints}. CRITICAL: Max 120 words.`,
          temperature: 0.7,
        }
      });
      const aiText = response.text || '...';
      const pointChange = parsePointsFromText(aiText);
      if (pointChange !== 0) {
          if (pointChange > 0) playSound('success');
          else playSound('fail');
          setHousePoints(prev => prev + pointChange); 
      }
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Magical interference detected.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const addIngredient = (ing: Ingredient) => {
    if (potion.isComplete || potion.ingredients.length >= 5) return;
    playSound('pop');
    setPotion(prev => ({ ...prev, ingredients: [...prev.ingredients, ing] }));
  };

  const stirPotion = async () => {
    if (potion.ingredients.length === 0 || potion.isStirring) return;
    setPotion(prev => ({ ...prev, isStirring: true, isComplete: false }));
    setBrewProgress(0);
    playSound('magic');
    const brewDuration = 2500;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / brewDuration) * 100);
      setBrewProgress(progress);
      if (progress >= 100) clearInterval(interval);
    }, 50);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Ingredients: ${potion.ingredients.map(i => i.name).join(', ')}. Outcome?`,
        config: {
          systemInstruction: "JSON: {title, description, color}.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              color: { type: Type.STRING }
            },
            required: ["title", "description", "color"]
          }
        }
      });
      const result = JSON.parse(response.text || '{}');
      setTimeout(() => {
        playSound('success');
        setPotion(prev => ({
          ...prev,
          isStirring: false,
          isComplete: true,
          resultTitle: result.title,
          resultDescription: result.description,
          resultColor: result.color
        }));
        
        // Save unique potions
        setMasteredPotions(prev => {
          if (prev.some(p => p.title.toLowerCase() === result.title.toLowerCase())) return prev;
          return [...prev, { title: result.title, color: result.color }];
        });

        setHousePoints(prev => prev + 25);
        setBrewProgress(0);
      }, brewDuration);
    } catch (e) {
      clearInterval(interval);
      setPotion(prev => ({ ...prev, isStirring: false }));
      setBrewProgress(0);
    }
  };

  const currentLiquidColor = potion.isComplete ? potion.resultColor : (potion.ingredients.length > 0 ? potion.ingredients[potion.ingredients.length - 1].color : '#2d3748');

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden safe-area-inset font-sans">
      {notification && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[280px] px-4 pointer-events-none">
          <div className={`py-2 px-4 rounded-lg text-center text-xs font-bold border border-white/20 shadow-2xl animate-fade-in-down ${notification.includes('Incorrect') ? 'bg-red-600/90 text-white' : 'bg-amber-600/90 text-white'}`}>
            {notification}
          </div>
        </div>
      )}

      <header className="flex-none p-3 px-4 flex justify-between items-center bg-slate-900/95 border-b border-white/10 z-50">
        <h1 className="font-magic text-base md:text-xl text-amber-200 truncate pr-2">Wizard Lab</h1>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${housePoints < 0 ? 'bg-red-950/60 border-red-500/50' : 'bg-black/40 border-amber-500/30'}`}>
          <span className="text-sm">{housePoints < 0 ? '⚠️' : '🏆'}</span>
          <span className="text-sm font-magic font-bold text-amber-100">{housePoints}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        <div className="flex-none md:hidden flex bg-slate-900 border-b border-white/10 relative z-40">
          <button 
            onClick={() => { playSound('pop'); setActiveTab('chat'); }}
            className={`flex-1 py-3 text-[10px] font-magic tracking-widest transition-all ${activeTab === 'chat' ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10' : 'text-slate-400'}`}
          >
            SCRIPTORIUM
          </button>
          <button 
            onClick={() => { playSound('pop'); setActiveTab('lab'); }}
            className={`flex-1 py-3 text-[10px] font-magic tracking-widest transition-all ${activeTab === 'lab' ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-500/10' : 'text-slate-400'}`}
          >
            LABORATORY
          </button>
        </div>

        <div className={`${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-slate-900/20 md:border-r border-white/10 min-h-0`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl shadow-lg text-sm ${m.role === 'user' ? 'bg-purple-700/80 text-white rounded-tr-none' : 'bg-slate-800/95 text-slate-100 rounded-tl-none border border-white/5'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2 text-purple-400 animate-pulse px-2">
                <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-3 bg-black/40 flex gap-2 border-t border-white/5">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Message or 'Quiz me'..."
              className="flex-1 bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button type="submit" disabled={isTyping} className="px-4 py-2 rounded-xl font-magic font-bold text-xs shadow-lg bg-purple-700 active:scale-95 disabled:opacity-50">SEND</button>
          </form>
        </div>

        <div className={`${activeTab === 'lab' ? 'flex' : 'hidden'} md:flex flex-1 flex-col p-4 bg-slate-950 overflow-y-auto custom-scrollbar`}>
          <div className="w-full max-w-2xl mx-auto space-y-8 pb-10">
            <section>
              <h3 className="font-magic text-amber-200/50 text-[10px] tracking-widest uppercase mb-3 text-center">Ingredient Shelf</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {availableIngredients.map(ing => (
                  <div key={ing.id} className="relative group/ing">
                    <button 
                      onClick={() => addIngredient(ing)} 
                      disabled={potion.isComplete || potion.ingredients.length >= 5} 
                      className="w-full flex flex-col items-center justify-center aspect-square bg-slate-900/60 rounded-xl border border-white/5 transition-all active:scale-90"
                    >
                      <span className="text-xl mb-1">{ing.icon}</span>
                      <span className="text-[8px] font-bold uppercase truncate w-full px-1 text-center opacity-50">{ing.name}</span>
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-slate-800 border border-purple-500/30 rounded-lg shadow-2xl opacity-0 invisible group-hover/ing:opacity-100 group-hover/ing:visible transition-all z-50 pointer-events-none">
                      <p className="text-[10px] text-purple-200 font-bold mb-1 uppercase tracking-tight">{ing.name}</p>
                      <p className="text-[9px] text-slate-300 leading-tight italic">{ing.description}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col items-center">
              <div className="relative">
                {potion.isStirring && (
                  <svg className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] -rotate-90 pointer-events-none z-10">
                    <circle cx="50%" cy="50%" r="48%" fill="none" stroke="url(#magicGradient)" strokeWidth="4" strokeDasharray="301.59" strokeDashoffset={301.59 - (301.59 * brewProgress) / 100} strokeLinecap="round" className="transition-all duration-100 ease-linear" />
                    <defs>
                      <linearGradient id="magicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#d946ef" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
                
                {potion.isComplete && (
                  <div className="absolute inset-[-20px] pointer-events-none z-20">
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute sparkle-particle text-xl"
                        style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.2}s`,
                          color: potion.resultColor || '#fbbf24'
                        }}
                      >✨</div>
                    ))}
                  </div>
                )}

                <div className={`relative w-40 h-40 sm:w-60 sm:h-60 cauldron-gradient rounded-full border-t-[4px] border-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center ${potion.isComplete ? 'animate-celebrate ring-4 ring-amber-400/30' : ''}`}>
                  <div className="absolute inset-1.5 rounded-full potion-liquid flex flex-col items-center justify-center p-4 text-center"
                    style={{ 
                      backgroundColor: currentLiquidColor, 
                      opacity: potion.ingredients.length > 0 ? 0.75 : 0.05,
                      transform: potion.isStirring ? `scale(${1 + brewProgress/500})` : 'scale(1)'
                    }}>
                    {potion.isStirring && (
                      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <span className="text-4xl animate-wand">🪄</span>
                      </div>
                    )}
                    {potion.isComplete && (
                      <div className="animate-fade-in px-2 max-h-full overflow-hidden flex flex-col items-center justify-center">
                        <h4 className="font-magic text-xs md:text-lg mb-1 text-slate-900 font-bold drop-shadow-sm leading-tight">
                          {potion.resultTitle}
                        </h4>
                        <p className="text-[9px] md:text-sm text-slate-800 font-medium leading-tight italic line-clamp-4 max-w-[90%]">
                          {potion.resultDescription}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-4 w-full">
                <button onClick={stirPotion} disabled={potion.ingredients.length === 0 || potion.isStirring} className={`w-full max-w-xs text-white font-magic tracking-widest py-3 rounded-full shadow-xl active:scale-95 disabled:opacity-20 transition-all text-xs ${potion.isComplete ? 'bg-amber-500 shadow-amber-500/50' : 'bg-amber-700'}`}>
                  {potion.isStirring ? `BREWING ${Math.round(brewProgress)}%` : potion.isComplete ? 'POTION READY' : 'STIR POTION'}
                </button>
                {potion.isComplete && (
                  <button onClick={() => { playSound('pop'); setPotion({ ingredients: [], isStirring: false, isComplete: false }); }} className="text-amber-200/40 text-[9px] font-magic tracking-widest hover:text-amber-200 uppercase">Empty Cauldron</button>
                )}
                <div className="flex gap-2 min-h-[30px] items-center">
                  {potion.ingredients.map((ing, i) => (
                    <span key={i} className="text-lg animate-drift" style={{ animationDelay: `${i * 0.2}s` }}>{ing.icon}</span>
                  ))}
                </div>
              </div>
            </section>

            {/* Mastered Potions Section */}
            <section className="pt-4 border-t border-white/5">
              <h3 className="font-magic text-amber-200/50 text-[10px] tracking-widest uppercase mb-4 text-center">Mastered Recipes</h3>
              {masteredPotions.length === 0 ? (
                <p className="text-center text-[10px] text-slate-500 italic">No unique potions brewed yet...</p>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  {masteredPotions.map((p, idx) => (
                    <div 
                      key={idx} 
                      className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/5 flex items-center gap-2 animate-fade-in"
                    >
                      <div className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)]" style={{ backgroundColor: p.color }}></div>
                      <span className="text-[10px] font-magic text-slate-300 tracking-wider whitespace-nowrap">{p.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
