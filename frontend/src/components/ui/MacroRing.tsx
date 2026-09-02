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
  color = '#ece9e4',
}: MacroRingProps) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#282833" strokeWidth="4" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-sm font-medium">{Math.round(current)}</span>
          <span className="num text-[10px] text-obliq-faint">/{target}g</span>
        </div>
      </div>
      <span className="text-xs tracking-tight text-obliq-dim">{label}</span>
    </div>
  )
}
