import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/70">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-xl border border-obliq-border bg-obliq-black px-4 py-3 text-white placeholder:text-white/30 outline-none transition-colors focus:border-obliq-red focus:shadow-red-glow ${className}`}
        {...props}
      />
    </div>
  )
}
