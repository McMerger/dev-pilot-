import React, { useState } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';
import { cn } from '../lib/utils';

interface PromptAreaProps {
    onSubmit: (prompt: string) => void;
    disabled?: boolean;
}

export function PromptArea({ onSubmit, disabled }: PromptAreaProps) {
    const [input, setInput] = useState('');

    const handleSubmit = () => {
        if (input.trim() && !disabled) {
            onSubmit(input.trim());
            setInput('');
        }
    };

    return (
        <div className="px-4 pb-4">
            <div className="relative rounded-2xl border border-border bg-card shadow-sm transition-shadow focus-within:ring-1 focus-within:ring-ring">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                    placeholder="Type a task..."
                    className="w-full bg-transparent border-none text-sm p-4 min-h-[120px] resize-none focus:outline-none placeholder:text-muted-foreground/70"
                    disabled={disabled}
                />

                <div className="flex items-center justify-between p-2 border-t border-border/50 bg-muted/20 rounded-b-2xl">
                    <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-background/50">
                        <Paperclip className="w-4 h-4" />
                    </button>

                    <button
                        onClick={handleSubmit}
                        className={cn(
                            "p-2 rounded-xl transition-all duration-200",
                            input.trim() && !disabled
                                ? "bg-primary text-primary-foreground shadow-md hover:opacity-90 scale-100"
                                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50 scale-95"
                        )}
                        disabled={!input.trim() || disabled}
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                </div>
            </div>


        </div>
    );
}
