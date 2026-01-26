
import { FolderGit2, Plus, ArrowRight } from 'lucide-react';
import { type Project } from '../lib/api';

interface ProjectGridProps {
    projects: Project[];
    onSelect: (project: Project) => void;
}

export function ProjectGrid({ projects, onSelect }: ProjectGridProps) {
    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 animate-in slide-in-from-bottom-5 duration-500">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Select a Project</h2>
                    <p className="text-muted-foreground">Choose a workspace from your local agent to start coding.</p>
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                        <FolderGit2 className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No projects found</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                            Make sure your local agent is running and `agent.config.json` has projects configured.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => onSelect(project)}
                                className="group relative flex flex-col items-start p-5 h-auto bg-card hover:bg-accent/40 border border-border rounded-xl text-left transition-all hover:shadow-md hover:-translate-y-1"
                            >
                                <div className="p-2.5 bg-primary/10 text-primary rounded-lg mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <FolderGit2 className="w-6 h-6" />
                                </div>
                                <div className="font-semibold text-lg mb-1">{project.name}</div>
                                <div className="text-xs text-muted-foreground font-mono truncate w-full opacity-70 mb-4">
                                    {project.root}
                                </div>

                                <div className="mt-auto pt-4 w-full flex items-center justify-between border-t border-border/30 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                    <span>Open Workspace</span>
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>
                        ))}

                        <div className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground hover:bg-accent/20 hover:border-primary/30 hover:text-primary transition-all cursor-pointer">
                            <Plus className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-sm font-medium">Add to Config</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
