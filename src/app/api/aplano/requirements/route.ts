import { NextRequest, NextResponse } from 'next/server';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiToken, from, to } = body;

        if (!apiToken) {
            return NextResponse.json({ error: 'API Token fehlt' }, { status: 400 });
        }

        const adapter = new AplanoAdapter({ apiToken });
        const requirements = await adapter.getShiftRequirements(from, to, { expand: true });

        return NextResponse.json({ requirements });
    } catch (error) {
        console.error('Aplano Requirements Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Fehler beim Laden der Anforderungen'
        }, { status: 500 });
    }
}
