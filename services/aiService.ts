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

const normalize = (text?: string | null): string => (text || "").toLowerCase().replace(/\s+/g, " ").trim();

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

  return (
    (!!normalizedQuote && quotesSet.has(normalizedQuote)) ||
    (!!normalizedAuthor && authorsSet.has(normalizedAuthor))
  );
};

export const fetchDailyInspiration = async (
  excludeAuthors: string[] = [],
  excludeQuotes: string[] = [],
  attempt = 0
): Promise<InspirationQuote> => {
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

  const uniqueAuthors = Array.from(new Set(excludeAuthors.map(normalize).filter(Boolean)));
  const uniqueQuotes = Array.from(new Set(excludeQuotes.map(normalize).filter(Boolean)));

  const maxItems = 50;
  const authorsList = uniqueAuthors.slice(-maxItems).join(", ");
  const quotesList = uniqueQuotes.slice(-maxItems).join(" | ");

  const authorInstruction = authorsList
    ? `Importante: não use estas autoras já usadas ou semelhantes: ${authorsList}.`
    : "";

  const quoteInstruction = quotesList
    ? `Evite repetir frases iguais ou muito parecidas com estas: ${quotesList}.`
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
        content: `Tarefa: gerar uma frase curta e motivacional de uma mulher inspiradora.\nTema: ${randomTheme}\nSeed: ${randomSeed}\n${authorInstruction}\n${quoteInstruction}\nRequisitos: 1) máximo de 2 orações; 2) autora mulher com país e papel; 3) português do Brasil; 4) responda apenas com JSON válido.`
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
