import { useState, useEffect } from 'react';
import { ChevronDown, User } from 'lucide-react';
import { getProjects, checkAgentHealth, type Project } from '../lib/api';
import { type Theme } from '../lib/theme';
import { HelpModal } from './HelpModal';
import { SettingsModal } from './SettingsModal';

interface TopBarProps {
    selectedProject: Project | null;
    onSelectProject: (project: Project) => void;
    currentTheme: Theme;
    onSetTheme: (theme: Theme) => void;
    onLogout?: () => void;
    onClearHistory?: () => void;
}

export function TopBar({ selectedProject, onSelectProject, currentTheme, onSetTheme, onLogout, onClearHistory }: TopBarProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isOnline, setIsOnline] = useState(false);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const online = await checkAgentHealth();
            setIsOnline(online);
            if (online) {
                const projs = await getProjects();
                setProjects(projs);
                if (projs.length > 0 && !selectedProject) {
                    onSelectProject(projs[0]);
                }
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [selectedProject, onSelectProject]);

    return (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="relative">
                <button
                    onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-foreground hover:bg-accent/50 px-2 py-1.5 rounded-md transition-colors"
                >
                    <span>{selectedProject?.name || 'Select Project'}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {projectDropdownOpen && projects.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50">
                        {projects.map((proj) => (
                            <button
                                key={proj.id}
                                onClick={() => {
                                    onSelectProject(proj);
                                    setProjectDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 first:rounded-t-lg last:rounded-b-lg"
                            >
                                {proj.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2 group cursor-help" title="Connected via Cloudflare Edge (IAD)">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="hidden sm:inline font-medium">Edge: {isOnline ? 'IAD' : 'Offline'}</span>
                </div>

                <HelpModal />

                <button
                    onClick={() => setSettingsOpen(true)}
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/80 to-purple-500/80 flex items-center justify-center text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                    title="Settings & Account"
                >
                    <User className="w-4 h-4" />
                </button>

                <SettingsModal
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    currentTheme={currentTheme}
                    onSetTheme={onSetTheme}
                    onLogout={onLogout}
                    currentProject={selectedProject}
                    onClearHistory={onClearHistory}
                />
            </div>
        </div>
    );
}
