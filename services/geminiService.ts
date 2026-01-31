
import { GoogleGenAI, Type, GenerateContentResponse, Modality, FunctionDeclaration } from "@google/genai";
import { MODELS } from "../constants";

export const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Wrapper for API calls to handle key selection errors and race conditions.
 */
const handleApiError = (error: any) => {
  console.error("Gemini API Error:", error);
  if (error?.message?.includes("Requested entity was not found.")) {
    // If the key is invalid or lost, force the user to re-select
    if (window.aistudio) {
      window.aistudio.openSelectKey();
    }
  }
  throw error;
};

export const generateReasoningResponse = async (prompt: string, thinkingBudget: number = 32768) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: MODELS.REASONING,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget }
      }
    });
    return response;
  } catch (e) {
    return handleApiError(e);
  }
};

export const analyzeKohaData = async (rawReport: string) => {
  try {
    const ai = getAIClient();
    const prompt = `
      Act as a Senior Library Data Scientist for Library 5.0. 
      Analyze the following raw data extracted from a Koha ILS report:
      
      DATA:
      "${rawReport}"
      
      Provide:
      1. Operational Health Score (0-100).
      2. Identification of 3 key trends.
      3. 3 Strategic Recommendations.
      4. A summary of potential data anomalies.
    `;

    const response = await ai.models.generateContent({
      model: MODELS.REASONING,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16000 }
      }
    });
    return response;
  } catch (e) {
    return handleApiError(e);
  }
};

export const generateSearchGroundedResponse = async (prompt: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response;
  } catch (e) {
    return handleApiError(e);
  }
};

export const generateMapsGroundedResponse = async (prompt: string, location?: { latitude: number, longitude: number }) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: location ? {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          }
        } : undefined
      },
    });
    return response;
  } catch (e) {
    return handleApiError(e);
  }
};

export const discoverOpenResources = async (query: string, searchZitesclic: boolean = false, includePaid: boolean = false) => {
  try {
    const ai = getAIClient();
    let scopeInstruction = "";
    
    if (searchZitesclic) {
        scopeInstruction = "Specifically focus on resources from the Zimbabwe Tertiary Education Strategic Library Consortium (ZITESCLIC), Zimbabwean university repositories (UZ, NUST, MSU, etc.), and African journals online.";
    } else if (includePaid) {
        scopeInstruction = "Find high-impact academic resources, prioritizing paid subscription databases (ProQuest, JSTOR, EBSCO, ScienceDirect, IEEE Xplore) and major commercial journals. Mark them as 'Subscription'.";
    } else {
        scopeInstruction = "Find global open access academic resources.";
    }

    const prompt = `${scopeInstruction} Find 5 academic resources for: ${query}. Format as JSON list. Include an 'isZitesclic' boolean field based on the source origin. Include an 'accessType' field which is either 'Open Access' or 'Subscription'.`;
    
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              type: { type: Type.STRING },
              category: { type: Type.STRING },
              author: { type: Type.STRING }, 
              year: { type: Type.STRING },
              isZitesclic: { type: Type.BOOLEAN },
              accessType: { type: Type.STRING }
            },
            required: ["title", "url", "type", "category", "isZitesclic", "accessType"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return handleApiError(e);
  }
};

export const searchResourcesFunctionDeclaration: FunctionDeclaration = {
  name: 'find_academic_resources',
  parameters: {
    type: Type.OBJECT,
    description: 'Find academic resources by topic.',
    properties: {
      topic: {
        type: Type.STRING,
        description: 'The research topic to find resources for.',
      },
    },
    required: ['topic'],
  },
};

export const filterResourcesFunctionDeclaration: FunctionDeclaration = {
  name: 'filter_academic_resources',
  parameters: {
    type: Type.OBJECT,
    description: 'Filter existing academic resources.',
    properties: {
      resourceType: {
        type: Type.STRING,
        description: 'Type of resource (Journal, eBook, Archive, Database).',
      },
    },
  },
};

export const summarizeDiscussion = async (topic: string, messages: any[]) => {
  try {
    const ai = getAIClient();
    const messageThread = messages.map(m => `${m.sender}: ${m.content}`).join('\n');
    const prompt = `Topic: "${topic}"\n\nThread History:\n${messageThread}\n\nAct as a Scholarly Moderator. Provide a synthesized insight.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: prompt,
    });
    return response.text;
  } catch (e) {
    return handleApiError(e);
  }
};

export const extractMetadataFromAsset = async (fileName: string, fileSize: number) => {
  try {
    const ai = getAIClient();
    const prompt = `Analyze file context: ${fileName} (${fileSize} bytes). Provide bibliographic metadata.`;

    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            category: { type: Type.STRING },
            ddc: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["title", "author", "ddc"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return handleApiError(e);
  }
};

export const generateImage = async (prompt: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: MODELS.IMAGE,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) {
    return handleApiError(e);
  }
};

export const generateVideo = async (prompt: string, onStatusUpdate?: (status: string) => void) => {
  try {
    const ai = getAIClient();
    let operation = await ai.models.generateVideos({
      model: MODELS.VIDEO,
      prompt: prompt,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return handleApiError(e);
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: MODELS.TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    return handleApiError(e);
  }
};

export function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
export function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}
export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
