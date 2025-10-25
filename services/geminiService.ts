import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GroundingSource, LandmarkInfo } from '../types';

const getAi = (apiKey: string) => new GoogleGenAI({ apiKey });

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

interface LandmarkIdentificationResponse {
    is_landmark: boolean;
    name: string | null;
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
}

export const identifyLandmark = async (apiKey: string, imageFile: File): Promise<LandmarkInfo> => {
    const ai = getAi(apiKey);
    const imagePart = await fileToGenerativePart(imageFile);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                imagePart,
                { text: `이 이미지에 랜드마크가 있는지 식별해주세요. 당신의 목표는 어떤 경우에도 'LANDMARK_NOT_FOUND' 오류를 피하는 것입니다.
- 이미지가 랜드마크일 가능성이 아주 조금이라도 있다면, 'is_landmark'를 true로 설정하고, 최선의 추측으로 이름, 도시, 국가, 위도, 경도 값을 반드시 제공해주세요.
- 제공하는 모든 필드(name, city, country, latitude, longitude)는 절대 null이 될 수 없습니다.
- 예를 들어, 사진에 특정 건물의 일부만 보여도, 그것이 무엇인지 과감하게 추측해야 합니다.
- 사진이 랜드마크가 아니라고 100% 확신하는 경우(예: 음식, 동물, 사람 얼굴 클로즈업)에만 'is_landmark'를 false로 설정하세요.` },
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    is_landmark: { type: Type.BOOLEAN, description: "사진이 랜드마크인지 여부" },
                    name: { type: Type.STRING, description: "랜드마크의 이름" },
                    city: { type: Type.STRING, description: "랜드마크가 위치한 도시" },
                    country: { type: Type.STRING, description: "랜드마크가 위치한 국가" },
                    latitude: { type: Type.NUMBER, description: "위도" },
                    longitude: { type: Type.NUMBER, description: "경도" },
                },
                required: ["is_landmark"],
            },
        },
    });
    const result: LandmarkIdentificationResponse = JSON.parse(response.text);

    if (!result.is_landmark || !result.name || !result.city || !result.country || result.latitude === null || result.longitude === null) {
        throw new Error("LANDMARK_NOT_FOUND");
    }
    
    return {
        name: result.name,
        city: result.city,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
    };
};

const getAudiencePrompt = (level: string): string => {
    switch (level) {
        case '호기심 많은 어린이 (7-9세)':
            return '7-9세 어린이가 이해할 수 있도록 아주 아주 쉽고, 재미있는 동화처럼 이야기해줘.';
        case '꼬마 역사학자 (10-12세)':
            return '이제 막 역사에 흥미를 갖기 시작한 10-12세 학생의 눈높이에 맞춰, 흥미진진한 모험 이야기처럼 설명해줘.';
        case '청소년 탐험가 (13-15세)':
            return '13-15세 청소년이 지루하지 않게, 핵심적인 역사적 사실과 그 배경을 명확하고 간결하게 설명해줘.';
        case '예비 지성인 (16-18세)':
            return '역사적 사건의 의미와 사회적 영향을 포함하여, 16-18세 학생의 지적 호기심을 자극할 수 있도록 깊이 있게 설명해줘.';
        case '성인 교양 수준':
            return '성인 교양 수준에 맞춰, 전문적인 용어를 사용해도 좋으니 정확하고 상세한 정보를 제공해줘.';
        default:
            return '일반인의 눈높이에 맞춰 알기 쉽게 설명해줘.';
    }
}

export const fetchLandmarkHistory = async (apiKey: string, landmarkName: string, level: string): Promise<{ text: string; sources: GroundingSource[] }> => {
    const ai = getAi(apiKey);
    const audiencePrompt = getAudiencePrompt(level);
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${landmarkName}의 역사에 대해 설명해줘. 가장 중요한 사실 위주로 3~4문장으로 요약해줘. 답변에 ** 같은 마크다운 서식은 절대 사용하지 마. ${audiencePrompt}`,
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

    return { text: response.text.replace(/\*\*/g, ''), sources };
};

export const generateSpeech = async (apiKey: string, text: string): Promise<string> => {
    const ai = getAi(apiKey);
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

export const askQuestion = async (apiKey: string, landmarkName: string, history: string, question: string, level: string): Promise<string> => {
    const ai = getAi(apiKey);
    const audiencePrompt = getAudiencePrompt(level);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `당신은 박물관 도슨트입니다. 아래 랜드마크 정보와 역사를 바탕으로 사용자의 질문에 답변해주세요. 답변은 짧고 명확해야 하며, ** 같은 마크다운 서식은 절대 사용하지 마세요. ${audiencePrompt}
        랜드마크: ${landmarkName}
        알려진 역사: ${history}
        사용자 질문: ${question}`,
    });
    return response.text.replace(/\*\*/g, '');
};

export const generateArtwork = async (apiKey: string, imageFile: File, style: string): Promise<string> => {
    const ai = getAi(apiKey);
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

export const getEmojisForLandmarks = async (apiKey: string, landmarkNames: string[]): Promise<string[]> => {
    const ai = getAi(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `For each landmark in the following list, provide a single, most representative emoji. Return the response as a JSON object with a key "emojis" containing an array of strings, where each string is just the emoji. The order must match the input list. The list is: ${JSON.stringify(landmarkNames)}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    emojis: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING, description: "A single emoji character" }
                    }
                },
                required: ["emojis"]
            }
        },
    });
    try {
        const result: { emojis: string[] } = JSON.parse(response.text);
        if (result.emojis && result.emojis.length === landmarkNames.length) {
            return result.emojis;
        }
    } catch (e) {
        console.error("Failed to parse emoji response:", e);
    }
    // Fallback if parsing fails or lengths don't match
    return landmarkNames.map(() => '📍');
};

export const fetchFunFact = async (apiKey: string, landmarkName: string, level: string): Promise<string> => {
    const ai = getAi(apiKey);
    const audiencePrompt = getAudiencePrompt(level);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${landmarkName}에 대한 흥미로운 사실을 한 가지 알려줘. 짧고 재미있게, 그리고 ** 같은 마크다운은 빼고 말해줘. ${audiencePrompt}`,
    });
    return response.text.replace(/\*\*/g, '');
};
