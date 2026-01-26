import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { AgentHeader } from './components/AgentHeader';
import { PromptArea } from './components/PromptArea';
import { TaskList } from './components/TaskList';
import { createTask, getTask, type Project, type Model, type Task } from './lib/api';

import { useTheme } from './lib/theme';

function App() {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedMode, setSelectedMode] = useState('planning');
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize theme management
    const { theme, setTheme } = useTheme();

    const handleSubmit = async (prompt: string) => {
        if (!selectedProject || !selectedModel) {
            console.error('Please select a project and model');
            return;
        }

        setIsSubmitting(true);
        try {
            const task = await createTask({
                projectId: selectedProject.id,
                prompt,
                mode: selectedMode,
                modelId: selectedModel.id,
            });
            setTasks((prev) => [task, ...prev]);

            // Poll for task completion
            const pollTask = async () => {
                const updated = await getTask(task.id);
                setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                if (updated.status === 'running' || updated.status === 'pending' || updated.status === 'planning') {
                    setTimeout(pollTask, 1000);
                }
            };
            setTimeout(pollTask, 1000);
        } catch (err) {
            console.error('Failed to create task:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-foreground antialiased selection:bg-primary/20">
            <TopBar
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                currentTheme={theme}
                onSetTheme={setTheme}
            />

            <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                <div className="flex-none z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm">
                    <AgentHeader
                        selectedMode={selectedMode}
                        onSelectMode={setSelectedMode}
                        selectedModel={selectedModel}
                        onSelectModel={setSelectedModel}
                    />
                    <PromptArea onSubmit={handleSubmit} disabled={isSubmitting || !selectedProject || !selectedModel} />
                </div>

                <TaskList tasks={tasks} />
            </main>
        </div>
    );
}

export default App;
