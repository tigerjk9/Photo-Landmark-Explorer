import React, { useState, useRef, useEffect } from 'react';
import { askQuestion } from '../services/geminiService';
import { ChatMessage } from '../types';

interface QAChatProps {
    landmarkName: string;
    history: string;
    userLevel: string;
    apiKey: string;
}

const QAChat: React.FC<QAChatProps> = ({ landmarkName, history, userLevel, apiKey }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastMessage, setLastMessage] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const submitMessage = async (message: string) => {
        if (!message.trim() || isLoading) return;
        
        setError(null);
        const userMessage: ChatMessage = { role: 'user', content: message };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setLastMessage(message);

        try {
            const modelResponse = await askQuestion(apiKey, landmarkName, history, message, userLevel);
            const modelMessage: ChatMessage = { role: 'model', content: modelResponse };
            setMessages((prev) => [...prev, modelMessage]);
            setLastMessage('');
        } catch (err) {
            setMessages(prev => prev.slice(0, prev.length - 1));
            setError('죄송합니다, 답변을 생성하는 중에 오류가 발생했습니다.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        submitMessage(inputValue);
        setInputValue('');
    };

    const handleRetry = () => {
        submitMessage(lastMessage);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-stone-800 mb-4">AI 도슨트와 Q&A</h3>
            <div className="h-64 bg-stone-100 rounded-md p-4 overflow-y-auto flex flex-col gap-4 mb-4">
                {messages.length === 0 && (
                     <p className="text-stone-500 m-auto">궁금한 점을 AI 도슨트에게 물어보세요!</p>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-rose-500 text-white' : 'bg-stone-200 text-stone-800'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-stone-200 text-stone-800 p-3 rounded-lg flex items-center gap-2">
                           <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
                           <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                           <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="예: '이 건물을 짓는 데 얼마나 걸렸나요?'"
                    className="flex-grow bg-stone-100 text-stone-800 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold p-3 rounded-full transition duration-300 transform hover:scale-110 disabled:bg-stone-300 disabled:cursor-not-allowed"
                    aria-label="질문 전송"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086L2.279 16.76a.75.75 0 00.95.826l16-5.333a.75.75 0 000-1.496l-16-5.333z" />
                    </svg>
                </button>
            </form>
            {error && !isLoading && (
                <div className="mt-2 text-center">
                    <p className="text-sm text-red-600">{error}</p>
                    <button onClick={handleRetry} disabled={isLoading} className="mt-1 text-sm text-rose-600 hover:underline disabled:text-stone-500">
                        마지막 메시지 재전송
                    </button>
                </div>
            )}
        </div>
    );
};

export default QAChat;