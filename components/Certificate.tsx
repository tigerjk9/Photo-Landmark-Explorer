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

    const handleDownload = async () => {
        const node = certificateRef.current;
        if (!node || isDownloading) return;

        setIsDownloading(true);
        setDownloadError(null);

        try {
            const width = node.offsetWidth;
            const height = node.offsetHeight;
            
            const clonedNode = node.cloneNode(true) as HTMLElement;
            clonedNode.style.margin = '0';
            clonedNode.style.padding = '0';

            const htmlString = clonedNode.outerHTML;

            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                    <foreignObject width="100%" height="100%">
                        <div xmlns="http://www.w3.org/1999/xhtml" style="width: ${width}px; height: ${height}px;">
                            ${htmlString}
                        </div>
                    </foreignObject>
                </svg>
            `;

            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = 2;
                    canvas.width = width * scale;
                    canvas.height = height * scale;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        if (downloadFormat === 'jpeg') {
                            ctx.fillStyle = '#fef2f2'; // bg-rose-50
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                        ctx.scale(scale, scale);
                        ctx.drawImage(img, 0, 0);

                        try {
                            const mimeType = `image/${downloadFormat}`;
                            const imageUrl = canvas.toDataURL(mimeType, 0.95);
                            const a = document.createElement('a');
                            a.href = imageUrl;
                            a.download = `landmark-explorer-certificate.${downloadFormat}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            resolve();
                        } catch (e) {
                             reject(new Error("인증서 이미지 생성에 실패했습니다."));
                        }
                    } else {
                        reject(new Error("Canvas context를 가져올 수 없습니다."));
                    }
                    URL.revokeObjectURL(url);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error("이미지 다운로드에 실패했습니다. SVG 변환 중 오류가 발생했습니다."));
                };
                img.src = url;
            });
        } catch (error: any) {
            setDownloadError(error.message || "인증서 다운로드 중 알 수 없는 오류가 발생했습니다.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
        <div className="mt-12 p-4 sm:p-6 bg-white rounded-lg shadow-xl animate-fade-in">
            <div ref={certificateRef} className="p-6 sm:p-10 border-8 border-rose-800 bg-rose-50 text-stone-700">
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
                            <input type="radio" name="format" value="png" checked={downloadFormat === 'png'} onChange={() => setDownloadFormat('png')} className="form-radio h-4 w-4 text-rose-500 border-stone-300 focus:ring-rose-400" /> PNG
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-stone-600">
                            <input type="radio" name="format" value="jpeg" checked={downloadFormat === 'jpeg'} onChange={() => setDownloadFormat('jpeg')} className="form-radio h-4 w-4 text-rose-500 border-stone-300 focus:ring-rose-400" /> JPG
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
                 {downloadError && <p className="text-red-600 mt-3 text-sm text-center">{downloadError}</p>}
            </div>
        </div>
    );
};

export default Certificate;