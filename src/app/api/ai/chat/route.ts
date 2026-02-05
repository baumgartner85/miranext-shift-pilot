import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';
import { AZG_RULES } from '@/lib/ai/azg-rules';

const SYSTEM_PROMPT = `Du bist der MiraShift KI-Assistent, ein Experte für Dienstplanung in Radiologie-Abteilungen.

DEINE FÄHIGKEITEN:
1. Dienstpläne erstellen und optimieren
2. Österreichisches Arbeitszeitgesetz (AZG) prüfen
3. Mitarbeiter-Präferenzen berücksichtigen
4. Historische Muster analysieren
5. Personalbedarf pro Schichttyp berechnen

AZG-REGELN DIE DU KENNST:
- Maximale Tagesarbeitszeit: ${AZG_RULES.MAX_DAILY_HOURS} Stunden
- Minimale Ruhezeit zwischen Schichten: ${AZG_RULES.MIN_DAILY_REST_HOURS} Stunden
- Maximale Wochenarbeitszeit: ${AZG_RULES.MAX_WEEKLY_HOURS} Stunden
- Max. aufeinanderfolgende Arbeitstage: ${AZG_RULES.MAX_CONSECUTIVE_WORK_DAYS}
- Nachtarbeit (22:00-05:00): max ${AZG_RULES.MAX_NIGHT_SHIFT_HOURS} Stunden pro Tag
- Pflichtpause ab ${AZG_RULES.BREAK_THRESHOLD_HOURS} Stunden: mindestens ${AZG_RULES.MIN_BREAK_MINUTES} Minuten

ANTWORT-REGELN:
- Antworte immer auf Deutsch
- Sei präzise und hilfreich
- Erkläre deine Entscheidungen
- Weise auf AZG-Konflikte hin
- Formatiere Listen und Tabellen übersichtlich mit Markdown
- Analysiere historische Schichtmuster wenn gefragt
- Zeige Personalbedarf pro Rolle und Schichttyp
`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, month, adapterConfig, geminiApiKey } = body;

        if (!geminiApiKey) {
            return NextResponse.json({
                response: 'Bitte konfigurieren Sie zuerst den Gemini API Key in den Einstellungen.'
            });
        }

        // Fetch comprehensive context from Aplano if configured
        let context = '';
        if (adapterConfig?.apiToken && month) {
            try {
                const adapter = new AplanoAdapter({ apiToken: adapterConfig.apiToken });

                // Calculate date range
                const [year, monthNum] = month.split('-').map(Number);
                const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
                const lastDay = new Date(year, monthNum, 0).getDate();
                const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`;

                // Fetch all data
                const planningData = await adapter.fetchPlanningData(startDate, endDate);

                // Analyze shift patterns
                const shiftPatterns = analyzeShiftPatterns(planningData.shifts);

                context = `
═══════════════════════════════════════════════════════════════
AKTUELLER PLANUNGSZEITRAUM: ${startDate} bis ${endDate}
═══════════════════════════════════════════════════════════════

SCHICHTTYPEN (aus Daten erkannt):
${shiftPatterns.length > 0 ? shiftPatterns.map(p => `- ${p.name}: ${p.startTime} - ${p.endTime} (${p.duration}h, ${p.count}x verwendet)`).join('\n') : 'Keine Schichten im Zeitraum'}

ROLLEN / POSITIONEN (${planningData.jobPositions.length}):
${planningData.jobPositions.map(jp => `- ${jp.name}${jp.shorthand ? ` (${jp.shorthand})` : ''}`).join('\n')}

STANDORTE (${planningData.branches.length}):
${planningData.branches.map(b => `- ${b.name}`).join('\n')}

MITARBEITER (${planningData.users.length}) MIT VERTRÄGEN:
${planningData.users.map(u => {
                    const contract = planningData.contracts.find(c => c.userId === u.id);
                    return `- ${u.firstName} ${u.lastName}: ${contract ? `${contract.totalHours}h/Woche` : 'Kein Vertrag'}`;
                }).join('\n')}

PERSONALBEDARF KONFIGURIERT (${planningData.requirements.length}):
${planningData.requirements.length > 0 ?
                        planningData.requirements.slice(0, 10).map(r => `- ${r.date} ${r.startTime}-${r.endTime}: ${r.requiredUsersAmount || 1} Person(en)`).join('\n') :
                        'Kein expliziter Bedarf konfiguriert'}

ABWESENHEITEN (${planningData.absences.length}):
${planningData.absences.length > 0 ?
                        planningData.absences.map(a => {
                            const user = planningData.users.find(u => u.id === a.userId);
                            return `- ${user ? `${user.firstName} ${user.lastName}` : a.userId}: ${a.startDate} bis ${a.endDate} (${translateAbsenceType(a.typeCode)})`;
                        }).join('\n') :
                        'Keine Abwesenheiten'}

BESTEHENDE SCHICHTEN (${planningData.shifts.length}):
${planningData.shifts.slice(0, 30).map(s => {
                            const jobPos = planningData.jobPositions.find(jp => jp.id === s.jobPositionId);
                            return `- ${s.date} ${s.startTime}-${s.endTime}: ${s.user ? `${s.user.firstName} ${s.user.lastName}` : 'OFFEN'} [${jobPos?.name || '-'}]`;
                        }).join('\n')}
${planningData.shifts.length > 30 ? `\n... und ${planningData.shifts.length - 30} weitere Schichten` : ''}
`;
            } catch (error) {
                context = '\n(Aplano-Daten konnten nicht geladen werden: ' + (error instanceof Error ? error.message : 'Unbekannt') + ')\n';
            }
        }

        const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });

        const result = await generateText({
            model: google('gemini-2.0-flash'),
            system: SYSTEM_PROMPT + context,
            prompt: `Monat: ${month}\n\nNutzer-Anfrage: ${message}`,
        });

        return NextResponse.json({ response: result.text });
    } catch (error) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({
            response: 'Es ist ein Fehler aufgetreten. Bitte prüfen Sie Ihre API-Konfiguration.'
        });
    }
}

// Helper function to analyze shift patterns
function analyzeShiftPatterns(shifts: any[]): { name: string; startTime: string; endTime: string; duration: number; count: number }[] {
    const patterns = new Map<string, { startTime: string; endTime: string; count: number }>();

    shifts.forEach(shift => {
        const key = `${shift.startTime}-${shift.endTime}`;
        const existing = patterns.get(key);
        if (existing) {
            existing.count++;
        } else {
            patterns.set(key, { startTime: shift.startTime, endTime: shift.endTime, count: 1 });
        }
    });

    return Array.from(patterns.entries())
        .map(([_, p]) => {
            const [startH, startM] = p.startTime.split(':').map(Number);
            const [endH, endM] = p.endTime.split(':').map(Number);
            let duration = (endH + endM / 60) - (startH + startM / 60);
            if (duration < 0) duration += 24;

            let name = 'Schicht';
            if (startH >= 5 && startH < 10) name = 'Früh';
            else if (startH >= 10 && startH < 14) name = 'Tag';
            else if (startH >= 14 && startH < 18) name = 'Spät';
            else if (startH >= 18 || startH < 5) name = 'Nacht';

            return { name, startTime: p.startTime, endTime: p.endTime, duration: Math.round(duration * 10) / 10, count: p.count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

// Helper function to translate absence types
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
