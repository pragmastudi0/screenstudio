// DTOs serializables que el server page pasa a los componentes cliente.
export interface SceneDTO {
  id: string;
  order: number;
  title: string;
  description: string;
  narration: string;
  onScreenText: string;
  requiredAction: string;
  status: "TODO" | "IN_PROGRESS" | "RECORDED" | "DONE";
}

export interface AssetDTO {
  id: string;
  kind: "IMAGE" | "SCREENSHOT" | "PDF" | "MANUAL" | "VIDEO";
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface PromptDTO {
  id: string;
  target: string;
  kind: "VIDEO" | "IMAGE" | "TEXT";
  label: string;
  content: string;
}

export interface VoiceoverDTO {
  id: string;
  variant: "FORMAL" | "COMMERCIAL" | "CORPORATE" | "EMOTIONAL";
  fullText: string;
  segments: { scene: number; text: string }[];
}

export interface AnalysisDTO {
  features: string[];
  benefits: string[];
  useCases: string[];
  modules: string[];
}

export interface GenerationDTO {
  executiveSummary: string;
  valueProposition: string;
  narrationScript: string;
  ctaFinal: string;
  recordingList: { title: string; description: string }[];
  videoPrompts: { target: string; content: string }[];
  imagePrompts: { target: string; content: string }[];
}

export interface ProjectDTO {
  id: string;
  softwareName: string;
  client: string | null;
  industry: string | null;
  description: string | null;
  systemUrl: string | null;
  videoGoal: string | null;
  demoType: string;
  duration: string;
  status: "DRAFT" | "ANALYZING" | "GENERATING" | "READY" | "ARCHIVED";
  analysis: AnalysisDTO | null;
  generation: GenerationDTO | null;
  assets: AssetDTO[];
  scenes: SceneDTO[];
  prompts: PromptDTO[];
  voiceovers: VoiceoverDTO[];
}
