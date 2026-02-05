/**
 * Austrian Labor Law (Arbeitszeitgesetz - AZG) Rules Engine
 * 
 * This module validates shift assignments against Austrian labor law requirements.
 * Reference: https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10008238
 */

export const AZG_RULES = {
    // Tägliche Ruhezeit: mindestens 11 Stunden (§ 12 AZG)
    MIN_DAILY_REST_HOURS: 11,

    // Maximale Tagesarbeitszeit inkl. Überstunden: 12 Stunden (§ 9 AZG)
    MAX_DAILY_HOURS: 12,

    // Normalarbeitszeit: 8h/Tag (§ 3 AZG)
    NORMAL_DAILY_HOURS: 8,

    // Normalarbeitszeit: 40h/Woche (§ 3 AZG)
    NORMAL_WEEKLY_HOURS: 40,

    // Durchschnitt über 17 Wochen: max 48h (§ 9 AZG)
    AVG_WEEKLY_MAX_HOURS: 48,
    AVERAGING_PERIOD_WEEKS: 17,

    // Maximale Wochenarbeitszeit inkl. Überstunden: 60h (§ 9 AZG)
    MAX_WEEKLY_HOURS: 60,

    // Nachtarbeit Definition: 22:00 - 05:00 (§ 12a AZG)
    NIGHT_WORK_START: 22, // 22:00
    NIGHT_WORK_END: 5,    // 05:00

    // Nachtarbeit max 10h pro Tag wenn Nachtarbeit geleistet wird
    MAX_NIGHT_SHIFT_HOURS: 10,

    // Pause bei >6h Arbeit: mindestens 30 Min (§ 11 AZG)
    BREAK_THRESHOLD_HOURS: 6,
    MIN_BREAK_MINUTES: 30,

    // Maximale aufeinanderfolgende Arbeitstage
    MAX_CONSECUTIVE_WORK_DAYS: 6,
} as const;

export type ViolationType =
    | 'MAX_DAILY_HOURS'
    | 'MIN_REST_TIME'
    | 'MAX_WEEKLY_HOURS'
    | 'AVG_WEEKLY_HOURS'
    | 'CONSECUTIVE_DAYS'
    | 'NIGHT_WORK_LIMIT'
    | 'MISSING_BREAK';

export type ViolationSeverity = 'warning' | 'violation';

export interface ComplianceViolation {
    type: ViolationType;
    severity: ViolationSeverity;
    message: string;
    details: {
        actual: number;
        limit: number;
        date?: string;
        employeeId?: string;
    };
}

export interface Shift {
    id: string;
    date: string;           // YYYY-MM-DD
    startTime: string;      // HH:mm
    endTime: string;        // HH:mm
    breakMinutes: number;
    employeeId: string;
}

/**
 * Calculate working hours from a shift
 */
export function calculateShiftHours(shift: Shift): number {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes - shift.breakMinutes;
    return totalMinutes / 60;
}

/**
 * Check if a shift includes night work
 */
export function isNightWork(shift: Shift): boolean {
    const [startH] = shift.startTime.split(':').map(Number);
    const [endH] = shift.endTime.split(':').map(Number);

    // Night is 22:00 - 05:00
    return startH >= AZG_RULES.NIGHT_WORK_START ||
        endH <= AZG_RULES.NIGHT_WORK_END ||
        endH < startH; // Overnight shift
}

/**
 * Calculate rest hours between two consecutive shifts
 */
export function calculateRestHours(shift1: Shift, shift2: Shift): number {
    // shift1 should be the earlier shift
    const [end1H, end1M] = shift1.endTime.split(':').map(Number);
    const [start2H, start2M] = shift2.startTime.split(':').map(Number);

    const date1 = new Date(`${shift1.date}T${shift1.endTime}`);
    const date2 = new Date(`${shift2.date}T${shift2.startTime}`);

    const diffMs = date2.getTime() - date1.getTime();
    return diffMs / (1000 * 60 * 60);
}

/**
 * Validate a single shift
 */
export function validateShift(shift: Shift): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const hours = calculateShiftHours(shift);

    // Check max daily hours
    if (hours > AZG_RULES.MAX_DAILY_HOURS) {
        violations.push({
            type: 'MAX_DAILY_HOURS',
            severity: 'violation',
            message: `Tagesarbeitszeit von ${hours.toFixed(1)}h überschreitet Maximum von ${AZG_RULES.MAX_DAILY_HOURS}h`,
            details: {
                actual: hours,
                limit: AZG_RULES.MAX_DAILY_HOURS,
                date: shift.date,
                employeeId: shift.employeeId,
            },
        });
    }

    // Check night work limit
    if (isNightWork(shift) && hours > AZG_RULES.MAX_NIGHT_SHIFT_HOURS) {
        violations.push({
            type: 'NIGHT_WORK_LIMIT',
            severity: 'violation',
            message: `Nachtschicht von ${hours.toFixed(1)}h überschreitet Maximum von ${AZG_RULES.MAX_NIGHT_SHIFT_HOURS}h`,
            details: {
                actual: hours,
                limit: AZG_RULES.MAX_NIGHT_SHIFT_HOURS,
                date: shift.date,
                employeeId: shift.employeeId,
            },
        });
    }

    // Check required break
    if (hours > AZG_RULES.BREAK_THRESHOLD_HOURS && shift.breakMinutes < AZG_RULES.MIN_BREAK_MINUTES) {
        violations.push({
            type: 'MISSING_BREAK',
            severity: 'warning',
            message: `Bei ${hours.toFixed(1)}h Arbeitszeit ist mindestens ${AZG_RULES.MIN_BREAK_MINUTES} Min Pause erforderlich`,
            details: {
                actual: shift.breakMinutes,
                limit: AZG_RULES.MIN_BREAK_MINUTES,
                date: shift.date,
                employeeId: shift.employeeId,
            },
        });
    }

    return violations;
}

/**
 * Validate rest time between consecutive shifts for an employee
 */
export function validateRestTime(shifts: Shift[]): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Sort by date and start time
    const sorted = [...shifts].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
    });

    for (let i = 0; i < sorted.length - 1; i++) {
        const restHours = calculateRestHours(sorted[i], sorted[i + 1]);

        if (restHours < AZG_RULES.MIN_DAILY_REST_HOURS) {
            violations.push({
                type: 'MIN_REST_TIME',
                severity: 'violation',
                message: `Ruhezeit von ${restHours.toFixed(1)}h unterschreitet Minimum von ${AZG_RULES.MIN_DAILY_REST_HOURS}h`,
                details: {
                    actual: restHours,
                    limit: AZG_RULES.MIN_DAILY_REST_HOURS,
                    date: sorted[i + 1].date,
                    employeeId: sorted[i].employeeId,
                },
            });
        }
    }

    return violations;
}

/**
 * Validate weekly hours for an employee
 */
export function validateWeeklyHours(shifts: Shift[], weekStart: string): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const weekShifts = shifts.filter(s => {
        const shiftDate = new Date(s.date);
        return shiftDate >= weekStartDate && shiftDate <= weekEndDate;
    });

    const totalHours = weekShifts.reduce((sum, shift) => sum + calculateShiftHours(shift), 0);

    if (totalHours > AZG_RULES.MAX_WEEKLY_HOURS) {
        violations.push({
            type: 'MAX_WEEKLY_HOURS',
            severity: 'violation',
            message: `Wochenarbeitszeit von ${totalHours.toFixed(1)}h überschreitet Maximum von ${AZG_RULES.MAX_WEEKLY_HOURS}h`,
            details: {
                actual: totalHours,
                limit: AZG_RULES.MAX_WEEKLY_HOURS,
                date: weekStart,
                employeeId: weekShifts[0]?.employeeId,
            },
        });
    } else if (totalHours > AZG_RULES.NORMAL_WEEKLY_HOURS) {
        violations.push({
            type: 'MAX_WEEKLY_HOURS',
            severity: 'warning',
            message: `Wochenarbeitszeit von ${totalHours.toFixed(1)}h überschreitet Normalarbeitszeit von ${AZG_RULES.NORMAL_WEEKLY_HOURS}h`,
            details: {
                actual: totalHours,
                limit: AZG_RULES.NORMAL_WEEKLY_HOURS,
                date: weekStart,
                employeeId: weekShifts[0]?.employeeId,
            },
        });
    }

    return violations;
}

/**
 * Validate consecutive work days
 */
export function validateConsecutiveDays(shifts: Shift[]): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Get unique work dates sorted
    const workDates = [...new Set(shifts.map(s => s.date))].sort();

    let consecutive = 1;
    for (let i = 1; i < workDates.length; i++) {
        const prev = new Date(workDates[i - 1]);
        const curr = new Date(workDates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            consecutive++;
            if (consecutive > AZG_RULES.MAX_CONSECUTIVE_WORK_DAYS) {
                violations.push({
                    type: 'CONSECUTIVE_DAYS',
                    severity: 'violation',
                    message: `${consecutive} aufeinanderfolgende Arbeitstage überschreiten Maximum von ${AZG_RULES.MAX_CONSECUTIVE_WORK_DAYS}`,
                    details: {
                        actual: consecutive,
                        limit: AZG_RULES.MAX_CONSECUTIVE_WORK_DAYS,
                        date: workDates[i],
                        employeeId: shifts[0]?.employeeId,
                    },
                });
            }
        } else {
            consecutive = 1;
        }
    }

    return violations;
}

/**
 * Full compliance check for an employee's shifts
 */
export function checkFullCompliance(shifts: Shift[]): {
    isCompliant: boolean;
    violations: ComplianceViolation[];
    score: number; // 0-100
} {
    const allViolations: ComplianceViolation[] = [];

    // Check each shift individually
    for (const shift of shifts) {
        allViolations.push(...validateShift(shift));
    }

    // Check rest times
    allViolations.push(...validateRestTime(shifts));

    // Check consecutive days
    allViolations.push(...validateConsecutiveDays(shifts));

    // Calculate score
    const criticalViolations = allViolations.filter(v => v.severity === 'violation').length;
    const warnings = allViolations.filter(v => v.severity === 'warning').length;

    let score = 100;
    score -= criticalViolations * 20;
    score -= warnings * 5;
    score = Math.max(0, score);

    return {
        isCompliant: criticalViolations === 0,
        violations: allViolations,
        score,
    };
}
