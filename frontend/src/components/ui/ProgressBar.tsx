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
  const over = value > max

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-2 flex items-baseline justify-between text-xs">
          <span className="num text-obliq-faint">{Math.round(pct)}%</span>
          <span className="num text-obliq-dim">
            {Math.round(value)} / {Math.round(max)} {t.common.kcal}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        className="h-1.5 overflow-hidden rounded-full bg-obliq-border"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${
            over ? 'bg-obliq-red' : 'bg-obliq-chalk'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
