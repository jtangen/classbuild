interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="28" width="10" height="10" rx="2.5" fill="#8b5cf6" />
        <rect x="15" y="17" width="10" height="10" rx="2.5" fill="#a78bfa" />
        <rect x="28" y="6" width="10" height="10" rx="2.5" fill="#c4b5fd" />
      </svg>
      {showText && (
        <span className="text-xl font-bold tracking-tight">
          <span className="text-slate-100">Class</span>
          <span className="text-violet-400">Build</span>
        </span>
      )}
    </div>
  );
}
