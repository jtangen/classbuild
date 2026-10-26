import { useUiStore } from '../../store/uiStore';

/**
 * True while a generation that writes into the course is running — a reading
 * or syllabus draft, a batch, a slide render, or any per-material job.
 * Starting a new course or restoring a project is held off until it settles
 * or is stopped: replacing the course mid-run would throw that work away.
 */
export function useCourseBusy(): boolean {
  return useUiStore(
    (s) =>
      s.isGenerating ||
      s.batchGenerating ||
      s.slidesRender !== null ||
      Object.values(s.inFlight).some((chapter) => chapter != null),
  );
}
