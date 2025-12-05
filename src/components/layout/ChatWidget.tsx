'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Loader2, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: 'http://localhost:4000/api/ai/chat', // Ensure this points to your backend
        headers: {
            'Authorization': `Bearer ${user?.token}` // Pass the token if available
        }
    });
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!user) return null; // Don't show if not logged in

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-300"
                >
                    <MessageCircle className="h-6 w-6 text-primary-foreground" />
                </Button>
            )}

            {isOpen && (
                <div className="bg-background border rounded-lg shadow-xl w-[400px] h-[600px] flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {/* Header */}
                    <div className="p-4 border-b flex justify-between items-center bg-muted/50 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <h3 className="font-semibold">NOC Assistant</h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground text-sm py-8">
                                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>Hello! I can help you check alerts, monitor hosts, and run diagnostics.</p>
                                </div>
                            )}

                            {messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "flex flex-col gap-1 max-w-[85%]",
                                        m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "p-3 rounded-lg text-sm",
                                            m.role === 'user'
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-foreground"
                                        )}
                                    >
                                        {m.content}
                                    </div>
                                    {/* Render tool invocations if needed, though Vercel SDK handles text response usually */}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex items-center gap-2 text-muted-foreground text-xs ml-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Thinking...
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t bg-background rounded-b-lg">
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Ask about alerts or hosts..."
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
