import { InspirationQuote } from "../types";

const OPENAI_API_URL = "https://api.openai.com/v1";

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

export const isOpenAIApiConfigured = (): boolean => !!getApiKey();

export const fetchDailyInspiration = async (excludeAuthors: string[] = []): Promise<InspirationQuote> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error("FATAL: OpenAI API Key não encontrada. Configure VITE_OPENAI_API_KEY.");
    throw new Error("Chave OpenAI ausente.");
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

  const exclusionInstruction = excludeAuthors.length > 0
    ? `Importante: não use estas autoras: ${excludeAuthors.join(", ")}.`
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
        content: "Você gera frases curtas, poderosas e motivacionais em português do Brasil, sempre atribuídas a mulheres reais."
      },
      {
        role: "user" as const,
        content: `Tarefa: gerar uma frase curta e motivacional de uma mulher inspiradora.\nTema: ${randomTheme}\nSeed: ${randomSeed}\n${exclusionInstruction}\nRequisitos: 1) máximo de 2 orações; 2) autora mulher com país e papel; 3) português do Brasil; 4) responda apenas com JSON válido.`
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
      throw new Error(`OpenAI retornou ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) throw new Error("Resposta vazia da OpenAI");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return parsed as InspirationQuote;
  } catch (error) {
    console.error("Erro OpenAI (texto):", error);

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

    return fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  }
};

export const fetchQuoteAudio = async (text: string): Promise<string | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${OPENAI_API_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text,
        voice: "alloy",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI TTS retornou ${response.status}: ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error("Erro OpenAI (áudio):", error);
    return null;
  }
};
