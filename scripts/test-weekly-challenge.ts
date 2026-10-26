#!/usr/bin/env node
/**
 * Test script for the weekly challenge template.
 * Generates a sample HTML file from hardcoded data — no API calls.
 *
 * Usage:  npx tsx --import ./scripts/raw-loader.mjs scripts/test-weekly-challenge.ts
 * Then:   open output/test-challenge.html
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { buildWeeklyChallengeHtml } from '../src/templates/weeklyChallengeTemplate';
import { CHAPTER_THEMES } from '../src/themes';
import type { WeeklyChallengeData } from '../src/types/course';

const SAMPLE_DATA: WeeklyChallengeData = {
  metadata: {
    chapterTitle: 'Memory and Forgetting',
    weekNumber: 4,
    estimatedMinutes: 8,
  },
  questions: [
    // ── Warm-up: 2 MCQs ──
    {
      type: 'mcq',
      tier: 'warmup',
      stem: 'Which memory system is responsible for holding information for about 20-30 seconds without rehearsal?',
      options: ['Short-term memory', 'Sensory memory', 'Long-term memory', 'Procedural memory'],
      correctIndex: 0,
      feedback: {
        correct: 'Short-term memory holds information for approximately 20-30 seconds without rehearsal, as demonstrated by Peterson and Peterson (1959).',
        incorrect: 'Sensory memory lasts only 1-2 seconds, long-term memory persists indefinitely. Short-term memory sits between these at about 20-30 seconds.',
      },
      difficulty: 1,
      variants: [{
        stem: 'Which memory store has a capacity of approximately 7\u00b12 items and requires active maintenance?',
        options: ['Short-term memory', 'Iconic memory', 'Episodic memory', 'Implicit memory'],
        correctIndex: 0,
        feedback: {
          correct: 'Miller (1956) described the "magical number seven, plus or minus two" as the capacity of short-term memory.',
          incorrect: 'Iconic memory is sensory memory lasting ~1 second. Episodic and implicit memory are long-term stores. Short-term memory is the store with ~7 item capacity.',
        },
      }],
    },
    {
      type: 'mcq',
      tier: 'warmup',
      stem: 'What did Ebbinghaus discover about the rate of forgetting?',
      options: ['Forgetting is most rapid shortly after learning, then levels off', 'Forgetting occurs at a constant rate over time', 'Forgetting only begins after 24 hours', 'Forgetting is fastest after one week'],
      correctIndex: 0,
      feedback: {
        correct: 'Ebbinghaus\u2019s forgetting curve shows memory loss is steepest in the first hour, with roughly 50% forgotten, then slows progressively.',
        incorrect: 'Forgetting is NOT constant \u2014 it follows a curve where most loss happens rapidly in the first hour, then gradually slows.',
      },
      difficulty: 1,
      variants: [{
        stem: 'What shape does the "forgetting curve" discovered by Ebbinghaus take?',
        options: ['A steep initial drop that gradually levels off', 'A straight downward line', 'A U-shape with recovery at the end', 'A gradual decline that accelerates over time'],
        correctIndex: 0,
        feedback: {
          correct: 'The forgetting curve is an exponential decay \u2014 steep initial loss in the first hour, then progressively slower forgetting over days.',
          incorrect: 'The curve is not linear or U-shaped. It shows rapid early loss that gradually levels off \u2014 an exponential decay pattern.',
        },
      }],
    },

    // ── Core ──
    {
      type: 'two-stage',
      tier: 'core',
      stem: 'A student studies vocabulary by reading the words and definitions five times. On the test, she can\u2019t recall most of them. Which concept best explains her poor performance?',
      options: ['Shallow processing (maintenance rehearsal)', 'Retroactive interference', 'Source monitoring failure', 'Encoding specificity violation'],
      correctIndex: 0,
      justifications: [
        'Simply repeating information keeps it in short-term memory but doesn\u2019t create durable long-term traces',
        'The student\u2019s existing knowledge interfered with encoding the new vocabulary',
        'The student encoded the information but couldn\u2019t access it without the right retrieval cue',
        'The vocabulary was encoded visually but the test required verbal recall',
      ],
      correctJustificationIndex: 0,
      feedback: {
        correct: 'Craik and Lockhart\u2019s levels of processing framework explains this: maintenance rehearsal processes information shallowly, producing weak memory traces.',
        incorrect: 'The issue is HOW she studied. Reading and repeating is maintenance rehearsal, which doesn\u2019t create strong long-term traces.',
        wrongReason: 'You identified shallow processing correctly, but the key reason is that maintenance rehearsal doesn\u2019t create durable traces \u2014 not interference or retrieval failure.',
      },
      difficulty: 2,
      variants: [{
        stem: 'A medical student highlights every sentence in the textbook while studying for an anatomy exam but performs poorly. Which concept best explains this?',
        options: ['Shallow processing (insufficient elaboration)', 'Proactive interference from prior courses', 'Decay of memory traces over time', 'Context-dependent memory failure'],
        correctIndex: 0,
        justifications: [
          'Highlighting without elaboration is shallow processing that doesn\u2019t create meaningful connections to support retrieval',
          'Previous anatomy knowledge from other courses interfered with new learning',
          'The time gap between studying and the exam caused the memories to decay',
          'Studying at home but testing in a lecture hall created a context mismatch',
        ],
        correctJustificationIndex: 0,
        feedback: {
          correct: 'Mass highlighting is one of the least effective study strategies because it involves shallow processing without creating meaningful connections.',
          incorrect: 'The problem is the study method itself. Highlighting feels productive but doesn\u2019t require deep processing or elaboration.',
          wrongReason: 'Correct that it\u2019s a processing issue, but specifically: highlighting is shallow because it doesn\u2019t force elaborative connections.',
        },
      }],
    },
    {
      type: 'assertion-reason',
      tier: 'core',
      stem: 'Evaluate the relationship between these two statements:',
      assertion: 'Distributed practice produces better long-term retention than massed practice.',
      reason: 'Distributed practice forces the learner to repeatedly retrieve information from long-term memory, strengthening the memory trace each time.',
      correctRelationship: 'both-true-reason-explains',
      feedback: {
        correct: 'Both true, and retrieval during spaced sessions IS a key mechanism: each retrieval strengthens the trace (Bjork & Bjork, 1992).',
        incorrect: 'Distributed practice IS superior, and the retrieval explanation IS correct \u2014 each spaced session requires retrieval, which strengthens the memory.',
      },
      difficulty: 2,
      variants: [{
        assertion: 'The testing effect shows that retrieval practice improves long-term retention more than restudying.',
        reason: 'Retrieving information requires more cognitive effort than rereading, creating stronger memory traces through desirable difficulty.',
        correctRelationship: 'both-true-reason-explains',
        feedback: {
          correct: 'Both true, and the desirable difficulty explanation IS a major mechanism: effortful retrieval creates stronger, more durable traces than passive rereading.',
          incorrect: 'The testing effect IS real and robust \u2014 retrieval practice consistently outperforms restudying, partly because effortful retrieval creates stronger memory traces.',
        },
      }, {
        assertion: 'Elaborative rehearsal produces stronger memories than maintenance rehearsal.',
        reason: 'Elaborative rehearsal takes more time than maintenance rehearsal.',
        correctRelationship: 'both-true-reason-independent',
        feedback: {
          correct: 'Both statements are true, but the time difference is NOT why elaborative rehearsal is superior. It\u2019s superior because it creates deeper, more meaningful connections \u2014 not because it takes longer.',
          incorrect: 'Elaborative rehearsal IS superior, and it does often take longer, but the causal mechanism is depth of processing, not duration.',
        },
      }],
    },
    {
      type: 'confidence-weighted',
      tier: 'core',
      stem: 'In the DRM paradigm, participants study "bed, rest, awake, tired, dream, wake" and then recall "sleep" even though it was never presented. This demonstrates:',
      options: ['Associative activation creating false memories', 'Proactive interference from prior knowledge', 'The misinformation effect', 'Source monitoring failure'],
      correctIndex: 0,
      feedback: {
        correct: 'The DRM paradigm demonstrates that semantic associations can generate false memories through accumulated activation of a critical lure.',
        incorrect: 'This is specifically caused by associative activation \u2014 all studied words activate "sleep" in semantic networks until it feels genuinely remembered.',
      },
      difficulty: 2,
      variants: [{
        stem: 'A witness confidently "remembers" seeing broken glass at an accident scene after being asked "How fast were the cars going when they smashed into each other?" This demonstrates:',
        options: ['The misinformation effect', 'Source monitoring failure', 'Retroactive interference', 'Flashbulb memory distortion'],
        correctIndex: 0,
        feedback: {
          correct: 'This is Loftus and Palmer\u2019s classic misinformation effect: the verb "smashed" introduced misleading post-event information that altered the original memory.',
          incorrect: 'The misleading verb "smashed" is a textbook example of post-event misinformation altering an existing memory \u2014 the misinformation effect.',
        },
      }],
    },

    // ── Spaced review ──
    {
      type: 'mcq',
      tier: 'core',
      stem: 'In signal detection theory, a "hit" occurs when:',
      options: ['A signal is present and the observer correctly reports detecting it', 'No signal is present but the observer reports detecting one', 'A signal is present but the observer fails to detect it', 'No signal is present and the observer correctly reports nothing'],
      correctIndex: 0,
      feedback: {
        correct: 'A "hit" is a correct detection \u2014 signal present and the observer says "yes."',
        incorrect: 'The 2\u00d72 matrix: signal present + "yes" = hit; signal absent + "yes" = false alarm; signal present + "no" = miss; signal absent + "no" = correct rejection.',
      },
      difficulty: 1,
      isSpacedReview: true,
      sourceChapter: 2,
      variants: [{
        stem: 'In signal detection theory, a "false alarm" occurs when:',
        options: ['No signal is present but the observer reports detecting one', 'A signal is present and the observer correctly detects it', 'A signal is present but the observer misses it', 'No signal is present and the observer correctly says nothing'],
        correctIndex: 0,
        feedback: {
          correct: 'A false alarm occurs when the observer says "yes" but no signal was actually present \u2014 a false positive.',
          incorrect: 'A false alarm is specifically saying "yes" when nothing is there. It\u2019s distinguished from a hit (correctly detecting a real signal).',
        },
      }],
    },

    // ── Challenge ──
    {
      type: 'agreement-matrix',
      tier: 'challenge',
      stem: 'Classify each statement about memory phenomena:',
      statements: [
        { text: 'Flashbulb memories are more vivid than ordinary memories', correct: 'always' as const },
        { text: 'Flashbulb memories are more accurate than ordinary memories', correct: 'sometimes' as const },
        { text: 'The testing effect improves long-term retention compared to restudying', correct: 'always' as const },
        { text: 'Retroactive interference eliminates the original memory trace', correct: 'never' as const },
        { text: 'Context-dependent memory effects occur when internal state matches at encoding and retrieval', correct: 'never' as const },
        { text: 'Mnemonics improve memory by adding meaning and structure to material', correct: 'always' as const },
      ],
      feedback: {
        correct: 'Key: flashbulb memories are ALWAYS more vivid but only SOMETIMES more accurate. Context-dependent = external environment, not internal state.',
        incorrect: 'Flashbulb memories feel vivid (always) but are NOT always more accurate. Context-dependent memory refers to external environment, not internal state.',
      },
      difficulty: 3,
      variants: [{
        stem: 'Classify each statement about encoding and retrieval:',
        statements: [
          { text: 'Elaborative rehearsal produces stronger memories than maintenance rehearsal', correct: 'always' },
          { text: 'Recognition is easier than recall', correct: 'always' },
          { text: 'Retrieval cues are helpful only if they were present during encoding', correct: 'sometimes' },
          { text: 'Forgetting is always caused by decay of the memory trace', correct: 'never' },
          { text: 'Interference effects are stronger for similar materials', correct: 'always' },
        ],
        feedback: {
          correct: 'Forgetting is NEVER always caused by decay \u2014 interference is a major alternative explanation. Retrieval cues are SOMETIMES helpful even when not present at encoding (e.g., category cues).',
          incorrect: 'The key trap: forgetting has multiple causes (decay AND interference), and retrieval cues can sometimes work even if not present at encoding.',
        },
      }],
    },
    {
      type: 'slider-estimation',
      tier: 'challenge',
      stem: 'According to Ebbinghaus\u2019s research, approximately what percentage of learned material is forgotten within the first hour?',
      unit: '%',
      correctValue: 56,
      acceptableRange: [45, 65] as [number, number],
      sliderMin: 0,
      sliderMax: 100,
      feedback: {
        correct: 'Ebbinghaus found approximately 56% of nonsense syllables were forgotten within one hour.',
        incorrect: 'Students commonly underestimate early forgetting. About 56% is lost in just the first hour.',
      },
      difficulty: 3,
      variants: [{
        stem: 'According to Ebbinghaus\u2019s research, approximately what percentage of learned material is retained after 24 hours?',
        correctValue: 33,
        acceptableRange: [25, 42],
        feedback: {
          correct: 'Ebbinghaus found approximately 33% retention after 24 hours (67% forgotten).',
          incorrect: 'Many students overestimate 24-hour retention. Only about a third of material is retained after one day.',
        },
      }, {
        stem: 'In Roediger & Karpicke\u2019s (2006) study, what percentage of a prose passage did the restudy group recall after one week?',
        correctValue: 42,
        acceptableRange: [34, 50],
        feedback: {
          correct: 'The restudy group recalled about 42% after one week, while the retrieval practice group recalled about 56% \u2014 demonstrating the testing effect.',
          incorrect: 'The restudy group\u2019s one-week retention (~42%) was substantially lower than the retrieval practice group (~56%), despite feeling more confident while studying.',
        },
      }],
    },

    // ── Spaced review ──
    {
      type: 'assertion-reason',
      tier: 'challenge',
      stem: 'Evaluate the relationship between these two statements:',
      assertion: 'Weber\u2019s Law states that the just noticeable difference is a constant proportion of the stimulus intensity.',
      reason: 'Humans are better at detecting small changes in weak stimuli than in strong stimuli.',
      correctRelationship: 'both-true-reason-explains',
      feedback: {
        correct: 'Both true, and the reason explains the assertion. We notice a 1g change in 10g but not in 1000g \u2014 sensitivity to change is proportional.',
        incorrect: 'Weber\u2019s Law describes proportional sensitivity: \u0394I/I is roughly constant, meaning we need larger absolute changes to notice differences in stronger stimuli.',
      },
      difficulty: 2,
      isSpacedReview: true,
      sourceChapter: 2,
      variants: [{
        assertion: 'Fechner\u2019s Law states that perceived intensity is proportional to the logarithm of stimulus intensity.',
        reason: 'Equal physical increments in stimulus intensity produce progressively smaller changes in perceived intensity.',
        correctRelationship: 'both-true-reason-explains',
        feedback: {
          correct: 'Both true, and the reason explains the logarithmic relationship: as physical intensity grows, each additional unit produces a diminishing perceptual change.',
          incorrect: 'Fechner\u2019s Law IS logarithmic, and it IS because equal physical increments produce diminishing perceptual changes \u2014 the hallmark of a log function.',
        },
      }],
    },

    // ── Boss ──
    {
      type: 'boss',
      tier: 'boss',
      stem: 'A psychology lecturer redesigns her course so that students complete short retrieval quizzes after each lecture instead of rereading notes. She spaces the quizzes so material from Week 1 reappears in Weeks 3, 6, and 10. Her students outperform the previous cohort by a full letter grade. Which combination of memory principles best explains this?',
      options: ['Testing effect + spacing effect + desirable difficulty', 'Elaborative rehearsal + encoding specificity + transfer-appropriate processing', 'Levels of processing + dual coding + distinctiveness', 'State-dependent memory + context reinstatement + generation effect'],
      correctIndex: 0,
      justifications: [
        'Retrieval practice strengthens traces, distributed timing exploits the spacing effect, and effortful recall creates desirable difficulty',
        'The quizzes require deeper processing than rereading, and the lecture hall context matches the exam',
        'Producing answers creates stronger traces than passive reading, regardless of spacing',
        'The key factor is that students studied more total hours due to the quiz schedule',
      ],
      correctJustificationIndex: 0,
      feedback: {
        correct: 'Three synergistic principles: testing effect (retrieval > restudying), spacing effect (distributed > massed), and desirable difficulty (effortful recall = durable learning).',
        incorrect: 'The scenario describes retrieval practice (quizzes), spaced scheduling (material reappears at intervals), and effortful recall (desirable difficulty).',
        wrongReason: 'Right answer, but make sure you understand each mechanism: testing = retrieval strengthens traces; spacing = prevents massed-practice illusions; desirable difficulty = effort leads to durability.',
      },
      difficulty: 3,
      variants: [{
        stem: 'A student who scored poorly on her midterm changes her study strategy: she now closes her textbook and tries to write down everything she remembers, checks what she missed, waits two days, and repeats. On the final exam she scores in the top 10%. Which combination best explains her improvement?',
        options: ['Free recall practice + spacing + successive relearning', 'Elaborative rehearsal + deep processing + method of loci', 'Dual coding + keyword method + interleaving', 'Overlearning + massed practice + encoding specificity'],
        correctIndex: 0,
        justifications: [
          'Closing the book and recalling is free recall (testing effect), the two-day gap is spacing, and repeating the cycle is successive relearning \u2014 one of the most potent combinations in the literature',
          'Writing from memory is a form of elaborative rehearsal that creates deeper processing',
          'The improvement came from writing (dual coding) combined with mixing topics',
          'Repeating the same material is overlearning, which is always the most effective strategy',
        ],
        correctJustificationIndex: 0,
        feedback: {
          correct: 'This is textbook successive relearning (Rawson & Dunlosky, 2011): retrieval practice + spacing + repeated cycles. Effect sizes are among the largest in the memory literature.',
          incorrect: 'The strategy is specifically: self-testing (not rereading), spaced intervals (not massed), and repeated cycles of retrieval \u2014 successive relearning.',
          wrongReason: 'Correct combination, but the mechanism is crucial: closing the book forces retrieval (not elaboration), the delay creates spacing (not just time), and repeating cycles compounds both effects.',
        },
      }],
    },
  ],
};

async function main() {
  await mkdir('output', { recursive: true });

  // Test with each chapter theme (press, notebook, almanac, …)
  for (const { id: theme } of CHAPTER_THEMES) {
    const html = buildWeeklyChallengeHtml(
      `Week 4 Challenge — Memory and Forgetting`,
      SAMPLE_DATA,
      'PSYC2371: Introduction to Psychology',
      theme,
    );
    await writeFile(`output/test-challenge-${theme}.html`, html);
    console.log(`✓ Generated output/test-challenge-${theme}.html`);
  }

  // Default theme
  const html = buildWeeklyChallengeHtml(
    `Week 4 Challenge — Memory and Forgetting`,
    SAMPLE_DATA,
    'PSYC2371: Introduction to Psychology',
  );
  await writeFile('output/test-challenge.html', html);
  console.log(`✓ Generated output/test-challenge.html (default theme)`);
  console.log('\nOpen in browser:  open output/test-challenge.html');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
