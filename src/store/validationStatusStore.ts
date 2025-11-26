import { create } from "zustand";

export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationStatus {
    isValid: boolean;
    missingFields: string[];
    totalRequired: number;
    totalProvided: number;
    lastChecked?: number;
}

interface ValidationStatusState {
    // Map of formulaId to validation status
    validationStatus: Record<string, ValidationStatus>;

    // Set validation status for a formula
    setValidationStatus: (formulaId: string, status: ValidationStatus) => void;

    // Get validation status for a formula
    getValidationStatus: (formulaId: string) => ValidationStatus | undefined;

    // Clear validation status for a formula
    clearValidationStatus: (formulaId: string) => void;

    // Clear all validation statuses
    clearAll: () => void;
}

export const useValidationStatusStore = create<ValidationStatusState>((set, get) => ({
    validationStatus: {},

    setValidationStatus: (formulaId: string, status: ValidationStatus) => {
        set((state) => ({
            validationStatus: {
                ...state.validationStatus,
                [formulaId]: {
                    ...status,
                    lastChecked: Date.now(),
                },
            },
        }));
    },

    getValidationStatus: (formulaId: string) => {
        return get().validationStatus[formulaId];
    },

    clearValidationStatus: (formulaId: string) => {
        set((state) => {
            const { [formulaId]: _, ...rest } = state.validationStatus;
            return { validationStatus: rest };
        });
    },

    clearAll: () => {
        set({ validationStatus: {} });
    },
}));
