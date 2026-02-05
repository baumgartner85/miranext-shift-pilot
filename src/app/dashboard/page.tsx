'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettingsStore } from '@/domain/settings-store';
import { useMounted } from '@/hooks/useMounted';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Users,
    Calendar,
    Building2,
    Briefcase,
    Clock,
    AlertCircle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ChevronRight
} from 'lucide-react';

interface StructuredData {
    employeesByStatus: {
        active: Array<{
            id: string;
            displayName: string;
            email?: string;
            weeklyHours: number;
        }>;
        inactive: Array<{
            id: string;
            displayName: string;
            weeklyHours: number;
        }>;
    };
    shiftsByWeek: Record<string, any[]>;
    absencesList: Array<{
        id: string;
        employeeName: string;
        startDate: string;
        endDate: string;
        typeName: string;
        typeCode: string;
    }>;
    requirementsStructured: Record<string, Record<string, Record<string, any[]>>>;
    shiftTypes: Array<{
        label: string;
        timeRange: string;
        count: number;
        duration: number;
    }>;
    branchStats: Array<{
        id: string;
        name: string;
        totalShifts: number;
        openShifts: number;
    }>;
    roleStats: Array<{
        id: string;
        name: string;
        shorthand?: string;
        totalShifts: number;
        openShifts: number;
    }>;
    summary: {
        totalEmployees: number;
        inactiveEmployees: number;
        totalShifts: number;
        openShifts: number;
        totalAbsences: number;
        totalRequirements: number;
    };
}

export default function DashboardPage() {
    const { t } = useLanguage();
    const mounted = useMounted();
    const { getActiveAdapter } = useSettingsStore();
    const activeAdapter = mounted ? getActiveAdapter() : null;

    const [data, setData] = useState<StructuredData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

    const fetchData = async () => {
        if (!activeAdapter?.apiToken) return;

        setLoading(true);
        setError(null);

        // Get current month range
        const now = new Date();
        const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

        try {
            const response = await fetch(`/api/aplano/structured-data?from=${from}&to=${to}`, {
                headers: { 'x-api-token': activeAdapter.apiToken },
            });
            const result = await response.json();

            if (result.error) {
                setError(result.error);
            } else {
                setData(result);
                // Select first week if available
                const weeks = Object.keys(result.shiftsByWeek || {});
                if (weeks.length > 0 && !selectedWeek) {
                    setSelectedWeek(weeks[0]);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mounted && activeAdapter?.apiToken) {
            fetchData();
        }
    }, [mounted, activeAdapter?.apiToken]);

    if (!mounted) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!activeAdapter?.isConnected) {
        return (
            <Card className="border-amber-500/50 bg-amber-500/10">
                <CardContent className="py-8 text-center">
                    <AlertCircle className="mx-auto mb-4 text-amber-500" size={48} />
                    <h2 className="text-xl font-semibold mb-2">Keine Verbindung</h2>
                    <p className="text-muted-foreground mb-4">
                        Bitte konfigurieren Sie zuerst die Aplano-Verbindung in den Einstellungen.
                    </p>
                    <Button asChild>
                        <a href="/settings">Zu den Einstellungen</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Datenübersicht</h1>
                    <p className="text-muted-foreground">Strukturierte Aplano-Daten</p>
                </div>
                <Button onClick={fetchData} disabled={loading} className="gap-2">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Aktualisieren
                </Button>
            </div>

            {error && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardContent className="py-4 flex items-center gap-3">
                        <XCircle className="text-red-500" size={20} />
                        <span>{error}</span>
                    </CardContent>
                </Card>
            )}

            {data && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <Users className="text-blue-500" size={24} />
                                    <div>
                                        <div className="text-2xl font-bold">{data.summary.totalEmployees}</div>
                                        <div className="text-xs text-muted-foreground">Aktive MA</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-green-500" size={24} />
                                    <div>
                                        <div className="text-2xl font-bold">{data.summary.totalShifts}</div>
                                        <div className="text-xs text-muted-foreground">Schichten</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="text-amber-500" size={24} />
                                    <div>
                                        <div className="text-2xl font-bold">{data.summary.openShifts}</div>
                                        <div className="text-xs text-muted-foreground">Offen</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <Clock className="text-purple-500" size={24} />
                                    <div>
                                        <div className="text-2xl font-bold">{data.summary.totalAbsences}</div>
                                        <div className="text-xs text-muted-foreground">Abwesenheiten</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <Building2 className="text-cyan-500" size={24} />
                                    <div>
                                        <div className="text-2xl font-bold">{data.branchStats.length}</div>
                                        <div className="text-xs text-muted-foreground">Standorte</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <Briefcase className="text-orange-500" size={24} />
                                    <div>
                                        <div className="text-2xl font-bold">{data.roleStats.length}</div>
                                        <div className="text-xs text-muted-foreground">Rollen</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Tabs */}
                    <Tabs defaultValue="employees" className="space-y-4">
                        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                            <TabsTrigger value="employees">Mitarbeiter</TabsTrigger>
                            <TabsTrigger value="shifts">Schichten</TabsTrigger>
                            <TabsTrigger value="absences">Abwesenheiten</TabsTrigger>
                            <TabsTrigger value="requirements">Bedarf</TabsTrigger>
                            <TabsTrigger value="stats">Statistiken</TabsTrigger>
                        </TabsList>

                        {/* Mitarbeiter Tab */}
                        <TabsContent value="employees">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users size={20} />
                                        Mitarbeiter nach Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-green-500 mb-2 flex items-center gap-2">
                                                <CheckCircle2 size={16} />
                                                Aktiv ({data.employeesByStatus.active.length})
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {data.employeesByStatus.active.map(emp => (
                                                    <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                                        <span className="font-medium">{emp.displayName}</span>
                                                        <Badge variant="secondary">{emp.weeklyHours}h/Woche</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {data.employeesByStatus.inactive.length > 0 && (
                                            <div>
                                                <h3 className="font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                                    <XCircle size={16} />
                                                    Inaktiv ({data.employeesByStatus.inactive.length})
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 opacity-60">
                                                    {data.employeesByStatus.inactive.map(emp => (
                                                        <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                                            <span>{emp.displayName}</span>
                                                            <Badge variant="outline">{emp.weeklyHours}h</Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Schichten Tab */}
                        <TabsContent value="shifts">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar size={20} />
                                        Schichten nach Woche
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2 mb-4 flex-wrap">
                                        {Object.keys(data.shiftsByWeek).map(week => (
                                            <Button
                                                key={week}
                                                variant={selectedWeek === week ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setSelectedWeek(week)}
                                            >
                                                {week}
                                                <Badge variant="secondary" className="ml-2">
                                                    {data.shiftsByWeek[week].length}
                                                </Badge>
                                            </Button>
                                        ))}
                                    </div>
                                    {selectedWeek && data.shiftsByWeek[selectedWeek] && (
                                        <div className="space-y-2 max-h-96 overflow-auto">
                                            {data.shiftsByWeek[selectedWeek].map((shift, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline">{shift.dayOfWeek}</Badge>
                                                        <span className="font-mono text-sm">{shift.date}</span>
                                                        <span className="text-muted-foreground">
                                                            {shift.startTime} - {shift.endTime}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge>{shift.roleName}</Badge>
                                                        <span className="text-sm">{shift.branchName}</span>
                                                        <ChevronRight size={16} className="text-muted-foreground" />
                                                        {shift.employeeName ? (
                                                            <span className="font-medium text-green-400">{shift.employeeName}</span>
                                                        ) : (
                                                            <span className="text-amber-400">OFFEN</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Abwesenheiten Tab */}
                        <TabsContent value="absences">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock size={20} />
                                        Abwesenheiten / Urlaub
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {data.absencesList.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            Keine Abwesenheiten im aktuellen Monat
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-auto">
                                            {data.absencesList.map((absence, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium">{absence.employeeName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge
                                                            variant={absence.typeCode === 'vacation' ? 'default' :
                                                                absence.typeCode === 'illness' ? 'destructive' : 'secondary'}
                                                        >
                                                            {absence.typeName}
                                                        </Badge>
                                                        <span className="text-sm font-mono">
                                                            {absence.startDate} - {absence.endDate}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Bedarf Tab */}
                        <TabsContent value="requirements">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Briefcase size={20} />
                                        Personalbedarf pro Woche / Standort / Rolle
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {Object.keys(data.requirementsStructured).length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            Keine Bedarfe konfiguriert
                                        </p>
                                    ) : (
                                        <div className="space-y-6">
                                            {Object.entries(data.requirementsStructured).map(([week, branches]) => (
                                                <div key={week}>
                                                    <h3 className="font-semibold text-lg mb-3 text-blue-400">{week}</h3>
                                                    {Object.entries(branches).map(([branch, roles]) => (
                                                        <div key={branch} className="ml-4 mb-4">
                                                            <h4 className="font-medium text-cyan-400 mb-2 flex items-center gap-2">
                                                                <Building2 size={14} />
                                                                {branch}
                                                            </h4>
                                                            {Object.entries(roles).map(([role, reqs]) => (
                                                                <div key={role} className="ml-4 mb-2">
                                                                    <h5 className="text-sm text-muted-foreground mb-1">{role}</h5>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {(reqs as any[]).map((req, idx) => (
                                                                            <Badge key={idx} variant="outline" className="text-xs">
                                                                                {req.dayOfWeek} {req.startTime}-{req.endTime} ({req.requiredCount}x)
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Statistiken Tab */}
                        <TabsContent value="stats">
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Schichttypen */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Erkannte Schichttypen</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {data.shiftTypes.map((type, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                                                    <div>
                                                        <span className="font-medium">{type.label}</span>
                                                        <span className="text-muted-foreground text-sm ml-2">
                                                            ({type.timeRange})
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary">{type.duration}h</Badge>
                                                        <Badge>{type.count}x</Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Standorte */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Standorte</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {data.branchStats.map(branch => (
                                                <div key={branch.id} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                                                    <span className="font-medium">{branch.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary">{branch.totalShifts} Schichten</Badge>
                                                        {branch.openShifts > 0 && (
                                                            <Badge variant="destructive">{branch.openShifts} offen</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Rollen */}
                                <Card className="md:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Rollen / Positionen</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {data.roleStats.map(role => (
                                                <div key={role.id} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                                                    <span className="font-medium">
                                                        {role.name}
                                                        {role.shorthand && <span className="text-muted-foreground ml-1">({role.shorthand})</span>}
                                                    </span>
                                                    <Badge>{role.totalShifts}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </>
            )}

            {loading && !data && (
                <div className="space-y-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-96" />
                </div>
            )}
        </div>
    );
}
