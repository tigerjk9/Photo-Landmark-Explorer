import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LoadingStep, GroundingSource, LandmarkInfo, TourStop } from './types';
import { identifyLandmark, fetchLandmarkHistory, generateSpeech } from './services/geminiService';
import Spinner from './components/Spinner';
import TourSummary from './components/TourSummary';
import ResultDisplay from './components/ResultDisplay';
import ApiKeyPrompt from './components/ApiKeyPrompt';

// --- Helper components defined outside App to prevent re-rendering issues ---

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  isLoading: boolean;
  userLevel: string;
  setUserLevel: (level: string) => void;
  apiKey: string | null;
  onApiKeySubmit: (key: string) => void;
}

const userLevels = [
  '호기심 많은 어린이 (7-9세)',
  '꼬마 역사학자 (10-12세)',
  '청소년 탐험가 (13-15세)',
  '예비 지성인 (16-18세)',
  '성인 교양 수준'
];

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, isLoading, userLevel, setUserLevel, apiKey, onApiKeySubmit }) => {
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

  const getHelperText = () => {
    if (isLoading) return null;
    const missing = [];
    if (!userLevel) missing.push("탐험가님의 수준을 선택");
    if (!apiKey) missing.push("API 키를 입력");
    if (missing.length > 0) {
        return `사진을 업로드하려면 먼저 ${missing.join('하고 ')}해주세요.`;
    }
    return null;
  }
  const helperText = getHelperText();

  return (
    <div className="w-full max-w-2xl mx-auto text-center p-8">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-rose-800 mb-4 shadow-text">포토 랜드마크 탐험가</h1>
      <p className="text-lg text-rose-600 mb-8 max-w-2xl mx-auto shadow-text">랜드마크 사진을 업로드하여 AI가 들려주는 해설과 함께 그 역사를 알아보세요.</p>
      
      <div className="mb-8 p-6 bg-white/30 backdrop-blur-sm rounded-lg">
        <h2 className="text-xl font-semibold text-stone-700 mb-4">탐험가님은 누구신가요?</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {userLevels.map(level => (
            <button
              key={level}
              onClick={() => setUserLevel(level)}
              className={`px-4 py-2 rounded-full font-semibold transition-all duration-200 text-sm md:text-base ${
                userLevel === level
                  ? 'bg-rose-500 text-white shadow-md scale-105'
                  : 'bg-white text-stone-600 hover:bg-rose-100 shadow-sm'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      
      <ApiKeyPrompt apiKey={apiKey} onApiKeySubmit={onApiKeySubmit} />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={isLoading || !userLevel || !apiKey}
      />
      <button
        onClick={handleButtonClick}
        disabled={isLoading || !userLevel || !apiKey}
        className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:bg-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        랜드마크 사진 업로드
      </button>
      {helperText && <p className="text-sm text-stone-500 mt-3 animate-fade-in">{helperText}</p>}
    </div>
  );
};

const Footer = (): React.ReactNode => (
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

type ErrorType = 'generic' | 'quota' | 'key' | 'not_found';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [loadingStep, setLoadingStep] = useState<LoadingStep>(LoadingStep.IDLE);
    const [failedStep, setFailedStep] = useState<LoadingStep | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<ErrorType>('generic');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [landmarkInfo, setLandmarkInfo] = useState<LandmarkInfo | null>(null);
    const [history, setHistory] = useState<string>('');
    const [sources, setSources] = useState<GroundingSource[]>([]);
    const [base64Audio, setBase64Audio] = useState<string>('');
    const [tourHistory, setTourHistory] = useState<TourStop[]>([]);
    const [isTourEnded, setIsTourEnded] = useState(false);
    const [userLevel, setUserLevel] = useState<string>('');
    const [isRetryableError, setIsRetryableError] = useState<boolean>(true);
    
    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        }
    }, []);

    const handleApiKeySubmit = (key: string) => {
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            setApiKey(key);
        } else {
            localStorage.removeItem('gemini_api_key');
            setApiKey(null);
        }
    };

    const handleInvalidApiKey = () => {
        localStorage.removeItem('gemini_api_key');
        setApiKey(null);
    };

    const resetState = useCallback((isNewTour = false) => {
        setLoadingStep(LoadingStep.IDLE);
        setError(null);
        setErrorType('generic');
        setFailedStep(null);
        setLandmarkInfo(null);
        setHistory('');
        setSources([]);
        setBase64Audio('');
        setImageFile(null);
        setIsRetryableError(true);

        if (imageUrl) {
            const isUrlInHistory = tourHistory.some(stop => stop.imageUrl === imageUrl);
            if (!isUrlInHistory) {
                URL.revokeObjectURL(imageUrl);
            }
        }
        setImageUrl(null);
        
        if (isNewTour) {
            tourHistory.forEach(stop => URL.revokeObjectURL(stop.imageUrl));
            setTourHistory([]);
            setIsTourEnded(false);
            setUserLevel('');
        }
    }, [imageUrl, tourHistory]);

    const handleImageSelect = useCallback(async (file: File) => {
        if (!userLevel) {
            alert("탐험가님의 수준을 먼저 선택해주세요.");
            return;
        }
        if (!apiKey) {
            alert("API 키를 먼저 입력하고 저장해주세요.");
            return;
        }
        resetState();
        const objectUrl = URL.createObjectURL(file);
        setImageUrl(objectUrl);
        setImageFile(file);
        
        let currentStep: LoadingStep = LoadingStep.IDLE;
        try {
            currentStep = LoadingStep.IDENTIFYING;
            setLoadingStep(currentStep);
            const identifiedLandmark = await identifyLandmark(apiKey, file);
            setLandmarkInfo(identifiedLandmark);

            currentStep = LoadingStep.FETCHING_HISTORY;
            setLoadingStep(currentStep);
            const { text: landmarkHistory, sources: landmarkSources } = await fetchLandmarkHistory(apiKey, identifiedLandmark.name, userLevel);
            setHistory(landmarkHistory);
            setSources(landmarkSources);

            currentStep = LoadingStep.GENERATING_SPEECH;
            setLoadingStep(currentStep);
            const audioData = await generateSpeech(apiKey, landmarkHistory);
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
            
            let errorMessage = `[${loadingMessages[currentStep]}] 단계에서 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`;
            let isRetryable = true;
            let type: ErrorType = 'generic';

            if (err.message?.includes('API key not valid')) {
                errorMessage = "유효하지 않은 API 키입니다. 키를 확인하고 '새로 시작'을 눌러 다시 입력해주세요.";
                isRetryable = false;
                type = 'key';
                handleInvalidApiKey();
            } else if (err.message === "LANDMARK_NOT_FOUND") {
                errorMessage = "업로드한 사진에서 랜드마크를 찾을 수 없습니다. 다른 사진으로 시도해보세요.";
                isRetryable = false;
                type = 'not_found';
            } else if (err.message?.includes("RESOURCE_EXHAUSTED")) {
                errorMessage = "API 사용량 할당량을 초과했습니다. 잠시 후 다시 시도하거나, Google AI Studio에서 요금제를 확인해주세요.";
                isRetryable = false;
                type = 'quota';
            }

            setError(errorMessage);
            setErrorType(type);
            setIsRetryableError(isRetryable);
            setLoadingStep(LoadingStep.ERROR);
            setFailedStep(currentStep);
        }
    }, [resetState, userLevel, apiKey]);

    const handleRetry = useCallback(async () => {
        if (!failedStep || !imageFile || !imageUrl || !userLevel || !apiKey) return;
    
        const stepToRetry = failedStep;
        setError(null);
        setErrorType('generic');
        setLoadingStep(stepToRetry);
        setFailedStep(null);
        setIsRetryableError(true);
    
        try {
            let landmarkToUse = landmarkInfo;
            if (stepToRetry <= LoadingStep.IDENTIFYING) {
                const identifiedLandmark = await identifyLandmark(apiKey, imageFile);
                setLandmarkInfo(identifiedLandmark);
                landmarkToUse = identifiedLandmark;
            }
            if (!landmarkToUse) throw new Error("Landmark not identified.");

            let historyToUse = history;
            let sourcesToUse = sources;
            if (stepToRetry <= LoadingStep.FETCHING_HISTORY) {
                setLoadingStep(LoadingStep.FETCHING_HISTORY);
                const { text: landmarkHistory, sources: landmarkSources } = await fetchLandmarkHistory(apiKey, landmarkToUse.name, userLevel);
                setHistory(landmarkHistory);
                setSources(landmarkSources);
                historyToUse = landmarkHistory;
                sourcesToUse = landmarkSources;
            }
    
            let audioToUse = base64Audio;
            if (stepToRetry <= LoadingStep.GENERATING_SPEECH) {
                setLoadingStep(LoadingStep.GENERATING_SPEECH);
                const audioData = await generateSpeech(apiKey, historyToUse);
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
            
            let errorMessage = `[${loadingMessages[stepToRetry]}] 재시도 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`;
            let isRetryable = true;
            let type: ErrorType = 'generic';

            if (err.message?.includes('API key not valid')) {
                errorMessage = "유효하지 않은 API 키입니다. 키를 확인하고 '새로 시작'을 눌러 다시 입력해주세요.";
                isRetryable = false;
                type = 'key';
                handleInvalidApiKey();
            } else if (err.message === "LANDMARK_NOT_FOUND") {
                errorMessage = "업로드한 사진에서 랜드마크를 찾을 수 없습니다. 다른 사진으로 시도해보세요.";
                isRetryable = false;
                type = 'not_found';
            } else if (err.message?.includes("RESOURCE_EXHAUSTED")) {
                errorMessage = "API 사용량 할당량을 초과했습니다. 잠시 후 다시 시도하거나, Google AI Studio에서 요금제를 확인해주세요.";
                isRetryable = false;
                type = 'quota';
            }
            
            setError(errorMessage);
            setErrorType(type);
            setIsRetryableError(isRetryable);
            setLoadingStep(LoadingStep.ERROR);
            setFailedStep(stepToRetry);
        }
    }, [failedStep, imageFile, landmarkInfo, history, tourHistory, imageUrl, sources, base64Audio, userLevel, apiKey]);

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
            <main className={`flex-grow w-full flex flex-col items-center justify-center p-4 relative`}>
                {isTourEnded ? (
                    <TourSummary 
                        tourHistory={tourHistory.map(stop => stop.landmarkInfo)} 
                        onRestart={handleRestartTour} 
                        onSelectLandmark={handleSelectLandmark}
                        apiKey={apiKey}
                    />
                ) : (
                    <>
                        {loadingStep === LoadingStep.IDLE && (
                            <ImageUploader 
                                onImageSelect={handleImageSelect} 
                                isLoading={isLoading} 
                                userLevel={userLevel} 
                                setUserLevel={setUserLevel}
                                apiKey={apiKey}
                                onApiKeySubmit={handleApiKeySubmit}
                            />
                        )}
                        
                        {(loadingStep !== LoadingStep.IDLE) && imageUrl && (
                             <div className="relative w-full max-w-5xl mx-auto">
                                {isLoading && <Spinner message={loadingMessages[loadingStep]}/>}
                                {loadingStep === LoadingStep.ERROR && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-8 text-center rounded-lg">
                                        <h2 className="text-2xl font-bold text-red-600 mb-4">분석 실패</h2>
                                        <p className="text-stone-600 mb-6 max-w-md">{error}</p>
                                        
                                        {errorType === 'quota' && (
                                            <div className="text-sm text-stone-500 mb-6 bg-rose-50 p-3 rounded-lg shadow-inner">
                                                <p>자세한 정보는 아래 링크를 참조하세요:</p>
                                                <div className="mt-2">
                                                    <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">API 속도 제한</a>
                                                    <span className="mx-2">|</span>
                                                    <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">사용량 모니터링</a>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex gap-4">
                                            {isRetryableError && (
                                                <button
                                                    onClick={handleRetry}
                                                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
                                                >
                                                    재시도
                                                </button>
                                            )}
                                             <button
                                                onClick={() => resetState()}
                                                className="bg-stone-500 hover:bg-stone-600 text-white font-bold py-2 px-6 rounded-full transition duration-300"
                                            >
                                                {isRetryableError ? '취소' : '새로 시작'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {loadingStep === LoadingStep.DONE && imageFile && landmarkInfo && apiKey ? (
                                    <ResultDisplay 
                                        imageUrl={imageUrl}
                                        landmarkInfo={landmarkInfo}
                                        history={history}
                                        sources={sources}
                                        base64Audio={base64Audio}
                                        imageFile={imageFile}
                                        onReset={() => resetState()}
                                        onEndTour={handleEndTour}
                                        userLevel={userLevel}
                                        apiKey={apiKey}
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