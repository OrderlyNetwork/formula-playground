import { create } from "zustand";

/**
 * Represents a single user-provided TypeScript source, typically via drag & drop or paste.
 */
export type UserCodeOrigin = "drop" | "paste" | "api";

export interface UserCodeFile {
  /** Stable identifier for the stored code item */
  id: string;
  /** Virtual or actual path used for parsing context (e.g., "user-input.ts") */
  path: string;
  /** Raw TypeScript content provided by the user */
  content: string;
  /** Where the content came from (drop, paste, or programmatic) */
  origin: UserCodeOrigin;
  /** Unix epoch milliseconds when the item was stored */
  createdAt: number;
}

interface UserCodeStore {
  /** All user-provided code items, newest last for stable order */
  files: UserCodeFile[];

  /**
   * Add a new user code item to the store.
   * Returns the stored record including its generated id and timestamp.
   */
  addCode: (params: {
    path: string;
    content: string;
    origin: UserCodeOrigin;
  }) => UserCodeFile;

  /** Remove an item by id */
  removeCode: (id: string) => void;

  /** Clear all user code items */
  clearAll: () => void;
}

/** Generate a simple unique id without external deps */
function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  ).toUpperCase();
}

export const useUserCodeStore = create<UserCodeStore>((set, get) => ({
  files: [],

  addCode: ({ path, content, origin }) => {
    const record: UserCodeFile = {
      id: generateId(),
      path,
      content,
      origin,
      createdAt: Date.now(),
    };
    set((state) => ({ files: [...state.files, record] }));
    return record;
  },

  removeCode: (id) => {
    set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
  },

  clearAll: () => {
    set({ files: [] });
  },
}));


