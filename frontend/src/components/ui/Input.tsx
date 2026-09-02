import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
}

export function Input({
  label,
  hint,
  error,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const describedBy = error ? `${inputId}-erro` : hint ? `${inputId}-dica` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium tracking-tight text-obliq-dim"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 w-full rounded-lg bg-obliq-black px-3.5 py-3 text-obliq-chalk ring-1 outline-none transition-colors duration-200 placeholder:text-obliq-faint ${
          error
            ? 'ring-obliq-red'
            : 'ring-obliq-border focus:ring-obliq-dim'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-erro`} role="alert" className="text-xs text-obliq-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-dica`} className="text-xs text-obliq-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
