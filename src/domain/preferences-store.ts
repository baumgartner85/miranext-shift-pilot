import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ShiftType = 'early' | 'late' | 'night' | 'homeoffice' | 'any';

export interface ShiftPreference {
    id: string;
    dayOfWeek: number; // 0=Sonntag, 1=Montag, ... 6=Samstag
    shiftType?: ShiftType;
    branchId?: string;
    jobPositionId?: string;
    note?: string;
}

export interface EmployeePreferences {
    userId: string;
    preferences: ShiftPreference[];
}

interface PreferencesState {
    employeePreferences: EmployeePreferences[];

    // Actions
    getPreferences: (userId: string) => ShiftPreference[];
    addPreference: (userId: string, pref: Omit<ShiftPreference, 'id'>) => void;
    updatePreference: (userId: string, prefId: string, updates: Partial<ShiftPreference>) => void;
    removePreference: (userId: string, prefId: string) => void;
    clearPreferences: (userId: string) => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set, get) => ({
            employeePreferences: [],

            getPreferences: (userId: string) => {
                const state = get();
                const employee = state.employeePreferences.find(e => e.userId === userId);
                return employee?.preferences || [];
            },

            addPreference: (userId, pref) => set((state) => {
                const newPref: ShiftPreference = { ...pref, id: generateId() };
                const existingIndex = state.employeePreferences.findIndex(e => e.userId === userId);

                if (existingIndex >= 0) {
                    // Update existing employee
                    const updated = [...state.employeePreferences];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        preferences: [...updated[existingIndex].preferences, newPref]
                    };
                    return { employeePreferences: updated };
                } else {
                    // Add new employee
                    return {
                        employeePreferences: [
                            ...state.employeePreferences,
                            { userId, preferences: [newPref] }
                        ]
                    };
                }
            }),

            updatePreference: (userId, prefId, updates) => set((state) => ({
                employeePreferences: state.employeePreferences.map(e => {
                    if (e.userId !== userId) return e;
                    return {
                        ...e,
                        preferences: e.preferences.map(p =>
                            p.id === prefId ? { ...p, ...updates } : p
                        )
                    };
                })
            })),

            removePreference: (userId, prefId) => set((state) => ({
                employeePreferences: state.employeePreferences.map(e => {
                    if (e.userId !== userId) return e;
                    return {
                        ...e,
                        preferences: e.preferences.filter(p => p.id !== prefId)
                    };
                })
            })),

            clearPreferences: (userId) => set((state) => ({
                employeePreferences: state.employeePreferences.filter(e => e.userId !== userId)
            })),
        }),
        {
            name: 'mirashift-preferences',
        }
    )
);

// Helper function to get day name
export const getDayName = (dayOfWeek: number, lang: 'de' | 'en' = 'de'): string => {
    const days = {
        de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
        en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    return days[lang][dayOfWeek] || '';
};

// Helper function to get shift type name
export const getShiftTypeName = (shiftType: ShiftType, lang: 'de' | 'en' = 'de'): string => {
    const types = {
        de: { early: 'Frühdienst', late: 'Spätdienst', night: 'Nachtdienst', homeoffice: 'Home Office', any: 'Beliebig' },
        en: { early: 'Early Shift', late: 'Late Shift', night: 'Night Shift', homeoffice: 'Home Office', any: 'Any' }
    };
    return types[lang][shiftType] || shiftType;
};
