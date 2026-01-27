import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { AgentHeader } from './components/AgentHeader';
import { PromptArea } from './components/PromptArea';
import { TaskList } from './components/TaskList';
import { Login } from './components/Login';
import { ProjectGrid } from './components/ProjectGrid';
import { createTask, getTask, getProjects, getTasks, type Project, type Model, type Task } from './lib/api';

import { useTheme } from './lib/theme';

function App() {
    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // App State
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
    const [selectedMode, setSelectedMode] = useState('planning');
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);

    // Task Persistence
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Theme
    const { theme, setTheme } = useTheme();

    // Check for existing session or URL token
    useEffect(() => {
        // 1. Check URL for token (OAuth callback)
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            localStorage.setItem('devpilot-session', token); // Store JWT
            setIsLoggedIn(true);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            // 2. Check LocalStorage
            const savedSession = localStorage.getItem('devpilot-session');
            if (savedSession) {
                setIsLoggedIn(true);
            }
        }
    }, []);

    // Fetch data when logged in
    useEffect(() => {
        if (isLoggedIn) {
            getProjects().then(setAvailableProjects).catch(console.error);
            getTasks().then(setTasks).catch(console.error);
        }
    }, [isLoggedIn]);

    const handleLogin = () => {
        setIsLoggedIn(true);
        localStorage.setItem('devpilot-session', 'true');
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setSelectedProject(null);
        localStorage.removeItem('devpilot-session');
    };

    const handleClearHistory = () => {
        if (confirm('Are you sure you want to clear all task history?')) {
            setTasks([]);
            localStorage.removeItem('devpilot-tasks');
        }
    };

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

    // 1. Login Screen
    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-foreground antialiased selection:bg-primary/20">
            <TopBar
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                currentTheme={theme}
                onSetTheme={setTheme}
                onLogout={handleLogout}
                onClearHistory={handleClearHistory}
            />

            <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                {/* 2. Project Selection / Welcome Screen */}
                {!selectedProject ? (
                    <ProjectGrid
                        projects={availableProjects}
                        onSelect={setSelectedProject}
                    />
                ) : (
                    <>
                        {/* 3. Main Chat Interface */}
                        {/* Header (Sticky Top) */}
                        <div className="flex-none z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm transition-all duration-200">
                            <AgentHeader
                                selectedMode={selectedMode}
                                onSelectMode={setSelectedMode}
                                selectedModel={selectedModel}
                                onSelectModel={setSelectedModel}
                            />
                        </div>

                        {/* Task List (Scrollable Middle) */}
                        <TaskList tasks={tasks} />

                        {/* Input Area (Sticky Bottom) */}
                        <div className="flex-none z-20 bg-background/80 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                            <PromptArea onSubmit={handleSubmit} disabled={isSubmitting || !selectedProject || !selectedModel} />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
