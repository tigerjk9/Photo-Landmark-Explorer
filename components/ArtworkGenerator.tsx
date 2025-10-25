import React, { useState } from 'react';
import { generateArtwork } from '../services/geminiService';

interface ArtworkGeneratorProps {
    imageFile: File;
}

const artStyles = [
    { name: '반 고흐', prompt: 'a painting in the style of Vincent Van Gogh' },
    { name: '수채화', prompt: 'a watercolor painting' },
    { name: '사이버펑크', prompt: 'a cyberpunk art, with neon lights and futuristic elements' },
    { name: '스케치', prompt: 'a detailed pencil sketch' },
];

const ArtworkGenerator: React.FC<ArtworkGeneratorProps> = ({ imageFile }) => {
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeStyle, setActiveStyle] = useState<string | null>(null);
    const [lastAttemptedStyle, setLastAttemptedStyle] = useState<{ name: string; prompt: string } | null>(null);

    const handleGenerate = async (styleName: string, stylePrompt: string) => {
        setGeneratedImage(null);
        setError(null);
        setIsLoading(true);
        setActiveStyle(styleName);
        setLastAttemptedStyle({ name: styleName, prompt: stylePrompt });
        try {
            const base64Image = await generateArtwork(imageFile, stylePrompt);
            setGeneratedImage(`data:image/png;base64,${base64Image}`);
        } catch (err) {
            setError('아트웍 생성에 실패했습니다. 다시 시도해주세요.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        if (lastAttemptedStyle) {
            handleGenerate(lastAttemptedStyle.name, lastAttemptedStyle.prompt);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-stone-800 mb-4">나만의 랜드마크 아트워크</h3>
            <p className="text-stone-600 mb-4">AI와 함께 사진을 다양한 예술 스타일로 재탄생시켜 보세요.</p>
            <div className="flex flex-wrap gap-3 mb-6">
                {artStyles.map((style) => (
                    <button
                        key={style.name}
                        onClick={() => handleGenerate(style.name, style.prompt)}
                        disabled={isLoading}
                        className="bg-violet-500 hover:bg-violet-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out disabled:bg-stone-300 disabled:cursor-not-allowed"
                    >
                        {style.name}
                    </button>
                ))}
            </div>

            {isLoading && (
                 <div className="w-full text-center p-8">
                    <div className="inline-block w-8 h-8 border-4 border-t-violet-500 border-stone-200 rounded-full animate-spin"></div>
                    <p className="mt-2 text-violet-500">{activeStyle} 스타일로 생성 중...</p>
                </div>
            )}
            
            {error && !isLoading && (
                 <div className="text-center mt-4 p-4 bg-red-50 rounded-lg">
                    <p className="text-red-600">{error}</p>
                    <button onClick={handleRetry} className="mt-2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-full transition duration-300">
                        재시도
                    </button>
                </div>
            )}
            
            {generatedImage && !isLoading && !error && (
                 <div className="mt-4 animate-fade-in">
                    <img src={generatedImage} alt={`${activeStyle} style artwork`} className="rounded-lg shadow-xl mx-auto w-full max-w-lg" />
                </div>
            )}
        </div>
    );
};

export default ArtworkGenerator;