type MacroRingProps = {
  label: string
  current: number
  target: number
  color?: string
}

export function MacroRing({
  label,
  current,
  target,
  color = '#E8000D',
}: MacroRingProps) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="#1F1F1F"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black tabular-nums">{Math.round(current)}</span>
          <span className="text-[10px] text-white/40">/{target}g</span>
        </div>
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
      </span>
    </div>
  )
}
