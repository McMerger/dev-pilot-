import { useState, useEffect } from 'react';

export type Theme = 'default' | 'light' | 'dracula' | 'monokai' | 'github-dark';

export const THEMES: { id: Theme; label: string }[] = [
    { id: 'default', label: 'Antigravity' },
    { id: 'light', label: 'Light' },
    { id: 'dracula', label: 'Dracula' },
    { id: 'monokai', label: 'Monokai' },
    { id: 'github-dark', label: 'GitHub Dark' },
];

export function useTheme() {
    const [theme, setTheme] = useState<Theme>('default');

    useEffect(() => {
        // Load saved theme
        const saved = localStorage.getItem('devpilot-theme') as Theme;
        if (saved && THEMES.some(t => t.id === saved)) {
            setTheme(saved);
        }
    }, []);

    useEffect(() => {
        // Apply theme to html element
        const root = document.documentElement;
        if (theme === 'default') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', theme);
        }
        localStorage.setItem('devpilot-theme', theme);
    }, [theme]);

    // Handle system preference if no theme saved (optional enhancement)
    useEffect(() => {
        if (!localStorage.getItem('devpilot-theme')) {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (!systemPrefersDark) {
                // Could default to light if preferred, but keeping App default dark for now
            }
        }
    }, []);

    return { theme, setTheme };
}
