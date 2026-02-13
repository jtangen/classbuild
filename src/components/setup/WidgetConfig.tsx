import { useCourseStore } from '../../store/courseStore';

export function WidgetConfig() {
  const { setup, updateSetup } = useCourseStore();

  const max = setup.chapterLength === 'concise' ? 2 : setup.chapterLength === 'standard' ? 3 : 4;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-primary">Interactive Widgets</h3>
      <label className="block">
        <span className="text-xs text-text-secondary mb-1.5 block">
          Widgets per class
        </span>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={max}
            value={setup.widgetsPerChapter}
            onChange={(e) => updateSetup({ widgetsPerChapter: parseInt(e.target.value) })}
            className="flex-1 accent-violet-500"
          />
          <span className="text-lg font-semibold text-violet-400 w-8 text-center">
            {setup.widgetsPerChapter}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          Interactive HTML/JS widgets embedded in classes — simulations, visualizations, and demonstrations that illustrate key concepts.
        </p>
      </label>
    </div>
  );
}
