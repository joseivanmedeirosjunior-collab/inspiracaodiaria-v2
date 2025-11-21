import { GoogleGenAI } from "@google/genai";

import { InspirationQuote } from "../types";

const OPENAI_API_URL = "https://api.openai.com/v1";
const DEFAULT_AUTHOR = "JURO";
const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";

const decodeBase64Audio = (
  base64: string | undefined,
  mimeType: string = "audio/mpeg"
): string | null => {
  if (!base64) return null;

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Falha ao decodificar áudio base64", error);
    return null;
  }
};

let quotaTemporarilyBlocked = false;
let lastQuotaBlockAt: number | null = null;
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos

export const isQuotaBlocked = () => {
  refreshQuotaBlockIfExpired();
  return quotaTemporarilyBlocked;
};

const refreshQuotaBlockIfExpired = () => {
  if (quotaTemporarilyBlocked && lastQuotaBlockAt) {
    const elapsed = Date.now() - lastQuotaBlockAt;
    if (elapsed > QUOTA_COOLDOWN_MS) {
      quotaTemporarilyBlocked = false;
      lastQuotaBlockAt = null;
    }
  }
};

const markQuotaBlocked = () => {
  quotaTemporarilyBlocked = true;
  lastQuotaBlockAt = Date.now();
};

export const resetQuotaBlock = () => {
  quotaTemporarilyBlocked = false;
  lastQuotaBlockAt = null;
};

export class QuotaExceededError extends Error {
  fallback?: InspirationQuote;

  constructor(message: string, fallback?: InspirationQuote) {
    super(message);
    this.name = "QuotaExceededError";
    this.fallback = fallback;
  }
}

const isPlaceholder = (value: string | undefined): boolean => {
  if (!value) return true;
  const normalized = value.trim();
  return normalized === "" || normalized.includes("VITE_OPENAI_API_KEY") || normalized.includes("VITE_API_KEY") || normalized.includes("%" );
};

const getApiKey = (): string | undefined => {
  if (typeof import.meta !== "undefined") {
    const inlineKey = import.meta.env?.VITE_OPENAI_API_KEY || import.meta.env?.VITE_API_KEY;
    if (!isPlaceholder(inlineKey)) return inlineKey;
  }

  if (typeof process !== "undefined") {
    const processKey = process.env?.VITE_OPENAI_API_KEY || process.env?.OPENAI_API_KEY || process.env?.VITE_API_KEY;
    if (!isPlaceholder(processKey)) return processKey;
  }

  return undefined;
};

const getGeminiApiKey = (): string | undefined => {
  if (typeof import.meta !== "undefined") {
    const inlineKey =
      import.meta.env?.VITE_API_KEY ||
      import.meta.env?.VITE_GEMINI_API_KEY ||
      import.meta.env?.GEMINI_API_KEY;
    if (!isPlaceholder(inlineKey)) return inlineKey;
  }

  if (typeof process !== "undefined") {
    const processKey =
      process.env?.VITE_API_KEY ||
      process.env?.VITE_GEMINI_API_KEY ||
      process.env?.GEMINI_API_KEY ||
      process.env?.GOOGLE_API_KEY;
    if (!isPlaceholder(processKey)) return processKey;
  }

  return undefined;
};

export const isOpenAIApiConfigured = (): boolean => !!getApiKey();

const normalize = (text?: string | null): string =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const isInspirationQuote = (value: any): value is InspirationQuote => {
  return (
    value &&
    typeof value.quote === "string" &&
    typeof value.author === "string" &&
    typeof value.role === "string" &&
    typeof value.country === "string"
  );
};

const parseInspirationContent = (content: unknown): InspirationQuote => {
  if (!content) throw new Error("Resposta vazia da OpenAI");

  // 1) Conteúdo já como objeto
  if (typeof content === "object" && !Array.isArray(content) && isInspirationQuote(content)) {
    return content;
  }

  // 2) Conteúdo string com JSON
  if (typeof content === "string") {
    return JSON.parse(content) as InspirationQuote;
  }

  // 3) Conteúdo como lista (novo formato chat/completions com response_format)
  if (Array.isArray(content)) {
    const textChunk = content.find((chunk) =>
      typeof chunk === "object" && chunk !== null && "text" in (chunk as any)
    ) as { text?: string } | undefined;

    const text = textChunk?.text || content.map((c: any) => c?.text || "").join("");
    if (!text) throw new Error("Resposta vazia da OpenAI");
    return JSON.parse(text) as InspirationQuote;
  }

  throw new Error("Formato de resposta inesperado da OpenAI");
};

export const isDuplicateQuote = (
  quote: InspirationQuote,
  excludeAuthors: string[],
  excludeQuotes: string[]
): boolean => {
  const normalizedQuote = normalize(quote.quote);
  const normalizedAuthor = normalize(quote.author);

  const authorsSet = new Set(excludeAuthors.map(normalize).filter(Boolean));
  const quotesSet = new Set(excludeQuotes.map(normalize).filter(Boolean));

  const authorIsDefault = normalizedAuthor === normalize(DEFAULT_AUTHOR);

  return (
    (!!normalizedQuote && quotesSet.has(normalizedQuote)) ||
    (!authorIsDefault && !!normalizedAuthor && authorsSet.has(normalizedAuthor))
  );
};

export const generateFallbackQuote = (
  excludeAuthors: string[] = [],
  excludeQuotes: string[] = []
): InspirationQuote => {
  const fallbackPool: InspirationQuote[] = [
    {
      quote: "Pés, para que os quero, se tenho asas para voar?",
      author: "Frida Kahlo",
      role: "Pintora",
      country: "México",
    },
    {
      quote: "Eu sou feita de cicatrizes, mas caminho com elegância.",
      author: "Conceição Evaristo",
      role: "Escritora",
      country: "Brasil",
    },
    {
      quote: "Ninguém pode fazer você se sentir inferior sem o seu consentimento.",
      author: "Eleanor Roosevelt",
      role: "Diplomata",
      country: "Estados Unidos",
    },
    {
      quote: "A liberdade é uma luta constante, mas a vitória é doce.",
      author: "Angela Davis",
      role: "Filósofa",
      country: "Estados Unidos",
    },
  ];

  const filteredFallbacks = fallbackPool.filter(
    (item) => !isDuplicateQuote(item, excludeAuthors, excludeQuotes)
  );

  const poolToUse = filteredFallbacks.length > 0 ? filteredFallbacks : fallbackPool;
  return poolToUse[Math.floor(Math.random() * poolToUse.length)];
};

export const fetchDailyInspiration = async (
  excludeAuthors: string[] = [],
  excludeQuotes: string[] = [],
  attempt = 0
): Promise<InspirationQuote> => {
  const apiKey = getApiKey();

  refreshQuotaBlockIfExpired();

  if (!apiKey || quotaTemporarilyBlocked) {
    if (!apiKey) {
      console.warn("OpenAI API Key ausente. Retornando fallback local.");
    } else if (quotaTemporarilyBlocked) {
      console.warn("OpenAI temporariamente bloqueado por cota. Usando fallback local.");
    }

    return generateFallbackQuote(excludeAuthors, excludeQuotes);
  }

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

  const uniqueAuthors = Array.from(new Set(excludeAuthors.map(normalize).filter(Boolean)));
  const uniqueQuotes = Array.from(new Set(excludeQuotes.map(normalize).filter(Boolean)));

  const sanitizedAuthors = uniqueAuthors.filter((author) => normalize(author) !== normalize(DEFAULT_AUTHOR));

  const maxItems = 200;
  const authorsList = sanitizedAuthors.slice(-maxItems).join(", ");
  const quotesList = uniqueQuotes.slice(-maxItems).join(" | ");

  const authorInstruction = authorsList
    ? `Evite repetir ou citar novamente estas autoras já usadas: ${authorsList}.`
    : "";

  const quoteInstruction = quotesList
    ? `Evite repetir frases iguais ou muito parecidas com estas já usadas: ${quotesList}.`
    : "";

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0.9,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "inspiration_quote",
        strict: true,
        schema: {
          type: "object",
          properties: {
            quote: { type: "string" },
            author: { type: "string" },
            role: { type: "string" },
            country: { type: "string" }
          },
          required: ["quote", "author", "role", "country"],
          additionalProperties: false
        }
      }
    },
    messages: [
      {
        role: "system" as const,
        content:
          "Você é uma roteirista e ghostwriter brasileira chamada JURO. Gere frases inéditas, curtas e poderosas em português do Brasil, sempre com autoria fixa JURO (mulher brasileira). Mantenha autenticidade, evite clichês e jamais repita frases ou reformule textos já usados."
      },
      {
        role: "user" as const,
        content: `Tarefa: gerar uma frase curta, original e motivacional assinada por JURO.\nTema: ${randomTheme}\nSeed: ${randomSeed}\n${authorInstruction}\n${quoteInstruction}\nRequisitos obrigatórios: 1) máx. 2 orações; 2) autora = JURO (mulher brasileira), inclua papel/ocupação coerente e país Brasil; 3) texto em português do Brasil; 4) responda apenas com JSON válido. Evite qualquer repetição ou reescrita de frases já usadas.`
      }
    ]
  };

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const fallback = generateFallbackQuote(excludeAuthors, excludeQuotes);
      const isQuotaError =
        response.status === 429 ||
        errorText.toLowerCase().includes("insufficient_quota") ||
        errorText.toLowerCase().includes("billing") ||
        errorText.toLowerCase().includes("quota");

      if (isQuotaError) {
        markQuotaBlocked();
        throw new QuotaExceededError(
          `OpenAI retornou ${response.status}: ${errorText}`,
          fallback
        );
      }

      throw new Error(`OpenAI retornou ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    const quote = parseInspirationContent(content);

    // Se a frase ou autora já foram usados, tenta uma nova rodada (até 3 vezes)
    if (isDuplicateQuote(quote, excludeAuthors, excludeQuotes) && attempt < 2) {
      const nextAuthors = [...excludeAuthors, quote.author];
      const nextQuotes = [...excludeQuotes, quote.quote];
      return fetchDailyInspiration(nextAuthors, nextQuotes, attempt + 1);
    }

    return quote;
  } catch (error) {
    console.error("Erro OpenAI (texto):", error);

    if (error instanceof QuotaExceededError && error.fallback) {
      markQuotaBlocked();
      return error.fallback;
    }

    return generateFallbackQuote(excludeAuthors, excludeQuotes);
  }
};

export const fetchQuoteAudio = async (text: string): Promise<string | null> => {
  refreshQuotaBlockIfExpired();

  // Tenta apenas com Gemini (voz Kore)
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const request: any = {
        model: GEMINI_TTS_MODEL,
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseMimeType: "audio/mp3",
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      };

      const response = await ai.models.generateContent(request);

      const inlineData = response?.candidates?.[0]?.content?.parts?.find(
        (part: any) => part?.inlineData?.data
      )?.inlineData;

      const audioUrl = decodeBase64Audio(
        inlineData?.data,
        inlineData?.mimeType || "audio/mpeg"
      );

      if (audioUrl) {
        return audioUrl;
      }
    } catch (error) {
      console.error("Erro Gemini (áudio):", error);
    }
  }

  return null;
};
