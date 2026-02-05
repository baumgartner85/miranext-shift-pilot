'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore } from '@/domain/settings-store';
import { useMounted } from '@/hooks/useMounted';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    CalendarClock,
    RefreshCw,
    Loader2,
    AlertTriangle,
    Users,
    Clock
} from 'lucide-react';

interface ShiftRequirement {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    jobPositionId: string;
    requiredUsersAmount: number;
    comment?: string;
    jobPosition?: {
        name: string;
        color?: string;
    };
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export default function RequirementsPage() {
    const { t } = useLanguage();
    const mounted = useMounted();
    const { getActiveAdapter } = useSettingsStore();
    const activeAdapter = mounted ? getActiveAdapter() : null;

    const [requirements, setRequirements] = useState<ShiftRequirement[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState(() => {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - now.getDay() + 1);
        return monday.toISOString().split('T')[0];
    });

    const fetchRequirements = async () => {
        if (!activeAdapter?.apiToken) return;

        setLoading(true);
        setError(null);

        try {
            const weekStart = new Date(selectedWeek);
            const weekEnd = new Date(selectedWeek);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const response = await fetch('/api/aplano/requirements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiToken: activeAdapter.apiToken,
                    from: weekStart.toISOString().split('T')[0],
                    to: weekEnd.toISOString().split('T')[0],
                }),
            });

            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            setRequirements(data.requirements || []);
        } catch (err) {
            setError('Fehler beim Laden des Personalbedarfs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeAdapter?.isConnected) {
            fetchRequirements();
        }
    }, [activeAdapter?.isConnected, selectedWeek]);

    // Group requirements by date
    const requirementsByDate = new Map<string, ShiftRequirement[]>();
    requirements.forEach(req => {
        const existing = requirementsByDate.get(req.date) || [];
        existing.push(req);
        requirementsByDate.set(req.date, existing);
    });

    // Generate week days
    const weekDays: Date[] = [];
    const startDate = new Date(selectedWeek);
    for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        weekDays.push(day);
    }

    const navigateWeek = (direction: number) => {
        const newDate = new Date(selectedWeek);
        newDate.setDate(newDate.getDate() + direction * 7);
        setSelectedWeek(newDate.toISOString().split('T')[0]);
    };

    if (!mounted) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    if (!activeAdapter?.isConnected) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CalendarClock size={24} />
                    {t('nav.requirements')}
                </h1>

                <Card className="border-amber-500/50 bg-amber-500/10">
                    <CardContent className="py-6 text-center">
                        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
                        <p className="font-medium">Keine Verbindung zu Aplano</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Bitte konfigurieren Sie zuerst das Planungstool in den{' '}
                            <a href="/settings" className="text-blue-500 hover:underline">Einstellungen</a>.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CalendarClock size={24} />
                    {t('nav.requirements')}
                </h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
                        ←
                    </Button>
                    <div className="text-sm font-medium min-w-32 text-center">
                        KW {getWeekNumber(new Date(selectedWeek))} / {new Date(selectedWeek).getFullYear()}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
                        →
                    </Button>
                    <Button
                        variant="outline"
                        onClick={fetchRequirements}
                        disabled={loading}
                        className="ml-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    </Button>
                </div>
            </div>

            {error && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardContent className="py-3">
                        <p className="text-red-500">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Week Grid */}
            {loading ? (
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="pt-4 space-y-2">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day, index) => {
                        const dateStr = day.toISOString().split('T')[0];
                        const dayRequirements = requirementsByDate.get(dateStr) || [];
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        return (
                            <Card
                                key={dateStr}
                                className={`${isToday ? 'border-blue-500' : ''} ${isWeekend ? 'bg-slate-800/50' : ''}`}
                            >
                                <CardHeader className="py-2 px-3">
                                    <div className="text-xs text-muted-foreground">
                                        {WEEKDAYS[day.getDay()]}
                                    </div>
                                    <div className={`text-lg font-bold ${isToday ? 'text-blue-500' : ''}`}>
                                        {day.getDate()}.{day.getMonth() + 1}
                                    </div>
                                </CardHeader>
                                <CardContent className="px-3 pb-3">
                                    {dayRequirements.length === 0 ? (
                                        <div className="text-xs text-muted-foreground text-center py-4">
                                            Kein Bedarf
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {dayRequirements.map(req => (
                                                <div
                                                    key={req.id}
                                                    className="p-2 rounded bg-slate-700/50 text-xs"
                                                >
                                                    <div className="flex items-center gap-1 font-medium">
                                                        <Clock size={12} />
                                                        {req.startTime} - {req.endTime}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Users size={12} />
                                                        {req.requiredUsersAmount}x {req.jobPosition?.name || 'Unbekannt'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Zusammenfassung dieser Woche</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-slate-800 rounded-lg">
                            <div className="text-2xl font-bold text-blue-500">
                                {requirements.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Schicht-Slots</div>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-lg">
                            <div className="text-2xl font-bold text-green-500">
                                {requirements.reduce((sum, r) => sum + (r.requiredUsersAmount || 1), 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Benötigte Personen</div>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-lg">
                            <div className="text-2xl font-bold text-purple-500">
                                {new Set(requirements.map(r => r.jobPosition?.name)).size}
                            </div>
                            <div className="text-sm text-muted-foreground">Verschiedene Rollen</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
