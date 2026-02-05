import { NextRequest, NextResponse } from 'next/server';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';

// Helper to get user name from various API formats
function getUserDisplayName(shift: any): string {
    // Try embedded user object first
    const user = shift.user;
    if (user) {
        const firstName = user.firstName || user.first_name || user.firstname || '';
        const lastName = user.lastName || user.last_name || user.lastname || '';
        if (firstName || lastName) {
            return `${firstName} ${lastName}`.trim();
        }
        if (user.name) return user.name;
        if (user.email) return user.email.split('@')[0];
    }
    return '';
}

// Helper to get job position name
function getJobPositionName(shift: any): string {
    const jp = shift.jobPosition || shift.job_position;
    if (jp) {
        return jp.name || jp.shorthand || '';
    }
    return '';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiToken, from, to } = body;

        if (!apiToken) {
            return NextResponse.json({ error: 'API Token fehlt' }, { status: 400 });
        }

        const adapter = new AplanoAdapter({ apiToken });
        const rawShifts = await adapter.getShifts(from, to, { expand: true });

        // Debug: Log first shift to see structure
        if (rawShifts.length > 0) {
            console.log('Sample shift structure:', JSON.stringify(rawShifts[0], null, 2));
        }

        // Transform shifts with proper name extraction
        const shifts = rawShifts.map((s: any) => ({
            ...s,
            employeeDisplayName: getUserDisplayName(s),
            jobPositionName: getJobPositionName(s),
        }));

        return NextResponse.json({ shifts });
    } catch (error) {
        console.error('Aplano Shifts Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Fehler beim Laden der Schichten'
        }, { status: 500 });
    }
}
