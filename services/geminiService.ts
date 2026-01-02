
import { GoogleGenAI, Type } from "@google/genai";
import { InspirationQuote } from "../types";

export const fetchDailyInspiration = async (excludeAuthors: string[] = []): Promise<InspirationQuote> => {
  // Inicialização obrigatória via process.env.API_KEY conforme as diretrizes
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Uso do modelo Gemini 3 Flash para melhor performance em tarefas de texto
  const modelName = 'gemini-3-flash-preview';
  
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
    NÃO USE estas autoras (blacklist): [${blacklistStr}].
    Busque diversidade global (foco em América Latina, África e Ásia).
    Retorne estritamente um JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING, description: "A frase inspiradora" },
            author: { type: Type.STRING, description: "Nome da autora" },
            role: { type: Type.STRING, description: "Profissão ou título da autora" },
            country: { type: Type.STRING, description: "País de origem" }
          },
          required: ["quote", "author", "role", "country"],
        },
      },
    });

    return JSON.parse(response.text) as InspirationQuote;
  } catch (error) {
    console.error("Erro na API Gemini:", error);
    // Fallback de segurança caso a cota ou a chave falhe
    return {
      quote: "Nada na vida deve ser temido, somente compreendido. Agora é a hora de compreender mais, para que possamos temer menos.",
      author: "Marie Curie",
      role: "Cientista e Nobel de Física",
      country: "Polônia"
    };
  }
};

export const fetchQuoteAudio = async (text: string): Promise<string | null> => {
  const apiKey = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
      method: "POST",
      headers: { 
        "Accept": "audio/mpeg", 
        "Content-Type": "application/json", 
        "xi-api-key": apiKey 
      },
      body: JSON.stringify({ 
        text, 
        model_id: "eleven_multilingual_v2" 
      }),
    });

    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
  } catch { 
    return null; 
  }
};
