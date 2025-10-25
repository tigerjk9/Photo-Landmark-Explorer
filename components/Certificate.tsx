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
    
    const [emojis, setEmojis] = useState<string[]>([]);
    const [isLoadingEmojis, setIsLoadingEmojis] = useState(true);

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

    const handleDownload = () => {
        if (isDownloading) return;
        
        setIsDownloading(true);
        setDownloadError(null);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error("Canvas를 생성할 수 없습니다.");
            }

            const width = 800;
            const height = 600;
            canvas.width = width;
            canvas.height = height;

            // 배경
            ctx.fillStyle = '#fef2f2';
            ctx.fillRect(0, 0, width, height);

            // 테두리
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 8;
            ctx.strokeRect(20, 20, width - 40, height - 40);

            // 기본 폰트
            ctx.textAlign = 'center';
            ctx.fillStyle = '#7f1d1d';
            const baseFont = 'Pretendard, sans-serif';

            // 제목
            ctx.font = `bold 36px ${baseFont}`;
            ctx.fillText('수료증', width / 2, 80);
            
            ctx.font = `20px ${baseFont}`;
            ctx.fillStyle = '#b91c1c';
            ctx.fillText('Certificate of Completion', width / 2, 110);

            // 구분선
            ctx.fillStyle = '#fca5a5';
            ctx.fillRect(width / 2 - 48, 130, 96, 4);

            // 탐험가 이름
            ctx.fillStyle = '#374151';
            ctx.font = `bold 24px ${baseFont}`;
            const explorerText = `탐험가: ${explorerName || "이름 없음"}`;
            ctx.fillText(explorerText, width / 2, 180);

            // 설명
            ctx.fillStyle = '#374151';
            ctx.font = `16px ${baseFont}`;
            ctx.fillText('위 탐험가는 포토 랜드마크 탐험가 프로그램을 통해', width / 2, 220);
            ctx.fillText('아래의 랜드마크를 성공적으로 탐험하였기에', width / 2, 245);
            ctx.fillText('이 증서를 수여합니다.', width / 2, 270);

            // 랜드마크 목록 배경
            const listHeight = Math.min(tourHistory.length * 30 + 20, 180);
            ctx.fillStyle = 'rgba(255, 228, 230, 0.3)';
            ctx.fillRect(100, 300, width - 200, listHeight);

            // 랜드마크 목록
            ctx.fillStyle = '#374151';
            ctx.font = `16px ${baseFont}`;
            ctx.textAlign = 'center';
            
            const maxItems = 5;
            tourHistory.slice(0, maxItems).forEach((landmark, index) => {
                const y = 325 + index * 30;
                const emoji = emojis[index] || '📍';
                ctx.fillText(`${emoji} ${landmark.name} (${landmark.city})`, width / 2, y);
            });
            
            if (tourHistory.length > maxItems) {
                ctx.fillText(`... 외 ${tourHistory.length - maxItems}곳`, width / 2, 325 + maxItems * 30);
            }

            // 날짜와 서명
            ctx.textAlign = 'center';
            const today = new Date();
            const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
            
            ctx.font = `18px ${baseFont}`;
            ctx.fillStyle = '#374151';
            ctx.fillText(dateString, width / 2, height - 80);
            
            ctx.fillStyle = '#7f1d1d';
            ctx.font = `bold 24px ${baseFont}`;
            ctx.fillText('AI 도슨트', width / 2, height - 50);

            const mimeType = downloadFormat === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType, 0.95);
            
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `landmark-certificate-${explorerName || 'explorer'}.${downloadFormat}`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setIsDownloading(false);
            setDownloadError(null);

        } catch (error: any) {
            console.error('Download error:', error);
            setDownloadError('다운로드에 실패했습니다. 스크린샷을 찍어 저장해주세요.');
            setIsDownloading(false);
        }
    };
    
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
        <div className="mt-12 p-4 sm:p-6 bg-white rounded-lg shadow-xl animate-fade-in">
            <div ref={certificateRef} className="p-6 sm:p-10 border-8 border-rose-800 bg-rose-50 text-stone-700 certificate-font">
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-rose-900 mb-2">수료증</h2>
                    <p className="text-md sm:text-lg text-rose-700">Certificate of Completion</p>
                    <div className="w-24 h-1 bg-rose-300 mx-auto my-4 sm:my-6"></div>
                </div>

                <p className="text-lg sm:text-xl my-6 sm:my-8 text-center">
                    탐험가: <span className="font-bold text-xl sm:text-2xl text-rose-900">{explorerName || "이름 없음"}</span>
                </p>

                <p className="leading-relaxed text-md sm:text-lg mb-6 text-center">
                    위 탐험가는 포토 랜드마크 탐험가 프로그램을 통해 아래의 랜드마크를 성공적으로 탐험하였기에 이 증서를 수여합니다.
                </p>

                <ul className="list-none bg-rose-100/50 p-4 rounded-md my-6 space-y-2 text-md sm:text-lg">
                    {tourHistory.map((landmark, index) => (
                        <li key={`${landmark.name}-${index}`} className="flex items-center justify-center">
                            <span className="mr-2 text-xl w-6 text-center">
                                {isLoadingEmojis ? '⏳' : (emojis[index] || '📍')}
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
                            /> PNG
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-stone-600">
                            <input 
                                type="radio" 
                                name="format" 
                                value="jpeg" 
                                checked={downloadFormat === 'jpeg'} 
                                onChange={() => setDownloadFormat('jpeg')} 
                            /> JPG
                        </label>
                    </div>
                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading || isLoadingEmojis}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:scale-105 shadow-lg disabled:bg-stone-400 disabled:cursor-wait w-full sm:w-auto"
                    >
                        {isLoadingEmojis ? '이모티콘 로딩중...' : (isDownloading ? '생성 중...' : '인증서 이미지로 다운로드')}
                    </button>
                </div>
                {downloadError && (
                    <p className="text-red-600 mt-3 text-sm text-center">{downloadError}</p>
                )}
            </div>
        </div>
    );
};

export default Certificate;
