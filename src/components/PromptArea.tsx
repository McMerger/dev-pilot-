import { useState } from 'react';
import { ArrowUp, Paperclip, X } from 'lucide-react';
import { cn } from '../lib/utils';
import * as Dialog from '@radix-ui/react-dialog';

interface PromptAreaProps {
    onSubmit: (prompt: string) => void;
    disabled?: boolean;
}

export function PromptArea({ onSubmit, disabled }: PromptAreaProps) {
    const [input, setInput] = useState('');
    const [contextOpen, setContextOpen] = useState(false);

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
                    <Dialog.Root open={contextOpen} onOpenChange={setContextOpen}>
                        <Dialog.Trigger asChild>
                            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-background/50" title="Add File Context">
                                <Paperclip className="w-4 h-4" />
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" />
                            <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-sm bg-card border border-border rounded-lg shadow-2xl z-50 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold">Context Files</h3>
                                    <Dialog.Close asChild>
                                        <button className="p-1 rounded-full hover:bg-muted text-muted-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </Dialog.Close>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-3 bg-muted/20 rounded-md border border-border/50 text-xs text-muted-foreground">
                                        <p>Mention files in your prompt to give the agent context. Example:</p>
                                        <p className="font-mono mt-1 text-foreground">"Refactor utils.ts"</p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Quick References (Manual)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="e.g. src/App.tsx"
                                                className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                                id="file-input"
                                            />
                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById('file-input') as HTMLInputElement;
                                                    if (input.value) {
                                                        const val = input.value;
                                                        setInput(prev => prev + (prev ? ' ' : '') + ` @${val}`);
                                                        input.value = '';
                                                        setContextOpen(false);
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md font-medium hover:opacity-90"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>

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
