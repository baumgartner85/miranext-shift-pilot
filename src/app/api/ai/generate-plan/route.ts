import { NextRequest, NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { AplanoAdapter } from '@/lib/adapters/aplano-adapter';
import { AZG_RULES } from '@/lib/ai/azg-rules';

const PLAN_GENERATION_PROMPT = `Du bist ein KI-Dienstplanungs-Agent für Radiologie-Abteilungen.

DEINE AUFGABE:
Erstelle einen optimierten Monatsplan basierend auf:
1. Verfügbaren Mitarbeitern, deren Verträge und Qualifikationen
2. Historischen Schichtmustern und Schichttypen
3. Täglichem Personalbedarf pro Rolle und Standort
4. Österreichischem Arbeitszeitgesetz (AZG)

AZG-REGELN:
- Max. Tagesarbeitszeit: ${AZG_RULES.MAX_DAILY_HOURS}h
- Min. Ruhezeit: ${AZG_RULES.MIN_DAILY_REST_HOURS}h zwischen Schichten
- Max. Wochenarbeitszeit: ${AZG_RULES.MAX_WEEKLY_HOURS}h
- Max. aufeinanderfolgende Arbeitstage: ${AZG_RULES.MAX_CONSECUTIVE_WORK_DAYS}
- Nachtarbeit (22:00-05:00): max ${AZG_RULES.MAX_NIGHT_SHIFT_HOURS}h
- Pflichtpause ab 6h: mindestens 30 Minuten

OUTPUT FORMAT:
Erstelle einen strukturierten Plan mit:
1. Erkannte Schichttypen (z.B. Früh, Spät, Nacht, etc.)
2. Personalbedarf pro Schichttyp und Rolle
3. Wochenübersicht mit Besetzung
4. Tägliche Schichtzuweisungen
5. AZG-Compliance-Status pro Mitarbeiter
6. Optimierungsvorschläge

Antworte auf Deutsch und formatiere mit Markdown-Tabellen.
`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { month, adapterConfig, geminiApiKey } = body;

        if (!geminiApiKey) {
            return NextResponse.json({
                error: 'Gemini API Key fehlt. Bitte in den Einstellungen konfigurieren.'
            });
        }

        if (!adapterConfig?.apiToken) {
            return NextResponse.json({
                error: 'Kein Planungstool verbunden. Bitte Aplano in den Einstellungen konfigurieren.'
            });
        }

        // Calculate date range for the month
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`;

        // Also fetch historical data from previous month
        const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
        const prevYear = monthNum === 1 ? year - 1 : year;
        const histStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const histLastDay = new Date(prevYear, prevMonth, 0).getDate();
        const histEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${histLastDay}`;

        // Fetch data from Aplano
        const adapter = new AplanoAdapter({ apiToken: adapterConfig.apiToken });

        let planningData;
        let historicalShifts: any[] = [];
        try {
            planningData = await adapter.fetchPlanningData(startDate, endDate);
            // Also get historical shifts for pattern analysis
            historicalShifts = await adapter.getShifts(histStartDate, histEndDate, { expand: true });
        } catch (error) {
            return NextResponse.json({
                error: `Fehler beim Laden der Aplano-Daten: ${error instanceof Error ? error.message : 'Unbekannt'}`
            });
        }

        // Analyze shift patterns from history
        const shiftPatterns = analyzeShiftPatterns([...planningData.shifts, ...historicalShifts]);

        // Map users to their job positions based on historical shifts
        const userRoles = mapUserRoles(historicalShifts);

        // Calculate staffing needs per day of week
        const weekdayStaffing = analyzeWeekdayStaffing(historicalShifts, planningData.jobPositions);

        // Build enhanced context for AI
        const context = `
PLANUNGSZEITRAUM: ${startDate} bis ${endDate}

═══════════════════════════════════════════════════════════════
SCHICHTTYPEN (erkannt aus historischen Daten):
═══════════════════════════════════════════════════════════════
${shiftPatterns.map(p => `- ${p.name}: ${p.startTime} - ${p.endTime} (${p.duration}h, ${p.count}x verwendet)`).join('\n')}

═══════════════════════════════════════════════════════════════
ROLLEN / POSITIONEN (${planningData.jobPositions.length}):
═══════════════════════════════════════════════════════════════
${planningData.jobPositions.map(jp => `- ${jp.name}${jp.shorthand ? ` (${jp.shorthand})` : ''} ${jp.color ? `[${jp.color}]` : ''}`).join('\n')}

═══════════════════════════════════════════════════════════════
STANDORTE / BRANCHES (${planningData.branches.length}):
═══════════════════════════════════════════════════════════════
${planningData.branches.map(b => `- ${b.name}${b.address ? ` (${b.address})` : ''}`).join('\n')}

═══════════════════════════════════════════════════════════════
MITARBEITER (${planningData.users.length}) MIT VERTRÄGEN:
═══════════════════════════════════════════════════════════════
${planningData.users.map(u => {
            const contract = planningData.contracts.find(c => c.userId === u.id);
            const roles = userRoles.get(u.id) || [];
            return `- ${u.firstName} ${u.lastName} (ID: ${u.id})
    Vertrag: ${contract ? `${contract.totalHours}h/Woche` : 'Kein Vertrag'}
    Typische Rollen: ${roles.length > 0 ? roles.join(', ') : 'Unbekannt'}`;
        }).join('\n')}

═══════════════════════════════════════════════════════════════
PERSONALBEDARF PRO WOCHENTAG (Durchschnitt aus Historie):
═══════════════════════════════════════════════════════════════
${weekdayStaffing}

═══════════════════════════════════════════════════════════════
PERSONALBEDARF KONFIGURIERT (${planningData.requirements.length}):
═══════════════════════════════════════════════════════════════
${planningData.requirements.length > 0 ?
                planningData.requirements.map(r => `- ${r.date} ${r.startTime}-${r.endTime}: ${r.requiredUsersAmount || 1} Person(en)`).join('\n') :
                'Kein expliziter Bedarf konfiguriert - verwende historische Muster!'}

═══════════════════════════════════════════════════════════════
ABWESENHEITEN IM PLANUNGSZEITRAUM (${planningData.absences.length}):
═══════════════════════════════════════════════════════════════
${planningData.absences.length > 0 ?
                planningData.absences.map(a => {
                    const user = planningData.users.find(u => u.id === a.userId);
                    return `- ${user ? `${user.firstName} ${user.lastName}` : a.userId}: ${a.startDate} bis ${a.endDate} (${translateAbsenceType(a.typeCode)})`;
                }).join('\n') :
                'Keine Abwesenheiten gemeldet'}

═══════════════════════════════════════════════════════════════
BESTEHENDE SCHICHTEN IM ZEITRAUM (${planningData.shifts.length}):
═══════════════════════════════════════════════════════════════
${planningData.shifts.slice(0, 100).map(s => {
                    const jobPos = planningData.jobPositions.find(jp => jp.id === s.jobPositionId);
                    return `- ${s.date} ${s.startTime}-${s.endTime}: ${s.user ? `${s.user.firstName} ${s.user.lastName}` : 'UNBESETZT'} [${jobPos?.name || 'Unbekannt'}]`;
                }).join('\n')}
${planningData.shifts.length > 100 ? `\n... und ${planningData.shifts.length - 100} weitere Schichten` : ''}
`;

        const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });

        const result = await generateText({
            model: google('gemini-2.0-flash'),
            system: PLAN_GENERATION_PROMPT,
            prompt: `${context}\n\nErstelle jetzt einen optimierten Dienstplan für diesen Monat. 
            
WICHTIG:
1. Analysiere die erkannten Schichttypen und verwende diese Labels
2. Berechne den Personalbedarf pro Rolle (Sekretariat, RT, Arzt, etc.) basierend auf den historischen Mustern
3. Berücksichtige alle AZG-Regeln
4. Zeige für jede Woche eine Übersicht der Besetzung
5. Markiere potenzielle Engpässe`,
        });

        return NextResponse.json({
            response: result.text,
            metadata: {
                usersCount: planningData.users.length,
                existingShifts: planningData.shifts.length,
                requirements: planningData.requirements.length,
                absences: planningData.absences.length,
                shiftPatterns: shiftPatterns.length,
                branches: planningData.branches.length,
                jobPositions: planningData.jobPositions.length,
            }
        });
    } catch (error) {
        console.error('Plan Generation Error:', error);
        return NextResponse.json({
            error: `Fehler bei der Planerstellung: ${error instanceof Error ? error.message : 'Unbekannt'}`
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

            // Classify shift type
            let name = 'Schicht';
            if (startH >= 5 && startH < 10) name = 'Früh';
            else if (startH >= 10 && startH < 14) name = 'Tag';
            else if (startH >= 14 && startH < 18) name = 'Spät';
            else if (startH >= 18 || startH < 5) name = 'Nacht';

            return { name, startTime: p.startTime, endTime: p.endTime, duration: Math.round(duration * 10) / 10, count: p.count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 patterns
}

// Helper function to map users to their typical roles
function mapUserRoles(shifts: any[]): Map<string, string[]> {
    const userRoles = new Map<string, Set<string>>();

    shifts.forEach(shift => {
        if (shift.userId && shift.jobPosition?.name) {
            const roles = userRoles.get(shift.userId) || new Set();
            roles.add(shift.jobPosition.name);
            userRoles.set(shift.userId, roles);
        }
    });

    return new Map(Array.from(userRoles.entries()).map(([id, roles]) => [id, Array.from(roles)]));
}

// Helper function to analyze staffing by weekday
function analyzeWeekdayStaffing(shifts: any[], jobPositions: any[]): string {
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const staffing = new Map<number, Map<string, number>>();
    const dayCount = new Map<number, number>();

    shifts.forEach(shift => {
        const date = new Date(shift.date);
        const day = date.getDay();
        const role = shift.jobPosition?.name || 'Unbekannt';

        dayCount.set(day, (dayCount.get(day) || 0) + 1);

        const dayStaffing = staffing.get(day) || new Map();
        dayStaffing.set(role, (dayStaffing.get(role) || 0) + 1);
        staffing.set(day, dayStaffing);
    });

    return weekdays.map((name, day) => {
        const dayStaff = staffing.get(day);
        if (!dayStaff) return `${name}: Keine Daten`;

        const count = dayCount.get(day) || 1;
        const avgStaff = Array.from(dayStaff.entries())
            .map(([role, total]) => `${role}: ~${Math.round(total / (count / 7))}`)
            .join(', ');

        return `${name}: ${avgStaff}`;
    }).join('\n');
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
