import { useEffect } from 'react';
import { useCourseStore } from '../../store/courseStore';
import type { EducationLevel, PriorKnowledge, TeachingEnvironment } from '../../types/course';

const educationLevels: { value: EducationLevel; label: string }[] = [
  { value: 'high-school', label: 'High School' },
  { value: 'first-year', label: 'First-year Undergraduate' },
  { value: 'advanced-undergrad', label: 'Advanced Undergraduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'professional', label: 'Professional Development' },
  { value: 'general-public', label: 'General Public' },
];

const priorKnowledgeLevels: { value: PriorKnowledge; label: string; desc: string }[] = [
  { value: 'none', label: 'No prior knowledge', desc: 'Complete beginners' },
  { value: 'some', label: 'Some foundation', desc: 'Basic concepts understood' },
  { value: 'significant', label: 'Significant background', desc: 'Ready for advanced material' },
];

const cohortSizes: { value: number; label: string; desc: string }[] = [
  { value: 25, label: 'Small', desc: 'Under 30' },
  { value: 65, label: 'Medium', desc: '30–100' },
  { value: 200, label: 'Large', desc: '100–300' },
  { value: 400, label: 'Very Large', desc: '300+' },
];

const teachingEnvironments: { value: TeachingEnvironment; label: string; desc: string }[] = [
  { value: 'lecture-theatre', label: 'Lecture Theatre', desc: 'Tiered / fixed seating' },
  { value: 'collaborative', label: 'Collaborative', desc: 'Group tables' },
  { value: 'flat-classroom', label: 'Flat Classroom', desc: 'Moveable desks / rows' },
  { value: 'online', label: 'Online / Hybrid', desc: 'Breakout rooms & shared docs' },
];

const VALID_COHORT_VALUES = new Set(cohortSizes.map(s => s.value));

export function AudienceSelector() {
  const { setup, updateSetup } = useCourseStore();

  // Snap stale cohortSize values (e.g. old default of 100) to nearest valid pill
  useEffect(() => {
    if (!VALID_COHORT_VALUES.has(setup.cohortSize)) {
      updateSetup({ cohortSize: 65 });
    }
  }, [setup.cohortSize, updateSetup]);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-text-primary">
        Your Class <span className="text-error">*</span>
      </h3>

      {/* Education Level */}
      <label className="block">
        <span className="text-xs text-text-secondary mb-1.5 block">Education level</span>
        <select
          value={setup.educationLevel}
          onChange={(e) => updateSetup({ educationLevel: e.target.value as EducationLevel })}
          className="w-full bg-bg-elevated border border-violet-500/20 rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer"
        >
          {educationLevels.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </label>

      {/* Prior Knowledge */}
      <div>
        <span className="text-xs text-text-secondary mb-2 block">Prior knowledge of this topic</span>
        <div className="grid grid-cols-3 gap-2">
          {priorKnowledgeLevels.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => updateSetup({ priorKnowledge: level.value })}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                setup.priorKnowledge === level.value
                  ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                  : 'border-white/[0.08] hover:border-violet-500/25 text-text-secondary'
              }`}
            >
              <div className="text-sm font-medium">{level.label}</div>
              <div className="text-xs text-text-muted mt-0.5">{level.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cohort Size */}
      <div>
        <span className="text-xs text-text-secondary mb-2 block">Approximate cohort size</span>
        <div className="grid grid-cols-4 gap-2">
          {cohortSizes.map((size) => (
            <button
              key={size.value}
              type="button"
              onClick={() => updateSetup({ cohortSize: size.value })}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                setup.cohortSize === size.value
                  ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                  : 'border-white/[0.08] hover:border-violet-500/25 text-text-secondary'
              }`}
            >
              <div className="text-sm font-medium">{size.label}</div>
              <div className="text-xs text-text-muted mt-0.5">{size.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Learner Notes */}
      <label className="block">
        <span className="text-xs text-text-secondary mb-1.5 block">
          Anything else about your learners? (optional)
        </span>
        <input
          type="text"
          value={setup.learnerNotes || ''}
          onChange={(e) => updateSetup({ learnerNotes: e.target.value })}
          placeholder="e.g., English is their second language, mixed maths backgrounds"
          className="w-full bg-bg-elevated border border-violet-500/15 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/40 transition-all"
        />
      </label>

      {/* Teaching Environment */}
      <div>
        <span className="text-xs text-text-secondary mb-2 block">Teaching environment (optional)</span>
        <div className="grid grid-cols-4 gap-2">
          {teachingEnvironments.map((env) => (
            <button
              key={env.value}
              type="button"
              onClick={() => updateSetup({
                teachingEnvironment: setup.teachingEnvironment === env.value ? '' : env.value,
              })}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                setup.teachingEnvironment === env.value
                  ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                  : 'border-white/[0.08] hover:border-violet-500/25 text-text-secondary'
              }`}
            >
              <div className="text-sm font-medium">{env.label}</div>
              <div className="text-xs text-text-muted mt-0.5">{env.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {setup.teachingEnvironment && (
        <label className="block">
          <span className="text-xs text-text-secondary mb-1.5 block">
            Room details (optional)
          </span>
          <input
            type="text"
            value={setup.environmentNotes || ''}
            onChange={(e) => updateSetup({ environmentNotes: e.target.value })}
            placeholder="e.g., 6 seats per table, no whiteboard, dual projectors"
            className="w-full bg-bg-elevated border border-violet-500/15 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/40 transition-all"
          />
        </label>
      )}
    </div>
  );
}
