
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface VoiceInputProps {
    onResult: (text: string) => void;
    disabled?: boolean;
}

// Web Speech API Types
interface SpeechRecognitionEvent {
    results: {
        [key: number]: {
            [key: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
}

export function VoiceInput({ onResult, disabled }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();

            if (recognitionRef.current) {
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                    const transcript = event.results[0][0].transcript;
                    onResult(transcript);
                    setIsListening(false);
                };

                recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, [onResult]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Voice input is not supported in this browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    if (!('webkitSpeechRecognition' in window)) return null;

    return (
        <button
            onClick={toggleListening}
            disabled={disabled}
            className={cn(
                "p-3 md:p-2 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation",
                isListening
                    ? "bg-red-500 text-white animate-pulse shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            title={isListening ? "Stop Listening" : "Voice Input"}
            type="button"
        >
            {isListening ? <MicOff className="w-5 h-5 md:w-4 md:h-4" /> : <Mic className="w-5 h-5 md:w-4 md:h-4" />}
        </button>
    );
}
