export type EducationLevel =
  | 'high-school'
  | 'first-year'
  | 'advanced-undergrad'
  | 'postgraduate'
  | 'professional'
  | 'general-public';

export type PriorKnowledge = 'none' | 'some' | 'significant';

export type ChapterLength = 'concise' | 'standard' | 'comprehensive';

// Three meaningful modes for the activities prompt: a room where students
// can't move (lecture theatre), a room where they can (active-classroom —
// covers both flat rooms with moveable desks and pre-arranged group tables),
// and an online/hybrid mode (breakout rooms, shared docs). The legacy
// 'collaborative' and 'flat-classroom' values are kept on the type so older
// persisted state still type-checks; both auto-migrate to 'active-classroom'
// when the user next visits Setup.
export type TeachingEnvironment =
  | 'lecture-theatre'
  | 'active-classroom'
  | 'online'
  | ''
  | 'collaborative'    // legacy → 'active-classroom'
  | 'flat-classroom';  // legacy → 'active-classroom'

export interface CourseSetup {
  topic: string;
  specificTopics?: string;
  avoidTopics?: string;
  textbookReference?: string;
  educationLevel: EducationLevel;
  priorKnowledge: PriorKnowledge;
  cohortSize: number;
  learnerNotes?: string;
  teachingEnvironment: TeachingEnvironment;
  environmentNotes?: string;
  numChapters: number;
  chapterLength: ChapterLength;
  /** Free-text override for reading length per chapter — passed verbatim to
   *  the generator when set. Falls back to `chapterLength` enum when empty. */
  chapterLengthBrief?: string;
  widgetsPerChapter: number;
  themeId?: string;
  voiceId?: string;
}

export type SciencePrinciple =
  | 'spacing'
  | 'interleaving'
  | 'retrieval'
  | 'examples'
  | 'dual-coding';

export interface ScienceAnnotation {
  principle: SciencePrinciple;
  description: string;
  relatedChapters?: number[];
}

export interface WidgetSpec {
  title: string;
  description: string;
  concept: string;
  rationale: string;
}

export interface ChapterSyllabus {
  number: number;
  title: string;
  narrative: string;
  keyConcepts: string[];
  widgets: WidgetSpec[];
  scienceAnnotations: ScienceAnnotation[];
  spacingConnections: number[]; // chapter numbers this connects back to
}

export interface Syllabus {
  courseTitle: string;
  courseOverview: string;
  chapters: ChapterSyllabus[];
}

export interface ResearchSource {
  title: string;
  authors: string;
  year: string;
  url?: string;
  doi?: string;
  summary: string;
  relevance: string;
  isVerified: boolean; // false = AI-generated, needs verification
}

export interface ResearchDossier {
  chapterNumber: number;
  sources: ResearchSource[];
  synthesisNotes: string;
}

export interface InClassQuizQuestion {
  question: string;
  correctAnswer: string;
  correctFeedback: string;
  distractors: Array<{
    text: string;
    feedback: string;
  }>;
}

// ── Weekly Challenge types ──

export type ChallengeQuestionType =
  | 'mcq' | 'two-stage' | 'assertion-reason'
  | 'agreement-matrix' | 'confidence-weighted'
  | 'slider-estimation' | 'boss';

export type ChallengeTier = 'warmup' | 'core' | 'challenge' | 'boss';

export type AssertionReasonRelationship =
  | 'both-true-reason-explains'
  | 'both-true-reason-independent'
  | 'a-true-b-false'
  | 'a-false-b-true'
  | 'both-false';

export type AgreementCategory = 'always' | 'sometimes' | 'never';

export interface ChallengeQuestionBase {
  type: ChallengeQuestionType;
  tier: ChallengeTier;
  stem: string;
  feedback: { correct: string; incorrect: string; wrongReason?: string };
  difficulty: 1 | 2 | 3;
  isSpacedReview?: boolean;
  sourceChapter?: number;
  /** 1-2 alternative versions of this question. At runtime one variant is randomly
   *  selected and its fields merged over the base question, producing a unique instance
   *  per attempt. Fields not present in the variant fall through to the base. */
  variants?: Array<Record<string, unknown>>;
}

export interface ChallengeMcq extends ChallengeQuestionBase {
  type: 'mcq';
  options: string[];
  correctIndex: number;
}

export interface ChallengeTwoStage extends ChallengeQuestionBase {
  type: 'two-stage' | 'boss';
  options: string[];
  correctIndex: number;
  justifications: string[];
  correctJustificationIndex: number;
}

export interface ChallengeAssertionReason extends ChallengeQuestionBase {
  type: 'assertion-reason';
  assertion: string;
  reason: string;
  correctRelationship: AssertionReasonRelationship;
}

export interface ChallengeAgreementMatrix extends ChallengeQuestionBase {
  type: 'agreement-matrix';
  statements: Array<{ text: string; correct: AgreementCategory }>;
}

export interface ChallengeConfidenceWeighted extends ChallengeQuestionBase {
  type: 'confidence-weighted';
  options: string[];
  correctIndex: number;
}

export interface ChallengeSliderEstimation extends ChallengeQuestionBase {
  type: 'slider-estimation';
  unit: string;
  correctValue: number;
  acceptableRange: [number, number];
  sliderMin: number;
  sliderMax: number;
}

export type ChallengeQuestion =
  | ChallengeMcq | ChallengeTwoStage | ChallengeAssertionReason
  | ChallengeAgreementMatrix | ChallengeConfidenceWeighted
  | ChallengeSliderEstimation;

export interface WeeklyChallengeData {
  metadata: { chapterTitle: string; weekNumber: number; estimatedMinutes: number };
  questions: ChallengeQuestion[];
}

export interface ActivityDetail {
  steps: Array<{ step: number; timing: string; instruction: string; studentAction: string }>;
  facilitationTips: string[];
  commonPitfalls: string[];
  debriefGuide: string;
  variations: string[];
  assessmentIdeas: string;
}

export interface GeneratedChapter {
  number: number;
  title: string;
  htmlContent: string; // full HTML with embedded widgets
  practiceQuizData?: string; // quiz text format
  inClassQuizData?: InClassQuizQuestion[];
  discussionData?: Array<{ prompt: string; hook: string }>;
  activityData?: Array<{ title: string; duration: string; description: string; materials: string; learningGoal: string; scalingNotes: string }>;
  activityDetails?: Record<number, ActivityDetail>;
  audioTranscript?: string;
  audioUrl?: string; // in-session blob URL from ElevenLabs (MP3); dies on reload + stripped from persistence
  audioDataUri?: string; // base64 data: URI of the MP3 — durable across reload (size-capped); not stripped
  slidesJson?: SlideData[];
  pptxUrl?: string; // blob URL
  infographicDataUri?: string; // data:image/jpeg;base64,...
  infographicPrompt?: string; // the Claude-written prompt for gpt-image-2
  weeklyChallengeData?: WeeklyChallengeData;
}

export interface SlideData {
  title: string;
  speakerNotes: string;
  /** gpt-image-2 prompt describing the full editorial image for this slide. */
  imagePrompt?: string;
  /** Rendered image (data:image/jpeg;base64,…). Cached after first render. */
  imageDataUri?: string;
  // ── Legacy fields, kept for backwards-compat with persisted state from the
  // old text-layout deck system. Not used by the new image-driven exporter
  // except as a last-ditch fallback when a slide has no imagePrompt.
  bullets?: string[];
  layout?: 'title' | 'content' | 'section' | 'big-idea' | 'quote' | 'two-column';
  bodyText?: string;
}

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type AlignmentLevel = 'introduced' | 'developed' | 'mastered';

export interface LearningObjective {
  id: number;
  text: string;
  bloomLevel: BloomLevel;
  alignments: Record<number, AlignmentLevel>;
}

export interface CurriculumMap {
  objectives: LearningObjective[];
  generatedAt: string;
  /** Hash of the syllabus content at generation time. Used to detect when the
   *  syllabus has been revised since the map was built, in which case the map
   *  is stale and the UI prompts the user to regenerate. */
  syllabusHash?: string;
}

export type StageId =
  | 'landing'
  | 'setup'
  | 'syllabus'
  | 'research'
  | 'build'
  | 'export';

export interface Stage {
  id: StageId;
  number: number;
  label: string;
  path: string;
}

export const STAGES: Stage[] = [
  { id: 'setup', number: 1, label: 'Setup', path: '/setup' },
  { id: 'syllabus', number: 2, label: 'Syllabus', path: '/syllabus' },
  { id: 'research', number: 3, label: 'Research', path: '/research' },
  { id: 'build', number: 4, label: 'Build', path: '/build' },
  { id: 'export', number: 5, label: 'Export', path: '/export' },
];
