import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InspirationQuote } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchDailyInspiration = async (): Promise<InspirationQuote> => {
  // Usamos um modelo mais capaz se disponível, ou o flash para rapidez
  const modelId = "gemini-2.5-flash";
  
  // Lista de temas para forçar variedade e evitar sempre as mesmas autoras
  const themes = [
    "Ciência, Tecnologia e Inovação",
    "Literatura Africana ou Asiática",
    "Ativismo Social e Direitos Humanos",
    "Artes Plásticas e Cinema",
    "Filosofia e Pensamento Crítico",
    "Liderança Política e Diplomacia",
    "Esporte e Superação",
    "Empreendedorismo e Negócios",
    "Poesia Latino-americana",
    "História Antiga e Medieval"
  ];

  // Seleciona um tema aleatório para esta requisição
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  
  // Adiciona um fator aleatório para evitar cache semântico
  const randomSeed = Math.floor(Math.random() * 1000000);

  const prompt = `
    Tarefa: Encontrar uma frase AUTÊNTICA e VERDADEIRA de uma mulher histórica ou contemporânea.
    
    CONTEXTO OBRIGATÓRIO DESTA BUSCA:
    Foco Temático: ${randomTheme}
    Seed Aleatório: ${randomSeed} (Use isso para gerar algo diferente da última vez)

    Requisitos RÍGIDOS:
    1. A autora deve ser mulher.
    2. VERACIDADE: A frase deve ser realmente da autora. NÃO atribua frases genéricas de internet a autoras famosas. Se tiver dúvida, escolha outra autora.
    3. DIVERSIDADE: Evite as autoras óbvias que aparecem sempre (como apenas Clarice Lispector ou Frida Kahlo). Busque vozes novas ou menos citadas dentro do tema "${randomTheme}".
    4. A frase deve ser traduzida para o Português (Brasil) mantendo o sentido original.
    5. Identifique a profissão e o país.

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
              description: "A frase inspiradora autêntica em português."
            },
            author: {
              type: Type.STRING,
              description: "Nome correto da autora."
            },
            role: {
              type: Type.STRING,
              description: "Papel da autora (ex: Astrônoma, Poeta, Líder Indígena)."
            },
            country: {
              type: Type.STRING,
              description: "País de origem."
            }
          },
          required: ["quote", "author", "role", "country"],
        },
        temperature: 1.0, // Aumentado para garantir máxima criatividade e variedade
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
    // Fallback quote
    return {
      quote: "Eu não sou livre enquanto alguma mulher não o for, mesmo quando as correntes dela forem muito diferentes das minhas.",
      author: "Audre Lorde",
      role: "Escritora e Ativista",
      country: "EUA"
    };
  }
};

export const fetchQuoteAudio = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: text }],
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Voz feminina natural
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