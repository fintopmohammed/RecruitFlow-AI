export interface Candidate {
  id: string;
  name: string;
  phone: string;
  originalRow: Record<string, string>;
  status: 'pending' | 'sent' | 'skipped' | 'sending' | 'failed';
}

export interface CsvAnalysisResult {
  nameColumn: string | null;
  phoneColumn: string | null;
  confidence: number;
}

export interface MessageTemplate {
  intro: string;
  questions: string[];
  outro: string;
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  MAPPING = 'MAPPING',
  EDITOR = 'EDITOR',
  QUEUE = 'QUEUE',
}

export interface GeminiMappingResponse {
  name_column: string;
  phone_column: string;
  reasoning: string;
}