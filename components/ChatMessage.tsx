
import React from 'react';
import { Message } from '../types';
import { BotIcon, UserIcon, RefreshIcon } from './Icons';

interface ChatMessageProps {
    message: Message;
    onRetry?: (messageId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry }) => {
    const isBot = message.sender === 'bot';

    const renderText = (text: string) => {
        // Simple markdown link renderer
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts = text.split(linkRegex);

        return parts.map((part, i) => {
            if (i % 3 === 1) { // Title part of the link
                const url = parts[i + 1];
                return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {part}
                    </a>
                );
            }
            if (i % 3 === 2) { // URL part, already handled
                return null;
            }

            // Simple bold
            const boldRegex = /\*\*(.*?)\*\*/gs;
            const subParts = part.split(boldRegex);

            return subParts.map((subPart, j) => {
                if (j % 2 === 1) {
                    return <strong key={`${i}-${j}`}>{subPart}</strong>;
                }
                return subPart;
            })

        }).flat();
    };

    return (
        <div className={`flex items-start gap-4 py-4 ${isBot ? '' : 'flex-row-reverse'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isBot ? 'bg-indigo-500' : 'bg-blue-500'}`}>
                {isBot ? <BotIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
            </div>
            <div className={`w-full max-w-2xl px-5 py-4 rounded-xl shadow-md ${isBot ? 'bg-gray-800 rounded-bl-none' : 'bg-gray-700 rounded-br-none'}`}>
                <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                    {renderText(message.text)}
                    {message.text.length === 0 && <div className="animate-pulse">...</div>}
                </div>
                {message.error && onRetry && (
                     <div className="mt-4">
                        <button
                            onClick={() => onRetry(message.id)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                        >
                            <RefreshIcon className="w-4 h-4" />
                            Yeniden Dene
                        </button>
                    </div>
                )}
                {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-700">
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Kaynaklar:</h4>
                        <ul className="list-none p-0 m-0 space-y-1">
                            {message.sources.map((source, index) => (
                                <li key={index}>
                                    <a
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 text-sm break-all"
                                    >
                                        {index + 1}. {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
