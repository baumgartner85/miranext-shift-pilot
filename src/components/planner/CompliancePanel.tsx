'use client';

import { useMemo } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    Moon,
    CalendarDays,
    Coffee
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    ComplianceViolation,
    ViolationType,
    AZG_RULES
} from '@/lib/ai/azg-rules';

interface CompliancePanelProps {
    violations: ComplianceViolation[];
    score: number;
}

const VIOLATION_ICONS: Record<ViolationType, React.ReactNode> = {
    MAX_DAILY_HOURS: <Clock size={16} />,
    MIN_REST_TIME: <Moon size={16} />,
    MAX_WEEKLY_HOURS: <CalendarDays size={16} />,
    AVG_WEEKLY_HOURS: <CalendarDays size={16} />,
    CONSECUTIVE_DAYS: <CalendarDays size={16} />,
    NIGHT_WORK_LIMIT: <Moon size={16} />,
    MISSING_BREAK: <Coffee size={16} />,
};

const VIOLATION_LABELS: Record<ViolationType, string> = {
    MAX_DAILY_HOURS: 'Tagesarbeitszeit',
    MIN_REST_TIME: 'Ruhezeit',
    MAX_WEEKLY_HOURS: 'Wochenarbeitszeit',
    AVG_WEEKLY_HOURS: 'Durchschn. Wochenzeit',
    CONSECUTIVE_DAYS: 'Konsekutive Tage',
    NIGHT_WORK_LIMIT: 'Nachtarbeit',
    MISSING_BREAK: 'Pause fehlt',
};

export function CompliancePanel({ violations, score }: CompliancePanelProps) {
    const criticalViolations = violations.filter(v => v.severity === 'violation');
    const warnings = violations.filter(v => v.severity === 'warning');

    const scoreColor = score >= 90 ? 'text-green-500' : score >= 70 ? 'text-amber-500' : 'text-red-500';
    const scoreBg = score >= 90 ? 'bg-green-500/20' : score >= 70 ? 'bg-amber-500/20' : 'bg-red-500/20';

    const violationsByType = useMemo(() => {
        const map = new Map<ViolationType, ComplianceViolation[]>();
        violations.forEach(v => {
            const existing = map.get(v.type) || [];
            existing.push(v);
            map.set(v.type, existing);
        });
        return map;
    }, [violations]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        {score >= 90 ? (
                            <CheckCircle2 className="text-green-500" size={20} />
                        ) : score >= 70 ? (
                            <AlertTriangle className="text-amber-500" size={20} />
                        ) : (
                            <XCircle className="text-red-500" size={20} />
                        )}
                        AZG-Compliance
                    </CardTitle>
                    <div className={cn("px-3 py-1 rounded-full font-bold", scoreBg, scoreColor)}>
                        {score}%
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-red-500/10">
                        <div className="text-2xl font-bold text-red-500">{criticalViolations.length}</div>
                        <div className="text-xs text-muted-foreground">Verletzungen</div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10">
                        <div className="text-2xl font-bold text-amber-500">{warnings.length}</div>
                        <div className="text-xs text-muted-foreground">Warnungen</div>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/10">
                        <div className="text-2xl font-bold text-green-500">
                            {violations.length === 0 ? '✓' : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">Konform</div>
                    </div>
                </div>

                {/* AZG Rules Reference */}
                <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
                    <div className="font-medium mb-2">AZG-Regeln (§ Arbeitszeitgesetz)</div>
                    <div className="flex justify-between">
                        <span>Max. Tagesarbeitszeit:</span>
                        <span>{AZG_RULES.MAX_DAILY_HOURS}h</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Min. Ruhezeit:</span>
                        <span>{AZG_RULES.MIN_DAILY_REST_HOURS}h</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Max. Wochenarbeitszeit:</span>
                        <span>{AZG_RULES.MAX_WEEKLY_HOURS}h</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Max. konsekutive Arbeitstage:</span>
                        <span>{AZG_RULES.MAX_CONSECUTIVE_WORK_DAYS}</span>
                    </div>
                </div>

                {/* Violation List */}
                {violations.length > 0 && (
                    <div className="border-t pt-3">
                        <div className="font-medium text-sm mb-2">Gefundene Probleme</div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Array.from(violationsByType.entries()).map(([type, typeViolations]) => (
                                <div
                                    key={type}
                                    className={cn(
                                        "p-2 rounded-lg text-sm",
                                        typeViolations[0].severity === 'violation' ? 'bg-red-500/10' : 'bg-amber-500/10'
                                    )}
                                >
                                    <div className="flex items-center gap-2 font-medium">
                                        {VIOLATION_ICONS[type]}
                                        <span>{VIOLATION_LABELS[type]}</span>
                                        <Badge variant="outline" className="ml-auto">
                                            {typeViolations.length}x
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {typeViolations[0].message}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Good State */}
                {violations.length === 0 && (
                    <div className="text-center py-4">
                        <CheckCircle2 className="mx-auto text-green-500 mb-2" size={32} />
                        <div className="font-medium">Alle Regeln erfüllt</div>
                        <div className="text-sm text-muted-foreground">
                            Keine AZG-Verstöße gefunden
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
