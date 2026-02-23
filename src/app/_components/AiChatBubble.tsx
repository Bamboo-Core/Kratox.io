'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(/\/$/, '');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiChatBubble() {
  const { t, i18n } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync welcome message whenever language changes
  useEffect(() => {
    setMessages([{ role: 'assistant', content: t('aiChat.welcomeMessage') }]);
  }, [i18n.language, t]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    // Add empty assistant message to fill via streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          lang: i18n.language,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('connection failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { role: 'assistant', content: last.content + chunk }];
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: t('aiChat.errorMessage') },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-white/10 bg-[#0f172a] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">{t('aiChat.assistantName')}</p>
                <p className="text-blue-200 text-xs mt-0.5">{t('aiChat.poweredBy')}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label={t('aiChat.closeAriaLabel')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white/10 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.role === 'assistant' && msg.content === '' && isLoading && (
                    <span className="inline-flex gap-1 items-center">
                      <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-white/5 border-t border-white/10 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('aiChat.inputPlaceholder')}
              disabled={isLoading}
              className="flex-1 bg-white/10 text-white placeholder-gray-400 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition flex-shrink-0"
              aria-label={t('aiChat.sendAriaLabel')}
            >
              {isLoading ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <Send size={16} className="text-white" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-24 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg hover:scale-110 transition-transform flex items-center justify-center animate-in slide-in-from-bottom-5 fade-in duration-500"
        aria-label={t('aiChat.ariaLabel')}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Bot size={26} className="text-white" />
        )}
      </button>
    </>
  );
}
