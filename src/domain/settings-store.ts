import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdapterType = 'aplano' | 'deputy' | 'manual';

export interface AdapterConfig {
    type: AdapterType;
    name: string;
    apiToken: string;
    baseUrl?: string;
    defaultBranchId?: string;
    isConnected: boolean;
    lastSync?: string;
    lastError?: string;
}

interface SettingsState {
    // Adapter Configuration
    adapters: AdapterConfig[];
    activeAdapterId: string | null;

    // AI Configuration
    geminiApiKey: string;

    // Actions
    addAdapter: (adapter: Omit<AdapterConfig, 'isConnected' | 'lastSync'>) => void;
    updateAdapter: (index: number, updates: Partial<AdapterConfig>) => void;
    removeAdapter: (index: number) => void;
    setActiveAdapter: (index: number | null) => void;
    setGeminiApiKey: (key: string) => void;
    getActiveAdapter: () => AdapterConfig | null;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            adapters: [],
            activeAdapterId: null,
            geminiApiKey: '',

            addAdapter: (adapter) => set((state) => ({
                adapters: [...state.adapters, {
                    ...adapter,
                    isConnected: false
                }],
            })),

            updateAdapter: (index, updates) => set((state) => ({
                adapters: state.adapters.map((a, i) =>
                    i === index ? { ...a, ...updates } : a
                ),
            })),

            removeAdapter: (index) => set((state) => ({
                adapters: state.adapters.filter((_, i) => i !== index),
                activeAdapterId: state.activeAdapterId === state.adapters[index]?.name
                    ? null
                    : state.activeAdapterId,
            })),

            setActiveAdapter: (index) => set((state) => ({
                activeAdapterId: index !== null ? state.adapters[index]?.name || null : null,
            })),

            setGeminiApiKey: (key) => set({ geminiApiKey: key }),

            getActiveAdapter: () => {
                const state = get();
                return state.adapters.find(a => a.name === state.activeAdapterId) || null;
            },
        }),
        {
            name: 'mirashift-settings',
        }
    )
);
