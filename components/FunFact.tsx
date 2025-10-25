import React, { useState } from 'react';
import { fetchFunFact } from '../services/geminiService';

interface FunFactProps {
    landmarkName: string;
    userLevel: string;
    apiKey: string;
}

const FunFact: React.FC<FunFactProps> = ({ landmarkName, userLevel, apiKey }) => {
    const [fact, setFact] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchFact = async () => {
        setIsLoading(true);
        setError(null);
        setFact(null);
        try {
            const newFact = await fetchFunFact(apiKey, landmarkName, userLevel);
            setFact(newFact);
        } catch (err) {
            setError('재미있는 사실을 가져오는 데 실패했습니다.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-stone-800 mb-4">숨겨진 이야기</h3>
            <p className="text-stone-600 mb-4">이 랜드마크에 얽힌 잘 알려지지 않은 재미있는 사실을 발견해보세요.</p>
            <button
                onClick={handleFetchFact}
                disabled={isLoading}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
                {isLoading ? '찾는 중...' : '재미있는 사실 보기!'}
            </button>

            {error && !isLoading && (
                 <div className="mt-4 text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-red-600">{error}</p>
                    <button onClick={handleFetchFact} className="mt-2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-full transition duration-300">
                        재시도
                    </button>
                </div>
            )}

            {fact && !isLoading && !error && (
                <div className="mt-4 p-4 bg-cyan-50 rounded-lg animate-fade-in">
                    <p className="text-lg text-cyan-800 italic">"{fact}"</p>
                </div>
            )}
        </div>
    );
};

export default FunFact;