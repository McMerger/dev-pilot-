import React from 'react';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Task } from '../lib/api';

interface TaskListProps {
    tasks: Task[];
}

function getStatusIcon(status: Task['status']) {
    switch (status) {
        case 'running':
        case 'planning':
        case 'pending':
            return <CircleDashed className="w-5 h-5 animate-spin text-blue-500" />;
        case 'done':
            return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
        case 'error':
            return <XCircle className="w-5 h-5 text-red-500" />;
    }
}

function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function TaskList({ tasks }: TaskListProps) {
    return (
        <div className="flex-1 overflow-y-auto min-h-0 bg-background/50">
            <div className="sticky top-0 px-4 py-2 bg-background/95 backdrop-blur-sm border-b border-border/50 text-xs font-medium text-muted-foreground z-10 flex justify-between items-center">
                <span>Recent Activity</span>
                <span className="text-muted-foreground/50">{tasks.length} tasks</span>
            </div>

            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs mt-1">Send a prompt to get started</p>
                </div>
            ) : (
                <div className="flex flex-col">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="p-4 border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">{getStatusIcon(task.status)}</div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                        {task.prompt}
                                    </h3>
                                    {task.resultSummary && (
                                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                            {task.resultSummary}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                            task.status === 'done' && "bg-emerald-500/20 text-emerald-400",
                                            task.status === 'running' && "bg-blue-500/20 text-blue-400",
                                            task.status === 'error' && "bg-red-500/20 text-red-400",
                                            (task.status === 'pending' || task.status === 'planning') && "bg-amber-500/20 text-amber-400"
                                        )}>
                                            {task.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {formatTime(task.createdAt)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
