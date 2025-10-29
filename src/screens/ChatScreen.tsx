import React, { useState, useEffect, useRef } from 'react';
import { BackIcon } from '../constants';
import { TypewriterText } from '../components';
import type { ChatMessage, CoachIntent } from '../types';

export const ChatScreen: React.FC<{
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, intent?: CoachIntent) => void;
  onBack: () => void;
}> = ({ messages, isLoading, onSendMessage, onBack }) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: 'end' });
    };
  
    useEffect(() => {
      setTimeout(scrollToBottom, 100);
    }, [messages, isLoading]);
  
    const handleSend = () => {
      if (inputText.trim()) {
        onSendMessage(inputText.trim());
        setInputText('');
      }
    };
  
    return (
      <div className="h-full flex flex-col animate-chat-open bg-slate-900">
        <header className="flex justify-between items-center flex-shrink-0 h-20 px-4 pt-6 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-300 button-press"><BackIcon /></button>
          <h2 className="text-lg font-bold">Symmetric Coach</h2>
          <div className="w-8"></div>
        </header>
  
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex-1 space-y-4">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex items-start gap-2.5 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'coach' && <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 mt-1"></div>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-slate-700 text-gray-200 rounded-bl-lg'}`}>
                  {message.sender === 'coach' && index === messages.length - 1 && isLoading && message.text ? (
                     <TypewriterText text={message.text} speed={30} className="leading-relaxed whitespace-pre-wrap" />
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.sender === 'user' && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 mt-1"></div>
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-slate-700 text-gray-200 rounded-bl-lg shadow-md">
                  <p className="opacity-70 leading-relaxed">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>
        
        <footer className="w-full p-4 flex-shrink-0 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-full py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSend} className="bg-blue-600 text-white rounded-full p-2.5 button-press hover:bg-blue-500 transition-colors disabled:bg-gray-600" disabled={!inputText.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </footer>
      </div>
    );
};
