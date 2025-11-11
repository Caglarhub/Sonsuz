
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, Source } from './types';
import { ChatMessage } from './components/ChatMessage';
import { DocumentIcon, LoadingSpinner, SendIcon, SearchIcon, SparklesIcon } from './components/Icons';

const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useSearch, setUseSearch] = useState(false);
    const [useDeepThink, setUseDeepThink] = useState(false);

    const chatRef = useRef<Chat | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height to recalculate
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${scrollHeight}px`;
        }
    }, [input]);

    const getChatSession = useCallback(() => {
        if (chatRef.current) {
            return chatRef.current;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const config: any = {
            systemInstruction: 'Sen "Imajinize & Optimize", yardımsever bir asistansın. Kısa ve öz ve yardımsever ol.',
            tools: useSearch ? [{ googleSearch: {} }] : [],
        };

        if (useDeepThink) {
            config.thinkingConfig = { thinkingBudget: 24576 };
        }

        const modelConfig = {
            model: "gemini-2.5-flash",
            config: config,
        };

        const chat = ai.chats.create(modelConfig);
        chatRef.current = chat;
        return chat;
    }, [useSearch, useDeepThink]);

    const callApiAndStreamResponse = useCallback(async (prompt: string) => {
        setIsLoading(true);

        const botMessageId = (Date.now() + 1).toString();
        const botMessagePlaceholder: Message = { id: botMessageId, text: '', sender: 'bot' };
        setMessages(prev => [...prev, botMessagePlaceholder]);
        
        try {
            const chat = getChatSession();
            
            const stream = await chat.sendMessageStream({ message: prompt });

            let fullText = '';
            let finalResponse: GenerateContentResponse | null = null;
            for await (const chunk of stream) {
                finalResponse = chunk;
                fullText += chunk.text;
                setMessages(prev => prev.map(msg => 
                    msg.id === botMessageId ? { ...msg, text: fullText, error: false } : msg
                ));
            }

            const groundingChunks = finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources: Source[] = (groundingChunks
                ?.map((chunk: any) => ({
                    uri: chunk.web?.uri || chunk.maps?.uri,
                    title: chunk.web?.title || chunk.maps?.title
                })) || [])
                .filter((source: { uri?: string; title?: string }): source is Source => !!source.uri);


            setMessages(prev => prev.map(msg => 
                msg.id === botMessageId ? { ...msg, text: fullText, sources } : msg
            ));

        } catch (err) {
            console.error(err);
            setMessages(prev => prev.map(msg => 
                msg.id === botMessageId ? { 
                    ...msg, 
                    text: `Bir hata oluştu. Lütfen tekrar deneyin.`, 
                    error: true 
                } : msg
            ));
        } finally {
            setIsLoading(false);
        }
    }, [getChatSession]);

    const doSendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        
        await callApiAndStreamResponse(currentInput);
    }, [input, isLoading, callApiAndStreamResponse]);

    const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        await doSendMessage();
    }, [doSendMessage]);

    const handleRetry = useCallback(async (failedBotMessageId: string) => {
        if (isLoading) return;

        const failedMessageIndex = messages.findIndex(msg => msg.id === failedBotMessageId);
        if (failedMessageIndex < 1) return;

        const userMessageToRetry = messages[failedMessageIndex - 1];
        if (userMessageToRetry.sender !== 'user') return;

        // Remove the failed bot message
        setMessages(prev => prev.slice(0, failedMessageIndex));

        await callApiAndStreamResponse(userMessageToRetry.text);
    }, [isLoading, messages, callApiAndStreamResponse]);
    
    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="flex-shrink-0 border-b border-gray-700">
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
                <div className="p-3 flex items-center justify-center gap-3">
                    <SparklesIcon className="w-7 h-7 text-purple-400" />
                    <h1 className="text-xl font-bold text-gray-200 tracking-wide">Imajinize & Optimize</h1>
                </div>
            </header>
            <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                 {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <DocumentIcon className="w-16 h-16 mb-4 text-gray-600"/>
                        <h2 className="text-2xl font-semibold text-gray-300">Imajinize & Optimize'a hoş geldiniz.</h2>
                        <p className="mt-2">Bugün size nasıl yardımcı olabilirim?</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <ChatMessage key={message.id} message={message} onRetry={handleRetry} />
                    ))
                )}
            </main>
            <footer className="p-4 border-t border-gray-700 bg-gray-900">
                <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto flex items-center gap-3">
                    <div className="relative flex-1">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    doSendMessage();
                                }
                            }}
                            placeholder="Bana istediğini sor..."
                            rows={1}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-5 pr-14 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            style={{ maxHeight: '200px' }}
                            disabled={isLoading}
                        />
                         <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:text-white hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            disabled={isLoading || !input.trim()}
                        >
                            {isLoading ? <LoadingSpinner className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                        </button>
                    </div>
                    <label htmlFor="deep-think-toggle" className={`flex items-center gap-2 p-2 rounded-full transition-colors ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-700'}`} title="Daha karmaşık sorular için derin düşünme modunu kullan">
                        <input
                            id="deep-think-toggle"
                            type="checkbox"
                            checked={useDeepThink}
                            onChange={() => {
                                setUseDeepThink(!useDeepThink);
                                chatRef.current = null; // Invalidate current chat session
                            }}
                            className="sr-only"
                            disabled={isLoading}
                        />
                        <SparklesIcon className={`w-6 h-6 transition-colors ${useDeepThink ? 'text-purple-400' : 'text-gray-500'}`} />
                    </label>
                    <label htmlFor="search-toggle" className={`flex items-center gap-2 p-2 rounded-full transition-colors ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-700'}`} title="Güncel bilgiler için Google Arama'yı kullan">
                        <input
                            id="search-toggle"
                            type="checkbox"
                            checked={useSearch}
                            onChange={() => {
                                setUseSearch(!useSearch);
                                chatRef.current = null; // Invalidate current chat session
                            }}
                            className="sr-only"
                            disabled={isLoading}
                        />
                        <SearchIcon className={`w-6 h-6 transition-colors ${useSearch ? 'text-indigo-400' : 'text-gray-500'}`} />
                    </label>
                </form>
            </footer>
        </div>
    );
};

export default App;