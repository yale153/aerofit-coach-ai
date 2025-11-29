import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, MessageSquare, StopCircle } from 'lucide-react';
import { Button } from './Button';
import { chatWithCoach } from '../services/gemini';
import { ChatMessage, AppState } from '../types';

interface ChatBotProps {
  apiKey: string;
  appState: AppState;
}

export const ChatBot: React.FC<ChatBotProps> = ({ apiKey, appState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from local storage
  useEffect(() => {
    const savedChat = localStorage.getItem('aerofit_chat_history');
    if (savedChat) {
      setMessages(JSON.parse(savedChat));
    } else {
        // Initial greeting
        setMessages([{
            id: 'init',
            role: 'model',
            text: 'Comandi! Sono il Tenente Colonnello Falco. Pronto a pianificare la missione odierna? Dimmi come ti senti o se hai dubbi sulla scheda.',
            timestamp: Date.now()
        }]);
    }
  }, []);

  // Save chat history
  useEffect(() => {
    localStorage.setItem('aerofit_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'it-IT';
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
            setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error(event.error);
            setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
        recognitionRef.current?.stop();
    } else {
        recognitionRef.current?.start();
        setIsListening(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !apiKey) return;

    const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: input,
        timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        // Construct context from app state
        const context = `
            Statistiche Utente: ${appState.userStats.height}cm, ${appState.userStats.weight}kg.
            Sessioni completate: ${appState.history.length}.
            Piano attuale: ${appState.currentPlan.length > 0 ? 'Attivo' : 'Nessuno'}.
        `;

        // Format history for Gemini
        const apiHistory = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await chatWithCoach(apiKey, apiHistory, userMsg.text, context);
        
        const botMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            text: responseText || "Ricevuto. Procediamo.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, botMsg]);

    } catch (error) {
        console.error(error);
        const errorMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            text: "Errore di comunicazione col Comando. Controlla la tua API Key.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
        <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 bg-military-600 text-white p-4 rounded-full shadow-2xl hover:bg-military-500 transition-all z-50 border-2 border-military-400"
        >
            <MessageSquare size={28} />
        </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
        {/* Header */}
        <div className="bg-military-700 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-bold tracking-wider">COACH FALCO</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:text-military-200">
                <X size={20} />
            </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-900/95">
            {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                        msg.role === 'user' 
                        ? 'bg-military-600 text-white rounded-br-none' 
                        : 'bg-stone-800 text-stone-200 rounded-bl-none border border-stone-700'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-stone-800 p-3 rounded-lg rounded-bl-none">
                        <span className="animate-pulse">Scrivendo...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-stone-800 border-t border-stone-700 flex gap-2 items-center">
            <button 
                onClick={toggleListening}
                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-600 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
                title="Dettatura vocale"
            >
                {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Chiedi al coach..."
                className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white resize-none h-10 focus:ring-1 focus:ring-military-500 focus:outline-none scrollbar-hide"
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2 bg-military-600 text-white rounded-lg hover:bg-military-500 disabled:opacity-50"
            >
                <Send size={18} />
            </button>
        </div>
    </div>
  );
};