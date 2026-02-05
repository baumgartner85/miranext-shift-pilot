'use client';

import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function GlobalHeader() {
    const { language, setLanguage } = useLanguage();

    return (
        <header className="h-14 bg-slate-900 border-b border-slate-700/50 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold text-white">
                    MiraShift AI Planner
                </h1>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded uppercase">
                    {language === 'de' ? 'ÖSTERREICH' : 'AUSTRIA'}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
                    className="text-slate-400 hover:text-white"
                >
                    <Globe size={18} />
                    <span className="ml-2 uppercase">{language}</span>
                </Button>
            </div>
        </header>
    );
}
