import { motion } from 'framer-motion';

interface StreamingTextProps {
  text: string;
  className?: string;
}

export function StreamingText({ text, className = '' }: StreamingTextProps) {
  return (
    <div className={`relative ${className}`}>
      <span>{text}</span>
      <motion.span
        className="inline-block w-0.5 h-5 bg-violet-400 ml-0.5 align-text-bottom"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
