import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InspirationQuote } from "../types";

export const fetchDailyInspiration = async (excludeAuthors: string[] = []): Promise<InspirationQuote> => {
  // Initialize client with process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.AIzaSyCZomq2mjDpLPaYn7k6SpQMEQEYhgELCDQ });

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
    ? `IMPORTANTE: Para garantir variedade, NÃO utilize as seguintes autoras (pois já foram usadas recentemente): ${excludeAuthors.join(", ")}.`
    : "";

  const prompt = `
    Tarefa: Encontrar uma frase CURTA, PODEROSA e MOTIVACIONAL de uma mulher inspiradora.
    
    CONTEXTO OBRIGATÓRIO DESTA BUSCA:
    O objetivo é empoderar mulheres, trazer coragem e elevar a autoestima.
    Foco Temático: ${randomTheme}
    Seed Aleatório: ${randomSeed}
    ${exclusionInstruction}

    Requisitos RÍGIDOS:
    1. ESTILO: A frase deve ser CURTA e IMPACTANTE (máximo 1 ou 2 orações). Evite textos longos.
    2. MENSAGEM: Deve transmitir força, coragem, determinação ou amor próprio. Algo que uma mulher leia e sinta vontade de conquistar o mundo.
    3. AUTORA: Apenas mulheres. Tente variar entre clássicas e contemporâneas.
    4. VERACIDADE: A frase deve ser autêntica.
    5. DIVERSIDADE: Busque autoras de diferentes origens, não apenas americanas/europeias.
    6. IDIOMA: Português do Brasil (tradução natural e fluida).

    Saída JSON esperada com: quote, author, role, country.
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
            quote: {
              type: Type.STRING,
              description: "A frase curta e empoderadora em português."
            },
            author: {
              type: Type.STRING,
              description: "Nome da autora."
            },
            role: {
              type: Type.STRING,
              description: "Papel da autora (ex: Escritora, Ativista, Cantora)."
            },
            country: {
              type: Type.STRING,
              description: "País de origem."
            }
          },
          required: ["quote", "author", "role", "country"],
        },
        temperature: 1.2,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No text returned from Gemini");
    }

    const data = JSON.parse(jsonText) as InspirationQuote;
    return data;

  } catch (error) {
    console.error("Error fetching quote from Gemini:", error);
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
    // Initialize client with process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: text }],
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Error generating audio:", error);
    return null;
  }
};
