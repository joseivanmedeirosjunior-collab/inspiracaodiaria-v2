
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Check, RefreshCw, X, Loader2, ArrowLeft, Edit2, Save } from 'lucide-react';
import { fetchDailyInspiration } from '../services/geminiService';
import { getQueue, updateQueueItem, formatDateKey } from '../services/queueService';
import { QueueItem, InspirationQuote } from '../types';
import { Logo } from './Logo';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [queue, setQueue] = useState<Record<string, QueueItem>>({});
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingDates, setLoadingDates] = useState<Record<string, boolean>>({});
  
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<InspirationQuote>({ quote: '', author: '', role: '', country: '' });

  const autoFillRef = useRef(false);

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('juro_admin_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchQueueData = async () => {
        setLoadingQueue(true);
        const storedQueue = await getQueue();
        setQueue(storedQueue);
        setLoadingQueue(false);
        autoFillRef.current = true;
      };
      fetchQueueData();
    }
  }, [isAuthenticated]);

  const getUsedAuthors = (): string[] => {
    return Object.values(queue)
      .filter((item: QueueItem) => item.data && item.data.author)
      .map((item: QueueItem) => item.data!.author.trim());
  };

  useEffect(() => {
    if (!isAuthenticated || !autoFillRef.current || loadingQueue) return;

    const fillNextEmptyDay = async () => {
      const today = new Date();
      const daysToCheck = 30;
      
      for (let i = 0; i < daysToCheck; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        const dateKey = formatDateKey(currentDate);
        
        if (!queue[dateKey] && !loadingDates[dateKey]) {
          await handleGenerate(currentDate, true); 
          return; 
        }
      }
      autoFillRef.current = false;
    };

    const timer = setTimeout(fillNextEmptyDay, 1500);
    return () => clearTimeout(timer);
  }, [queue, isAuthenticated, loadingDates, loadingQueue]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let correctPassword = 'admin';
    try {
        // @ts-ignore
        const env = import.meta.env;
        if (env && env.VITE_ADMIN_PASSWORD) {
            correctPassword = env.VITE_ADMIN_PASSWORD;
        }
    } catch (error) {}

    if (password === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('juro_admin_auth', 'true');
    } else {
      alert('Senha incorreta.');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('juro_admin_auth');
    setPassword('');
    window.location.hash = '';
  };

  const handleGenerate = async (date: Date, isAuto = false) => {
    const dateKey = formatDateKey(date);
    setLoadingDates(prev => ({ ...prev, [dateKey]: true }));
    
    try {
      const usedAuthors = getUsedAuthors();
      const newQuote = await fetchDailyInspiration(usedAuthors);
      await updateQueueItem(date, 'draft', newQuote);
      
      setQueue(prev => ({
        ...prev,
        [dateKey]: {
          date: dateKey,
          status: 'draft',
          data: newQuote
        }
      }));
    } catch (error: any) {
      console.error("Erro ao gerar frase", error);
      if (!isAuto) {
         alert(`Erro ao gerar frase: ${error.message || "Verifique sua chave API."}`);
      }
    } finally {
      setLoadingDates(prev => ({ ...prev, [dateKey]: false }));
    }
  };

  const handleApprove = async (date: Date, quote: InspirationQuote) => {
    const dateKey = formatDateKey(date);
    try {
      await updateQueueItem(date, 'approved', quote);
      setQueue(prev => ({
        ...prev,
        [dateKey]: { ...prev[dateKey], status: 'approved', data: quote }
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (date: Date) => {
    if (window.confirm('Deseja cancelar a aprovação?')) {
        const dateKey = formatDateKey(date);
        const currentItem = queue[dateKey];
        try {
          await updateQueueItem(date, 'draft', currentItem?.data);
          setQueue(prev => ({
            ...prev,
            [dateKey]: { ...prev[dateKey], status: 'draft' }
          }));
        } catch (e) { console.error(e); }
    }
  };

  const startEditing = (dateKey: string, currentData?: InspirationQuote) => {
    setEditingDate(dateKey);
    if (currentData) setEditForm(currentData);
    else setEditForm({ quote: '', author: '', role: '', country: '' });
  };

  const saveManualEdit = async (date: Date) => {
    const dateKey = formatDateKey(date);
    setLoadingDates(prev => ({ ...prev, [dateKey]: true }));
    try {
      await updateQueueItem(date, 'draft', editForm);
      setQueue(prev => ({
        ...prev,
        [dateKey]: { date: dateKey, status: 'draft', data: editForm }
      }));
      setEditingDate(null);
    } catch (e) { console.error(e); }
    finally { setLoadingDates(prev => ({ ...prev, [dateKey]: false })); }
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
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-pink-100 max-w-sm w-full text-center animate-fade-in">
          <div className="mb-6 flex justify-center">
             <Logo size="sm" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-juro-text mb-6">Acesso Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-juro-primary/50 text-center"
            />
            <button type="submit" className="w-full bg-juro-primary text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors shadow-md">
              Entrar no Painel
            </button>
          </form>
          <button onClick={() => window.location.hash = ''} className="mt-8 flex items-center justify-center gap-2 w-full text-sm text-gray-400 hover:text-juro-primary py-2">
            <ArrowLeft size={14} /> Voltar para o App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-pink-50">
        <div className="flex items-center gap-4">
          <button onClick={() => window.location.hash = ''} className="p-3 rounded-full bg-pink-50 hover:bg-pink-100 text-juro-primary">
            <ArrowLeft size={24} />
          </button>
          <div>
             <h1 className="text-2xl md:text-3xl font-serif font-bold text-juro-text">Gerenciador Editorial</h1>
             <p className="text-sm text-gray-500">{loadingQueue ? 'Sincronizando...' : 'Planeje os próximos 30 dias'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
          Sair do Sistema
        </button>
      </div>

      {loadingQueue ? (
          <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={48} className="text-juro-primary animate-spin mb-4" />
              <p className="text-gray-500">Carregando...</p>
          </div>
      ) : (
          <div className="space-y-6">
            {getNext30Days().map((date) => {
              const dateKey = formatDateKey(date);
              const item = queue[dateKey];
              const isLoading = loadingDates[dateKey];
              const isApproved = item?.status === 'approved';
              const hasDraft = item?.status === 'draft' || isApproved;
              const isEditing = editingDate === dateKey;
              const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

              return (
                <div key={dateKey} className={`bg-white rounded-2xl p-6 border-2 transition-all relative overflow-hidden ${isApproved ? 'border-green-200 shadow-sm' : isEditing ? 'border-juro-primary ring-4 ring-pink-50 shadow-lg z-10' : 'border-pink-50 shadow-sm hover:border-pink-200'}`}>
                  <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider ${isApproved ? 'bg-green-100 text-green-700' : hasDraft ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                    {isApproved ? 'Aprovado' : hasDraft ? 'Rascunho' : 'Vazio'}
                  </div>
                  <div className="flex flex-col md:flex-row md:items-start gap-6 mt-2">
                    <div className="min-w-[200px] md:border-r md:border-pink-50 pr-4">
                      <div className="flex items-center gap-2 text-juro-primary mb-1">
                        <Calendar size={20} /><span className="font-bold text-lg">{date.getDate()}</span>
                      </div>
                      <p className="capitalize text-gray-600 font-medium">{formattedDate}</p>
                    </div>
                    <div className="flex-grow w-full">
                      {isEditing ? (
                        <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200">
                            <textarea className="w-full p-3 rounded-lg border border-gray-300 font-serif" rows={3} value={editForm.quote} onChange={(e) => setEditForm({...editForm, quote: e.target.value})} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input className="w-full p-2 rounded-lg border border-gray-300" placeholder="Autora" value={editForm.author} onChange={(e) => setEditForm({...editForm, author: e.target.value})} />
                                <input className="w-full p-2 rounded-lg border border-gray-300" placeholder="Profissão" value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} />
                                <input className="w-full p-2 rounded-lg border border-gray-300" placeholder="País" value={editForm.country} onChange={(e) => setEditForm({...editForm, country: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingDate(null)} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
                                <button onClick={() => saveManualEdit(date)} className="px-4 py-2 text-sm bg-juro-primary text-white rounded-lg font-bold flex items-center gap-2">
                                    {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Salvar
                                </button>
                            </div>
                        </div>
                      ) : (
                        <>
                          {hasDraft && item?.data ? (
                            <div className="mb-6">
                              <p className="text-xl font-serif italic text-juro-text mb-3">"{item.data.quote}"</p>
                              <p className="font-bold text-juro-primary text-sm uppercase">— {item.data.author} | {item.data.role} | {item.data.country}</p>
                            </div>
                          ) : <div className="py-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 mb-4 text-center text-gray-400">Vazio</div>}
                          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
                            {!isApproved && (
                                <button onClick={() => handleGenerate(date)} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-50 text-juro-primary text-sm transition-colors">
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {hasDraft ? 'Gerar Outra' : 'Gerar'}
                                </button>
                            )}
                            {!isApproved && (
                                <button onClick={() => startEditing(dateKey, item?.data)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm">
                                    <Edit2 size={16} /> {hasDraft ? 'Editar' : 'Manual'}
                                </button>
                            )}
                            {hasDraft && !isApproved && (
                                <button onClick={() => handleApprove(date, item!.data!)} className="ml-auto px-6 py-2 rounded-lg bg-green-500 text-white font-bold text-sm shadow-md">
                                  <Check size={18} /> Aprovar
                                </button>
                            )}
                            {isApproved && (
                              <div className="flex items-center justify-between w-full md:w-auto ml-auto">
                                <span className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-lg border border-green-100 mr-2">
                                  <Check size={16} /> Agendado
                                </span>
                                <button onClick={() => handleReject(date)} className="text-xs text-orange-400">Cancelar</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      )}
    </div>
  );
};
