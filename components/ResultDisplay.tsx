import React from 'react';
import { GroundingSource, LandmarkInfo } from '../types';
import AudioPlayer from './AudioPlayer';
import FunFact from './FunFact';
import ArtworkGenerator from './ArtworkGenerator';
import QAChat from './QAChat';
import LocationMap from './LocationMap';

interface ResultDisplayProps {
    imageUrl: string;
    landmarkInfo: LandmarkInfo;
    history: string;
    sources: GroundingSource[];
    base64Audio: string;
    imageFile: File;
    userLevel: string;
    apiKey: string;
    onReset: () => void;
    onEndTour: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageUrl, landmarkInfo, history, sources, base64Audio, imageFile, userLevel, apiKey, onReset, onEndTour }) => {
    
    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
            <div className="relative rounded-lg shadow-2xl overflow-hidden mb-8">
                <img src={imageUrl} alt="업로드된 랜드마크" className="w-full h-auto object-cover max-h-[60vh]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 md:p-8 flex flex-col justify-end">
                    <h2 className="text-3xl md:text-4xl font-bold text-white shadow-text mb-4">{landmarkInfo.name}</h2>
                    <div className="flex items-center gap-4 justify-center md:justify-start">
                        <AudioPlayer base64Audio={base64Audio} />
                    </div>
                </div>
            </div>

            <div className="space-y-8 mb-8">
                <LocationMap latitude={landmarkInfo.latitude} longitude={landmarkInfo.longitude} name={landmarkInfo.name} />
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-2xl font-semibold text-stone-800 mb-4">역사 엿보기</h3>
                    <p className="text-stone-700 leading-relaxed">{history}</p>
                </div>
            </div>
            
            <div className="space-y-8">
              <FunFact landmarkName={landmarkInfo.name} userLevel={userLevel} apiKey={apiKey} />
              <ArtworkGenerator imageFile={imageFile} apiKey={apiKey} />
              <QAChat landmarkName={landmarkInfo.name} history={history} userLevel={userLevel} apiKey={apiKey} />
            </div>

            <div className="text-center mt-8 flex flex-wrap justify-center items-center gap-4">
                <button
                    onClick={onReset}
                    className="bg-stone-500 hover:bg-stone-600 text-white font-bold py-3 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
                >
                    다른 사진 분석하기
                </button>
                 <button
                    onClick={onEndTour}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
                >
                    투어 종료하기
                </button>
            </div>
        </div>
    );
};
export default ResultDisplay;