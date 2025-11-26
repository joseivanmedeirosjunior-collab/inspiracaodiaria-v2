import { GoogleGenAI, Type } from "@google/genai";
import { InspirationQuote } from "../types";

// Helper genérico para obter variáveis de ambiente de forma segura
const getEnvVar = (key: string): string | undefined => {
  // 1. Tenta Vite (Cloudflare/Produção)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // 2. Tenta process.env (Fallback Local)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}
  
  return undefined;
};

export const fetchDailyInspiration = async (excludeAuthors: string[] = []): Promise<InspirationQuote> => {
  const apiKey = getEnvVar('VITE_API_KEY');
  
  if (!apiKey) {
    console.error("FATAL: API Key não encontrada no ambiente.");
    throw new Error("Chave de API do Gemini não configurada no sistema. Adicione VITE_API_KEY no Cloudflare.");
  }

  // Log de segurança (mostra apenas o prefixo)
  console.log("Gemini Service - API Key detectada:", apiKey ? "Sim (" + apiKey.substring(0, 4) + "...)" : "Não");

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
        throw new Error("⚠️ ERRO CRÍTICO: Sua Chave de API do Gemini foi bloqueada pelo Google (Chave Vazada). Acesse o Cloudflare, troque a variável VITE_API_KEY por uma nova chave e faça o redeploy.");
    }
    
    console.error("Erro Gemini:", error);
    
    // Fallback seguro em caso de erro de conexão
    return {
      quote: "Pés, para que os quero, se tenho asas para voar?",
      author: "Frida Kahlo",
      role: "Pintora",
      country: "México"
    };
  }
};

// Integração ElevenLabs (Modelo Flash v2.5)
export const fetchQuoteAudio = async (text: string): Promise<string | null> => {
  try {
    const apiKey = getEnvVar('VITE_ELEVENLABS_API_KEY');
    
    // Check de Depuração Crítico para o Cloudflare
    if (!apiKey) {
      console.warn("⚠️ ElevenLabs: Chave não encontrada. Se você adicionou no Cloudflare, faça um REDEPLOY/RETRY do build.");
      return null;
    }

    // ID da voz "Rachel" - Voz feminina, clara e popular
    const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 
    
    // Modelo Flash v2.5: Latência ultra-baixa (~75ms) e custo reduzido
    const MODEL_ID = "eleven_flash_v2_5"; 

    console.log(`ElevenLabs: Gerando áudio com modelo ${MODEL_ID}...`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`ElevenLabs Falhou (${response.status}). Usando fallback nativo.`);
      return null; // Retorna null para disparar o fallback
    }

    // ElevenLabs retorna o binário do MP3. Convertemos para Base64 para tocar no front.
    const arrayBuffer = await response.arrayBuffer();
    const base64String = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return base64String;

  } catch (error: any) {
    console.error("Erro Audio ElevenLabs (Catch):", error);
    return null; // Retorna null para disparar o fallback
  }
};