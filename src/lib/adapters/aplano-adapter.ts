/**
 * Aplano API Adapter
 * 
 * Connects to the Aplano Public API (v1.8) for shift planning integration.
 * API Documentation: https://docs.aplano.de/
 */

export interface AplanoConfig {
    apiToken: string;
    baseUrl?: string;
}

export interface AplanoUser {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    isInactive?: boolean;
}

export interface AplanoShift {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    userId?: string;
    jobPositionId: string;
    branchId: string;
    comment?: string;
    user?: AplanoUser;
    jobPosition?: AplanoJobPosition;
}

export interface AplanoShiftRequirement {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    jobPositionId: string;
    branchId: string;
    requiredUsersAmount?: number;
    comment?: string;
}

export interface AplanoJobPosition {
    id: string;
    name: string;
    color?: string;
    shorthand?: string;
    isInactive?: boolean;
}

export interface AplanoBranch {
    id: string;
    name: string;
    color?: string;
    isInactive?: boolean;
    address?: string;
}

export interface AplanoAbsence {
    id: string;
    userId: string;
    startDate: string;
    endDate: string;
    typeCode: 'vacation' | 'illness' | 'unpaidVacation' | 'overtimeReduction' | 'custom';
    status: 'requested' | 'active';
}

export interface AplanoContract {
    id: string;
    userId: string;
    totalHours: number;
    validFrom: string;
    validTo?: string;
    dailyQuota?: {
        mo?: number;
        tu?: number;
        we?: number;
        th?: number;
        fr?: number;
        sa?: number;
        su?: number;
    };
}

export interface AplanoAvailability {
    id: string;
    userId: string;
    startDate: string;
    endDate?: string;
    isAvailable: boolean;
    startTime?: string;
    endTime?: string;
    weekDays?: ('mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su')[];
}

interface ApiResponse<T> {
    data: T;
}

export class AplanoAdapter {
    private baseUrl: string;
    private apiToken: string;

    constructor(config: AplanoConfig) {
        this.baseUrl = config.baseUrl || 'https://web.aplano.de/papi/v1';
        this.apiToken = config.apiToken;
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Aplano API error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    /**
     * Test the API connection
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            await this.getUsers();
            return { success: true, message: 'Verbindung erfolgreich!' };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Verbindungsfehler'
            };
        }
    }

    /**
     * GET /users - Alle Mitarbeiter abrufen
     */
    async getUsers(options?: { expand?: boolean }): Promise<AplanoUser[]> {
        const params = new URLSearchParams();
        if (options?.expand) params.append('expand', 'true');
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await this.request<ApiResponse<AplanoUser[]>>(`/users${query}`);
        return response.data;
    }

    /**
     * GET /shifts - Schichten für Zeitraum abrufen
     */
    async getShifts(from: string, to: string, options?: {
        userId?: string;
        branchId?: string;
        expand?: boolean;
    }): Promise<AplanoShift[]> {
        const params = new URLSearchParams({ from, to });
        if (options?.userId) params.append('userId', options.userId);
        if (options?.branchId) params.append('branchId', options.branchId);
        if (options?.expand) params.append('expand', 'true');

        const response = await this.request<ApiResponse<AplanoShift[]>>(`/shifts?${params}`);
        return response.data;
    }

    /**
     * GET /shift-requirements - Personalbedarf abrufen
     */
    async getShiftRequirements(from: string, to: string, options?: {
        branchId?: string;
        expand?: boolean;
    }): Promise<AplanoShiftRequirement[]> {
        const params = new URLSearchParams({ from, to });
        if (options?.branchId) params.append('branchId', options.branchId);
        if (options?.expand) params.append('expand', 'true');

        const response = await this.request<ApiResponse<AplanoShiftRequirement[]>>(`/shift-requirements?${params}`);
        return response.data;
    }

    /**
     * POST /shift-requirements - Personalbedarf erstellen
     */
    async createShiftRequirement(requirement: Omit<AplanoShiftRequirement, 'id'>): Promise<AplanoShiftRequirement> {
        const response = await this.request<ApiResponse<AplanoShiftRequirement>>('/shift-requirements', {
            method: 'POST',
            body: JSON.stringify(requirement),
        });
        return response.data;
    }

    /**
     * PUT /shift-requirements/:id - Personalbedarf aktualisieren
     */
    async updateShiftRequirement(id: string, requirement: Partial<AplanoShiftRequirement>): Promise<AplanoShiftRequirement> {
        const response = await this.request<ApiResponse<AplanoShiftRequirement>>(`/shift-requirements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(requirement),
        });
        return response.data;
    }

    /**
     * DELETE /shift-requirements/:id - Personalbedarf löschen
     */
    async deleteShiftRequirement(id: string): Promise<void> {
        await this.request(`/shift-requirements/${id}`, { method: 'DELETE' });
    }

    /**
     * GET /job-positions - Rollen abrufen
     */
    async getJobPositions(): Promise<AplanoJobPosition[]> {
        const response = await this.request<ApiResponse<AplanoJobPosition[]>>('/job-positions');
        return response.data;
    }

    /**
     * GET /branches - Standorte abrufen
     */
    async getBranches(): Promise<AplanoBranch[]> {
        const response = await this.request<ApiResponse<AplanoBranch[]>>('/branches');
        return response.data;
    }

    /**
     * GET /absences - Abwesenheiten abrufen
     */
    async getAbsences(from: string, to: string, options?: {
        userId?: string;
        expand?: boolean;
    }): Promise<AplanoAbsence[]> {
        const params = new URLSearchParams({ from, to });
        if (options?.userId) params.append('userId', options.userId);
        if (options?.expand) params.append('expand', 'true');

        const response = await this.request<ApiResponse<AplanoAbsence[]>>(`/absences?${params}`);
        return response.data;
    }

    /**
     * GET /contracts - Verträge abrufen
     */
    async getContracts(options?: {
        userId?: string;
        expand?: boolean;
    }): Promise<AplanoContract[]> {
        const params = new URLSearchParams();
        if (options?.userId) params.append('userId', options.userId);
        if (options?.expand) params.append('expand', 'true');

        const query = params.toString() ? `?${params}` : '';
        const response = await this.request<ApiResponse<AplanoContract[]>>(`/contracts${query}`);
        return response.data;
    }

    /**
     * GET /availabilities - Verfügbarkeiten abrufen
     */
    async getAvailabilities(from: string, to: string, options?: {
        userId?: string;
    }): Promise<AplanoAvailability[]> {
        const params = new URLSearchParams({ from, to });
        if (options?.userId) params.append('userId', options.userId);

        const response = await this.request<ApiResponse<AplanoAvailability[]>>(`/availabilities?${params}`);
        return response.data;
    }

    /**
     * Fetch all data needed for shift planning
     */
    async fetchPlanningData(from: string, to: string) {
        const [users, shifts, requirements, jobPositions, branches, absences, contracts] = await Promise.all([
            this.getUsers(),
            this.getShifts(from, to, { expand: true }),
            this.getShiftRequirements(from, to, { expand: true }),
            this.getJobPositions(),
            this.getBranches(),
            this.getAbsences(from, to),
            this.getContracts({ expand: true }),
        ]);

        return {
            users: users.filter(u => !u.isInactive),
            shifts,
            requirements,
            jobPositions: jobPositions.filter(jp => !jp.isInactive),
            branches: branches.filter(b => !b.isInactive),
            absences,
            contracts,
        };
    }
}

// Singleton instance management
let aplanoInstance: AplanoAdapter | null = null;

export function initAplano(config: AplanoConfig): AplanoAdapter {
    aplanoInstance = new AplanoAdapter(config);
    return aplanoInstance;
}

export function getAplano(): AplanoAdapter | null {
    return aplanoInstance;
}
