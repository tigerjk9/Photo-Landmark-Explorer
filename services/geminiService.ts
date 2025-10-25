import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GroundingSource, LandmarkInfo } from '../types';

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getApiKey = (): string => {
    const apiKey = process.env.API_KEY as string;
    if (!apiKey) {
        throw new Error("API_KEY가 환경 변수에 설정되지 않았습니다.");
    }
    return apiKey;
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const identifyLandmark = async (imageFile: File): Promise<LandmarkInfo> => {
    const ai = getAi();
    const imagePart = await fileToGenerativePart(imageFile);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                imagePart,
                { text: "이 사진 속 랜드마크를 식별해주세요. 이름, 도시, 국가, 그리고 정확한 위도와 경도를 포함한 JSON 형식으로 응답해주세요." },
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "랜드마크의 이름" },
                    city: { type: Type.STRING, description: "랜드마크가 위치한 도시" },
                    country: { type: Type.STRING, description: "랜드마크가 위치한 국가" },
                    latitude: { type: Type.NUMBER, description: "위도" },
                    longitude: { type: Type.NUMBER, description: "경도" },
                },
                required: ["name", "city", "country", "latitude", "longitude"],
            },
        },
    });
    return JSON.parse(response.text);
};

export const fetchLandmarkHistory = async (landmarkName: string): Promise<{ text: string; sources: GroundingSource[] }> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `청소년이 이해하기 쉽게 ${landmarkName}의 역사에 대해 설명해줘. 가장 중요한 사실 위주로 3~4문장으로 요약하고, 친근한 말투를 사용해줘. 답변에 ** 같은 마크다운 서식은 절대 사용하지 마.`,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    
    const sources: GroundingSource[] = groundingChunks
        .filter(chunk => chunk.web?.uri && chunk.web.title)
        .map(chunk => ({
            web: {
                uri: chunk.web!.uri!,
                title: chunk.web!.title!,
            }
        }));

    // FIX: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.
    return { text: response.text.replace(/\*\*/g, ''), sources };
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `다음 텍스트를 명확하고 매력적인 다큐멘터리 스타일의 목소리로 읽어주세요: ${text}` }] }],
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
    if (!base64Audio) {
        throw new Error("오디오 데이터를 응답에서 찾을 수 없습니다.");
    }
    return base64Audio;
};

export const askQuestion = async (landmarkName: string, history: string, question: string): Promise<string> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `당신은 청소년을 위한 박물관 도슨트입니다. 아래 랜드마크 정보와 역사를 바탕으로 사용자의 질문에 쉽고 친근하게 답변해주세요. 답변은 짧고 명확해야 하며, ** 같은 마크다운 서식은 절대 사용하지 마세요.
        랜드마크: ${landmarkName}
        알려진 역사: ${history}
        사용자 질문: ${question}`,
    });
    // FIX: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.
    return response.text.replace(/\*\*/g, '');
};

export const generateArtwork = async (imageFile: File, style: string): Promise<string> => {
    const ai = getAi();
    const imagePart = await fileToGenerativePart(imageFile);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                imagePart,
                { text: `이 이미지를 ${style} 스타일의 아름다운 예술 작품으로 재창조해주세요.` },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates?.[0].content.parts ?? []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("생성된 아트워크 이미지를 찾을 수 없습니다.");
};


export const fetchFunFact = async (landmarkName: string): Promise<string> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${landmarkName}에 대한 흥미로운 사실을 청소년이 좋아할 만하게 한 가지 알려줘. 짧고 재미있게, 그리고 ** 같은 마크다운은 빼고 말해줘.`,
    });
    // FIX: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.
    return response.text.replace(/\*\*/g, '');
};
