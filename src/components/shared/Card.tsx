import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-bg-card border border-violet-500/15 rounded-xl p-6 ${
        hover ? 'cursor-pointer transition-all duration-200 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
