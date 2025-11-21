import React, { useState, useRef, useEffect } from 'react';
import { Share2, Quote, Copy, Check, Volume2, StopCircle, Loader2, Heart, Zap, Star } from 'lucide-react';
import { InspirationQuote, ReactionCounts, ReactionType } from '../types';
import { fetchQuoteAudio } from '../services/geminiService';
import { registerReaction, getReactions, formatDateKey } from '../services/queueService';

interface QuoteCardProps {
  data: InspirationQuote | null;
  loading: boolean;
  date: Date;
}

// Funções auxiliares para decodificação de áudio PCM do Gemini
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ data, loading, date }) => {
  const [copied, setCopied] = useState(false);
  
  // Estados de Áudio
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioCache, setAudioCache] = useState<string | null>(null);
  
  // Estados de Reação
  const [reactions, setReactions] = useState<ReactionCounts>({ love: 0, power: 0, sad: 0 });
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [isVoting, setIsVoting] = useState(false);

  // Refs de Áudio
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Carregar reações iniciais
  useEffect(() => {
    if (data) {
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

  // Limpar áudio ao desmontar ou mudar a frase
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [data]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignorar erro se já estiver parado
      }
      sourceNodeRef.current = null;
    }
    setIsSpeaking(false);
  };

  const playAudio = async (base64Data: string) => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audioBuffer = await decodeAudioData(
        decode(base64Data),
        audioContextRef.current,
        24000,
        1 
      );

      stopAudio();

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        sourceNodeRef.current = null;
      };

      sourceNodeRef.current = source;
      source.start();
      setIsSpeaking(true);

    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      setIsSpeaking(false);
    }
  };

  const handleSpeak = async () => {
    if (!data) return;

    if (isSpeaking) {
      stopAudio();
      return;
    }

    if (audioCache) {
      playAudio(audioCache);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const textToSpeak = `${data.quote}. Frase de ${data.author}.`;
      const base64 = await fetchQuoteAudio(textToSpeak);
      
      if (base64) {
        setAudioCache(base64);
        await playAudio(base64);
      }
    } catch (error) {
      console.error("Falha ao obter áudio", error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleReaction = async (newType: ReactionType) => {
    if (isVoting) return; 

    // 1. Identificar se já existe um voto anterior
    const previousVote = Object.keys(userVotes).find(key => userVotes[key]) as ReactionType | undefined;

    // Se o usuário clicou no mesmo que já estava, não fazemos nada (ou poderíamos desmarcar/toggle off)
    // Seguindo a lógica de "mudar de ideia", apenas ignoramos o clique repetido para evitar recalculo
    if (previousVote === newType) return;

    setIsVoting(true);

    // 2. Atualização Otimista (UI)
    const updatedReactions = { ...reactions };
    
    // Se tinha voto antes, remove 1
    if (previousVote) {
        updatedReactions[previousVote] = Math.max(0, updatedReactions[previousVote] - 1);
    }
    // Adiciona 1 no novo voto
    updatedReactions[newType] = updatedReactions[newType] + 1;
    
    setReactions(updatedReactions);
    
    // 3. Atualizar estado local de votos do usuário (Garante exclusividade)
    const newUserVotes: Record<string, boolean> = { [newType]: true }; // Apenas o novo é true
    setUserVotes(newUserVotes);
    
    // Salvar no localStorage
    const dateKey = formatDateKey(date);
    localStorage.setItem(`juro_votes_${dateKey}`, JSON.stringify(newUserVotes));

    // 4. Enviar para o servidor (backend)
    try {
       await registerReaction(date, newType, previousVote);
    } catch (e) {
       console.error("Falha ao salvar reação", e);
       // Em caso de erro real, poderíamos reverter o estado, mas para UX simples mantemos otimista
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
          className={`w-full sm:w-auto group flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-semibold transition-all shadow-sm active:scale-95 border whitespace-nowrap ${
            isSpeaking
              ? 'bg-red-50 text-red-500 border-red-100'
              : isLoadingAudio 
                ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-wait'
                : 'bg-juro-bg text-juro-primary border-juro-secondary hover:bg-juro-secondary/30'
          }`}
        >
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