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
    user?: any;
}

export function TopBar({ selectedProject, onSelectProject, currentTheme, onSetTheme, onLogout, onClearHistory, user }: TopBarProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [edgeStatus, setEdgeStatus] = useState({ online: false, region: 'Offline' });
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const status = await checkAgentHealth();
            setEdgeStatus(status);
            if (status.online) {
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
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 pt-safe transition-all duration-300">
            <div className="relative">
                <button
                    onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-foreground hover:bg-accent/50 px-3 py-2 rounded-md transition-colors active:bg-accent/70 touch-manipulation select-none"
                >
                    <span className="truncate max-w-[120px] sm:max-w-xs">{selectedProject?.name || 'Select Project'}</span>
                    <ChevronDown className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
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
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2 group cursor-help" title={`Connected via Cloudflare Edge (${edgeStatus.region})`}>
                    <div className={`w-2 h-2 rounded-full ${edgeStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="hidden sm:inline font-medium">Edge: {edgeStatus.online ? edgeStatus.region : 'Offline'}</span>
                </div>

                <HelpModal />

                <button
                    onClick={() => setSettingsOpen(true)}
                    className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-gradient-to-tr from-primary/80 to-purple-500/80 flex items-center justify-center text-primary-foreground shadow-sm hover:opacity-90 transition-opacity active:scale-95 touch-manipulation select-none"
                    title="Settings & Account"
                >
                    <User className="w-5 h-5 md:w-4 md:h-4" />
                </button>

                <SettingsModal
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    currentTheme={currentTheme}
                    onSetTheme={onSetTheme}
                    onLogout={onLogout}
                    currentProject={selectedProject}
                    onClearHistory={onClearHistory}
                    edgeStatus={edgeStatus}
                    user={user}
                />
            </div>
        </div>
    );
}
