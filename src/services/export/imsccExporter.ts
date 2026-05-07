import type {
  Syllabus,
  GeneratedChapter,
  InClassQuizQuestion,
  WeeklyChallengeData,
  ChallengeQuestion,
} from '../../types/course';

// ── Helpers ──

function escXml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slug(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ── Quiz model normalization (everything funnels into MCQ for QTI 1.2) ──

interface ParsedMcq {
  prompt: string;
  options: string[];
  correctIndex: number;
  feedback?: string;
}

/**
 * Parse the markdown format used by `practiceQuizData`. Mirrors the parser in
 * `src/templates/quizTemplate.ts` (option `a` is always the correct answer in
 * source; the runtime quiz randomizes order at display time).
 */
function parsePracticeQuizMarkdown(md: string): ParsedMcq[] {
  const out: ParsedMcq[] = [];
  const norm = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const sections = norm.split(/\n\s*---\s*\n/);
  for (const sec of sections) {
    const t = sec.trim();
    if (!t) continue;
    const qm = t.match(/^\s*\d+\.\s+\*\*([^*]+)\*\*/);
    if (!qm) continue;
    const prompt = qm[1].trim();
    const opts: { id: string; text: string }[] = [];
    const re = /\s+([a-d])\.\s+(.*?)(?=\s+[a-d]\.\s+|\s+\*\*Answer|\s*$)/gs;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      if (['a', 'b', 'c', 'd'].includes(m[1])) {
        opts.push({ id: m[1], text: m[2].trim() });
      }
      if (opts.length >= 4) break;
    }
    if (opts.length === 0) continue;
    const fbm = t.match(/\*\*Feedback\*\*:\s*([\s\S]*?)(?=\s*$)/);
    out.push({
      prompt,
      options: opts.map((o) => o.text),
      correctIndex: 0,
      feedback: fbm ? fbm[1].trim() : undefined,
    });
  }
  return out;
}

function inClassToMcq(q: InClassQuizQuestion): ParsedMcq {
  return {
    prompt: q.question,
    options: [q.correctAnswer, ...q.distractors.map((d) => d.text)],
    correctIndex: 0,
    feedback: q.correctFeedback,
  };
}

function challengeToMcq(q: ChallengeQuestion): ParsedMcq | null {
  if (q.type === 'mcq' || q.type === 'confidence-weighted') {
    return {
      prompt: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      feedback: q.feedback?.correct,
    };
  }
  if (q.type === 'two-stage' || q.type === 'boss') {
    return {
      prompt: q.stem,
      options: q.options,
      correctIndex: q.correctIndex,
      feedback: q.feedback?.correct,
    };
  }
  // assertion-reason / agreement-matrix / slider-estimation: not cleanly
  // representable in QTI 1.2 single-MCQ; the rich HTML version is shipped
  // alongside as a webcontent resource so the content is still usable.
  return null;
}

function weeklyToMcqs(d: WeeklyChallengeData): ParsedMcq[] {
  const out: ParsedMcq[] = [];
  for (const q of d.questions) {
    const mcq = challengeToMcq(q);
    if (mcq) out.push(mcq);
  }
  return out;
}

// ── QTI 1.2 builders (Canvas-flavored, CC 1.1 profile) ──

function qtiItem(id: string, mcq: ParsedMcq): string {
  const choiceLabels = mcq.options
    .map((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      return `<response_label ident="${letter}"><material><mattext texttype="text/plain">${escXml(opt)}</mattext></material></response_label>`;
    })
    .join('');
  const correctLetter = String.fromCharCode(65 + mcq.correctIndex);
  const fbBlock = mcq.feedback
    ? `<itemfeedback ident="${id}_fb"><flow_mat><material><mattext texttype="text/plain">${escXml(mcq.feedback)}</mattext></material></flow_mat></itemfeedback>`
    : '';
  const fbLink = mcq.feedback ? `<displayfeedback feedbacktype="Response" linkrefid="${id}_fb"/>` : '';
  return `<item ident="${id}" title="${escXml(mcq.prompt.slice(0, 80))}">
  <itemmetadata>
    <qtimetadata>
      <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield>
      <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>1.0</fieldentry></qtimetadatafield>
    </qtimetadata>
  </itemmetadata>
  <presentation>
    <material><mattext texttype="text/html">${escXml(mcq.prompt)}</mattext></material>
    <response_lid ident="response1" rcardinality="Single">
      <render_choice>${choiceLabels}</render_choice>
    </response_lid>
  </presentation>
  <resprocessing>
    <outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>
    <respcondition continue="No">
      <conditionvar><varequal respident="response1">${correctLetter}</varequal></conditionvar>
      <setvar action="Set" varname="SCORE">100</setvar>
      ${fbLink}
    </respcondition>
  </resprocessing>
  ${fbBlock}
</item>`;
}

function qtiAssessment(assessmentId: string, title: string, mcqs: ParsedMcq[]): string {
  const items = mcqs.map((m, i) => qtiItem(`${assessmentId}_Q${i + 1}`, m)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_qtiasiv1p2p1_v1p0.xsd">
  <assessment ident="${assessmentId}" title="${escXml(title)}">
    <section ident="root_section">${items}</section>
  </assessment>
</questestinterop>`;
}

// ── Manifest assembly ──

interface ResourceRecord {
  id: string;
  type: string;
  href: string;
  files: string[];
  title: string;
}

interface ChapterModule {
  number: number;
  title: string;
  resources: ResourceRecord[];
}

const QTI_RESOURCE_TYPE = 'imsqti_xmlv1p2/imscc_xmlv1p1/assessment';
const DISCUSSION_RESOURCE_TYPE = 'imsdt_xmlv1p1';

// ── Discussion topic builder (IMS DT 1.1, CC 1.1 profile) ──

function discussionTopicXml(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<topic xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imsdt_v1p1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imsdt_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imsdt_v1p2_v1p0.xsd">
  <title>${escXml(title)}</title>
  <text texttype="text/html">${escXml(body)}</text>
</topic>`;
}

// ── Canvas course-settings extension ──
// Canvas-proprietary; surfaces the course title and pushes the description
// into the Syllabus tab body (which IS visible to enrolled students, unlike
// the LOM <description> in the manifest which only shows in Course Details).
//
// Canvas's own CC exporter uses a separate `syllabus.html` file rather than
// an inline `<syllabus_body>` field, and points the resource href at the
// `canvas_export.txt` sentinel rather than the settings XML. Matching that
// convention is what gets the description picked up on import.
const COURSE_SETTINGS_RESOURCE_TYPE =
  'associatedcontent/imscc_xmlv1p1/learning-application-resource';

function buildCourseSettingsXml(syllabus: Syllabus): string {
  const courseId = `classbuild-${slug(syllabus.courseTitle) || 'course'}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<course identifier="${escXml(courseId)}" xmlns="http://canvas.instructure.com/xsd/cccv1p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://canvas.instructure.com/xsd/cccv1p0 http://canvas.instructure.com/xsd/cccv1p0.xsd">
  <title>${escXml(syllabus.courseTitle)}</title>
  <storage_quota>524288000</storage_quota>
  <is_public>false</is_public>
</course>`;
}

function buildSyllabusHtml(syllabus: Syllabus): string {
  const overview = escXml(syllabus.courseOverview || '');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escXml(syllabus.courseTitle)}</title>
</head>
<body>
  <p>${overview}</p>
</body>
</html>`;
}

function buildManifest(
  syllabus: Syllabus,
  modules: ChapterModule[],
  extraResources: ResourceRecord[],
  settingsResources: ResourceRecord[],
): string {
  const courseId = `classbuild-${slug(syllabus.courseTitle) || 'course'}`;

  const moduleItems = modules
    .map((m) => {
      const subItems = m.resources
        .map(
          (r) =>
            `<item identifier="I_${r.id}" identifierref="${r.id}"><title>${escXml(r.title)}</title></item>`,
        )
        .join('');
      return `<item identifier="M_${m.number}"><title>${escXml(`Chapter ${m.number}: ${m.title}`)}</title>${subItems}</item>`;
    })
    .join('');

  const extraItems = extraResources
    .map(
      (r) =>
        `<item identifier="I_${r.id}" identifierref="${r.id}"><title>${escXml(r.title)}</title></item>`,
    )
    .join('');

  // settingsResources intentionally do NOT appear in the organization tree —
  // they are LMS-side configuration, not module content.
  const allResources = [
    ...modules.flatMap((m) => m.resources),
    ...extraResources,
    ...settingsResources,
  ];
  const resourceXml = allResources
    .map((r) => {
      const files = r.files.map((f) => `<file href="${escXml(f)}"/>`).join('');
      return `<resource identifier="${r.id}" type="${r.type}" href="${escXml(r.href)}">${files}</resource>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escXml(courseId)}"
  xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"
  xmlns:lomimscc="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imscp_v1p2_v1p0.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/manifest http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lommanifest_v1p0.xsd">
  <metadata>
    <schema>IMS Common Cartridge</schema>
    <schemaversion>1.1.0</schemaversion>
    <lomimscc:lom>
      <lomimscc:general>
        <lomimscc:title><lomimscc:string>${escXml(syllabus.courseTitle)}</lomimscc:string></lomimscc:title>
        <lomimscc:description><lomimscc:string>${escXml(syllabus.courseOverview || '')}</lomimscc:string></lomimscc:description>
      </lomimscc:general>
    </lomimscc:lom>
  </metadata>
  <organizations>
    <organization identifier="O_1" structure="rooted-hierarchy">
      <item identifier="LearningModules">${moduleItems}${extraItems}</item>
    </organization>
  </organizations>
  <resources>${resourceXml}</resources>
</manifest>`;
}

// ── Public API ──

export interface ImsccOptions {
  themeId?: string;
  curriculumCsv?: string;
}

/**
 * Bundle a generated course into a Common Cartridge 1.1 (.imscc) Blob suitable
 * for import into Canvas LMS. Each chapter becomes a learning module containing
 * the reading (HTML), practice quiz (QTI + interactive HTML), in-class quiz
 * (QTI), weekly challenge (QTI MCQ subset + interactive HTML), slides (PPTX),
 * and infographic (JPG). Audio is skipped because blob URLs are non-persistent
 * — same constraint as the existing ZIP exporter.
 */
export async function assembleImscc(
  syllabus: Syllabus,
  chapters: GeneratedChapter[],
  opts: ImsccOptions = {},
): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const modules: ChapterModule[] = [];

  for (const ch of chapters) {
    const folder = `chapter-${ch.number}-${slug(ch.title)}`;
    const mod: ChapterModule = { number: ch.number, title: ch.title, resources: [] };

    // 1. Reading HTML
    if (ch.htmlContent) {
      const href = `${folder}/reading.html`;
      zip.file(href, ch.htmlContent);
      mod.resources.push({
        id: `R_${ch.number}_reading`,
        type: 'webcontent',
        href,
        files: [href],
        title: `${ch.title} — Reading`,
      });
    }

    // 2. Practice quiz → QTI only. The interactive HTML version is a single-
    // page app and Canvas's Page sanitizer strips its scripts on import, so
    // shipping it as a webcontent resource produces a broken page. The
    // standalone "Publish Course" HTML viewer is the right home for the
    // interactive UX.
    if (ch.practiceQuizData) {
      const mcqs = parsePracticeQuizMarkdown(ch.practiceQuizData);
      if (mcqs.length > 0) {
        const assessmentId = `A_${ch.number}_practice`;
        const xmlPath = `${folder}/practice-quiz.xml`;
        zip.file(xmlPath, qtiAssessment(assessmentId, `${ch.title} — Practice Quiz`, mcqs));
        mod.resources.push({
          id: `R_${ch.number}_practice_qti`,
          type: QTI_RESOURCE_TYPE,
          href: xmlPath,
          files: [xmlPath],
          title: `${ch.title} — Practice Quiz`,
        });
      }
    }

    // 3. In-class quiz → QTI
    if (ch.inClassQuizData && ch.inClassQuizData.length > 0) {
      const mcqs = ch.inClassQuizData.map(inClassToMcq);
      const assessmentId = `A_${ch.number}_inclass`;
      const xmlPath = `${folder}/in-class-quiz.xml`;
      zip.file(xmlPath, qtiAssessment(assessmentId, `${ch.title} — In-Class Quiz`, mcqs));
      mod.resources.push({
        id: `R_${ch.number}_inclass_qti`,
        type: QTI_RESOURCE_TYPE,
        href: xmlPath,
        files: [xmlPath],
        title: `${ch.title} — In-Class Quiz`,
      });
    }

    // 4. Weekly challenge → QTI only (MCQ subset; non-MCQ types are skipped).
    // Same Canvas-Page-sanitizer constraint as the practice quiz — the rich
    // interactive HTML version cannot survive import as a Page.
    if (ch.weeklyChallengeData) {
      const mcqs = weeklyToMcqs(ch.weeklyChallengeData);
      if (mcqs.length > 0) {
        const assessmentId = `A_${ch.number}_challenge`;
        const xmlPath = `${folder}/weekly-challenge.xml`;
        zip.file(
          xmlPath,
          qtiAssessment(assessmentId, `Week ${ch.number} Challenge — ${ch.title}`, mcqs),
        );
        mod.resources.push({
          id: `R_${ch.number}_challenge_qti`,
          type: QTI_RESOURCE_TYPE,
          href: xmlPath,
          files: [xmlPath],
          title: `Week ${ch.number} Challenge — ${ch.title}`,
        });
      }
    }

    // 5. Slides PPTX (file resource — Canvas attaches as a downloadable file)
    if (ch.slidesJson && ch.slidesJson.length > 0) {
      try {
        const { generatePptx } = await import('./pptxExporter');
        const pptxBlob = await generatePptx(
          ch.slidesJson,
          syllabus.courseTitle,
          ch.title,
          opts.themeId,
        );
        const href = `${folder}/slides.pptx`;
        zip.file(href, pptxBlob);
        mod.resources.push({
          id: `R_${ch.number}_slides`,
          type: 'webcontent',
          href,
          files: [href],
          title: `${ch.title} — Slides`,
        });
      } catch {
        /* pptx generation failed */
      }
    }

    // 6. Infographic
    if (ch.infographicDataUri) {
      const m = ch.infographicDataUri.match(/^data:[^;]+;base64,(.+)$/);
      if (m) {
        const href = `${folder}/infographic.jpg`;
        zip.file(href, m[1], { base64: true });
        mod.resources.push({
          id: `R_${ch.number}_infographic`,
          type: 'webcontent',
          href,
          files: [href],
          title: `${ch.title} — Infographic`,
        });
      }
    }

    // 7. Teaching resources DOCX (discussions + activities, when present).
    // Kept alongside native discussions because the DOCX also captures the
    // step-by-step activity guides that don't have a native Canvas analogue.
    const hasTeachingContent =
      (ch.discussionData && ch.discussionData.length > 0) ||
      (ch.activityData && ch.activityData.length > 0);
    if (hasTeachingContent) {
      try {
        const { generateTeachingResourcesDocx } = await import('./teachingResourcesDocx');
        const docxBlob = await generateTeachingResourcesDocx(ch, syllabus);
        if (docxBlob) {
          const href = `${folder}/teaching-resources.docx`;
          zip.file(href, docxBlob);
          mod.resources.push({
            id: `R_${ch.number}_teaching`,
            type: 'webcontent',
            href,
            files: [href],
            title: `${ch.title} — Teaching Resources`,
          });
        }
      } catch {
        /* docx generation failed */
      }
    }

    // 8. Discussion topics → native Canvas Discussions (one per prompt).
    if (ch.discussionData && ch.discussionData.length > 0) {
      ch.discussionData.forEach((d, i) => {
        const idx = i + 1;
        const title = `${ch.title} — Discussion ${idx}: ${d.hook}`;
        const body = `<p><strong>[${d.hook}]</strong></p><p>${d.prompt}</p>`;
        const href = `${folder}/discussions/disc-${idx}.xml`;
        zip.file(href, discussionTopicXml(title, body));
        mod.resources.push({
          id: `R_${ch.number}_disc_${idx}`,
          type: DISCUSSION_RESOURCE_TYPE,
          href,
          files: [href],
          title,
        });
      });
    }

    modules.push(mod);
  }

  const extraResources: ResourceRecord[] = [];
  if (opts.curriculumCsv) {
    const href = 'curriculum-alignment-matrix.csv';
    zip.file(href, opts.curriculumCsv);
    extraResources.push({
      id: 'R_curriculum',
      type: 'webcontent',
      href,
      files: [href],
      title: 'Curriculum Alignment Matrix',
    });
  }

  const settingsResources: ResourceRecord[] = [];
  if (syllabus.courseOverview) {
    const settingsHref = 'course_settings/course_settings.xml';
    const sentinelHref = 'course_settings/canvas_export.txt';
    const syllabusHref = 'course_settings/syllabus.html';
    zip.file(settingsHref, buildCourseSettingsXml(syllabus));
    zip.file(syllabusHref, buildSyllabusHtml(syllabus));
    zip.file(
      sentinelHref,
      'Generated by ClassBuild — Common Cartridge export for Instructure Canvas.',
    );
    // Resource href points at the sentinel — matches Canvas's own CC export
    // convention. Files list bundles all three so they're included in the ZIP.
    settingsResources.push({
      id: 'course_settings',
      type: COURSE_SETTINGS_RESOURCE_TYPE,
      href: sentinelHref,
      files: [settingsHref, syllabusHref, sentinelHref],
      title: 'Course Settings',
    });
  }

  zip.file('imsmanifest.xml', buildManifest(syllabus, modules, extraResources, settingsResources));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
