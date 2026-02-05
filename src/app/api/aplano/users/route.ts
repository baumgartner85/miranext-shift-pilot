import { NextRequest, NextResponse } from 'next/server';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';

// Helper to get display name from various API formats
function getUserDisplayName(user: any): string {
    // Aplano returns 'name' field directly
    if (user.name) return user.name.trim();
    const firstName = user.firstName || user.first_name || user.firstname || '';
    const lastName = user.lastName || user.last_name || user.lastname || '';
    if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
    }
    if (user.email) return user.email.split('@')[0];
    return 'Unbekannt';
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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiToken } = body;

        if (!apiToken) {
            return NextResponse.json({ error: 'API Token fehlt' }, { status: 400 });
        }

        const adapter = new AplanoAdapter({ apiToken });

        const [rawUsers, contracts] = await Promise.all([
            adapter.getUsers({ expand: true }),
            adapter.getContracts({ expand: true }),
        ]);

        // Debug: Log sample users to see lastWorkDay field
        if (rawUsers.length > 0) {
            console.log('Sample user structure:', JSON.stringify(rawUsers[0], null, 2));
            console.log('All user fields:', Object.keys(rawUsers[0]));
            // Find users with lastWorkDay set
            const usersWithLastDay = rawUsers.filter((u: any) => u.lastWorkDay || u.last_work_day);
            if (usersWithLastDay.length > 0) {
                console.log('User with lastWorkDay:', JSON.stringify(usersWithLastDay[0], null, 2));
            }
        }

        // Filter out deleted users and add displayName
        const users = rawUsers
            .filter((u: any) => {
                const email = u.email || '';
                return !email.startsWith('deleted-');
            })
            .map((u: any) => ({
                ...u,
                displayName: getUserDisplayName(u),
                // Normalize field names
                firstName: u.firstName || u.first_name || u.firstname || '',
                lastName: u.lastName || u.last_name || u.lastname || '',
                // Determine inactive: isDeleted flag OR lastWorkDay in the past
                isInactive: isUserInactive(u),
            }));

        return NextResponse.json({ users, contracts });
    } catch (error) {
        console.error('Aplano Users Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Fehler beim Laden der Mitarbeiter'
        }, { status: 500 });
    }
}
