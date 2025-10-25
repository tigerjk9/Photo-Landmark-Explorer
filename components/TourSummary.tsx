import React, { useState } from 'react';
import { LandmarkInfo } from '../types';
import Certificate from './Certificate';

interface TourSummaryProps {
    tourHistory: LandmarkInfo[];
    onRestart: () => void;
    onSelectLandmark: (index: number) => void;
    apiKey: string | null;
}

const LandmarkCard: React.FC<{ landmark: LandmarkInfo; index: number; onClick: () => void; }> = ({ landmark, index, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center transform transition-transform duration-300 hover:scale-105 animate-fade-in w-full h-full"
            style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
            aria-label={`${landmark.name} 상세 정보 보기`}
        >
            <div className="bg-rose-100 text-rose-600 font-bold rounded-full w-12 h-12 flex items-center justify-center text-xl mb-4 shadow-inner flex-shrink-0">
                {index + 1}
            </div>
            <div className="flex-grow flex flex-col justify-center">
                <h3 className="text-xl font-bold text-stone-800 mb-1">{landmark.name}</h3>
                <p className="text-stone-500">{`${landmark.city}, ${landmark.country}`}</p>
            </div>
        </button>
    );
};

const TourSummary: React.FC<TourSummaryProps> = ({ tourHistory, onRestart, onSelectLandmark, apiKey }) => {
    const [explorerName, setExplorerName] = useState('');
    const [showCertificate, setShowCertificate] = useState(false);

    const handleGenerateCertificate = (e: React.FormEvent) => {
        e.preventDefault();
        if (explorerName.trim()) {
            setShowCertificate(true);
        } else {
            alert('인증서에 사용할 이름을 입력해주세요.');
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 text-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-stone-800 mb-4 shadow-text">나의 투어 요약</h1>
            <p className="text-lg text-stone-600 mb-12 max-w-2xl mx-auto shadow-text">지금까지 탐험한 랜드마크 기록입니다. 카드를 클릭하면 자세한 내용을 다시 볼 수 있어요.</p>
            
            {tourHistory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {tourHistory.map((landmark, index) => (
                        <LandmarkCard 
                            key={`${landmark.name}-${index}`} 
                            landmark={landmark} 
                            index={index} 
                            onClick={() => onSelectLandmark(index)}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white/50 backdrop-blur-sm rounded-lg shadow-lg p-12">
                    <p className="text-xl text-stone-500">탐험 기록이 없습니다. 새로운 투어를 시작해보세요!</p>
                </div>
            )}
            
            {tourHistory.length > 0 && !showCertificate && (
                <div className="mt-12 p-6 bg-white/60 backdrop-blur-sm rounded-lg shadow-lg animate-fade-in">
                    <h2 className="text-2xl font-bold text-stone-800 mb-4">나만의 탐험 인증서 만들기</h2>
                    <p className="text-stone-600 mb-4">탐험가님의 이름을 입력하고 멋진 인증서를 받아보세요!</p>
                    <form onSubmit={handleGenerateCertificate} className="flex flex-col sm:flex-row justify-center items-center gap-2">
                        <input 
                            type="text"
                            value={explorerName}
                            onChange={(e) => setExplorerName(e.target.value)}
                            placeholder="이름을 입력하세요"
                            className="bg-white text-stone-800 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-rose-400 w-64"
                            aria-label="탐험가 이름"
                        />
                        <button 
                            type="submit"
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
                        >
                            인증서 생성
                        </button>
                    </form>
                </div>
            )}
            
            {showCertificate && tourHistory.length > 0 && apiKey && (
                <Certificate explorerName={explorerName} tourHistory={tourHistory} apiKey={apiKey} />
            )}


            <div className="mt-12">
                <button 
                    onClick={onRestart} 
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:scale-105 shadow-lg"
                >
                    새로운 투어 시작
                </button>
            </div>
        </div>
    );
};

export default TourSummary;
