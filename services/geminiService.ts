import { GoogleGenAI, Type } from "@google/genai";
import { InspirationQuote } from "../types";

// Helper para obter a chave de API do Gemini de forma segura
const getApiKey = (): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    return import.meta.env.VITE_API_KEY;
  }
  return undefined;
};

// Helper para obter a chave da ElevenLabs
const getElevenLabsKey = (): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ELEVENLABS_API_KEY) {
    return import.meta.env.VITE_ELEVENLABS_API_KEY;
  }
  return undefined;
};

export const fetchDailyInspiration = async (excludeAuthors: string[] = []): Promise<InspirationQuote> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("FATAL: API Key não encontrada no ambiente.");
    throw new Error("Chave de API do Gemini não configurada no sistema.");
  }

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

  const blacklistStr = excludeAuthors.length > 0 
    ? excludeAuthors.map(a => `"${a}"`).join(", ") 
    : "Nenhuma";

  const prompt = `
    ATUE COMO: Curador especialista em literatura feminina mundial e história das mulheres.
    OBJETIVO: Gerar uma frase inspiradora autêntica de uma mulher notável.
    PARÂMETROS GERAIS:
    - Tema: ${randomTheme}
    - Seed de Aleatoriedade: ${randomSeed}
    - Idioma: Português do Brasil (pt-BR).
    REGRAS CRÍTICAS (Siga rigorosamente):
    1. **BLACKLIST (PROIBIDO USAR)**: As seguintes autoras já foram usadas recentemente e NÃO podem ser repetidas: [${blacklistStr}].
    2. **VERACIDADE**: A frase deve ser real. Não invente frases. Se não tiver certeza absoluta da autoria, escolha outra.
    3. **DIVERSIDADE**: Busque ativamente mulheres da África, Ásia, América Latina (além do Brasil), Oriente Médio e Indígenas. Evite focar apenas em EUA/Europa.
    4. **FORMATO**: Frase CURTA e impactante (máximo 2 orações). Perfeita para redes sociais.
    SAÍDA ESPERADA (JSON Puro):
    {
      "quote": "A frase em português.",
      "author": "Nome da Mulher",
      "role": "Profissão ou Papel (ex: Ativista, Poeta, Cientista)",
      "country": "País de Origem"
    }
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
        temperature: 1.0, 
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Gemini não retornou texto");

    const result = JSON.parse(jsonText) as InspirationQuote;
    return result;

  } catch (error: any) {
    const errorMsg = error?.toString() || JSON.stringify(error);
    
    if (errorMsg.includes("403") || errorMsg.includes("leaked") || errorMsg.includes("PERMISSION_DENIED")) {
        console.error("BLOCK: Chave de API bloqueada pelo Google.");
        throw new Error("⚠️ ERRO CRÍTICO: Sua Chave de API do Gemini foi bloqueada pelo Google. Gere uma nova chave no AI Studio e atualize no Cloudflare.");
    }
    
    console.error("Erro Gemini:", error);
    
    return {
      quote: "Pés, para que os quero, se tenho asas para voar?",
      author: "Frida Kahlo",
      role: "Pintora",
      country: "México"
    };
  }
};

// Função atualizada para usar ElevenLabs
export const fetchQuoteAudio = async (text: string): Promise<string | null> => {
  try {
    const apiKey = getElevenLabsKey();
    
    if (!apiKey) {
      console.error("ElevenLabs API Key não configurada.");
      alert("⚠️ Chave da ElevenLabs não configurada. Adicione VITE_ELEVENLABS_API_KEY no Cloudflare.");
      return null;
    }

    // ID da voz "Rachel" (Feminina, Americana, mas funciona bem em pt-BR com o modelo multilingual)
    // Outra opção boa: "Bella" (EXAVITQu4vr4xnSDxMaL)
    const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2", // Essencial para falar Português corretamente
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorDetail = await response.json();
      console.error("Erro ElevenLabs:", errorDetail);
      if (response.status === 401) {
        alert("⚠️ Erro de Autenticação ElevenLabs. Verifique sua chave API.");
      }
      return null;
    }

    // ElevenLabs retorna o binário do MP3. Convertemos para Base64 para tocar no front.
    const arrayBuffer = await response.arrayBuffer();
    const base64String = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return base64String;

  } catch (error: any) {
    console.error("Erro Audio ElevenLabs:", error);
    return null;
  }
};