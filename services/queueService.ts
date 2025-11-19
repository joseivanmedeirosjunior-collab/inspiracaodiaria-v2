import { createClient } from '@supabase/supabase-js';
import { InspirationQuote, QueueItem, QuoteStatus } from "../types";

const SUPABASE_URL = 'https://bkhlktxmghmrndhjhyxb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraGxrdHhtZ2htcm5kaGpoeXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTEwOTEsImV4cCI6MjA3OTEyNzA5MX0.nSRYFZDDpRd2-HHN2o9Kd5ImIentHFRJxnGeZONHhaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to format date as YYYY-MM-DD
export const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getQueue = async (): Promise<Record<string, QueueItem>> => {
  try {
    const { data, error } = await supabase
      .from('quotes_queue')
      .select('*');

    if (error) {
      console.error("Supabase fetch error:", error);
      return {};
    }

    const queue: Record<string, QueueItem> = {};
    data.forEach((row: any) => {
      queue[row.date] = {
        date: row.date,
        status: row.status as QuoteStatus,
        data: row.data
      };
    });
    
    return queue;
  } catch (e) {
    console.error("Erro ao buscar fila do Supabase", e);
    return {};
  }
};

export const getQuoteForDate = async (date: Date): Promise<InspirationQuote | null> => {
  try {
    const key = formatDateKey(date);
    
    // Primeiro verificamos se já temos essa data no cache local para performance
    // Mas como é uma operação crítica de leitura, vamos ao banco
    const { data, error } = await supabase
      .from('quotes_queue')
      .select('*')
      .eq('date', key)
      .single();

    if (error) {
      // Erro PGRST116 significa nenhum resultado encontrado, o que é normal
      if (error.code !== 'PGRST116') console.error("Erro ao buscar frase do dia:", error);
      return null;
    }
    
    if (data && data.status === 'approved' && data.data) {
      return data.data as InspirationQuote;
    }
    
    return null;
  } catch (e) {
    console.error("Erro geral ao buscar frase", e);
    return null;
  }
};

export const updateQueueItem = async (date: Date, status: QuoteStatus, data?: InspirationQuote) => {
  const key = formatDateKey(date);
  
  const payload = {
    date: key,
    status: status,
    data: data || null // Supabase aceita JSON null
  };

  try {
    const { error } = await supabase
      .from('quotes_queue')
      .upsert(payload);

    if (error) {
      throw error;
    }
  } catch (e) {
    console.error("Erro ao salvar no Supabase", e);
    alert("Erro de conexão ao salvar. Verifique sua internet.");
    throw e;
  }
};