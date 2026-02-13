import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../shared/Button';

interface InlineFeedbackProps {
  onSubmit: (feedback: string) => void;
  isLoading: boolean;
}

export function InlineFeedback({ onSubmit, isLoading }: InlineFeedbackProps) {
  const [feedback, setFeedback] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (feedback.trim()) {
      onSubmit(feedback.trim());
      setFeedback('');
    }
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <Button variant="ghost" onClick={() => setIsOpen(true)}>
          <svg className="mr-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Refine this syllabus
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-card border border-violet-500/15 rounded-xl p-5"
    >
      <h3 className="text-sm font-medium text-text-primary mb-3">
        What would you like to change?
      </h3>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="e.g., Move the statistics chapter earlier, add more focus on qualitative methods, make the widget descriptions more specific..."
        className="w-full bg-bg-elevated border border-violet-500/20 rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/50 resize-none transition-all"
        rows={3}
      />
      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={() => { setIsOpen(false); setFeedback(''); }}
          className="text-sm text-text-muted hover:text-text-secondary cursor-pointer"
        >
          Cancel
        </button>
        <Button
          size="sm"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!feedback.trim()}
        >
          Regenerate Syllabus
        </Button>
      </div>
    </motion.div>
  );
}
