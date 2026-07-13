import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CursorStyle = "system" | "simple" | "mascot";

interface UiState {
  cursorStyle: CursorStyle;
  setCursorStyle: (style: CursorStyle) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      cursorStyle: "system",
      setCursorStyle: (cursorStyle) => set({ cursorStyle }),
    }),
    { name: "resumeiq-ui" },
  ),
);
