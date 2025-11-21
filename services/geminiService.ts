import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InspirationQuote } from "../types";

// Identifica placeholders comuns de build que não devem ser usados como chave real
const isPlaceholder = (value: string | undefined): boolean => {
  if (!value) return true;
  const normalized = value.trim();
  return normalized === '' || normalized.includes('VITE_API_KEY') || normalized.includes('%');
};

// Helper para obter a chave de API de forma segura
const getApiKey = (): string | undefined => {
  // 1) Build-time via Vite (Cloudflare Pages)
  if (typeof import.meta !== 'undefined' && !isPlaceholder(import.meta.env?.VITE_API_KEY)) {
    return import.meta.env.VITE_API_KEY;
  }

  // 2) Fallback para builds que expõem VITE_API_KEY em process.env (alguns runners)
  if (typeof process !== 'undefined' && !isPlaceholder(process.env?.VITE_API_KEY)) {
    return process.env.VITE_API_KEY;
  }

  // 3) Fallback para builds antigos/local (chave sem prefixo VITE)
  if (typeof process !== 'undefined' && !isPlaceholder(process.env?.API_KEY)) {
    return process.env.API_KEY;
  }

  // 4) Fallback de emergência: meta tag no index.html (preenchida no build do Pages)
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="vite-api-key"]');
    const content = meta?.getAttribute('content') || undefined;
    if (!isPlaceholder(content)) return content;
  }

  return undefined;
};

// Exposto para o painel Admin conseguir exibir um aviso claro quando a chave faltar
export const isGeminiApiConfigured = (): boolean => !!getApiKey();

export const fetchDailyInspiration = async (excludeAuthors: string[] = []): Promise<InspirationQuote> => {
  const apiKey = getApiKey();
  
  // Debug Log (não mostra a chave inteira, apenas se existe)
  console.log("Gemini Service - API Key detectada:", !!apiKey);
  
  if (!apiKey) {
    console.error("FATAL: API Key não encontrada. Verifique o painel do Cloudflare.");
    throw new Error("Chave de API não configurada no sistema.");
  }

  // Inicialização Lazy
  const ai = new GoogleGenAI({ apiKey });
  const modelId = "gemini-2.5-flash";
  
  const themes = [
    "Autoestima e Amor Próprio Radical",
    "Coragem para Quebrar Padrões",
    "Resiliência e Superação de Desafios",
    "Liderança Feminina e Ambição",
    "Sororidade e Apoio entre Mulheres",
    "Independência e Liberdade",
    "Força Interior e Espiritualidade",
    "Alegria de Viver e Ousadia"
  ];

  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const randomSeed = Math.floor(Math.random() * 1000000);

  const exclusionInstruction = excludeAuthors.length > 0
    ? `IMPORTANTE: NÃO utilize estas autoras: ${excludeAuthors.join(", ")}.`
    : "";

  const prompt = `
    Tarefa: Frase CURTA e MOTIVACIONAL de uma mulher inspiradora.
    Tema: ${randomTheme}
    Seed: ${randomSeed}
    ${exclusionInstruction}

    Requisitos:
    1. Frase CURTA (max 2 orações).
    2. Autora mulher.
    3. Português do Brasil.
    4. JSON Output.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING },
            author: { type: Type.STRING },
            role: { type: Type.STRING },
            country: { type: Type.STRING }
          },
          required: ["quote", "author", "role", "country"],
        },
        temperature: 1.2,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Gemini não retornou texto");

    return JSON.parse(jsonText) as InspirationQuote;

  } catch (error) {
    console.error("Erro Gemini:", error);
    // Fallback seguro
    return {
      quote: "Pés, para que os quero, se tenho asas para voar?",
      author: "Frida Kahlo",
      role: "Pintora",
      country: "México"
    };
  }
};

export const fetchQuoteAudio = async (text: string): Promise<string | null> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("Erro Audio:", error);
    return null;
  }
};