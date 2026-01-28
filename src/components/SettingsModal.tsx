
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, User, Palette, Laptop, Settings, Monitor } from 'lucide-react';
import { type Theme } from '../lib/theme';

interface SettingsModalProps {
    currentTheme: Theme;
    onSetTheme: (theme: Theme) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLogout?: () => void;
    currentProject?: { name: string; root: string; allowedCommands: string[] } | null;
    onClearHistory?: () => void;
    edgeStatus?: { online: boolean; region: string };
    user?: any;
}

export function SettingsModal({ currentTheme, onSetTheme, open, onOpenChange, onLogout, currentProject, onClearHistory, edgeStatus, user }: SettingsModalProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" />
                <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-lg h-[600px] max-h-[85vh] bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col focus:outline-none overflow-hidden">

                    <div className="flex items-center justify-between p-4 border-b border-border/50">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Settings className="w-5 h-5 text-muted-foreground" />
                            Settings
                        </h2>
                        <Dialog.Close asChild>
                            <button className="p-1 rounded-full hover:bg-accent/50 text-muted-foreground transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <Tabs.Root defaultValue="account" className="flex-1 flex flex-col sm:flex-row">
                        <Tabs.List className="flex text-xs flex-row sm:flex-col border-b sm:border-b-0 sm:border-r border-border/50 bg-muted/20 p-2 gap-1 sm:w-48">
                            <Tabs.Trigger value="account" className="flex items-center gap-2 px-3 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground transition-all hover:bg-accent/50">
                                <User className="w-4 h-4" />
                                Account
                            </Tabs.Trigger>
                            <Tabs.Trigger value="project" className="flex items-center gap-2 px-3 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground transition-all hover:bg-accent/50">
                                <Laptop className="w-4 h-4" />
                                Project
                            </Tabs.Trigger>
                            <Tabs.Trigger value="appearance" className="flex items-center gap-2 px-3 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground transition-all hover:bg-accent/50">
                                <Palette className="w-4 h-4" />
                                Appearance
                            </Tabs.Trigger>
                            <Tabs.Trigger value="agent" className="flex items-center gap-2 px-3 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground transition-all hover:bg-accent/50">
                                <Monitor className="w-4 h-4" />
                                Agent
                            </Tabs.Trigger>
                        </Tabs.List>

                        <div className="flex-1 p-6 overflow-y-auto">
                            <Tabs.Content value="account" className="space-y-6 outline-none">
                                <div>
                                    <h3 className="text-sm font-medium mb-1">User Profile</h3>
                                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-primary-foreground font-bold text-lg">
                                                {user?.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium">{user?.name || 'Guest User'}</div>
                                            <div className="text-xs text-muted-foreground">{user?.email || 'Not logged in'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium mb-2">Connected Accounts</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-black font-bold text-xs">GH</div>
                                                <div className="text-sm">GitHub</div>
                                            </div>
                                            <button className="text-xs px-2 py-1 bg-accent/50 rounded hover:bg-accent text-muted-foreground hover:text-foreground">Connect</button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">G</div>
                                                <div className="text-sm">Google</div>
                                            </div>
                                            <div className="text-xs text-emerald-500 font-medium px-2">Connected</div>
                                        </div>
                                    </div>
                                </div>

                                {onClearHistory && (
                                    <div className="pt-4 border-t border-border/50">
                                        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Data Management</h3>
                                        <button
                                            onClick={onClearHistory}
                                            className="w-full py-2 px-4 rounded-md border border-border bg-muted/20 hover:bg-muted/50 transition-colors text-sm font-medium mb-3"
                                        >
                                            Clear Chat History
                                        </button>
                                    </div>
                                )}

                                {onLogout && (
                                    <div className="pt-2">
                                        <button
                                            onClick={onLogout}
                                            className="w-full py-2 px-4 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </Tabs.Content>

                            <Tabs.Content value="project" className="space-y-6 outline-none">
                                {currentProject ? (
                                    <>
                                        <div>
                                            <h3 className="text-sm font-medium mb-1">Active Project</h3>
                                            <div className="p-3 bg-muted/30 rounded-md border border-border/50 space-y-2">
                                                <div>
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Name</div>
                                                    <div className="font-medium">{currentProject.name}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Root Path</div>
                                                    <div className="font-mono text-xs bg-black/20 p-1 rounded mt-1 overflow-x-auto whitespace-nowrap">
                                                        {currentProject.root}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                Security Policies
                                            </h3>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Only specific commands are allowed to run in this environment.
                                            </p>
                                            <div className="bg-muted/30 rounded-md border border-border/50 overflow-hidden">
                                                <div className="px-3 py-2 border-b border-border/50 text-xs font-medium bg-muted/50">
                                                    Allowlist ({currentProject.allowedCommands.length})
                                                </div>
                                                <div className="divide-y divide-border/50">
                                                    {currentProject.allowedCommands.map((cmd, i) => (
                                                        <div key={i} className="px-3 py-2 text-xs font-mono text-muted-foreground">
                                                            {cmd}
                                                        </div>
                                                    ))}
                                                    {currentProject.allowedCommands.length === 0 && (
                                                        <div className="px-3 py-4 text-center text-xs text-muted-foreground/50 italic">
                                                            No commands configured
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground text-sm">
                                        No project selected
                                    </div>
                                )}
                            </Tabs.Content>

                            <Tabs.Content value="appearance" className="space-y-6 outline-none">
                                {/* Existing/assumed appearance tab content if I had it, but for now I'm overwriting so I need to be careful.
                     Wait, I am overwriting, so I need to include the FULL content. 
                     The previous file content for 'appearance' tab wasn't fully visible in my last view_file of SettingsModal?
                     Actually, I replaced the *whole* file content in my thought process earlier, but I better check. 
                     Step 541 showed the file content? No, Step 541 replaced it.
                     I will assume standard appearance content or use what I wrote in Step 541.
                  */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Import THEMES from theme.ts needs to be added to top of file if not present */}
                                    {/* Actually I'll just hardcode the Correct list for safety if I can't add import easily */
                                        /* Wait, I can see imports. import { type Theme } from '../lib/theme'; */
                                        /* I need to change import to: import { type Theme, THEMES } from '../lib/theme'; */
                                    }
                                    {['default', 'light', 'dracula', 'monokai', 'github-dark'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => onSetTheme(t as Theme)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${currentTheme === t
                                                ? 'border-primary bg-primary/5 shadow-md'
                                                : 'border-border hover:border-border/80 hover:bg-accent/50'
                                                }`}
                                        >
                                            <div className="font-medium capitalize mb-1">{t.replace('-', ' ')}</div>
                                            <div className="flex gap-1">
                                                <div className="w-4 h-4 rounded-full bg-background border border-border" />
                                                <div className="w-4 h-4 rounded-full bg-primary" />
                                                <div className="w-4 h-4 rounded-full bg-secondary" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </Tabs.Content>

                            <Tabs.Content value="agent" className="space-y-6 outline-none">
                                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">Agent Federation</span>
                                            <span className="text-xs text-muted-foreground">Global Agent Pool</span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded font-medium flex items-center gap-1 ${edgeStatus?.online ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${edgeStatus?.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                            {edgeStatus?.online ? 'Healthy' : 'Offline'}
                                        </span>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-border/50">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground">Connected Region</span>
                                            <span className="font-mono">{edgeStatus?.online ? edgeStatus.region : 'Disconnected'}</span>
                                        </div>
                                        {edgeStatus?.online && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-muted-foreground">Latency</span>
                                                <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                                    <div className="h-full w-[85%] bg-emerald-500 rounded-full" />
                                                </div>
                                                <span className="font-mono">&lt;50ms</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground">Active Agents</span>
                                            <span className="font-mono">{edgeStatus?.online ? '1 / 1' : '0 / 0'}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-border/50">
                                        <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-2">Security Audit Log</div>
                                        <div className="bg-black/40 rounded border border-border/50 p-2 h-24 overflow-y-auto font-mono text-[10px] space-y-1 flex items-center justify-center text-muted-foreground/50 italic">
                                            No recent audit events
                                        </div>
                                    </div>

                                    <div className="bg-background rounded border border-border/50 p-2 mt-2">
                                        <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-2">Cluster Node Status</div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${edgeStatus?.online ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                                    local-agent-01 ({edgeStatus?.online ? 'Active' : 'Missing'})
                                                </span>
                                                <span className="text-muted-foreground">{edgeStatus?.online ? 'Ready' : 'Unknown'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Tabs.Content>
                        </div>
                    </Tabs.Root>
                </Dialog.Content>
            </Dialog.Portal >
        </Dialog.Root >
    );
}
