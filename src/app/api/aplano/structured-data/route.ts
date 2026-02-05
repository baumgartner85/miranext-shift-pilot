import { NextRequest, NextResponse } from 'next/server';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';

// Helper to get user display name from various API formats
function getUserName(user: any): string {
    if (!user) return 'Unbekannt';
    // Aplano API returns 'name' field directly (e.g., "Baumgartner David")
    const name = user.name || '';
    if (name) return name.trim();
    // Fallback to firstName/lastName if available
    const firstName = user.firstName || user.first_name || user.firstname || '';
    const lastName = user.lastName || user.last_name || user.lastname || '';
    if (firstName || lastName) return `${firstName} ${lastName}`.trim();
    return 'Unbekannt';
}

// Helper to get weekly hours from contract
function getWeeklyHours(contracts: any[], userId: string): number {
    const contract = contracts.find(c => (c.userId || c.user_id) === userId);
    return contract?.totalHours || contract?.total_hours || 0;
}

// Helper to check if user is inactive based on lastWorkDay or isDeleted
function isUserInactive(user: any): boolean {
    // Check isDeleted flag
    if (user.isDeleted || user.is_deleted) return true;

    // Check lastWorkDay - if in the past, user is deactivated
    const lastWorkDay = user.lastWorkDay || user.last_work_day;
    if (lastWorkDay) {
        const today = new Date().toISOString().split('T')[0];
        return lastWorkDay < today;
    }

    return false;
}

// GET /api/aplano/structured-data - Alle Daten strukturiert
export async function GET(request: NextRequest) {
    const apiToken = request.headers.get('x-api-token');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');

    if (!apiToken) {
        return NextResponse.json({ error: 'API Token fehlt' }, { status: 401 });
    }

    if (!from || !to) {
        return NextResponse.json({ error: 'from und to Parameter erforderlich' }, { status: 400 });
    }

    try {
        const adapter = new AplanoAdapter({ apiToken });

        // Fetch all data in parallel
        const [users, shifts, requirements, jobPositions, branches, absences, contracts] = await Promise.all([
            adapter.getUsers(),
            adapter.getShifts(from, to, { expand: true }),
            adapter.getShiftRequirements(from, to, { expand: true }),
            adapter.getJobPositions(),
            adapter.getBranches(),
            adapter.getAbsences(from, to),
            adapter.getContracts({ expand: true }),
        ]);

        // Debug: Log first user to see field structure
        console.log('Sample user:', JSON.stringify(users[0], null, 2));
        console.log('All user fields:', users[0] ? Object.keys(users[0]) : []);
        // Find Teresa to see her status
        const teresa = users.find((u: any) => u.name?.includes('Teresa') || u.name?.includes('Reiter'));
        if (teresa) {
            console.log('Teresa user data:', JSON.stringify(teresa, null, 2));
        }
        console.log('Sample shift:', JSON.stringify(shifts[0], null, 2));
        console.log('Sample contract:', JSON.stringify(contracts[0], null, 2));
        console.log('Total contracts:', contracts.length);

        // Normalize user data and filter out deleted users
        const normalizedUsers = users
            .filter((u: any) => {
                const email = u.email || '';
                // Filter out deleted placeholder users
                return !email.startsWith('deleted-');
            })
            .map((u: any) => ({
                id: u.id,
                name: u.name || '',
                firstName: u.firstName || u.first_name || u.firstname || '',
                lastName: u.lastName || u.last_name || u.lastname || '',
                email: u.email || '',
                lastWorkDay: u.lastWorkDay || u.last_work_day || null,
                // Determine inactive status: isDeleted flag OR lastWorkDay in the past
                isInactive: isUserInactive(u),
            }));

        // 1. Mitarbeiter nach Status mit Wochenstunden
        const employeesByStatus = {
            active: normalizedUsers.filter(u => !u.isInactive).map(u => ({
                ...u,
                displayName: getUserName(u),
                weeklyHours: getWeeklyHours(contracts, u.id),
            })).sort((a, b) => b.weeklyHours - a.weeklyHours),
            inactive: normalizedUsers.filter(u => u.isInactive).map(u => ({
                ...u,
                displayName: getUserName(u),
                weeklyHours: getWeeklyHours(contracts, u.id),
            })),
        };

        // 2. Schichten nach Woche gruppiert
        const shiftsByWeek = groupShiftsByWeek(shifts, jobPositions, branches, normalizedUsers);

        // 3. Abwesenheiten mit Mitarbeiternamen
        const absencesList = absences.map((a: any) => {
            const userId = a.userId || a.user_id;
            const user = normalizedUsers.find(u => u.id === userId);
            return {
                ...a,
                employeeName: getUserName(user),
                typeName: translateAbsenceType(a.typeCode || a.type_code || a.type || ''),
            };
        }).sort((a: any, b: any) => new Date(a.startDate || a.start_date).getTime() - new Date(b.startDate || b.start_date).getTime());

        // 4. Personalbedarf pro Woche, Standort, Rolle, Schicht
        const requirementsStructured = structureRequirements(requirements, jobPositions, branches);

        // 5. Schichttypen erkannt
        const shiftTypes = analyzeShiftTypes(shifts);

        // 6. Standorte mit Statistiken
        const branchStats = branches.filter((b: any) => !(b.isInactive ?? b.is_inactive)).map((b: any) => {
            const branchId = b.id;
            const branchShifts = shifts.filter((s: any) => (s.branchId || s.branch_id) === branchId);
            const branchRequirements = requirements.filter((r: any) => (r.branchId || r.branch_id) === branchId);
            return {
                ...b,
                totalShifts: branchShifts.length,
                totalRequirements: branchRequirements.length,
                openShifts: branchShifts.filter((s: any) => !(s.userId || s.user_id)).length,
            };
        });

        // 7. Rollen mit Statistiken
        const roleStats = jobPositions.filter((jp: any) => !(jp.isInactive ?? jp.is_inactive)).map((jp: any) => {
            const jobPosId = jp.id;
            const roleShifts = shifts.filter((s: any) => (s.jobPositionId || s.job_position_id) === jobPosId);
            return {
                ...jp,
                totalShifts: roleShifts.length,
                assignedShifts: roleShifts.filter((s: any) => (s.userId || s.user_id)).length,
                openShifts: roleShifts.filter((s: any) => !(s.userId || s.user_id)).length,
            };
        });

        return NextResponse.json({
            employeesByStatus,
            shiftsByWeek,
            absencesList,
            requirementsStructured,
            shiftTypes,
            branchStats,
            roleStats,
            summary: {
                totalEmployees: employeesByStatus.active.length,
                inactiveEmployees: employeesByStatus.inactive.length,
                totalShifts: shifts.length,
                openShifts: shifts.filter((s: any) => !(s.userId || s.user_id)).length,
                totalAbsences: absences.length,
                totalRequirements: requirements.length,
            },
        });
    } catch (error) {
        console.error('Structured data error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        }, { status: 500 });
    }
}

function groupShiftsByWeek(shifts: any[], jobPositions: any[], branches: any[], users: any[]) {
    const weeks: Record<string, any[]> = {};

    shifts.forEach(shift => {
        const shiftDate = shift.date || shift.shiftDate;
        const date = new Date(shiftDate);
        const week = getWeekNumber(date);
        const weekKey = `KW ${week}`;

        if (!weeks[weekKey]) weeks[weekKey] = [];

        const jobPosId = shift.jobPositionId || shift.job_position_id;
        const branchId = shift.branchId || shift.branch_id;
        const userId = shift.userId || shift.user_id;

        const jobPos = jobPositions.find((jp: any) => jp.id === jobPosId);
        const branch = branches.find((b: any) => b.id === branchId);
        const user = userId ? users.find((u: any) => u.id === userId) : null;

        // Use embedded user from expand=true if available
        const embeddedUser = shift.user;
        const employeeName = embeddedUser
            ? getUserName(embeddedUser)
            : (user ? getUserName(user) : null);

        weeks[weekKey].push({
            ...shift,
            roleName: jobPos?.name || jobPos?.shorthand || 'Unbekannt',
            roleShorthand: jobPos?.shorthand || '',
            branchName: branch?.name || branch?.shorthand || 'Unbekannt',
            employeeName: employeeName,
            dayOfWeek: getDayName(date.getDay()),
        });
    });

    // Sort shifts within each week by date
    Object.keys(weeks).forEach(key => {
        weeks[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return weeks;
}

function structureRequirements(requirements: any[], jobPositions: any[], branches: any[]) {
    const structured: Record<string, Record<string, Record<string, any[]>>> = {};

    requirements.forEach(req => {
        const date = new Date(req.date);
        const week = `KW ${getWeekNumber(date)}`;
        const branch = branches.find(b => b.id === req.branchId);
        const role = jobPositions.find(jp => jp.id === req.jobPositionId);

        const branchName = branch?.name || 'Unbekannt';
        const roleName = role?.name || 'Unbekannt';

        if (!structured[week]) structured[week] = {};
        if (!structured[week][branchName]) structured[week][branchName] = {};
        if (!structured[week][branchName][roleName]) structured[week][branchName][roleName] = [];

        structured[week][branchName][roleName].push({
            date: req.date,
            dayOfWeek: getDayName(date.getDay()),
            startTime: req.startTime,
            endTime: req.endTime,
            requiredCount: req.requiredUsersAmount || 1,
            shiftType: classifyShiftType(req.startTime),
        });
    });

    return structured;
}

function analyzeShiftTypes(shifts: any[]) {
    const patterns: Record<string, { count: number; startTime: string; endTime: string }> = {};

    shifts.forEach(shift => {
        const key = `${shift.startTime}-${shift.endTime}`;
        if (!patterns[key]) {
            patterns[key] = { count: 0, startTime: shift.startTime, endTime: shift.endTime };
        }
        patterns[key].count++;
    });

    return Object.entries(patterns)
        .map(([key, data]) => ({
            label: classifyShiftType(data.startTime),
            timeRange: key,
            startTime: data.startTime,
            endTime: data.endTime,
            count: data.count,
            duration: calculateDuration(data.startTime, data.endTime),
        }))
        .sort((a, b) => b.count - a.count);
}

function classifyShiftType(startTime: string): string {
    const hour = parseInt(startTime.split(':')[0], 10);
    if (hour >= 5 && hour < 10) return 'Frühdienst';
    if (hour >= 10 && hour < 14) return 'Tagdienst';
    if (hour >= 14 && hour < 18) return 'Spätdienst';
    return 'Nachtdienst';
}

function calculateDuration(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let hours = (eh + em / 60) - (sh + sm / 60);
    if (hours < 0) hours += 24;
    return Math.round(hours * 10) / 10;
}

function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDayName(day: number): string {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return days[day];
}

function translateAbsenceType(typeCode: string): string {
    const translations: Record<string, string> = {
        vacation: 'Urlaub',
        illness: 'Krankheit',
        unpaidVacation: 'Unbezahlter Urlaub',
        overtimeReduction: 'Überstundenabbau',
        custom: 'Sonstiges',
    };
    return translations[typeCode] || typeCode;
}
