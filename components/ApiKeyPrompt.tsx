import React, { useState } from 'react';

interface ApiKeyPromptProps {
    apiKey: string | null;
    onApiKeySubmit: (key: string) => void;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ apiKey, onApiKeySubmit }) => {
    const [keyInput, setKeyInput] = useState('');

    const handleKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (keyInput.trim()) {
            onApiKeySubmit(keyInput.trim());
            setKeyInput('');
        }
    };

    return (
        <div className="mb-8 p-6 bg-white/30 backdrop-blur-sm rounded-lg">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-semibold text-stone-700">Google Gemini API 키</h2>
               <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-1 px-3 rounded-full transition duration-300 transform hover:scale-105"
                >
                    키 받으러 가기
                </a>
            </div>
            {apiKey ? (
               <div className="flex items-center gap-2">
                 <p className="flex-grow text-left bg-white/50 p-3 rounded-full text-stone-600 shadow-inner px-5">API 키가 저장되었습니다.</p>
                 <button 
                    onClick={() => onApiKeySubmit('')} 
                    className="bg-stone-400 hover:bg-stone-500 text-white font-semibold py-2 px-4 rounded-full transition-colors"
                 >
                    수정
                 </button>
               </div>
            ) : (
              <form onSubmit={handleKeySubmit} className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="여기에 API 키를 붙여넣으세요"
                  className="flex-grow w-full sm:w-auto bg-white text-stone-800 rounded-full py-3 px-5 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-inner"
                  aria-label="Gemini API Key"
                />
                <button
                  type="submit"
                  disabled={!keyInput.trim()}
                  className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 disabled:bg-stone-300"
                >
                  키 저장
                </button>
              </form>
            )}
        </div>
    );
};

export default ApiKeyPrompt;
