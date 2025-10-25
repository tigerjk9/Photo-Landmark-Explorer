import React, { useRef, useState } from 'react';
import { LandmarkInfo } from '../types';

interface CertificateProps {
    explorerName: string;
    tourHistory: LandmarkInfo[];
}

// Helper to fetch font as a base64 data URL and cache it on the window object.
const getGowunDodumFontDataURL = async (): Promise<string> => {
    const cacheKey = 'gowunDodumFontDataURL';
    if ((window as any)[cacheKey]) {
        return (window as any)[cacheKey];
    }
    
    // The specific .woff2 file for the Korean subset of Gowun Dodum font.
    const fontURL = 'https://fonts.gstatic.com/s/gowundodum/v1/3Jn5SD_00GqwlBnWc1cO55_3lVAN-g.woff2';
    try {
        const response = await fetch(fontURL);
        if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
        const blob = await response.blob();
        const dataURL = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        (window as any)[cacheKey] = dataURL;
        return dataURL;
    } catch (error) {
        console.error("Font fetching failed:", error);
        throw new Error("인증서 폰트를 불러오는 데 실패했습니다. 인터넷 연결을 확인해주세요.");
    }
};


const Certificate: React.FC<CertificateProps> = ({ explorerName, tourHistory }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownload = async () => {
        const node = certificateRef.current;
        if (!node || isDownloading) return;

        setIsDownloading(true);
        setDownloadError(null);

        try {
            // Fetch the font and embed it as a data URI to prevent tainting the canvas.
            const fontDataURL = await getGowunDodumFontDataURL();
            const fontStyle = `
                @font-face {
                    font-family: 'Gowun Dodum';
                    font-style: normal;
                    font-weight: 400;
                    src: url(${fontDataURL}) format('woff2');
                }
            `;

            const width = node.offsetWidth;
            const height = node.offsetHeight;
            
            const clonedNode = node.cloneNode(true) as HTMLElement;
            // Explicitly set the font-family on the cloned node for rendering within the SVG context.
            clonedNode.style.fontFamily = "'Gowun Dodum', serif";

            // Serialize the styled clone to an HTML string.
            const htmlString = clonedNode.outerHTML;

            // Wrap the HTML in an SVG with the embedded font style.
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                    <style>
                        ${fontStyle}
                    </style>
                    <foreignObject width="100%" height="100%">
                        <div xmlns="http://www.w3.org/1999/xhtml">${htmlString}</div>
                    </foreignObject>
                </svg>
            `;

            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = 2; // Render at 2x resolution for better quality.
                    canvas.width = width * scale;
                    canvas.height = height * scale;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.scale(scale, scale);
                        ctx.drawImage(img, 0, 0);
                        try {
                            const pngUrl = canvas.toDataURL('image/png');
                            const a = document.createElement('a');
                            a.href = pngUrl;
                            a.download = `landmark-explorer-certificate.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            resolve();
                        } catch (e) {
                             console.error("Failed to export canvas.", e);
                             reject(new Error("인증서 이미지 생성에 실패했습니다. 브라우저 보안 설정 때문일 수 있습니다."));
                        }
                    } else {
                        reject(new Error("Canvas context를 가져올 수 없습니다."));
                    }
                    URL.revokeObjectURL(url);
                };
                img.onerror = (e) => {
                    console.error("Failed to load SVG image for canvas conversion.", e);
                    URL.revokeObjectURL(url);
                    reject(new Error("이미지 다운로드에 실패했습니다. 다른 브라우저에서 시도해주세요."));
                };
                img.src = url;
            });
        } catch (error: any) {
            console.error("An error occurred during certificate download:", error);
            setDownloadError(error.message || "인증서 다운로드 중 알 수 없는 오류가 발생했습니다.");
        } finally {
            setIsDownloading(false);
        }
    };
    
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
        <div className="mt-12 p-4 sm:p-6 bg-white rounded-lg shadow-xl animate-fade-in">
            {/* The inline style forcing a system font has been removed to revert to using 'Gowun Dodum' from the stylesheet. */}
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
                    {tourHistory.map(landmark => (
                        <li key={landmark.name}>• <span className="font-semibold">{landmark.name}</span> ({landmark.city})</li>
                    ))}
                </ul>
                
                <div className="mt-10 sm:mt-12 text-center">
                    <p className="text-lg sm:text-xl">{dateString}</p>
                    <p className="text-xl sm:text-2xl font-bold text-rose-900 mt-2">AI 도슨트</p>
                </div>
            </div>
            <div className="text-center mt-6">
                 <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:scale-105 shadow-lg disabled:bg-stone-400 disabled:cursor-wait"
                 >
                    {isDownloading ? '생성 중...' : '인증서 이미지로 다운로드'}
                 </button>
                 {downloadError && <p className="text-red-600 mt-2 text-sm">{downloadError}</p>}
            </div>
        </div>
    );
};

export default Certificate;
