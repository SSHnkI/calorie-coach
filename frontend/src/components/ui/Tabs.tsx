type TabsProps = {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex rounded-xl border border-obliq-border bg-obliq-black p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
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
