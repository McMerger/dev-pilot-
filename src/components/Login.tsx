import { Bot, Github } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

// @ts-ignore
export function Login({ }: LoginProps) {
    const isLoading = false;



    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-in fade-in duration-500">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-border shadow-lg">
                        <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to Splitline</h1>
                    <p className="text-muted-foreground text-sm">
                        Your pocket-sized AI coding companion. <br />
                        Connect to your local agent to start.
                    </p>
                </div>

                <div className="space-y-4 pt-4">
                    <button
                        onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/auth/github`}
                        disabled={isLoading}
                        className="w-full relative group overflow-hidden bg-[#24292F] text-white hover:opacity-90 transition-all p-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Github className="w-5 h-5" />
                                Continue with GitHub
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/auth/google`}
                        disabled={isLoading}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 transition-all p-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">G</div>
                        Continue with Google
                    </button>

                    <button
                        onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/auth/apple`}
                        disabled={isLoading}
                        className="w-full bg-black text-white hover:opacity-90 transition-all p-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.35-1.09-.56-2.09-.48-3.08.35-1.04.86-2.17.92-3.07.35C5.6 19.8 4.09 16.92 4.09 14.1c0-2.3 2.1-4.22 4.49-4.22 1.3 0 2.37.59 2.98.59.62 0 1.95-.59 3.23-.59 2.45 0 3.79 1.95 3.79 1.95s-2.06 1.05-2.06 3.65c0 2.8 2.53 3.89 2.53 3.89-.04.13-.33 1.13-1.06 2.18-.75 1.08-1.55 2.15-2.34 2.15zM12.03 7.25c-.15 1.4-1.25 2.4-2.5 2.4-.15-1.16 1.09-2.28 2.3-2.43 1.25.07 2.05 1.16 2.05 1.16z" /></svg>
                        Continue with Apple
                    </button>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-8">
                    By continuing, you acknowledge that Splitline modifies files on your local machine.
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
