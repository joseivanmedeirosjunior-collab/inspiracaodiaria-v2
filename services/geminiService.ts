
import { GoogleGenAI, Type } from "@google/genai";
import { InspirationQuote } from "../types";

export const fetchDailyInspiration = async (excludeAuthors: string[] = []): Promise<InspirationQuote> => {
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;
  
  if (!apiKey) {
    throw new Error("Chave de API não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  const themes = [
    "Autoestima e Amor Próprio",
    "Coragem para Quebrar Padrões",
    "Resiliência e Superação",
    "Liderança Feminina",
    "Sororidade",
    "Independência",
    "Força Interior",
    "Alegria de Viver"
  ];

  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const blacklistStr = excludeAuthors.length > 0 ? excludeAuthors.join(", ") : "Nenhuma";

  const prompt = `
    Gere uma frase inspiradora REAL de uma mulher notável da história ou atualidade.
    Tema: ${randomTheme}.
    NÃO USE estas autoras: [${blacklistStr}].
    Busque diversidade (América Latina, África, Ásia).
    Retorne apenas o JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
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
      },
    });

    return JSON.parse(response.text) as InspirationQuote;
  } catch (error) {
    console.error("Erro Gemini:", error);
    return {
      quote: "Pés, para que os quero, se tenho asas para voar?",
      author: "Frida Kahlo",
      role: "Pintora",
      country: "México"
    };
  }
};

export const fetchQuoteAudio = async (text: string): Promise<string | null> => {
  const apiKey = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
      method: "POST",
      headers: { "Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
    });

    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
  } catch { return null; }
};
