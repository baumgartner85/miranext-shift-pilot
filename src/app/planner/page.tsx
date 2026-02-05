'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore } from '@/domain/settings-store';
import { useMounted } from '@/hooks/useMounted';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Bot,
    Send,
    Sparkles,
    Calendar,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Loader2,
    RefreshCw,
    Users,
    Clock,
    Building2,
    BarChart3
} from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
        usersCount?: number;
        existingShifts?: number;
        requirements?: number;
        absences?: number;
        shiftPatterns?: number;
        branches?: number;
        jobPositions?: number;
    };
}

interface GeneratedShift {
    date: string;
    startTime: string;
    endTime: string;
    employeeName: string;
    role: string;
    complianceStatus: 'ok' | 'warning' | 'violation';
}

// Quick action buttons for common queries
const QUICK_ACTIONS = [
    {
        label: 'Schichttypen analysieren',
        icon: Clock,
        query: 'Analysiere die vorhandenen Schichttypen und zeige mir welche Schichten (Früh, Spät, Nacht, etc.) es gibt.'
    },
    {
        label: 'Personalbedarf',
        icon: Users,
        query: 'Zeige mir den Personalbedarf pro Rolle (Sekretariat, RT, Arzt) und Wochentag basierend auf den historischen Daten.'
    },
    {
        label: 'Standorte & Rollen',
        icon: Building2,
        query: 'Liste alle Standorte und verfügbaren Rollen/Positionen auf.'
    },
    {
        label: 'Wochenübersicht',
        icon: BarChart3,
        query: 'Erstelle eine Wochenübersicht mit der Besetzung pro Tag und Schichttyp.'
    },
];

export default function PlannerPage() {
    const { t } = useLanguage();
    const mounted = useMounted();
    const { getActiveAdapter, geminiApiKey } = useSettingsStore();
    const activeAdapter = mounted ? getActiveAdapter() : null;
    const apiKey = mounted ? geminiApiKey : '';

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: `Willkommen beim MiraShift KI-Planer! 🤖

Ich habe Zugriff auf alle Ihre Aplano-Daten und kann:

• **Schichttypen analysieren** - Früh, Spät, Nacht, etc. aus historischen Daten erkennen
• **Personalbedarf berechnen** - Pro Rolle (RT, Arzt, Sekretariat) und Wochentag
• **Dienstplan generieren** - AZG-konforme Monatspläne erstellen
• **Muster erkennen** - Historische Schichtmuster analysieren

Nutzen Sie die Schnellaktionen unten oder stellen Sie mir direkt eine Frage!`,
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleQuickAction = (query: string) => {
        setInput(query);
        // Trigger send after a short delay to show the input
        setTimeout(() => {
            handleSendWithQuery(query);
        }, 100);
    };

    const handleSendWithQuery = async (query: string) => {
        if (!query.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: query,
                    month: selectedMonth,
                    adapterConfig: activeAdapter,
                    geminiApiKey,
                }),
            });

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || 'Entschuldigung, es gab einen Fehler bei der Verarbeitung.',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Es tut mir leid, aber ich konnte Ihre Anfrage nicht verarbeiten. Bitte stellen Sie sicher, dass die API-Keys korrekt konfiguriert sind.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        handleSendWithQuery(input);
    };

    const handleGeneratePlan = async () => {
        const generateMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: `Erstelle einen optimierten Dienstplan für ${selectedMonth}`,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, generateMessage]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month: selectedMonth,
                    adapterConfig: activeAdapter,
                    geminiApiKey,
                }),
            });

            const data = await response.json();

            const resultMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || data.error || 'Plan wurde erstellt.',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, resultMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Fehler beim Generieren des Plans. Bitte prüfen Sie die Konfiguration.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const isConfigured = activeAdapter?.isConnected && apiKey;

    if (!mounted) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <Skeleton className="flex-1" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{t('planner.title')}</h1>
                        <p className="text-sm text-muted-foreground">
                            Autonome KI-Dienstplanung mit AZG-Compliance
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-muted-foreground" />
                        <Input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-40"
                        />
                    </div>
                    <Button
                        onClick={handleGeneratePlan}
                        disabled={!isConfigured || isLoading}
                        className="gap-2"
                    >
                        <Sparkles size={18} />
                        {t('planner.generatePlan')}
                    </Button>
                </div>
            </div>

            {/* Configuration Warning */}
            {!isConfigured && (
                <Card className="mb-4 border-amber-500/50 bg-amber-500/10">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="text-amber-500" size={20} />
                            <span>
                                Bitte konfigurieren Sie zuerst das Planungstool und den Gemini API Key in den{' '}
                                <a href="/settings" className="text-blue-500 hover:underline">Einstellungen</a>.
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Chat Interface */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="py-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Bot size={20} className="text-blue-500" />
                            {t('ai.assistant')}
                        </CardTitle>
                        {activeAdapter && (
                            <Badge variant={activeAdapter.isConnected ? 'default' : 'destructive'}>
                                {activeAdapter.name}: {activeAdapter.isConnected ? 'Verbunden' : 'Getrennt'}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg p-4 ${message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-800'
                                    }`}
                            >
                                <div className="whitespace-pre-wrap">{message.content}</div>
                                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>
                                    {message.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="animate-spin text-blue-500" size={18} />
                                    <span className="text-muted-foreground">{t('ai.thinking')}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </CardContent>

                {/* Input */}
                <div className="p-4 border-t space-y-3">
                    {/* Quick Actions */}
                    {isConfigured && messages.length <= 2 && !isLoading && (
                        <div className="flex flex-wrap gap-2">
                            {QUICK_ACTIONS.map((action) => (
                                <Button
                                    key={action.label}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-xs"
                                    onClick={() => handleQuickAction(action.query)}
                                >
                                    <action.icon size={14} />
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('ai.askAnything')}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            disabled={!isConfigured || isLoading}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || !isConfigured || isLoading}
                        >
                            <Send size={18} />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
