import React, { useState, useCallback, useRef } from 'react';
import { LoadingStep, GroundingSource, LandmarkInfo, TourStop } from './types';
import { identifyLandmark, fetchLandmarkHistory, generateSpeech } from './services/geminiService';
import Spinner from './components/Spinner';
import AudioPlayer from './components/AudioPlayer';
import FunFact from './components/FunFact';
import ArtworkGenerator from './components/ArtworkGenerator';
import QAChat from './components/QAChat';
import LocationMap from './components/LocationMap';
import TourSummary from './components/TourSummary';

// --- Helper components defined outside App to prevent re-rendering issues ---

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto text-center p-8">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-stone-800 mb-4 shadow-text">포토 랜드마크 탐험가</h1>
      <p className="text-lg text-stone-600 mb-8 max-w-2xl mx-auto shadow-text">랜드마크 사진을 업로드하여 AI가 들려주는 해설과 함께 그 역사를 알아보세요.</p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={isLoading}
      />
      <button
        onClick={handleButtonClick}
        disabled={isLoading}
        className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-stone-300 disabled:cursor-not-allowed"
      >
        랜드마크 사진 업로드
      </button>
    </div>
  );
};

interface ResultDisplayProps {
    imageUrl: string;
    landmarkInfo: LandmarkInfo;
    history: string;
    sources: GroundingSource[];
    base64Audio: string;
    imageFile: File;
    onReset: () => void;
    onEndTour: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageUrl, landmarkInfo, history, sources, base64Audio, imageFile, onReset, onEndTour }) => {
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
              <FunFact landmarkName={landmarkInfo.name} />
              <ArtworkGenerator imageFile={imageFile} />
              <QAChat landmarkName={landmarkInfo.name} history={history} />
            </div>

            <div className="text-center mt-8 flex flex-wrap justify-center gap-4">
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

const Footer = () => (
    <footer className="w-full text-center p-6 text-sm text-stone-500 mt-auto">
        <p>Made by 김진관 (<a href="https://litt.ly/dot_connector" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">닷커넥터</a>)</p>
        <p className="mt-1">배움, 나눔, 성장을 추구하는 연결주의자</p>
    </footer>
);

// --- Main App Component ---

const loadingMessages: Record<LoadingStep, string> = {
    [LoadingStep.IDLE]: '',
    [LoadingStep.DONE]: '',
    [LoadingStep.ERROR]: '오류가 발생했습니다.',
    [LoadingStep.IDENTIFYING]: '랜드마크 식별 중...',
    [LoadingStep.FETCHING_HISTORY]: '역사 정보 검색 중...',
    [LoadingStep.GENERATING_SPEECH]: '오디오 가이드 생성 중...',
};

const App: React.FC = () => {
    const [loadingStep, setLoadingStep] = useState<LoadingStep>(LoadingStep.IDLE);
    const [failedStep, setFailedStep] = useState<LoadingStep | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [landmarkInfo, setLandmarkInfo] = useState<LandmarkInfo | null>(null);
    const [history, setHistory] = useState<string>('');
    const [sources, setSources] = useState<GroundingSource[]>([]);
    const [base64Audio, setBase64Audio] = useState<string>('');
    const [tourHistory, setTourHistory] = useState<TourStop[]>([]);
    const [isTourEnded, setIsTourEnded] = useState(false);
    
    const resetState = useCallback((isNewTour = false) => {
        setLoadingStep(LoadingStep.IDLE);
        setError(null);
        setFailedStep(null);
        setLandmarkInfo(null);
        setHistory('');
        setSources([]);
        setBase64Audio('');
        setImageFile(null);
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
            setImageUrl(null);
        }
        if (isNewTour) {
            tourHistory.forEach(stop => URL.revokeObjectURL(stop.imageUrl));
            setTourHistory([]);
            setIsTourEnded(false);
        }
    }, [imageUrl, tourHistory]);

    const handleImageSelect = useCallback(async (file: File) => {
        resetState();
        const objectUrl = URL.createObjectURL(file);
        setImageUrl(objectUrl);
        setImageFile(file);
        
        let currentStep: LoadingStep = LoadingStep.IDLE;
        try {
            currentStep = LoadingStep.IDENTIFYING;
            setLoadingStep(currentStep);
            const identifiedLandmark = await identifyLandmark(file);
            setLandmarkInfo(identifiedLandmark);

            currentStep = LoadingStep.FETCHING_HISTORY;
            setLoadingStep(currentStep);
            const { text: landmarkHistory, sources: landmarkSources } = await fetchLandmarkHistory(identifiedLandmark.name);
            setHistory(landmarkHistory);
            setSources(landmarkSources);

            currentStep = LoadingStep.GENERATING_SPEECH;
            setLoadingStep(currentStep);
            const audioData = await generateSpeech(landmarkHistory);
            setBase64Audio(audioData);
            
            const newTourStop: TourStop = {
                landmarkInfo: identifiedLandmark,
                imageUrl: objectUrl,
                imageFile: file,
                history: landmarkHistory,
                sources: landmarkSources,
                base64Audio: audioData,
            };
            setTourHistory(prev => [...prev, newTourStop]);

            setLoadingStep(LoadingStep.DONE);
            setFailedStep(null);
        } catch (err: any) {
            console.error(`Error during step ${currentStep}:`, err);
            URL.revokeObjectURL(objectUrl);
            setError(`[${loadingMessages[currentStep]}] 단계에서 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
            setLoadingStep(LoadingStep.ERROR);
            setFailedStep(currentStep);
        }
    }, [resetState]);

    const handleRetry = useCallback(async () => {
        if (!failedStep || !imageFile || !imageUrl) return;
    
        const stepToRetry = failedStep;
        setError(null);
        setLoadingStep(stepToRetry);
        setFailedStep(null);
    
        try {
            let landmarkToUse = landmarkInfo;
            if (stepToRetry <= LoadingStep.IDENTIFYING) {
                const identifiedLandmark = await identifyLandmark(imageFile);
                setLandmarkInfo(identifiedLandmark);
                landmarkToUse = identifiedLandmark;
            }
            if (!landmarkToUse) throw new Error("Landmark not identified.");

            let historyToUse = history;
            let sourcesToUse = sources;
            if (stepToRetry <= LoadingStep.FETCHING_HISTORY) {
                setLoadingStep(LoadingStep.FETCHING_HISTORY);
                const { text: landmarkHistory, sources: landmarkSources } = await fetchLandmarkHistory(landmarkToUse.name);
                setHistory(landmarkHistory);
                setSources(landmarkSources);
                historyToUse = landmarkHistory;
                sourcesToUse = landmarkSources;
            }
    
            let audioToUse = base64Audio;
            if (stepToRetry <= LoadingStep.GENERATING_SPEECH) {
                setLoadingStep(LoadingStep.GENERATING_SPEECH);
                const audioData = await generateSpeech(historyToUse);
                setBase64Audio(audioData);
                audioToUse = audioData;
            }
            
            setLoadingStep(LoadingStep.DONE);
            
            if (!tourHistory.find(item => item.landmarkInfo.name === landmarkToUse!.name)) {
                const newTourStop: TourStop = {
                    landmarkInfo: landmarkToUse!,
                    imageUrl: imageUrl!,
                    imageFile: imageFile!,
                    history: historyToUse,
                    sources: sourcesToUse,
                    base64Audio: audioToUse,
                };
                setTourHistory(prev => [...prev, newTourStop]);
            }
        } catch (err: any) {
            console.error(`Error during retry of step ${stepToRetry}:`, err);
            setError(`[${loadingMessages[stepToRetry]}] 재시도 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
            setLoadingStep(LoadingStep.ERROR);
            setFailedStep(stepToRetry);
        }
    }, [failedStep, imageFile, landmarkInfo, history, tourHistory, imageUrl, sources, base64Audio]);

    const handleEndTour = () => setIsTourEnded(true);
    const handleRestartTour = () => resetState(true);

    const handleSelectLandmark = useCallback((index: number) => {
        const selectedStop = tourHistory[index];
        if (selectedStop) {
            setLoadingStep(LoadingStep.DONE);
            setError(null);
            setFailedStep(null);
            setLandmarkInfo(selectedStop.landmarkInfo);
            setHistory(selectedStop.history);
            setSources(selectedStop.sources);
            setBase64Audio(selectedStop.base64Audio);
            setImageFile(selectedStop.imageFile);
            setImageUrl(selectedStop.imageUrl);
            setIsTourEnded(false);
        }
    }, [tourHistory]);

    const isLoading = loadingStep !== LoadingStep.IDLE && loadingStep !== LoadingStep.DONE && loadingStep !== LoadingStep.ERROR;

    return (
        <div className="flex flex-col min-h-screen">
            <main className={`flex-grow w-full flex flex-col items-center justify-center p-4 relative ${loadingStep === LoadingStep.IDLE && !isTourEnded ? 'world-map-bg' : ''}`}>
                {isTourEnded ? (
                    <TourSummary 
                        tourHistory={tourHistory.map(stop => stop.landmarkInfo)} 
                        onRestart={handleRestartTour} 
                        onSelectLandmark={handleSelectLandmark}
                    />
                ) : (
                    <>
                        {loadingStep === LoadingStep.IDLE && <ImageUploader onImageSelect={handleImageSelect} isLoading={isLoading} />}
                        
                        {(loadingStep !== LoadingStep.IDLE) && imageUrl && (
                             <div className="relative w-full max-w-5xl mx-auto">
                                {isLoading && <Spinner message={loadingMessages[loadingStep]}/>}
                                {loadingStep === LoadingStep.ERROR && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-8 text-center rounded-lg">
                                        <h2 className="text-2xl font-bold text-red-600 mb-4">분석 실패</h2>
                                        <p className="text-stone-600 mb-6 max-w-md">{error}</p>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleRetry}
                                                className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
                                            >
                                                재시도
                                            </button>
                                             <button
                                                onClick={() => resetState()}
                                                className="bg-stone-500 hover:bg-stone-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {loadingStep === LoadingStep.DONE && imageFile && landmarkInfo ? (
                                    <ResultDisplay 
                                        imageUrl={imageUrl}
                                        landmarkInfo={landmarkInfo}
                                        history={history}
                                        sources={sources}
                                        base64Audio={base64Audio}
                                        imageFile={imageFile}
                                        onReset={() => resetState()}
                                        onEndTour={handleEndTour}
                                    />
                                ) : (
                                    <div className={`transition-opacity duration-500 ${isLoading || loadingStep === LoadingStep.ERROR ? 'opacity-30' : 'opacity-0'}`}>
                                       <img src={imageUrl} alt="업로드된 이미지 미리보기" className="w-full h-auto object-cover max-h-[80vh] rounded-lg shadow-lg" />
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default App;