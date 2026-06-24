type TabsProps = {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex overflow-x-auto rounded-xl border border-obliq-border bg-obliq-black p-1 gap-1 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 flex-1 min-w-fit rounded-lg px-3 py-2.5 text-xs font-bold uppercase tracking-normal transition-all ${
            active === tab.id
              ? 'bg-red-gradient text-white shadow-red-glow'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
