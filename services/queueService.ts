import { InspirationQuote, QueueItem, QuoteStatus } from "../types";

const QUEUE_STORAGE_KEY = 'juro_admin_queue_v1';

// Helper to format date as YYYY-MM-DD
export const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getQueue = (): Record<string, QueueItem> => {
  const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const saveQueue = (queue: Record<string, QueueItem>) => {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

export const getQuoteForDate = (date: Date): InspirationQuote | null => {
  const key = formatDateKey(date);
  const queue = getQueue();
  const item = queue[key];
  
  if (item && item.status === 'approved' && item.data) {
    return item.data;
  }
  return null;
};

export const updateQueueItem = (date: Date, status: QuoteStatus, data?: InspirationQuote) => {
  const key = formatDateKey(date);
  const queue = getQueue();
  
  queue[key] = {
    date: key,
    status,
    data
  };
  
  saveQueue(queue);
};
