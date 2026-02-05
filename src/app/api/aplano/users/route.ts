import { NextRequest, NextResponse } from 'next/server';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';

// Helper to get display name from various API formats
function getUserDisplayName(user: any): string {
    const firstName = user.firstName || user.first_name || user.firstname || '';
    const lastName = user.lastName || user.last_name || user.lastname || '';
    if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
    }
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    return 'Unbekannt';
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
            adapter.getUsers(),
            adapter.getContracts({ expand: true }),
        ]);

        // Debug: Log first user to see structure
        if (rawUsers.length > 0) {
            console.log('Sample user structure:', JSON.stringify(rawUsers[0], null, 2));
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
                isInactive: u.isInactive ?? u.is_inactive ?? false,
            }));

        return NextResponse.json({ users, contracts });
    } catch (error) {
        console.error('Aplano Users Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Fehler beim Laden der Mitarbeiter'
        }, { status: 500 });
    }
}
