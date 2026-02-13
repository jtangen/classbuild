import { useCourseStore } from '../../store/courseStore';
import type { ChapterLength } from '../../types/course';

const lengthOptions: { value: ChapterLength; label: string; time: string; widgets: string }[] = [
  { value: 'concise', label: 'Concise', time: '~10 min · ~2,000 words', widgets: '1 widget' },
  { value: 'standard', label: 'Standard', time: '~20 min · ~4,000 words', widgets: '2 widgets' },
  { value: 'comprehensive', label: 'Comprehensive', time: '~30 min · ~6,000 words', widgets: '3 widgets' },
];

const WIDGETS_FOR_LENGTH: Record<ChapterLength, number> = {
  concise: 1,
  standard: 2,
  comprehensive: 3,
};

const CLASS_COUNTS = Array.from({ length: 13 }, (_, i) => i + 4); // 4..16

export function ChapterConfig() {
  const { setup, updateSetup } = useCourseStore();

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-text-primary">
        Course Structure <span className="text-error">*</span>
      </h3>

      {/* Number of classes — compact pills */}
      <div>
        <span className="text-xs text-text-secondary mb-2 block">Number of classes</span>
        <div className="flex flex-wrap gap-1">
          {CLASS_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => updateSetup({ numChapters: n })}
              className={`w-9 h-9 rounded-md text-[13px] font-medium transition-all cursor-pointer ${
                setup.numChapters === n
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Reading length */}
      <div>
        <span className="text-xs text-text-secondary mb-2 block">Reading length</span>
        <div className="grid grid-cols-3 gap-2">
          {lengthOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateSetup({ chapterLength: opt.value, widgetsPerChapter: WIDGETS_FOR_LENGTH[opt.value] })}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                setup.chapterLength === opt.value
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-white/[0.08] hover:border-violet-500/25'
              }`}
            >
              <div className={`text-sm font-medium ${
                setup.chapterLength === opt.value ? 'text-violet-400' : 'text-text-secondary'
              }`}>
                {opt.label}
              </div>
              <div className="text-xs text-text-muted mt-0.5">{opt.time}</div>
              <div className="text-xs text-text-muted">{opt.widgets}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
