import React, { useEffect, useState } from 'react';
import { generateTheme, applyTheme, ThemeColors } from '../utils/theme';

const DEFAULT_THEME_COLOR = '#10b981'; // Emerald-500

const ThemeSelector: React.FC = () => {
    const [baseColor, setBaseColor] = useState(DEFAULT_THEME_COLOR);
    const [theme, setTheme] = useState<ThemeColors | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Load from LS
        const saved = localStorage.getItem('gitretro-theme-base');
        if (saved) {
            setBaseColor(saved);
            updateTheme(saved);
        } else {
            updateTheme(DEFAULT_THEME_COLOR);
        }
    }, []);

    const updateTheme = (color: string) => {
        const newTheme = generateTheme(color);
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        setBaseColor(color);
        updateTheme(color);
        localStorage.setItem('gitretro-theme-base', color);
    };

    const handleReset = () => {
        setBaseColor(DEFAULT_THEME_COLOR);
        updateTheme(DEFAULT_THEME_COLOR);
        localStorage.removeItem('gitretro-theme-base');
    };

    if (!theme) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full border-2 border-white/20 hover:border-white transition-colors"
                style={{ backgroundColor: theme.primary }}
                title="Customizar Tema"
            >
                <span className="sr-only">Tema</span>
                <div className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute top-12 right-0 bg-surface-muted backdrop-blur-md border-2 border-primary-dark p-4 rounded-lg shadow-xl w-64 z-[100] animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-accent-light">Tema</h3>
                        <button
                            onClick={handleReset}
                            className="text-xs text-red-400 hover:text-red-300 underline"
                        >
                            Resetar
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-accent-light flex-1">Cor Principal</label>
                            <input
                                type="color"
                                value={baseColor}
                                onChange={handleChange}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-accent-light/70 uppercase font-bold tracking-wider">Preview</div>
                            <div className="flex gap-2 h-8">
                                <div className="flex-1 rounded" style={{ backgroundColor: theme.primary }} title="Primária" />
                                <div className="flex-1 rounded" style={{ backgroundColor: theme.accent }} title="Acento (Oposta)" />
                                <div className="flex-1 rounded" style={{ backgroundColor: theme.surface, border: '1px solid white' }} title="Fundo (Surface)" />
                            </div>
                        </div>

                        <div className="text-xs text-center text-accent-light/50 italic">
                            Seleção salva automaticamente.
                        </div>
                    </div>
                </div>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
};

export default ThemeSelector;
