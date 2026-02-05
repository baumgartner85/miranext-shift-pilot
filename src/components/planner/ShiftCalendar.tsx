'use client';

import { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    User,
    Clock,
    Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Shift {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    employeeName: string;
    role: string;
    complianceStatus: 'ok' | 'warning' | 'violation';
}

interface ShiftCalendarProps {
    shifts: Shift[];
    month: string; // YYYY-MM
    onMonthChange: (month: string) => void;
    onShiftClick?: (shift: Shift) => void;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS_DE = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
    // Convert Sunday=0 to Monday-based (Mo=0, So=6)
    return day === 0 ? 6 : day - 1;
}

export function ShiftCalendar({ shifts, month, onMonthChange, onShiftClick }: ShiftCalendarProps) {
    const [year, monthNum] = month.split('-').map(Number);
    const monthIndex = monthNum - 1;
    const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

    const daysInMonth = getDaysInMonth(year, monthIndex);
    const firstDay = getFirstDayOfMonth(year, monthIndex);

    // Get unique roles from shifts
    const availableRoles = useMemo(() => {
        const roles = new Set<string>();
        shifts.forEach(s => {
            if (s.role && s.role !== 'Unbekannt') {
                roles.add(s.role);
            }
        });
        return Array.from(roles).sort();
    }, [shifts]);

    // Filter shifts by selected roles
    const filteredShifts = useMemo(() => {
        if (selectedRoles.size === 0) return shifts;
        return shifts.filter(s => selectedRoles.has(s.role));
    }, [shifts, selectedRoles]);

    // Group shifts by date
    const shiftsByDate = useMemo(() => {
        const map = new Map<string, Shift[]>();
        filteredShifts.forEach(shift => {
            const existing = map.get(shift.date) || [];
            existing.push(shift);
            map.set(shift.date, existing);
        });
        return map;
    }, [filteredShifts]);

    const toggleRole = (role: string) => {
        setSelectedRoles(prev => {
            const next = new Set(prev);
            if (next.has(role)) {
                next.delete(role);
            } else {
                next.add(role);
            }
            return next;
        });
    };

    const handlePrevMonth = () => {
        const newDate = new Date(year, monthIndex - 1);
        onMonthChange(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        const newDate = new Date(year, monthIndex + 1);
        onMonthChange(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
    };

    const today = new Date();
    const isToday = (day: number) =>
        today.getFullYear() === year &&
        today.getMonth() === monthIndex &&
        today.getDate() === day;

    // Build calendar days
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    return (
        <div className="bg-card rounded-lg border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft size={20} />
                </Button>
                <h2 className="text-lg font-semibold">
                    {MONTHS_DE[monthIndex]} {year}
                </h2>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                    <ChevronRight size={20} />
                </Button>
            </div>

            {/* Role Filters */}
            {availableRoles.length > 0 && (
                <div className="flex items-center gap-2 p-3 border-b flex-wrap">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Filter size={14} />
                        <span>Berufsgruppen:</span>
                    </div>
                    <button
                        onClick={() => setSelectedRoles(new Set())}
                        className={cn(
                            "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                            selectedRoles.size === 0
                                ? "bg-blue-500 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        )}
                    >
                        Alle
                    </button>
                    {availableRoles.map(role => (
                        <button
                            key={role}
                            onClick={() => toggleRole(role)}
                            className={cn(
                                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                                selectedRoles.has(role)
                                    ? "bg-blue-500 text-white"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            )}
                        >
                            {role}
                        </button>
                    ))}
                    {selectedRoles.size > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                            ({filteredShifts.length} von {shifts.length} Schichten)
                        </span>
                    )}
                </div>
            )}

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b">
                {WEEKDAYS.map((day, i) => (
                    <div
                        key={day}
                        className={cn(
                            "p-2 text-center text-sm font-medium text-muted-foreground",
                            (i === 5 || i === 6) && "text-blue-400"
                        )}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="min-h-24 border-b border-r last:border-r-0" />;
                    }

                    const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayShifts = shiftsByDate.get(dateStr) || [];
                    const hasViolation = dayShifts.some(s => s.complianceStatus === 'violation');
                    const hasWarning = dayShifts.some(s => s.complianceStatus === 'warning');

                    return (
                        <div
                            key={day}
                            className={cn(
                                "min-h-24 border-b border-r last:border-r-0 p-1",
                                isToday(day) && "bg-blue-500/10"
                            )}
                        >
                            {/* Day Number */}
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn(
                                    "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                    isToday(day) && "bg-blue-500 text-white"
                                )}>
                                    {day}
                                </span>
                                {hasViolation && <AlertTriangle size={14} className="text-red-500" />}
                                {!hasViolation && hasWarning && <AlertTriangle size={14} className="text-amber-500" />}
                            </div>

                            {/* Shifts */}
                            <div className="space-y-0.5">
                                {dayShifts.slice(0, 3).map(shift => (
                                    <button
                                        key={shift.id}
                                        onClick={() => onShiftClick?.(shift)}
                                        className={cn(
                                            "w-full text-left text-xs p-1 rounded truncate transition-colors",
                                            shift.complianceStatus === 'ok' && "bg-green-500/20 text-green-400 hover:bg-green-500/30",
                                            shift.complianceStatus === 'warning' && "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
                                            shift.complianceStatus === 'violation' && "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                        )}
                                    >
                                        <span className="font-medium">{shift.startTime}</span>
                                        <span className="mx-0.5">·</span>
                                        <span>{shift.employeeName}</span>
                                    </button>
                                ))}
                                {dayShifts.length > 3 && (
                                    <div className="text-xs text-muted-foreground pl-1">
                                        +{dayShifts.length - 3} mehr
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 p-3 border-t text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500/30" />
                    <span className="text-muted-foreground">AZG konform</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-amber-500/30" />
                    <span className="text-muted-foreground">Warnung</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500/30" />
                    <span className="text-muted-foreground">Verletzung</span>
                </div>
            </div>
        </div>
    );
}
