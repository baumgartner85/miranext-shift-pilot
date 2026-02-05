'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore } from '@/domain/settings-store';
import { useMounted } from '@/hooks/useMounted';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShiftCalendar } from '@/components/planner/ShiftCalendar';
import {
    Calendar,
    RefreshCw,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Users,
    Clock
} from 'lucide-react';

interface AplanoShift {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    // Pre-computed display name from API
    employeeDisplayName?: string;
    jobPositionName?: string;
    user?: {
        firstName?: string;
        lastName?: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        email?: string;
    };
    jobPosition?: {
        name?: string;
        shorthand?: string;
    };
}

interface CalendarShift {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    employeeName: string;
    role: string;
    complianceStatus: 'ok' | 'warning' | 'violation';
}

export default function HistoryPage() {
    const { t } = useLanguage();
    const mounted = useMounted();
    const { getActiveAdapter } = useSettingsStore();
    const activeAdapter = mounted ? getActiveAdapter() : null;

    const [month, setMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [shifts, setShifts] = useState<CalendarShift[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ total: 0, employees: 0, hours: 0 });

    const fetchShifts = async () => {
        if (!activeAdapter?.apiToken) return;

        setLoading(true);
        setError(null);

        try {
            const [year, monthNum] = month.split('-').map(Number);
            const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
            const lastDay = new Date(year, monthNum, 0).getDate();
            const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`;

            const response = await fetch('/api/aplano/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiToken: activeAdapter.apiToken,
                    from: startDate,
                    to: endDate,
                }),
            });

            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            // Transform Aplano shifts to calendar format
            const calendarShifts: CalendarShift[] = (data.shifts || []).map((s: AplanoShift) => {
                // Use pre-computed display name from API or extract from user object
                let employeeName = s.employeeDisplayName || '';
                if (!employeeName && s.user) {
                    const firstName = s.user.firstName || (s.user as any).first_name || '';
                    const lastName = s.user.lastName || (s.user as any).last_name || '';
                    employeeName = `${firstName} ${lastName}`.trim();
                }

                // Get job position name
                const roleName = s.jobPositionName || s.jobPosition?.name || '';

                return {
                    id: s.id,
                    date: s.date,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    employeeName: employeeName || 'Unbesetzt',
                    role: roleName || 'Unbekannt',
                    complianceStatus: 'ok' as const,
                };
            });

            setShifts(calendarShifts);

            // Calculate stats
            const uniqueEmployees = new Set(calendarShifts.map(s => s.employeeName).filter(n => n !== 'Unbesetzt'));
            let totalHours = 0;
            calendarShifts.forEach(s => {
                const [startH, startM] = s.startTime.split(':').map(Number);
                const [endH, endM] = s.endTime.split(':').map(Number);
                let hours = (endH + endM / 60) - (startH + startM / 60);
                if (hours < 0) hours += 24;
                totalHours += hours;
            });

            setStats({
                total: calendarShifts.length,
                employees: uniqueEmployees.size,
                hours: Math.round(totalHours),
            });
        } catch (err) {
            setError('Fehler beim Laden der Schichten');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeAdapter?.isConnected) {
            fetchShifts();
        }
    }, [month, activeAdapter?.isConnected]);

    const handleShiftClick = (shift: CalendarShift) => {
        console.log('Shift clicked:', shift);
    };

    if (!mounted) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!activeAdapter?.isConnected) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar size={24} />
                    {t('nav.history')}
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
                    <Calendar size={24} />
                    {t('nav.history')}
                </h1>
                <Button
                    variant="outline"
                    onClick={fetchShifts}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                        <RefreshCw size={18} className="mr-2" />
                    )}
                    Aktualisieren
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Calendar className="text-blue-500" size={20} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <div className="text-xs text-muted-foreground">Schichten</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <Users className="text-green-500" size={20} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.employees}</div>
                                <div className="text-xs text-muted-foreground">Mitarbeiter</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <Clock className="text-purple-500" size={20} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{stats.hours}</div>
                                <div className="text-xs text-muted-foreground">Stunden gesamt</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardContent className="py-3">
                        <p className="text-red-500">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Calendar */}
            {loading ? (
                <Card>
                    <CardContent className="py-8">
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-48 mx-auto" />
                            <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: 35 }).map((_, i) => (
                                    <Skeleton key={i} className="h-24" />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <ShiftCalendar
                    shifts={shifts}
                    month={month}
                    onMonthChange={setMonth}
                    onShiftClick={handleShiftClick}
                />
            )}
        </div>
    );
}
