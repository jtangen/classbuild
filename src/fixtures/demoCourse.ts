import type {
  Syllabus,
  GeneratedChapter,
  CourseSetup,
  WeeklyChallengeData,
} from '../types/course';

// Smallest valid base64 JPEG (1x1 white pixel) — gives the IMSCC infographic
// path something real to bundle without depending on a generated image.
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQBAQAAAAAAAAAAAAAAAAAAAAj/2gAMAwEAAhADEAAAAQH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAh//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AR//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AR//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Ah//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IR//2gAMAwEAAgADAAAAEB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EB//2Q==';

export const demoSetup: CourseSetup = {
  topic: 'Cellular Biology Foundations',
  educationLevel: 'first-year',
  priorKnowledge: 'some',
  cohortSize: 40,
  teachingEnvironment: 'lecture-theatre',
  numChapters: 2,
  chapterLength: 'standard',
  widgetsPerChapter: 1,
  themeId: 'midnight',
  voiceId: 'Kore',
};

export const demoSyllabus: Syllabus = {
  courseTitle: 'Cellular Biology Foundations (Demo)',
  courseOverview:
    'A two-class demo course covering the basic structure of cells and the central dogma of molecular biology. This is a fixture for testing the Common Cartridge export pipeline.',
  chapters: [
    {
      number: 1,
      title: 'Cell Structure and Organelles',
      narrative:
        'Introduce the cell as the fundamental unit of life. Compare prokaryotic and eukaryotic organization, then walk through the major organelles and their functions.',
      keyConcepts: ['Cell theory', 'Prokaryote vs eukaryote', 'Organelles and division of labor'],
      widgets: [
        {
          title: 'Organelle matcher',
          description: 'Drag-and-drop matching of organelles to functions',
          concept: 'Organelle function',
          rationale: 'Active retrieval of structure-function pairings',
        },
      ],
      scienceAnnotations: [
        { principle: 'retrieval', description: 'The matcher widget forces students to recall functions, not just recognize them.' },
      ],
      spacingConnections: [],
    },
    {
      number: 2,
      title: 'DNA, RNA, and the Central Dogma',
      narrative:
        'Build on cellular machinery to introduce DNA structure, transcription, and translation. Emphasize how information flows from genome to phenotype.',
      keyConcepts: ['DNA structure', 'Transcription', 'Translation'],
      widgets: [
        {
          title: 'Codon decoder',
          description: 'Translate a short mRNA sequence into amino acids',
          concept: 'The genetic code',
          rationale: 'Procedural fluency through repetition',
        },
      ],
      scienceAnnotations: [
        { principle: 'spacing', description: 'Reuses ribosome from chapter 1 to reinforce structure-function memory.', relatedChapters: [1] },
      ],
      spacingConnections: [1],
    },
  ],
};

const chapter1Reading = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Cell Structure and Organelles</title>
</head>
<body>
  <h1>Cell Structure and Organelles</h1>
  <p>The cell is the smallest unit of life capable of independent reproduction. Every organism — from a single bacterium to a blue whale — is built from cells.</p>
  <h2>Prokaryotes vs. eukaryotes</h2>
  <p>Prokaryotic cells (bacteria, archaea) lack a membrane-bound nucleus and store their DNA in a region called the nucleoid. Eukaryotic cells (plants, animals, fungi, protists) compartmentalize functions into organelles, including a true nucleus.</p>
  <h2>Major organelles</h2>
  <ul>
    <li><strong>Nucleus</strong> — stores the genome and coordinates gene expression.</li>
    <li><strong>Mitochondrion</strong> — converts chemical energy into ATP via oxidative phosphorylation.</li>
    <li><strong>Ribosome</strong> — translates mRNA into protein.</li>
    <li><strong>Endoplasmic reticulum</strong> — folds and modifies proteins (rough ER) and synthesizes lipids (smooth ER).</li>
    <li><strong>Golgi apparatus</strong> — packages proteins for secretion or transport.</li>
  </ul>
  <p>The compartmentalization that defines eukaryotes is itself a hypothesis about <em>how</em> complex life evolved: the endosymbiotic theory holds that mitochondria and chloroplasts descend from free-living bacteria absorbed by an ancestral eukaryote.</p>
</body>
</html>`;

const chapter2Reading = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>DNA, RNA, and the Central Dogma</title>
</head>
<body>
  <h1>DNA, RNA, and the Central Dogma</h1>
  <p>In chapter 1 we toured the cell. Now we look inside the nucleus, at the molecule that makes inheritance possible.</p>
  <h2>DNA's structure</h2>
  <p>DNA is a double helix of two complementary strands, with adenine pairing to thymine and guanine pairing to cytosine. The sequence of these bases encodes every protein the cell can build.</p>
  <h2>The central dogma</h2>
  <p>Francis Crick's <em>central dogma</em> describes the flow of genetic information:</p>
  <p style="text-align: center; font-family: monospace;">DNA &rarr; RNA &rarr; Protein</p>
  <ol>
    <li><strong>Transcription</strong> — RNA polymerase reads a DNA template and produces messenger RNA (mRNA).</li>
    <li><strong>Translation</strong> — ribosomes (last chapter!) read mRNA in three-base codons and assemble the corresponding amino acids into a protein.</li>
  </ol>
  <p>Exceptions exist (reverse transcription in retroviruses, for one), but the dogma still describes the dominant flow of information in nearly all living systems.</p>
</body>
</html>`;

// Practice quiz markdown — option 'a' is always the correct answer per the
// upstream parser convention in src/templates/quizTemplate.ts.
const chapter1PracticeQuiz = `1. **Which organelle generates the majority of a eukaryotic cell's ATP?**
   a. The mitochondrion
   b. The Golgi apparatus
   c. The smooth endoplasmic reticulum
   d. The lysosome
   **Answer**: The mitochondrion
   **Feedback**: Mitochondria carry out oxidative phosphorylation, the major ATP-producing pathway in aerobic eukaryotes.

---

2. **Which of the following best distinguishes prokaryotes from eukaryotes?**
   a. Prokaryotes lack a membrane-bound nucleus
   b. Prokaryotes do not have ribosomes
   c. Prokaryotes cannot reproduce
   d. Prokaryotes are always pathogenic
   **Answer**: Prokaryotes lack a membrane-bound nucleus
   **Feedback**: Both cell types have ribosomes and reproduce, and most prokaryotes are harmless. The defining feature is the absence of a nuclear envelope.
`;

const chapter2PracticeQuiz = `1. **What is the role of mRNA in the central dogma?**
   a. It carries genetic instructions from DNA to the ribosome
   b. It catalyzes peptide bond formation
   c. It physically pairs amino acids together without a template
   d. It replicates the DNA helix
   **Answer**: It carries genetic instructions from DNA to the ribosome
   **Feedback**: mRNA is the messenger — it is transcribed from DNA in the nucleus and read by ribosomes during translation.
`;

const chapter1WeeklyChallenge: WeeklyChallengeData = {
  metadata: { chapterTitle: 'Cell Structure and Organelles', weekNumber: 1, estimatedMinutes: 15 },
  questions: [
    {
      type: 'mcq',
      tier: 'warmup',
      stem: 'Which organelle is the primary site of protein translation?',
      options: ['Ribosome', 'Nucleolus', 'Lysosome', 'Peroxisome'],
      correctIndex: 0,
      feedback: { correct: 'Right — ribosomes catalyze peptide bond formation.', incorrect: 'Re-read the section on protein synthesis.' },
      difficulty: 1,
    },
    {
      type: 'two-stage',
      tier: 'core',
      stem: 'A cell mutant cannot package secreted proteins for export. Which organelle is most likely defective?',
      options: ['Golgi apparatus', 'Mitochondrion', 'Nucleus', 'Smooth ER'],
      correctIndex: 0,
      justifications: [
        'The Golgi sorts and packages proteins into vesicles destined for secretion.',
        'Mitochondria do not handle secretion.',
        'The nucleus stores DNA.',
        'Smooth ER handles lipid synthesis, not protein packaging.',
      ],
      correctJustificationIndex: 0,
      feedback: { correct: 'Correct — and you picked the right reason.', incorrect: 'The Golgi packages secretory proteins.' },
      difficulty: 2,
    },
    {
      type: 'confidence-weighted',
      tier: 'core',
      stem: 'Endosymbiotic theory proposes that mitochondria descend from which kind of ancestral cell?',
      options: ['A free-living aerobic bacterium', 'A virus', 'An ancient eukaryote', 'A chloroplast'],
      correctIndex: 0,
      feedback: { correct: 'Yes — Lynn Margulis championed this view in the 1960s.', incorrect: 'Mitochondria descend from a bacterial ancestor, per the endosymbiotic hypothesis.' },
      difficulty: 2,
    },
    // The next three exercise the lossy-skip paths in the QTI conversion —
    // they should appear in the rich HTML weekly challenge but be omitted
    // from the Canvas-imported quiz.
    {
      type: 'assertion-reason',
      tier: 'challenge',
      stem: 'Evaluate the relationship.',
      assertion: 'Prokaryotic cells contain ribosomes.',
      reason: 'Ribosomes are required for translation.',
      correctRelationship: 'both-true-reason-explains',
      feedback: { correct: 'Both statements are true and the reason explains the assertion.', incorrect: 'Both statements are true and the second explains the first.' },
      difficulty: 3,
    },
    {
      type: 'agreement-matrix',
      tier: 'challenge',
      stem: 'Classify how often each of the following is true of eukaryotic cells:',
      statements: [
        { text: 'Has a membrane-bound nucleus', correct: 'always' },
        { text: 'Performs photosynthesis', correct: 'sometimes' },
        { text: 'Lacks ribosomes', correct: 'never' },
      ],
      feedback: { correct: 'Strong work distinguishing universal from contingent traits.', incorrect: 'Review which features define eukaryotes vs. which depend on cell type.' },
      difficulty: 3,
    },
  ],
};

export const demoChapters: GeneratedChapter[] = [
  {
    number: 1,
    title: 'Cell Structure and Organelles',
    htmlContent: chapter1Reading,
    practiceQuizData: chapter1PracticeQuiz,
    inClassQuizData: [
      {
        question: 'Which organelle is responsible for ATP production in eukaryotes?',
        correctAnswer: 'Mitochondrion',
        correctFeedback: 'Mitochondria run oxidative phosphorylation.',
        distractors: [
          { text: 'Golgi apparatus', feedback: 'The Golgi packages proteins; it does not produce ATP.' },
          { text: 'Lysosome', feedback: 'Lysosomes degrade waste; they do not produce ATP.' },
          { text: 'Nucleus', feedback: 'The nucleus stores DNA; it is not the primary ATP producer.' },
        ],
      },
      {
        question: 'What is the defining feature that separates eukaryotes from prokaryotes?',
        correctAnswer: 'A membrane-bound nucleus',
        correctFeedback: 'Eukaryotes compartmentalize their DNA inside a nucleus.',
        distractors: [
          { text: 'The presence of ribosomes', feedback: 'Both cell types have ribosomes.' },
          { text: 'A cell wall', feedback: 'Both can have cell walls; not a defining distinction.' },
          { text: 'The ability to reproduce', feedback: 'All cells reproduce.' },
        ],
      },
    ],
    discussionData: [
      { hook: 'Hot take', prompt: 'Are viruses alive? Defend your answer using the cell theory.' },
    ],
    activityData: [
      {
        title: 'Build-an-organelle relay',
        duration: '20 min',
        description: 'Teams race to map organelle cards onto a functional cell diagram.',
        materials: 'Pre-printed organelle cards, large cell outline poster',
        learningGoal: 'Recall organelle functions through active retrieval.',
        scalingNotes: 'For 60+ students, run two parallel relays.',
      },
    ],
    weeklyChallengeData: chapter1WeeklyChallenge,
    slidesJson: [
      { title: 'Cell Structure and Organelles', bullets: [], speakerNotes: 'Open by asking what the smallest unit of life is.', layout: 'title' },
      { title: 'Prokaryotes vs. eukaryotes', bullets: ['Prokaryotes lack a nucleus', 'Eukaryotes compartmentalize'], speakerNotes: 'Use the bacterium-vs-yeast diagram from the slide deck.' },
      { title: 'Why compartments?', bullets: ['Specialization', 'Higher reaction rates', 'Information protection'], speakerNotes: 'Tie this back to endosymbiotic theory.' },
    ],
    infographicDataUri: `data:image/jpeg;base64,${TINY_JPEG_BASE64}`,
  },
  {
    number: 2,
    title: 'DNA, RNA, and the Central Dogma',
    htmlContent: chapter2Reading,
    practiceQuizData: chapter2PracticeQuiz,
    inClassQuizData: [
      {
        question: 'During translation, which molecule reads mRNA codons?',
        correctAnswer: 'Transfer RNA (tRNA)',
        correctFeedback: 'tRNAs match codons to amino acids.',
        distractors: [
          { text: 'DNA polymerase', feedback: 'DNA polymerase replicates DNA, not mRNA.' },
          { text: 'Ribosomal RNA only', feedback: 'rRNA is part of the ribosome but does not match codons to amino acids.' },
          { text: 'Messenger RNA itself', feedback: 'mRNA is the template, not the reader.' },
        ],
      },
    ],
  },
];
