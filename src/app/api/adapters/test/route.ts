import { NextRequest, NextResponse } from 'next/server';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, apiToken, baseUrl } = body;

        if (type === 'aplano') {
            const adapter = new AplanoAdapter({
                apiToken,
                baseUrl: baseUrl || undefined,
            });

            const result = await adapter.testConnection();
            return NextResponse.json(result);
        }

        return NextResponse.json({
            success: false,
            message: 'Unbekannter Adapter-Typ'
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Verbindungsfehler'
        });
    }
}
