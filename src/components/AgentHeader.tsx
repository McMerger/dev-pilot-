import { useState, useEffect } from 'react';
import { Bot, ChevronDown, Sparkles, Zap } from 'lucide-react';
import { getModels, type Model } from '../lib/api';

interface AgentHeaderProps {
    selectedMode: string;
    onSelectMode: (mode: string) => void;
    selectedModel: Model | null;
    onSelectModel: (model: Model) => void;
}

const MODES = [
    { id: 'fast', label: 'Fast', icon: Zap },
    { id: 'planning', label: 'Planning', icon: Sparkles },
];

export function AgentHeader({ selectedMode, onSelectMode, selectedModel, onSelectModel }: AgentHeaderProps) {
    const [models, setModels] = useState<Model[]>([]);
    const [modeDropdown, setModeDropdown] = useState(false);
    const [modelDropdown, setModelDropdown] = useState(false);

    useEffect(() => {
        getModels().then((data) => {
            setModels(data);
            if (data.length > 0 && !selectedModel) {
                onSelectModel(data[0]);
            }
        }).catch(console.error);
    }, [selectedModel, onSelectModel]);

    const currentMode = MODES.find((m) => m.id === selectedMode) || MODES[0];
    const ModeIcon = currentMode.icon;

    return (
        <div className="px-4 py-4 pt-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Bot className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">DevPilot</h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                {/* Mode Selector */}
                <div className="relative">
                    <button
                        onClick={() => setModeDropdown(!modeDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium hover:border-primary/50 transition-colors whitespace-nowrap"
                    >
                        <ModeIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>{currentMode.label} Mode</span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
                    </button>
                    {modeDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50">
                            {MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => {
                                        onSelectMode(mode.id);
                                        setModeDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                                >
                                    <mode.icon className="w-4 h-4" />
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Model Selector */}
                <div className="relative">
                    <button
                        onClick={() => setModelDropdown(!modelDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium hover:border-primary/50 transition-colors whitespace-nowrap"
                    >
                        <span>{selectedModel?.label || 'Select Model'}</span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
                    </button>
                    {modelDropdown && models.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                            <div className="p-1.5 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                                Google Deepmind
                            </div>
                            {models.filter(m => m.id.includes('gemini')).map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onSelectModel(model);
                                        setModelDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50"
                                >
                                    {model.label}
                                </button>
                            ))}

                            <div className="p-1.5 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-y border-border/50">
                                Anthropic
                            </div>
                            {models.filter(m => m.id.includes('claude')).map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onSelectModel(model);
                                        setModelDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50"
                                >
                                    {model.label}
                                </button>
                            ))}

                            <div className="p-1.5 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-y border-border/50">
                                OpenAI
                            </div>
                            {models.filter(m => !m.id.includes('gemini') && !m.id.includes('claude')).map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onSelectModel(model);
                                        setModelDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 last:rounded-b-lg"
                                >
                                    {model.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
