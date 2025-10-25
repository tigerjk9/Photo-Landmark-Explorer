import React, { useRef, useState, useEffect } from 'react';
import { LandmarkInfo } from '../types';
import { getEmojisForLandmarks } from '../services/geminiService';

interface CertificateProps {
    explorerName: string;
    tourHistory: LandmarkInfo[];
    apiKey: string;
}

const Certificate: React.FC<CertificateProps> = ({ explorerName, tourHistory, apiKey }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('png');
    const [fontLoaded, setFontLoaded] = useState(false);
    
    const [emojis, setEmojis] = useState<string[]>([]);
    const [isLoadingEmojis, setIsLoadingEmojis] = useState(true);

    // Pretendard 폰트 로드 확인
    useEffect(() => {
        const loadFont = async () => {
            try {
                await document.fonts.load('20px Pretendard');
                setFontLoaded(true);
            } catch (error) {
                console.log('Font loading error:', error);
                setFontLoaded(true); // 폰트 로드 실패해도 진행
            }
        };
        loadFont();
    }, []);

    useEffect(() => {
        const fetchEmojis = async () => {
            if (!apiKey || tourHistory.length === 0) {
                setIsLoadingEmojis(false);
                return;
            }
            setIsLoadingEmojis(true);
            try {
                const landmarkNames = tourHistory.map(lm => lm.name);
                const fetchedEmojis = await getEmojisForLandmarks(apiKey, landmarkNames);
                setEmojis(fetchedEmojis);
            } catch (error) {
                console.error("Failed to fetch emojis:", error);
                setEmojis(tourHistory.map(() => '📍'));
            } finally {
                setIsLoadingEmojis(false);
            }
        };

        fetchEmojis();
    }, [apiKey, tourHistory]);

    const handleDownload = async () => {
        const node = certificateRef.current;
        if (!node || isDownloading) return;

        setIsDownloading(true);
        setDownloadError(null);

        try {
            // Canvas 생성
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error("Canvas context를 생성할 수 없습니다.");
            }

            // 수료증 크기 설정
            const scale = 2; // 고해상도
            const width = 800;
            const height = 600;
            canvas.width = width * scale;
            canvas.height = height * scale;
            ctx.scale(scale, scale);

            // 배경색
            ctx.fillStyle = '#fef2f2';
            ctx.fillRect(0, 0, width, height);

            // 테두리
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 8;
            ctx.strokeRect(20, 20, width - 40, height - 40);

            // Pretendard 폰트 사용
            const fontFamily = '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#7f1d1d';

            // 제목
            ctx.font = `bold 36px ${fontFamily}`;
            ctx.fillText('수료증', width / 2, 80);
            
            ctx.font = `20px ${fontFamily}`;
            ctx.fillStyle = '#b91c1c';
            ctx.fillText('Certificate of Completion', width / 2, 110);

            // 구분선
            ctx.fillStyle = '#fca5a5';
            ctx.fillRect(width / 2 - 48, 130, 96, 4);

            // 탐험가 이름
            ctx.fillStyle = '#1f2937';
            ctx.font = `18px ${fontFamily}`;
            ctx.fillText('탐험가:', width / 2 - 50, 180);
            ctx.fillStyle = '#7f1d1d';
            ctx.font = `bold 24px ${fontFamily}`;
            ctx.fillText(explorerName || "이름 없음", width / 2 + 50, 180);

            // 설명 텍스트
            ctx.fillStyle = '#1f2937';
            ctx.font = `16px ${fontFamily}`;
            const description = '위 탐험가는 포토 랜드마크 탐험가 프로그램을 통해';
            const description2 = '아래의 랜드마크를 성공적으로 탐험하였기에';
            const description3 = '이 증서를 수여합니다.';
            ctx.fillText(description, width / 2, 220);
            ctx.fillText(description2, width / 2, 245);
            ctx.fillText(description3, width / 2, 270);

            // 랜드마크 목록 배경
            ctx.fillStyle = 'rgba(255, 228, 230, 0.5)';
            ctx.fillRect(100, 300, width - 200, Math.min(tourHistory.length * 30 + 20, 180));

            // 랜드마크 목록
            ctx.fillStyle = '#1f2937';
            ctx.font = `16px ${fontFamily}`;
            ctx.textAlign = 'left';
            tourHistory.forEach((landmark, index) => {
                if (index < 5) { // 최대 5개까지만 표시
                    const y = 325 + index * 30;
                    const emoji = isLoadingEmojis ? '⏳' : (emojis[index] || '📍');
                    ctx.fillText(`${emoji} ${landmark.name} (${landmark.city})`, 120, y);
                }
            });
            if (tourHistory.length > 5) {
                ctx.fillText(`... 외 ${tourHistory.length - 5}곳`, 120, 325 + 5 * 30);
            }

            // 날짜와 서명
            ctx.textAlign = 'center';
            const today = new Date();
            const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
            ctx.font = `18px ${fontFamily}`;
            ctx.fillText(dateString, width / 2, height - 80);
            
            ctx.fillStyle = '#7f1d1d';
            ctx.font = `bold 24px ${fontFamily}`;
            ctx.fillText('AI 도슨트', width / 2, height - 50);

            // Canvas를 이미지로 변환하여 다운로드
            const mimeType = downloadFormat === 'png' ? 'image/png' : 'image/jpeg';
            const quality = downloadFormat === 'jpeg' ? 0.95 : undefined;
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error("이미지 생성에 실패했습니다.");
                }
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `landmark-explorer-certificate.${downloadFormat}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // 메모리 정리
                setTimeout(() => URL.revokeObjectURL(url), 100);
                
                setIsDownloading(false);
                setDownloadError(null);
            }, mimeType, quality);

        } catch (error: any) {
            console.error('Download error:', error);
            setDownloadError(error.message || "인증서 다운로드 중 알 수 없는 오류가 발생했습니다.");
            setIsDownloading(false);
        }
    };
    
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    // 수료증 스타일 (Pretendard 폰트 적용)
    const certificateStyle = {
        fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
    };

    return (
        <div className="mt-12 p-4 sm:p-6 bg-white rounded-lg shadow-xl animate-fade-in">
            <div 
                ref={certificateRef} 
                className="p-6 sm:p-10 border-8 border-rose-800 bg-rose-50 text-stone-700"
                style={certificateStyle}
            >
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-rose-900 mb-2">수료증</h2>
                    <p className="text-md sm:text-lg text-rose-700">Certificate of Completion</p>
                    <div className="w-24 h-1 bg-rose-300 mx-auto my-4 sm:my-6"></div>
                </div>

                <p className="text-lg sm:text-xl my-6 sm:my-8">
                    탐험가: <span className="font-bold text-xl sm:text-2xl text-rose-900">{explorerName || "이름 없음"}</span>
                </p>

                <p className="leading-relaxed text-md sm:text-lg mb-6">
                    위 탐험가는 포토 랜드마크 탐험가 프로그램을 통해 아래의 랜드마크를 성공적으로 탐험하였기에 이 증서를 수여합니다.
                </p>

                <ul className="list-none bg-rose-100/50 p-4 rounded-md my-6 space-y-2 text-md sm:text-lg">
                    {tourHistory.map((landmark, index) => (
                        <li key={landmark.name} className="flex items-center">
                            <span className="mr-2 text-xl w-6 text-center">
                                {isLoadingEmojis ? (
                                    <span className="inline-block w-3 h-3 bg-stone-300 rounded-full animate-pulse"></span>
                                ) : (emojis[index] || '📍')}
                            </span>
                            <span><span className="font-semibold">{landmark.name}</span> ({landmark.city})</span>
                        </li>
                    ))}
                </ul>
                
                <div className="mt-10 sm:mt-12 text-center">
                    <p className="text-lg sm:text-xl">{dateString}</p>
                    <p className="text-xl sm:text-2xl font-bold text-rose-900 mt-2">AI 도슨트</p>
                </div>
            </div>
            
            <div className="mt-6 p-4 bg-stone-50 rounded-md">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-stone-700">파일 형식:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-stone-600">
                            <input 
                                type="radio" 
                                name="format" 
                                value="png" 
                                checked={downloadFormat === 'png'} 
                                onChange={() => setDownloadFormat('png')} 
                                className="form-radio h-4 w-4 text-rose-500 border-stone-300 focus:ring-rose-400" 
                            /> 
                            PNG
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-stone-600">
                            <input 
                                type="radio" 
                                name="format" 
                                value="jpeg" 
                                checked={downloadFormat === 'jpeg'} 
                                onChange={() => setDownloadFormat('jpeg')} 
                                className="form-radio h-4 w-4 text-rose-500 border-stone-300 focus:ring-rose-400" 
                            /> 
                            JPG
                        </label>
                    </div>
                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading || isLoadingEmojis || !fontLoaded}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:scale-105 shadow-lg disabled:bg-stone-400 disabled:cursor-wait w-full sm:w-auto"
                    >
                        {isDownloading ? '생성 중...' : '인증서 이미지로 다운로드'}
                    </button>
                </div>
                {downloadError && (
                    <div className="mt-3 text-center">
                        <p className="text-red-600 text-sm">
                            {downloadError}
                        </p>
                        <p className="text-stone-500 text-xs mt-1">
                            문제가 지속되면 스크린샷을 찍어서 저장해주세요.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Certificate;
