import { PersonaId, personas } from '../../types/persona'

export function PersonaSwitcher({ value, onChange }: { value: PersonaId; onChange: (p: PersonaId) => void }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-200">Personas</h2>
      <div className="grid grid-cols-1 gap-3">
        {personas.map((p) => {
          const active = value === p.id
          const ring = active ? 'ring-2 ring-primary-500/70' : 'ring-0'
          const dotColor =
            p.id === 'friendly' ? 'bg-emerald-500' : p.id === 'technical' ? 'bg-violet-500' : p.id === 'professional' ? 'bg-slate-500' : 'bg-amber-500'
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              className={`text-left rounded-2xl ${ring} border border-white/10 bg-white/5 backdrop-blur px-4 py-3 transition hover:bg-white/10 hover:translate-y-[-1px]`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${dotColor}`} aria-hidden />
                <div className="flex-1">
                  <div className="font-medium text-slate-100">{p.display_name}</div>
                  <div className="text-xs text-slate-300/80">{p.description}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
