import React, { useState, useEffect, useRef } from 'react';
import { Lock, Calendar, Check, RefreshCw, X, Loader2, ArrowLeft, Edit2, Save, AlertTriangle } from 'lucide-react';
import { fetchDailyInspiration, isOpenAIApiConfigured } from '../services/aiService';
import { getQueue, updateQueueItem, formatDateKey } from '../services/queueService';
import { QueueItem, InspirationQuote } from '../types';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [queue, setQueue] = useState<Record<string, QueueItem>>({});
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingDates, setLoadingDates] = useState<Record<string, boolean>>({});
  
  // Estados para Edição Manual
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<InspirationQuote>({ quote: '', author: '', role: '', country: '' });

  // Status da API para feedback preventivo
  const [hasOpenAIKey, setHasOpenAIKey] = useState<boolean>(true);

  // Referência para controlar o loop de geração automática
  const autoFillRef = useRef(false);

  // Verifica sessão ao carregar
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('juro_admin_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Carrega a fila ao autenticar
  useEffect(() => {
    if (isAuthenticated) {
      const fetchQueue = async () => {
        setLoadingQueue(true);
        const storedQueue = await getQueue();
        setQueue(storedQueue);
        setLoadingQueue(false);
        autoFillRef.current = true; // Ativa o gatilho para preenchimento automático após carregar dados
        setHasOpenAIKey(isOpenAIApiConfigured());
      };
      fetchQueue();
    }
  }, [isAuthenticated]);

  // Helper para pegar lista de autoras já usadas (para evitar repetição)
  const getUsedAuthors = (): string[] => {
    return Object.values(queue)
      .map((item: QueueItem) => item.data?.author)
      .filter((author): author is string => !!author);
  };

  // Efeito para preenchimento automático sequencial
  useEffect(() => {
    if (!isAuthenticated || !autoFillRef.current || loadingQueue) return;

    const fillNextEmptyDay = async () => {
      const today = new Date();
      const daysToCheck = 30;
      
      for (let i = 0; i < daysToCheck; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        const dateKey = formatDateKey(currentDate);
        
        // Se não tem nada na fila para este dia E não estamos carregando ele agora
        if (!queue[dateKey] && !loadingDates[dateKey]) {
          // Encontrou um buraco! Vamos preencher.
          await handleGenerate(currentDate, true); // true = modo silencioso/automático
          return; // Sai da função e deixa o useEffect rodar de novo quando o estado 'queue' atualizar
        }
      }
      // Se chegou aqui, todos os dias têm algo (ou estão carregando). Podemos parar.
      autoFillRef.current = false;
    };

    // Delay para não sobrecarregar a API e o Banco
    const timer = setTimeout(fillNextEmptyDay, 1500);
    return () => clearTimeout(timer);
  }, [queue, isAuthenticated, loadingDates, loadingQueue]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().toLowerCase() === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('juro_admin_auth', 'true');
    } else {
      alert('Senha incorreta. Tente "admin".');
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

    if (!isOpenAIApiConfigured()) {
      setHasOpenAIKey(false);
      if (!isAuto) {
        alert('Configure a variável VITE_OPENAI_API_KEY no Cloudflare Pages ou no .env local para gerar novas frases.');
      }
      return;
    }

    setLoadingDates(prev => ({ ...prev, [dateKey]: true }));
    
    try {
      // 1. Coleta autoras já usadas para enviar como exclusão
      const usedAuthors = getUsedAuthors();

      // 2. Gera com IA passando as exclusões
      const newQuote = await fetchDailyInspiration(usedAuthors);
      
      // 3. Salva no Supabase
      await updateQueueItem(date, 'draft', newQuote);
      
      // 4. Atualiza estado local para refletir mudança instantaneamente
      setQueue(prev => ({
        ...prev,
        [dateKey]: {
          date: dateKey,
          status: 'draft',
          data: newQuote
        }
      }));
    } catch (error) {
      console.error("Erro ao gerar frase", error);
      if (!isAuto) alert("Erro ao gerar frase. Tente novamente.");
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
    if (window.confirm('⚠️ Atenção\n\nTem certeza que deseja cancelar a aprovação desta frase?\n\nEla voltará para o status de RASCUNHO e não será exibida no app até ser aprovada novamente.')) {
        const dateKey = formatDateKey(date);
        const currentItem = queue[dateKey];
        
        try {
          if (currentItem && currentItem.data) {
             // Volta para rascunho mantendo os dados
             await updateQueueItem(date, 'draft', currentItem.data);
             setQueue(prev => ({
                ...prev,
                [dateKey]: { ...prev[dateKey], status: 'draft' }
             }));
          } else {
             // Caso raro onde não há dados (fallback)
             await updateQueueItem(date, 'draft');
             setQueue(prev => ({
                ...prev,
                [dateKey]: { ...prev[dateKey], status: 'draft' }
             }));
          }
        } catch (e) {
          console.error("Erro ao rejeitar:", e);
          alert("Erro ao cancelar aprovação. Tente novamente.");
        }
    }
  };

  const startEditing = (dateKey: string, currentData?: InspirationQuote) => {
    setEditingDate(dateKey);
    if (currentData) {
      setEditForm(currentData);
    } else {
      setEditForm({ quote: '', author: '', role: '', country: '' });
    }
  };

  const cancelEditing = () => {
    setEditingDate(null);
    setEditForm({ quote: '', author: '', role: '', country: '' });
  };

  const saveManualEdit = async (date: Date) => {
    if (!editForm.quote || !editForm.author) {
      alert("Preencha pelo menos a Frase e a Autora.");
      return;
    }
    
    const dateKey = formatDateKey(date);
    setLoadingDates(prev => ({ ...prev, [dateKey]: true }));

    try {
      await updateQueueItem(date, 'draft', editForm);
      setQueue(prev => ({
        ...prev,
        [dateKey]: {
          date: dateKey,
          status: 'draft',
          data: editForm
        }
      }));
      setEditingDate(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDates(prev => ({ ...prev, [dateKey]: false }));
    }
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-juro-primary/50 text-center"
            />
            <button
              type="submit"
              className="w-full bg-juro-primary text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors shadow-md hover:shadow-lg transform active:scale-95 duration-200"
            >
              Entrar no Painel
            </button>
          </form>
          
          <button 
            onClick={() => window.location.hash = ''}
            className="mt-8 flex items-center justify-center gap-2 w-full text-sm text-gray-400 hover:text-juro-primary transition-colors py-2"
          >
            <ArrowLeft size={14} />
            Voltar para Frase do Dia
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-24">
      {!hasOpenAIKey && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle size={18} className="mt-1" />
          <div>
            <p className="font-semibold">Configure a chave da OpenAI para gerar frases automaticamente.</p>
            <p className="text-sm text-amber-700">
              Defina <strong>VITE_OPENAI_API_KEY</strong> nas variáveis do projeto no Cloudflare Pages (ou use um .env local) e
              publique novamente. Enquanto isso, use "Escrever Manualmente" ou edite um rascunho existente.
            </p>
          </div>
        </div>
      )}
      {/* Header do Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-pink-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.hash = ''}
            className="p-3 rounded-full bg-pink-50 hover:bg-pink-100 text-juro-primary transition-colors"
            title="Voltar para o App"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
             <h1 className="text-2xl md:text-3xl font-serif font-bold text-juro-text">Gerenciador Editorial</h1>
             <p className="text-sm text-gray-500">
                {loadingQueue ? 'Sincronizando com o banco de dados...' : 'Planeje as frases dos próximos 30 dias'}
             </p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Sair do Sistema
        </button>
      </div>

      {loadingQueue ? (
          <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={48} className="text-juro-primary animate-spin mb-4" />
              <p className="text-gray-500">Carregando suas frases...</p>
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
              
              const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              }).format(date);

              return (
                <div 
                  key={dateKey} 
                  className={`bg-white rounded-2xl p-6 border-2 transition-all relative overflow-hidden ${
                    isApproved 
                      ? 'border-green-200 shadow-sm' 
                      : isEditing 
                        ? 'border-juro-primary ring-4 ring-pink-50 shadow-lg z-10'
                        : 'border-pink-50 shadow-sm hover:border-pink-200'
                  }`}
                >
                  {/* Status Flag */}
                  <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider
                    ${isApproved ? 'bg-green-100 text-green-700' : hasDraft ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                    {isApproved ? 'Aprovado' : hasDraft ? 'Rascunho' : 'Vazio'}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start gap-6 mt-2">
                    {/* Data Coluna Esquerda */}
                    <div className="min-w-[200px] md:border-r md:border-pink-50 pr-4">
                      <div className="flex items-center gap-2 text-juro-primary mb-1">
                        <Calendar size={20} />
                        <span className="font-bold text-lg">{date.getDate()}</span>
                      </div>
                      <p className="capitalize text-gray-600 font-medium">{formattedDate}</p>
                      <p className="text-xs text-gray-400 mt-1">{date.getFullYear()}</p>
                    </div>

                    {/* Conteúdo Central */}
                    <div className="flex-grow w-full">
                      
                      {/* MODO EDIÇÃO */}
                      {isEditing ? (
                        <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Frase</label>
                                <textarea 
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-juro-primary focus:border-transparent text-juro-text font-serif"
                                    rows={3}
                                    value={editForm.quote}
                                    onChange={(e) => setEditForm({...editForm, quote: e.target.value})}
                                    placeholder="Digite a frase inspiradora aqui..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Autora</label>
                                    <input 
                                        className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-juro-primary"
                                        value={editForm.author}
                                        onChange={(e) => setEditForm({...editForm, author: e.target.value})}
                                        placeholder="Nome da Autora"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Profissão/Papel</label>
                                    <input 
                                        className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-juro-primary"
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                        placeholder="Ex: Escritora"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">País</label>
                                    <input 
                                        className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-juro-primary"
                                        value={editForm.country}
                                        onChange={(e) => setEditForm({...editForm, country: e.target.value})}
                                        placeholder="Ex: Brasil"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={cancelEditing} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg">Cancelar</button>
                                <button onClick={() => saveManualEdit(date)} className="px-4 py-2 text-sm bg-juro-primary text-white hover:bg-pink-600 rounded-lg font-bold flex items-center gap-2">
                                    {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Salvar Rascunho
                                </button>
                            </div>
                        </div>
                      ) : (
                        // MODO VISUALIZAÇÃO
                        <>
                          {hasDraft && item?.data ? (
                            <div className="mb-6">
                              <p className="text-xl font-serif italic text-juro-text mb-3 leading-relaxed">"{item.data.quote}"</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-juro-primary text-sm uppercase tracking-wide">— {item.data.author}</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-xs text-gray-500">{item.data.role}</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-xs text-gray-500">{item.data.country}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 mb-4">
                              <p className="text-gray-400 text-sm font-medium">Ainda não há inspiração para este dia.</p>
                            </div>
                          )}

                          {/* Barra de Ferramentas */}
                          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
                            {/* Botão Gerar/Regerar */}
                            {!isApproved && (
                                <button
                                    onClick={() => handleGenerate(date)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-50 text-juro-primary hover:bg-pink-100 font-medium text-sm transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                    {hasDraft ? 'Gerar Outra' : 'Gerar Automático'}
                                </button>
                            )}

                            {/* Botão Editar Manualmente */}
                            {!isApproved && (
                                <button 
                                    onClick={() => startEditing(dateKey, item?.data)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium text-sm transition-colors"
                                >
                                    <Edit2 size={16} />
                                    {hasDraft ? 'Editar' : 'Escrever Manualmente'}
                                </button>
                            )}

                            {/* Ações de Aprovação */}
                            {hasDraft && !isApproved && (
                              <div className="ml-auto pl-4 border-l border-gray-100">
                                <button
                                  onClick={() => handleApprove(date, item!.data!)}
                                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg transform active:scale-95 transition-all font-bold text-sm"
                                >
                                  <Check size={18} />
                                  Aprovar Publicação
                                </button>
                              </div>
                            )}

                            {/* Status Aprovado */}
                            {isApproved && (
                              <div className="flex items-center justify-between w-full md:w-auto ml-auto">
                                <span className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-lg border border-green-100 mr-2">
                                  <Check size={16} />
                                  Publicação Agendada
                                </span>
                                <button
                                  onClick={() => handleReject(date)}
                                  className="text-xs text-orange-400 hover:text-orange-600 hover:bg-orange-50 px-3 py-1 rounded transition-colors"
                                >
                                  Cancelar Aprovação
                                </button>
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