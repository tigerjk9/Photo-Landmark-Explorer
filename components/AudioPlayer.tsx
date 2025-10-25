import React, { useState, useEffect, useRef } from 'react';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface AudioPlayerProps {
    base64Audio: string;
}

const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 00-.75.75v12c0 .414.336.75.75.75h2.25a.75.75 0 00.75-.75v-12a.75.75 0 00-.75-.75H6.75zm8.25 0a.75.75 0 00-.75.75v12c0 .414.336.75.75.75h2.25a.75.75 0 00.75-.75v-12a.75.75 0 00-.75-.75h-2.25z" clipRule="evenodd" />
    </svg>
);

const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        const setupAudio = async () => {
            if (base64Audio) {
                try {
                    // @ts-ignore
                    const context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                    audioContextRef.current = context;
                    const decodedBytes = decode(base64Audio);
                    const buffer = await decodeAudioData(decodedBytes, context, 24000, 1);
                    audioBufferRef.current = buffer;
                    setIsReady(true);
                } catch (error) {
                    console.error("오디오 데이터 디코딩 실패:", error);
                    setIsReady(false);
                }
            }
        };

        setupAudio();

        return () => {
            if (sourceRef.current) {
                sourceRef.current.stop();
                sourceRef.current.disconnect();
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base64Audio]);

    const togglePlayPause = () => {
        const audioContext = audioContextRef.current;
        if (!audioContext || !audioBufferRef.current) return;

        if (isPlaying) {
            if (sourceRef.current) {
                sourceRef.current.stop();
            }
            setIsPlaying(false);
        } else {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const source = audioContext.createBufferSource();
            source.buffer = audioBufferRef.current;
            source.connect(audioContext.destination);
            source.onended = () => {
                setIsPlaying(false);
                sourceRef.current = null;
            };
            source.start();
            sourceRef.current = source;
            setIsPlaying(true);
        }
    };

    return (
        <button
            onClick={togglePlayPause}
            disabled={!isReady}
            className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg transform transition-transform duration-200 hover:scale-110 disabled:bg-stone-300 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-opacity-75"
            aria-label={isPlaying ? '내레이션 일시정지' : '내레이션 재생'}
        >
            {isReady ? (
                isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>
            ) : (
                <div className="w-6 h-6 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
            )}
        </button>
    );
};

export default AudioPlayer;