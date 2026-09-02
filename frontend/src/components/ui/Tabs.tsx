type TabsProps = {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}

// Abas de sublinhado, nao pilulas coloridas: a cor da marca fica pro numero.
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      role="tablist"
      className="flex gap-6 overflow-x-auto border-b border-obliq-border scrollbar-none"
    >
      {tabs.map((tab) => {
        const on = active === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={on}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 border-b-2 pb-3 text-sm font-medium tracking-tight transition-colors duration-200 ${
              on
                ? 'border-obliq-red text-obliq-chalk'
                : 'border-transparent text-obliq-faint hover:text-obliq-dim'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
