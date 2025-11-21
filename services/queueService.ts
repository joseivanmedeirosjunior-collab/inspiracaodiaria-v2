import { createClient } from '@supabase/supabase-js';
import { InspirationQuote, QueueItem, QuoteStatus, ReactionType, ReactionCounts } from "../types";

const SUPABASE_URL = 'https://bkhlktxmghmrndhjhyxb.supabase.co';
// Nota: Em produção real, use import.meta.env.VITE_SUPABASE_KEY
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraGxrdHhtZ2htcm5kaGpoeXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTEwOTEsImV4cCI6MjA3OTEyNzA5MX0.nSRYFZDDpRd2-HHN2o9Kd5ImIentHFRJxnGeZONHhaU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const normalize = (text?: string | null): string =>
  (text || "")
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export class DuplicateQuoteError extends Error {
  existingDate?: string;

  constructor(message: string, existingDate?: string) {
    super(message);
    this.name = 'DuplicateQuoteError';
    this.existingDate = existingDate;
  }
}

export const getAllUsedQuotes = async (): Promise<{ authors: string[]; quotes: string[] }> => {
  try {
    const { data, error } = await supabase
      .from('quotes_queue')
      .select('data');

    if (error) {
      console.error("Erro ao buscar todas as frases do Supabase:", error);
      return { authors: [], quotes: [] };
    }

    const authors: string[] = [];
    const quotes: string[] = [];
    const seenAuthors = new Set<string>();
    const seenQuotes = new Set<string>();

    (data || []).forEach((row: any) => {
      const normalizedAuthor = normalize(row?.data?.author);
      const normalizedQuote = normalize(row?.data?.quote);

      if (row?.data?.author && normalizedAuthor && !seenAuthors.has(normalizedAuthor)) {
        seenAuthors.add(normalizedAuthor);
        authors.push(row.data.author);
      }

      if (row?.data?.quote && normalizedQuote && !seenQuotes.has(normalizedQuote)) {
        seenQuotes.add(normalizedQuote);
        quotes.push(row.data.quote);
      }
    });

    return { authors, quotes };
  } catch (e) {
    console.error("Erro geral ao buscar frases usadas", e);
    return { authors: [], quotes: [] };
  }
};

// Helper to format date as YYYY-MM-DD using LOCAL time to avoid timezone issues
export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
        data: row.data,
        reactions: row.reactions
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
    
    const { data, error } = await supabase
      .from('quotes_queue')
      .select('*')
      .eq('date', key)
      .single();

    if (error) {
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

const ensureUniqueQuoteInDatabase = async (quote: string, currentDateKey: string) => {
  const target = normalize(quote);
  if (!target) return;

  try {
    const { data, error } = await supabase
      .from('quotes_queue')
      .select('date, data');

    if (error) {
      console.error('Erro ao validar duplicidade no Supabase:', error);
      return;
    }

    const conflict = (data || []).find((row: any) => {
      const normalizedQuote = normalize(row?.data?.quote);
      return row?.date !== currentDateKey && normalizedQuote && normalizedQuote === target;
    });

    if (conflict) {
      throw new DuplicateQuoteError('Frase já existe no banco', conflict.date);
    }
  } catch (e) {
    if (e instanceof DuplicateQuoteError) {
      throw e;
    }
    console.error('Erro inesperado ao checar duplicidade:', e);
  }
};

export const updateQueueItem = async (date: Date, status: QuoteStatus, data?: InspirationQuote) => {
  const key = formatDateKey(date);

  const payload = {
    date: key,
    status: status,
    data: data || null
  };

  try {
    if (data?.quote) {
      await ensureUniqueQuoteInDatabase(data.quote, key);
    }

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

export const getReactions = async (date: Date): Promise<ReactionCounts> => {
  const key = formatDateKey(date);
  try {
    const { data, error } = await supabase
      .from('quotes_queue')
      .select('reactions')
      .eq('date', key)
      .single();

    if (error || !data) return { love: 0, power: 0, sad: 0 };
    return data.reactions || { love: 0, power: 0, sad: 0 };
  } catch (e) {
    return { love: 0, power: 0, sad: 0 };
  }
};

export const registerReaction = async (date: Date, newType: ReactionType, previousType?: ReactionType | null): Promise<ReactionCounts | null> => {
  const key = formatDateKey(date);
  try {
    // 1. Busca valores atuais
    const { data: currentData, error: fetchError } = await supabase
      .from('quotes_queue')
      .select('reactions, status')
      .eq('date', key)
      .single();

    // Se não existir o dia ainda, cria zerado
    let currentReactions = currentData?.reactions || { love: 0, power: 0, sad: 0 };
    
    // 2. Calcula novos valores
    const updatedReactions = { ...currentReactions };

    // Se tinha um voto anterior, remove ele
    if (previousType && updatedReactions[previousType] > 0) {
        updatedReactions[previousType]--;
    }

    // Adiciona o novo voto
    updatedReactions[newType] = (updatedReactions[newType] || 0) + 1;

    // 3. Salva no banco
    const { error: updateError } = await supabase
      .from('quotes_queue')
      .upsert({
        date: key,
        reactions: updatedReactions,
        status: currentData?.status || 'draft' // Mantém status ou cria
      });

    if (updateError) throw updateError;
    
    return updatedReactions;
  } catch (e) {
    console.error("Erro ao registrar reação", e);
    return null;
  }
};