import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AnalysisResult, InterviewPrepResult, RoadmapResult } from "@/lib/ai/schemas";
import type { AiCallResult } from "@/lib/ai/server-functions";

export type AsyncSlice<T> = {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: { kind: string; message: string; retryAfterSeconds?: number } | null;
};

function idleSlice<T>(): AsyncSlice<T> {
  return { status: "idle", data: null, error: null };
}

interface WorkspaceState {
  resumeText: string | null;
  resumeFileName: string | null;
  resumeParseWarnings: string[];
  jobDescription: string;
  targetRole: string;

  analysis: AsyncSlice<AnalysisResult>;
  roadmap: AsyncSlice<RoadmapResult>;
  interviewPrep: AsyncSlice<InterviewPrepResult>;

  setResume: (params: { text: string; fileName: string; warnings: string[] }) => void;
  clearResume: () => void;
  setJobDescription: (text: string) => void;
  setTargetRole: (role: string) => void;

  setAnalysisLoading: () => void;
  setAnalysisResult: (result: AiCallResult<AnalysisResult>) => void;

  setRoadmapLoading: () => void;
  setRoadmapResult: (result: AiCallResult<RoadmapResult>) => void;

  setInterviewLoading: () => void;
  setInterviewResult: (result: AiCallResult<InterviewPrepResult>) => void;

  reset: () => void;
}

function applyResult<T>(result: AiCallResult<T>): AsyncSlice<T> {
  if (result.ok) {
    return { status: "success", data: result.data, error: null };
  }
  return {
    status: "error",
    data: null,
    error: { kind: result.errorKind, message: result.message, retryAfterSeconds: result.retryAfterSeconds },
  };
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      resumeText: null,
      resumeFileName: null,
      resumeParseWarnings: [],
      jobDescription: "",
      targetRole: "Machine Learning Engineer",

      analysis: idleSlice(),
      roadmap: idleSlice(),
      interviewPrep: idleSlice(),

      setResume: ({ text, fileName, warnings }) =>
        set({ resumeText: text, resumeFileName: fileName, resumeParseWarnings: warnings }),
      clearResume: () =>
        set({
          resumeText: null,
          resumeFileName: null,
          resumeParseWarnings: [],
          analysis: idleSlice(),
          roadmap: idleSlice(),
          interviewPrep: idleSlice(),
        }),
      setJobDescription: (jobDescription) => set({ jobDescription }),
      setTargetRole: (targetRole) => set({ targetRole }),

      setAnalysisLoading: () => set({ analysis: { status: "loading", data: null, error: null } }),
      setAnalysisResult: (result) => set({ analysis: applyResult(result) }),

      setRoadmapLoading: () => set({ roadmap: { status: "loading", data: null, error: null } }),
      setRoadmapResult: (result) => set({ roadmap: applyResult(result) }),

      setInterviewLoading: () => set({ interviewPrep: { status: "loading", data: null, error: null } }),
      setInterviewResult: (result) => set({ interviewPrep: applyResult(result) }),

      reset: () =>
        set({
          resumeText: null,
          resumeFileName: null,
          resumeParseWarnings: [],
          jobDescription: "",
          analysis: idleSlice(),
          roadmap: idleSlice(),
          interviewPrep: idleSlice(),
        }),
    }),
    {
      name: "resumeiq-workspace",
      // Persist inputs across refresh; AI results are cheap to re-request and can go stale
      // relative to edited inputs, so we don't persist those.
      partialize: (state) => ({
        resumeText: state.resumeText,
        resumeFileName: state.resumeFileName,
        resumeParseWarnings: state.resumeParseWarnings,
        jobDescription: state.jobDescription,
        targetRole: state.targetRole,
      }),
    },
  ),
);
