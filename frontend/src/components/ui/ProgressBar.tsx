import { useI18n } from '../../i18n/I18nContext'

type ProgressBarProps = {
  value: number
  max: number
  className?: string
  showLabel?: boolean
}

export function ProgressBar({
  value,
  max,
  className = '',
  showLabel = false,
}: ProgressBarProps) {
  const { t } = useI18n()
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-white/60">{Math.round(pct)}%</span>
          <span className="font-semibold tabular-nums">
            {Math.round(value)} / {Math.round(max)} {t.common.kcal}
          </span>
        </div>
      )}
      <div className="h-3 overflow-hidden rounded-full bg-obliq-border">
        <div
          className="h-full rounded-full bg-red-gradient transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
