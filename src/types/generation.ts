export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

export interface GenerationProgress {
  stage: string;
  chapterNumber?: number;
  step: string;
  progress: number; // 0-100
  streamedText: string;
}

export interface StreamEvent {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result' | 'done' | 'error';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
}
