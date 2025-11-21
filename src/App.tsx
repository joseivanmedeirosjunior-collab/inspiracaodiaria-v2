import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { QuoteCard } from '../components/QuoteCard';
import { AdminPanel } from '../components/AdminPanel';
import { fetchDailyInspiration } from '../services/geminiService';
import { getQuoteForDate } from '../services/queueService';
import { InspirationQuote, DailyData } from '../types';
import { Sparkles, AlertTriangle } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'juro_daily_inspiration_v1';

export default function App() {
  // Routing State
  const [currentPath, setCurrentPath] = useState(window.location.hash);

  // App State
  const [quoteData, setQuoteData] = useState<InspirationQuote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // Novo estado de erro
  const [currentDateString, setCurrentDateString] = useState<string>('');
  const [quoteDate, setQuoteDate] = useState<Date>(new Date());

  // Handle Hash Change (Routing)
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadData = useCallback(async () => {
    const todayDate = new Date();
    setQuoteDate(todayDate);
    
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(todayDate);
    
    setCurrentDateString(formattedDate);
    setLoading(true);
    setError(null); // Limpa erros anteriores

    try {
      // 1. Tenta pegar frase APROVADA pelo admin no Supabase
      const adminApprovedQuote = await getQuoteForDate(todayDate);
      if (adminApprovedQuote) {
        setQuoteData(adminApprovedQuote);
        setLoading(false);
        return;
      }

      // 2. Se não tiver admin approved, usa lógica de cache diário local
      const todayKey = todayDate.toDateString();
      const storedDataString = localStorage.getItem(LOCAL_STORAGE_KEY);

      let shouldFetch = true;

      if (storedDataString) {
        try {
          const storedData: DailyData = JSON.parse(storedDataString);
          if (storedData.date === todayKey) {
            setQuoteData(storedData.data);
            setLoading(false);
            shouldFetch = false;
          }
        } catch (e) {
          console.error("Error parsing stored data", e);
        }
      }

      if (shouldFetch) {
        try {
          const newData = await fetchDailyInspiration();
          setQuoteData(newData);
          
          const dataToStore: DailyData = {
            date: todayKey,
            data: newData
          };
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
        } catch (err: any) {
          console.error("Erro no fetch:", err);
          // Define a mensagem de erro para mostrar na tela
          setError(err.message || "Não foi possível carregar a frase de hoje.");
        }
      }
    } catch (error: any) {
      console.error("Failed to load daily quote", error);
      setError("Erro inesperado ao carregar o aplicativo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPath !== '#admin') {
      loadData();
    }
  }, [currentPath, loadData]);

  // RENDER: Admin View
  if (currentPath === '#admin') {
    return (
      <div className="min-h-screen flex flex-col bg-juro-bg selection:bg-juro-secondary selection:text-juro-primary">
        <Header />
        <AdminPanel />
      </div>
    );
  }

  // RENDER: Home View
  return (
    <div className="min-h-screen flex flex-col bg-juro-bg selection:bg-juro-secondary selection:text-juro-primary">
      <Header />
      
      <main className="flex-grow flex flex-col items-center justify-start pt-4 pb-12 px-4 w-full">
        
        <div className="flex flex-col items-center text-center mb-8 space-y-2 animate-fade-in">
          <div className="flex items-center gap-4 text-juro-primary opacity-70">
            <Sparkles size={20} />
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-juro-primary">
              Inspiração Diária
            </h1>
            <Sparkles size={20} />
          </div>
          <p className="text-lg md:text-xl text-juro-text font-medium opacity-60 mt-2">
            {currentDateString}
          </p>
        </div>

        <div className="container mx-auto flex justify-center">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-lg text-center shadow-sm">
                <div className="flex justify-center mb-4 text-red-400">
                  <AlertTriangle size={48} />
                </div>
                <h3 className="text-xl font-bold text-red-600 mb-2">Ops! Algo deu errado.</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <p className="text-sm text-gray-400">
                  Se você é o administrador, verifique se a <strong>VITE_API_KEY</strong> está configurada corretamente no Cloudflare.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : (
              <QuoteCard data={quoteData} loading={loading} date={quoteDate} />
            )}
        </div>
      </main>

      <Footer />
    </div>
  );
}