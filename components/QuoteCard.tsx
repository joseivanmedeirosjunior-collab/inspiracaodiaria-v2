import React, { useState, useEffect, useRef } from 'react';
import { Share2, Quote, Copy, Check, Volume2, StopCircle, Loader2, Heart, Zap, Star, Sparkles } from 'lucide-react';
import { InspirationQuote, ReactionCounts, ReactionType } from '../types';
import { fetchQuoteAudio } from '../services/geminiService';
import { registerReaction, getReactions, formatDateKey } from '../services/queueService';

interface QuoteCardProps {
  data: InspirationQuote | null;
  loading: boolean;
  date: Date;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ data, loading, date }) => {
  const [copied, setCopied] = useState(false);
  
  // Estados de Áudio
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioCache, setAudioCache] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<'elevenlabs' | 'native' | null>(null); // 'elevenlabs' ou 'native'
  
  // Estados de Reação
  const [reactions, setReactions] = useState<ReactionCounts>({ love: 0, power: 0, sad: 0 });
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [isVoting, setIsVoting] = useState(false);

  // Ref para o elemento de áudio HTML5 nativo (muito mais simples para MP3)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Carregar reações iniciais
  useEffect(() => {
    if (data) {
        // Resetar cache de áudio se mudar a frase
        setAudioCache(null);
        setAudioSource(null);
        stopAudio();

        const loadReactions = async () => {
            const counts = await getReactions(date);
            setReactions(counts);
        };
        loadReactions();

        // Carregar votos locais do usuário para este dia
        const dateKey = formatDateKey(date);
        const savedVotes = localStorage.getItem(`juro_votes_${dateKey}`);
        if (savedVotes) {
            setUserVotes(JSON.parse(savedVotes));
        } else {
            setUserVotes({});
        }
    }
  }, [data, date]);

  // Limpar áudio ao desmontar
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    // Parar áudio HTML5 (ElevenLabs)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Parar áudio Nativo (Browser)
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const playAudioData = (base64Data: string) => {
    stopAudio();
    
    // Cria um player nativo para o MP3 Base64
    const audio = new Audio(`data:audio/mpeg;base64,${base64Data}`);
    
    audio.onended = () => {
      setIsSpeaking(false);
    };
    
    audio.onerror = (e) => {
      console.error("Erro ao tocar áudio", e);
      setIsSpeaking(false);
    };

    audioRef.current = audio;
    audio.play().catch(e => {
        console.error("Play falhou (interação necessária?)", e);
        setIsSpeaking(false);
    });
    setIsSpeaking(true);
  };

  const playNativeSpeech = (text: string) => {
      stopAudio();
      
      if (!window.speechSynthesis) {
          alert("Seu navegador não suporta áudio.");
          return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9; // Um pouco mais lento para ser poético
      utterance.pitch = 1;

      // Tenta encontrar uma voz feminina em PT-BR (melhor esforço)
      const voices = window.speechSynthesis.getVoices();
      const ptVoices = voices.filter(v => v.lang.includes('pt') || v.lang.includes('PT'));
      if (ptVoices.length > 0) {
          // Google Português do Brasil geralmente é boa
          const googleVoice = ptVoices.find(v => v.name.includes('Google'));
          if (googleVoice) utterance.voice = googleVoice;
      }

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
  };

  const handleSpeak = async () => {
    if (!data) return;

    if (isSpeaking) {
      stopAudio();
      return;
    }

    const textToSpeak = `"${data.quote}" ... ${data.author}.`;

    // 1. Tenta usar Cache de Áudio de Alta Qualidade
    if (audioCache) {
      playAudioData(audioCache);
      return;
    }

    setIsLoadingAudio(true);
    try {
      // 2. Tenta gerar áudio novo na ElevenLabs
      const base64 = await fetchQuoteAudio(textToSpeak);
      
      if (base64) {
        setAudioCache(base64);
        setAudioSource('elevenlabs');
        playAudioData(base64);
      } else {
        // 3. FALLBACK: Se falhar ou não tiver chave, usa o nativo
        console.log("Usando voz nativa do navegador (Fallback)");
        setAudioSource('native');
        playNativeSpeech(textToSpeak);
      }
    } catch (error) {
      console.error("Falha geral no áudio, usando nativo", error);
      setAudioSource('native');
      playNativeSpeech(textToSpeak);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleReaction = async (newType: ReactionType) => {
    if (isVoting) return; 

    const previousVote = Object.keys(userVotes).find(key => userVotes[key]) as ReactionType | undefined;

    if (previousVote === newType) return;

    setIsVoting(true);

    const updatedReactions = { ...reactions };
    
    if (previousVote) {
        updatedReactions[previousVote] = Math.max(0, updatedReactions[previousVote] - 1);
    }
    updatedReactions[newType] = updatedReactions[newType] + 1;
    
    setReactions(updatedReactions);
    
    const newUserVotes: Record<string, boolean> = { [newType]: true };
    setUserVotes(newUserVotes);
    
    const dateKey = formatDateKey(date);
    localStorage.setItem(`juro_votes_${dateKey}`, JSON.stringify(newUserVotes));

    try {
       await registerReaction(date, newType, previousVote);
    } catch (e) {
       console.error("Falha ao salvar reação", e);
    } finally {
        setIsVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl w-full mx-4 bg-white rounded-[2rem] shadow-sm p-8 md:p-12 flex flex-col items-center animate-pulse border border-juro-secondary/30">
        <div className="h-4 bg-juro-secondary/20 w-12 mb-6 rounded"></div>
        <div className="h-6 bg-juro-secondary/20 w-3/4 mb-4 rounded"></div>
        <div className="h-6 bg-juro-secondary/20 w-2/3 mb-8 rounded"></div>
        <div className="h-4 bg-juro-secondary/20 w-1/3 rounded"></div>
      </div>
    );
  }

  if (!data) return null;

  const handleShare = () => {
    const text = `"${data.quote}" — ${data.author}\n\nInspiração do dia via JURO App ✨`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    const text = `"${data.quote}" — ${data.author}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar texto: ', err);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-4 bg-white rounded-[2.5rem] shadow-xl shadow-juro-secondary/50 border-2 border-white p-8 md:p-16 flex flex-col items-center text-center transform transition-all hover:scale-[1.01] duration-500 relative">
      
      <div className="mb-6 text-juro-primary opacity-80">
        <Quote size={40} fill="currentColor" className="rotate-180" />
      </div>

      <h1 className="font-serif text-2xl md:text-4xl text-juro-text leading-relaxed mb-8 italic">
        "{data.quote}"
      </h1>

      <div className="w-16 h-1.5 bg-juro-primary rounded-full mb-8 opacity-20"></div>

      <div className="flex flex-col items-center mb-10">
        <h2 className="font-sans font-bold text-xl text-juro-primary tracking-wide">
          — {data.author}
        </h2>
        <p className="font-sans text-sm text-juro-text opacity-60 mt-2 font-medium">
          {data.role} • {data.country}
        </p>
      </div>

      {/* Área de Reações */}
      <div className="flex items-center justify-center gap-4 md:gap-6 mb-10 w-full">
        {/* Amei */}
        <button 
            onClick={() => handleReaction('love')}
            className={`flex flex-col items-center gap-1 group transition-all active:scale-90 ${userVotes.love ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
        >
            <div className={`p-3 rounded-full transition-all shadow-sm ${userVotes.love ? 'bg-red-100 text-red-500 scale-110 shadow-red-200' : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-400'}`}>
                <Heart size={24} fill={userVotes.love ? "currentColor" : "none"} className={userVotes.love ? "animate-bounce-short" : ""} />
            </div>
            <span className="text-xs font-bold text-juro-text/70">{reactions.love}</span>
            <span className="text-[10px] uppercase tracking-wide text-gray-400 hidden md:block">Amei</span>
        </button>

        {/* Poderosa */}
        <button 
            onClick={() => handleReaction('power')}
            className={`flex flex-col items-center gap-1 group transition-all active:scale-90 ${userVotes.power ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
        >
            <div className={`p-3 rounded-full transition-all shadow-sm ${userVotes.power ? 'bg-orange-100 text-orange-500 scale-110 shadow-orange-200' : 'bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-400'}`}>
                <Zap size={24} fill={userVotes.power ? "currentColor" : "none"} />
            </div>
            <span className="text-xs font-bold text-juro-text/70">{reactions.power}</span>
            <span className="text-[10px] uppercase tracking-wide text-gray-400 hidden md:block">Poderosa</span>
        </button>

        {/* Tocante */}
        <button 
            onClick={() => handleReaction('sad')}
            className={`flex flex-col items-center gap-1 group transition-all active:scale-90 ${userVotes.sad ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
        >
            <div className={`p-3 rounded-full transition-all shadow-sm ${userVotes.sad ? 'bg-purple-100 text-purple-500 scale-110 shadow-purple-200' : 'bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-400'}`}>
                <Star size={24} fill={userVotes.sad ? "currentColor" : "none"} />
            </div>
            <span className="text-xs font-bold text-juro-text/70">{reactions.sad}</span>
            <span className="text-[10px] uppercase tracking-wide text-gray-400 hidden md:block">Tocante</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center justify-center flex-wrap">
        <button
          onClick={handleSpeak}
          disabled={isLoadingAudio}
          className={`relative w-full sm:w-auto group flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-semibold transition-all shadow-sm active:scale-95 border whitespace-nowrap overflow-hidden ${
            isSpeaking
              ? 'bg-red-50 text-red-500 border-red-100'
              : isLoadingAudio 
                ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-wait'
                : 'bg-juro-bg text-juro-primary border-juro-secondary hover:bg-juro-secondary/30'
          }`}
        >
          {/* Indicador de ElevenLabs (HD) - Visível enquanto não carrega e é ElevenLabs */}
          {audioSource === 'elevenlabs' && !isLoadingAudio && (
            <div className="absolute top-0 right-0 p-1">
              <Sparkles size={10} className="text-amber-400 fill-amber-400 animate-pulse" />
            </div>
          )}

          {isLoadingAudio ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isSpeaking ? (
            <StopCircle size={20} />
          ) : (
            <Volume2 size={20} />
          )}
          <span>
            {isLoadingAudio ? 'Gerando...' : isSpeaking ? 'Parar' : 'Ouvir'}
          </span>
        </button>

        <button
          onClick={handleShare}
          className="w-full sm:w-auto group flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-semibold transition-all shadow-lg hover:shadow-green-500/20 active:scale-95 whitespace-nowrap"
        >
          <Share2 size={20} />
          <span>WhatsApp</span>
        </button>

        <button
          onClick={handleCopy}
          className={`w-full sm:w-auto group flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-semibold transition-all shadow-sm active:scale-95 border whitespace-nowrap ${
            copied 
              ? 'bg-gray-100 text-gray-600 border-gray-200' 
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
    </div>
  );
};