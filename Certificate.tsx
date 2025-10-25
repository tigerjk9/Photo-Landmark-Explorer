import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
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

    const handleDownload = async () => {
        const node = certificateRef.current;
        if (!node || isDownloading) return;

        setIsDownloading(true);
        setDownloadError(null);

        try {
            // html2canvas 옵션 설정
            const canvas = await html2canvas(node, {
                backgroundColor: '#fef2f2', // bg-rose-50 색상
                scale: 2, // 고해상도를 위한 스케일
                useCORS: true, // CORS 이슈 방지
                allowTaint: true, // tainted canvas 허용
                logging: false, // 로깅 비활성화
                windowWidth: node.scrollWidth,
                windowHeight: node.scrollHeight,
                width: node.scrollWidth,
                height: node.scrollHeight,
                x: 0,
                y: 0
            });

            // Canvas를 이미지로 변환
            const mimeType = downloadFormat === 'png' ? 'image/png' : 'image/jpeg';
            const quality = downloadFormat === 'jpeg' ? 0.95 : undefined;
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error("이미지 생성에 실패했습니다.");
                }
                
                // Blob을 다운로드
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `landmark-explorer-certificate.${downloadFormat}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                setIsDownloading(false);
            }, mimeType, quality);

        } catch (error: any) {
            console.error('Download error:', error);
            setDownloadError(error.message || "인증서 다운로드 중 알 수 없는 오류가 발생했습니다.");
            setIsDownloading(false);
        }
    };
    
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
        <div className="mt-12 p-4 sm:p-6 bg-white rounded-lg shadow-xl animate-fade-in">
            <div 
                ref={certificateRef} 
                className="p-6 sm:p-10 border-8 border-rose-800 bg-rose-50 text-stone-700"
                style={{
                    // 인라인 스타일 추가로 더 안정적인 렌더링 보장
                    backgroundColor: '#fef2f2',
                    borderColor: '#991b1b',
                    borderWidth: '8px',
                    borderStyle: 'solid',
                    padding: '40px'
                }}
            >
                <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-rose-900 mb-2" style={{ color: '#7f1d1d', fontSize: '32px', fontWeight: 'bold' }}>수료증</h2>
                    <p className="text-md sm:text-lg text-rose-700" style={{ color: '#b91c1c', fontSize: '18px' }}>Certificate of Completion</p>
                    <div className="w-24 h-1 bg-rose-300 mx-auto my-4 sm:my-6" style={{ width: '96px', height: '4px', backgroundColor: '#fca5a5', margin: '24px auto' }}></div>
                </div>

                <p className="text-lg sm:text-xl my-6 sm:my-8" style={{ fontSize: '20px', margin: '32px 0' }}>
                    탐험가: <span className="font-bold text-xl sm:text-2xl text-rose-900" style={{ fontWeight: 'bold', fontSize: '24px', color: '#7f1d1d' }}>{explorerName || "이름 없음"}</span>
                </p>

                <p className="leading-relaxed text-md sm:text-lg mb-6" style={{ lineHeight: '1.75', fontSize: '18px', marginBottom: '24px' }}>
                    위 탐험가는 포토 랜드마크 탐험가 프로그램을 통해 아래의 랜드마크를 성공적으로 탐험하였기에 이 증서를 수여합니다.
                </p>

                <ul className="list-none bg-rose-100/50 p-4 rounded-md my-6 space-y-2 text-md sm:text-lg" style={{ listStyle: 'none', backgroundColor: 'rgba(255, 228, 230, 0.5)', padding: '16px', borderRadius: '6px', margin: '24px 0' }}>
                    {tourHistory.map((landmark, index) => (
                        <li key={landmark.name} className="flex items-center" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="mr-2 text-xl w-6 text-center" style={{ marginRight: '8px', fontSize: '20px', width: '24px', textAlign: 'center' }}>
                                {isLoadingEmojis ? '⏳' : (emojis[index] || '📍')}
                            </span>
                            <span><span className="font-semibold" style={{ fontWeight: '600' }}>{landmark.name}</span> ({landmark.city})</span>
                        </li>
                    ))}
                </ul>
                
                <div className="mt-10 sm:mt-12 text-center" style={{ marginTop: '48px', textAlign: 'center' }}>
                    <p className="text-lg sm:text-xl" style={{ fontSize: '20px' }}>{dateString}</p>
                    <p className="text-xl sm:text-2xl font-bold text-rose-900 mt-2" style={{ fontSize: '24px', fontWeight: 'bold', color: '#7f1d1d', marginTop: '8px' }}>AI 도슨트</p>
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
                        disabled={isDownloading || isLoadingEmojis}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:scale-105 shadow-lg disabled:bg-stone-400 disabled:cursor-wait w-full sm:w-auto"
                    >
                        {isDownloading ? '생성 중...' : '인증서 이미지로 다운로드'}
                    </button>
                </div>
                {downloadError && (
                    <p className="text-red-600 mt-3 text-sm text-center">
                        {downloadError}
                        <br />
                        <small className="text-stone-500">브라우저의 다운로드 설정을 확인해주세요.</small>
                    </p>
                )}
            </div>
        </div>
    );
};

export default Certificate;
