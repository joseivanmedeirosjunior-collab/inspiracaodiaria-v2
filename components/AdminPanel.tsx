import React, { useState, useEffect } from 'react';
import { Lock, Calendar, Check, RefreshCw, X, Loader2, ArrowLeft } from 'lucide-react';
import { fetchDailyInspiration } from '../services/geminiService';
import { getQueue, updateQueueItem, formatDateKey } from '../services/queueService';
import { QueueItem, InspirationQuote } from '../types';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [queue, setQueue] = useState<Record<string, QueueItem>>({});
  const [loadingDates, setLoadingDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const storedQueue = getQueue();
    setQueue(storedQueue);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta');
    }
  };

  const handleGenerate = async (date: Date) => {
    const dateKey = formatDateKey(date);
    setLoadingDates(prev => ({ ...prev, [dateKey]: true }));
    
    try {
      const newQuote = await fetchDailyInspiration();
      updateQueueItem(date, 'draft', newQuote);
      setQueue(getQueue()); // Refresh local state
    } catch (error) {
      console.error("Erro ao gerar frase", error);
      alert("Erro ao gerar frase. Tente novamente.");
    } finally {
      setLoadingDates(prev => ({ ...prev, [dateKey]: false }));
    }
  };

  const handleApprove = (date: Date, quote: InspirationQuote) => {
    updateQueueItem(date, 'approved', quote);
    setQueue(getQueue());
  };

  const handleReject = (date: Date) => {
    updateQueueItem(date, 'empty');
    setQueue(getQueue());
  };

  const getNext30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-pink-100 max-w-sm w-full text-center">
          <div className="mb-6 text-juro-primary flex justify-center">
            <div className="p-4 bg-pink-50 rounded-full">
              <Lock size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-serif font-bold text-juro-text mb-6">Acesso Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-juro-primary/50"
            />
            <button
              type="submit"
              className="w-full bg-juro-primary text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors"
            >
              Entrar
            </button>
          </form>
          <button 
            onClick={() => window.location.hash = ''}
            className="mt-6 text-sm text-gray-400 hover:text-juro-primary transition-colors"
          >
            Voltar para o App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.hash = ''}
            className="p-2 rounded-full hover:bg-pink-100 text-juro-primary transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-serif font-bold text-juro-text">Gerenciador de Frases</h1>
        </div>
        <div className="text-sm text-gray-500">
          Próximos 30 dias
        </div>
      </div>

      <div className="space-y-6">
        {getNext30Days().map((date) => {
          const dateKey = formatDateKey(date);
          const item = queue[dateKey];
          const isLoading = loadingDates[dateKey];
          const isApproved = item?.status === 'approved';
          const hasDraft = item?.status === 'draft' || isApproved;
          
          const formattedDate = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'short',
            day: 'numeric',
            month: 'long'
          }).format(date);

          return (
            <div 
              key={dateKey} 
              className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                isApproved 
                  ? 'border-green-200 shadow-green-100' 
                  : 'border-pink-50 shadow-sm'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {/* Data */}
                <div className="min-w-[180px] flex items-center gap-2 text-juro-text opacity-70">
                  <Calendar size={18} />
                  <span className="capitalize font-medium">{formattedDate}</span>
                </div>

                {/* Conteúdo */}
                <div className="flex-grow">
                  {hasDraft && item?.data ? (
                    <div className="mb-4">
                      <p className="text-xl font-serif italic text-juro-text mb-2">"{item.data.quote}"</p>
                      <p className="text-sm text-juro-primary font-bold">— {item.data.author}</p>
                      <p className="text-xs text-gray-500">{item.data.role} • {item.data.country}</p>
                    </div>
                  ) : (
                    <div className="text-gray-400 italic text-sm py-2 mb-4">
                      Nenhuma frase definida para este dia.
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap gap-3">
                    {!isApproved && (
                      <button
                        onClick={() => handleGenerate(date)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-50 text-juro-primary hover:bg-pink-100 font-medium text-sm transition-colors disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {hasDraft ? 'Gerar Nova Opção' : 'Gerar Frase'}
                      </button>
                    )}

                    {hasDraft && !isApproved && (
                      <>
                        <button
                          onClick={() => handleApprove(date, item!.data!)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-medium text-sm transition-colors"
                        >
                          <Check size={16} />
                          Aprovar
                        </button>
                        
                      </>
                    )}

                    {isApproved && (
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-lg">
                          <Check size={16} />
                          Aprovado
                        </span>
                        <button
                          onClick={() => handleReject(date)}
                          className="text-xs text-gray-400 hover:text-red-400 underline"
                        >
                          Alterar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
