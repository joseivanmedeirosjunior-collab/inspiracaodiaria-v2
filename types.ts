export interface InspirationQuote {
  quote: string;
  author: string;
  role: string; // e.g., "Escritora Brasileira" or "Cientista Polonesa"
  country: string;
}

export interface DailyData {
  date: string;
  data: InspirationQuote;
}

export type QuoteStatus = 'empty' | 'draft' | 'approved';

export interface QueueItem {
  date: string; // ISO Date string YYYY-MM-DD
  status: QuoteStatus;
  data?: InspirationQuote;
}
