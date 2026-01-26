import { useState } from 'react';
import { Bot, Github } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = () => {
        setIsLoading(true);
        // Simulate auth delay
        setTimeout(() => {
            onLogin();
        }, 1500);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-in fade-in duration-500">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-border shadow-lg">
                        <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to DevPilot</h1>
                    <p className="text-muted-foreground text-sm">
                        Your pocket-sized AI coding companion. <br />
                        Connect to your local agent to start.
                    </p>
                </div>

                <div className="space-y-4 pt-4">
                    <button
                        onClick={() => handleLogin()}
                        disabled={isLoading}
                        className="w-full relative group overflow-hidden bg-foreground text-background hover:opacity-90 transition-all p-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                        ) : (
                            <>
                                <Github className="w-5 h-5" />
                                Continue with GitHub
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => handleLogin()}
                        disabled={isLoading}
                        className="w-full bg-card hover:bg-accent/50 border border-border text-foreground transition-all p-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">G</div>
                        Continue with Google
                    </button>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-8">
                    By continuing, you acknowledge that DevPilot modifies files on your local machine.
                </p>

                <div className="pt-8 border-t border-border/30">
                    <details className="group">
                        <summary className="text-xs text-muted-foreground cursor-pointer list-none flex items-center justify-center gap-1 hover:text-foreground transition-colors">
                            Advanced Options
                        </summary>
                        <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-medium text-muted-foreground block">API Endpoint</label>
                            <input
                                type="text"
                                placeholder="http://localhost:8787"
                                className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <p className="text-[10px] text-muted-foreground/70">
                                Override if you are hosting the worker on Cloudflare.
                            </p>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}
