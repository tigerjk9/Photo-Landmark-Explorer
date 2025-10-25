import React, { useState, useEffect } from 'react';
import { LandmarkInfo } from '../types';

interface CertificateProps {
    explorerName: string;
    tourHistory: LandmarkInfo[];
    apiKey: string;
}

const Certificate: React.FC<CertificateProps> = ({ explorerName, tourHistory }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string>('');

    // 수료증 생성
    const generateCertificate = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        canvas.width = 800;
        canvas.height = 600;

        // 그라데이션 배경
        const gradient = ctx.createLinearGradient(0, 0, 0, 600);
        gradient.addColorStop(0, '#fef2f2');
        gradient.addColorStop(1, '#fecaca');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 600);

        // 메인 프레임
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 10;
        ctx.strokeRect(25, 25, 750, 550);

        // 내부 프레임
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, 720, 520);

        // 제목 영역
        ctx.fillStyle = '#7f1d1d';
        ctx.font = 'bold 48px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('수료증', 400, 100);

        // 영문 제목
        ctx.font = '24px Georgia, serif';
        ctx.fillStyle = '#b91c1c';
        ctx.fillText('Certificate of Completion', 400, 135);

        // 장식선
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(250, 155);
        ctx.lineTo(550, 155);
        ctx.stroke();

        // 이름 섹션
        ctx.fillStyle = '#1f2937';
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText('This is to certify that', 400, 200);

        // 탐험가 이름 (강조)
        ctx.fillStyle = '#7f1d1d';
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.fillText(explorerName || 'Explorer', 400, 245);

        // 설명
        ctx.fillStyle = '#1f2937';
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText('has successfully completed the Photo Landmark Explorer program', 400, 285);
        ctx.fillText('by exploring the following landmarks:', 400, 315);

        // 랜드마크 목록 박스
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(200, 340, 400, Math.min(tourHistory.length * 30 + 20, 140));

        // 랜드마크 리스트
        ctx.fillStyle = '#374151';
        ctx.font = '16px Arial, sans-serif';
        ctx.textAlign = 'left';

        const maxShow = 4;
        tourHistory.slice(0, maxShow).forEach((landmark, idx) => {
            const y = 365 + idx * 30;
            ctx.fillText(`• ${landmark.name}, ${landmark.city}`, 220, y);
        });

        if (tourHistory.length > maxShow) {
            ctx.fillText(`... and ${tourHistory.length - maxShow} more locations`, 220, 365 + maxShow * 30);
        }

        // 날짜
        ctx.textAlign = 'center';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillStyle = '#4b5563';
        const date = new Date();
        ctx.fillText(`${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 520);

        // 서명
        ctx.font = 'italic 20px Georgia, serif';
        ctx.fillStyle = '#7f1d1d';
        ctx.fillText('AI Tour Guide', 400, 545);

        return canvas.toDataURL('image/png');
    };

    useEffect(() => {
        const url = generateCertificate();
        setDownloadUrl(url);
    }, [explorerName, tourHistory]);

    const handleDownload = () => {
        if (!downloadUrl) return;
        setIsDownloading(true);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `certificate-${explorerName || 'explorer'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => setIsDownloading(false), 1000);
    };

    return (
        <div className="mt-12 p-6 bg-white rounded-lg shadow-xl">
            <h3 className="text-2xl font-bold text-center mb-6 text-stone-800">
                탐험 수료증
            </h3>
            
            {/* 미리보기 */}
            <div className="mb-6 border-4 border-stone-200 rounded-lg overflow-hidden">
                {downloadUrl && (
                    <img 
                        src={downloadUrl} 
                        alt="Certificate Preview" 
                        className="w-full h-auto"
                        style={{ maxHeight: '500px', objectFit: 'contain' }}
                    />
                )}
            </div>

            {/* 다운로드 버튼 */}
            <div className="text-center">
                <button
                    onClick={handleDownload}
                    disabled={isDownloading || !downloadUrl}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:scale-105 shadow-lg disabled:bg-stone-400"
                >
                    {isDownloading ? '다운로드 중...' : '📥 수료증 다운로드'}
                </button>
                <p className="text-sm text-stone-500 mt-3">
                    * 이미지를 우클릭하여 저장할 수도 있습니다
                </p>
            </div>
        </div>
    );
};

export default Certificate;
