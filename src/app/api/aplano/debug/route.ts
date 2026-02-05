import { NextRequest, NextResponse } from 'next/server';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';

// Debug endpoint to see raw data structure
export async function GET(request: NextRequest) {
    const apiToken = request.headers.get('x-api-token');

    if (!apiToken) {
        return NextResponse.json({ error: 'API Token fehlt' }, { status: 401 });
    }

    try {
        const adapter = new AplanoAdapter({ apiToken });

        // Get just users to see the structure
        const users = await adapter.getUsers();

        return NextResponse.json({
            sampleUser: users[0],
            userKeys: users[0] ? Object.keys(users[0]) : [],
            totalUsers: users.length
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        }, { status: 500 });
    }
}
