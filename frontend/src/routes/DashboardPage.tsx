import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { analyzeFood } from '../lib/analyzeFood'
import { deleteFood, fetchFoodByDay, updateFoodKcal } from '../lib/foodLog'
import { calculateDailyKcal, calculateMacroTargets } from '../lib/tdee'
import { horaNoPeriodo } from '../lib/horaDoRegistro'
import { PERIODOS, periodoAgora, periodoDe, type PeriodoId } from '../lib/periodos'
import { formatQuantidade } from '../lib/format'
import { comemora, desfechoDoDia, type Objetivo } from '../lib/recompensa'
import type { FoodEntry } from '../types'
import { AppShell } from '../components/layout/AppShell'
import { Icon } from '../components/ui/Icon'
import { Tabs } from '../components/ui/Tabs'
import { Habito } from '../components/nutrition/Habito'
import { Avisos } from '../components/layout/Avisos'
import { Refeicoes } from '../components/nutrition/Refeicoes'
import { Gasto } from '../components/nutrition/Gasto'
import { Composer } from '../components/nutrition/Composer'
import { useCountUp } from '../lib/useCountUp'
import { NutritionHistory } from '../components/nutrition/NutritionHistory'
import { NutritionStats } from '../components/nutrition/NutritionStats'

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function meiaNoite(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function DashboardPage() {
  const { t } = useI18n()
  const { user } = useApp()
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [tab, setTab] = useState('today')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [novoId, setNovoId] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [ganho, setGanho] = useState<string | null>(null)
  const [pendentes, setPendentes] = useState<{ id: string; texto: string; foto?: string }[]>([])
  const [dia, setDia] = useState(() => meiaNoite())
  const [gasto, setGasto] = useState(0)
  // Em qual janela do dia entra o proximo registro. Comeca na janela de agora e
  // a pessoa troca tocando na caixa da refeicao.
  const [periodo, setPeriodo] = useState<PeriodoId>(() => periodoAgora())

  const ehHoje = mesmoDia(dia, new Date())

  const loadToday = useCallback((marcarNovo = false) => {
    fetchFoodByDay(dia)
      .then((novos) => {
        setEntries((antigos) => {
          if (marcarNovo) {
            const vistos = new Set(antigos.map((e) => e.id))
            const recem = novos.find((e) => !vistos.has(e.id))
            if (recem) {
              setNovoId(recem.id)
              setGanho(`+${recem.kcal}`)
              navigator.vibrate?.(12)
              setTimeout(() => setNovoId(null), 1200)
              setTimeout(() => setGanho(null), 1100)
            }
          }
          return novos
        })
        if (marcarNovo) setVersao((v) => v + 1)
      })
      .catch(() => {})
  }, [dia])

  useEffect(() => {
    // Some com o numero do dia anterior enquanto o do novo nao chega.
    setGasto(0)
    loadToday()
    // Voltar do background com o registro de ontem na tela e o jeito mais
    // rapido de o usuario desconfiar do app. Recarrega ao reaparecer.
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return
      loadToday()
      // Ficou a tarde inteira aberto: a janela sugerida acompanha o relogio.
      if (mesmoDia(dia, new Date())) setPeriodo(periodoAgora())
    }
    // ponytail: sem re-sincronizar o dia aberto na virada da meia-noite.
    // Quem deixa o app aberto atravessando a meia-noite ve o dia certo ao voltar.
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [loadToday, dia])

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          kcal: acc.kcal + e.kcal,
          protein_g: acc.protein_g + e.protein_g,
          carbs_g: acc.carbs_g + e.carbs_g,
          fat_g: acc.fat_g + e.fat_g,
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      ),
    [entries],
  )

  // O diario do dia, quebrado nas janelas. Grupo vazio nao vira secao: linha
  // fechada sem nada dentro so ocupa espaco.
  const grupos = useMemo(
    () =>
      PERIODOS.map((j) => {
        const itens = entries.filter((e) => periodoDe(new Date(e.logged_at)) === j.id)
        return { ...j, itens, kcal: itens.reduce((s, e) => s + e.kcal, 0) }
      }).filter((g) => g.itens.length > 0),
    [entries],
  )

  const target = user?.daily_kcal ?? 2000
  // O que foi gasto entra na meta do dia. Os macros seguem a meta base: a
  // proporcao entre proteina, carbo e gordura nao muda porque voce correu.
  const metaDia = target + gasto
  const remaining = metaDia - totals.kcal
  const pct = metaDia > 0 ? Math.min(100, (totals.kcal / metaDia) * 100) : 0
  const macros = calculateMacroTargets(target)
  const maintenance = user
    ? calculateDailyKcal({
        age: user.age,
        weight_kg: user.weight_kg,
        height_cm: user.height_cm,
        sex: user.sex,
        activity: user.activity,
        goal: 'maintain',
      })
    : target

  // Otimista: a linha entra na hora e o calculo corre atras.
  // Varios registros podem estar em analise ao mesmo tempo.
  const handleAnalyze = (texto: string, foto?: string, fala?: string) => {
    const id = `pend-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const rotulo = texto.trim() || (fala ? 'ouvindo o que você disse' : 'foto da refeição')
    setPendentes((p) => [{ id, texto: rotulo, foto }, ...p])
    setError('')

    // Sem carimbo, o servidor usa a hora de agora. So carimbamos quando o
    // destino nao e este instante: dia passado, ou outra janela do dia.
    const naJanelaDeAgora = ehHoje && periodo === periodoAgora()
    const quando = naJanelaDeAgora ? undefined : horaNoPeriodo(dia, periodo, entries)

    analyzeFood(texto, foto, fala, quando)
      .then((result) => {
        if (!result.ok) {
          setError(
            result.error === 'limit_reached'
              ? t.dashboard.limitReached
              : t.dashboard.analyzeError,
          )
          return
        }
        loadToday(true)
      })
      .catch(() => setError(t.dashboard.analyzeError))
      .finally(() => setPendentes((p) => p.filter((x) => x.id !== id)))
  }

  const handleDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    try {
      await deleteFood(id)
    } catch {
      loadToday()
    }
  }

  // Edicao no lugar, sem prompt() do navegador.
  const startEdit = (item: FoodEntry) => {
    setEditing(item.id)
    setEditValue(String(item.kcal))
  }

  const commitEdit = async (item: FoodEntry) => {
    const kcal = Number(editValue)
    setEditing(null)
    if (!Number.isFinite(kcal) || kcal < 0 || kcal === item.kcal) return
    setEntries((prev) => prev.map((e) => (e.id === item.id ? { ...e, kcal } : e)))
    try {
      await updateFoodKcal(item.id, kcal)
    } catch {
      loadToday()
    }
  }

  const rotuloDoDia = DIAS[dia.getDay()]
  const rotuloPeriodo = PERIODOS.find((p) => p.id === periodo)?.rotulo ?? ''
  const dataCurta = dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  // So avisa quando o registro nao cai aqui e agora.
  const destinoDoRegistro =
    ehHoje && periodo === periodoAgora()
      ? undefined
      : ehHoje
        ? rotuloPeriodo
        : `${rotuloDoDia}, ${dataCurta}, ${rotuloPeriodo}`
  const exibido = useCountUp(totals.kcal)
  // Depois desta hora quase ninguem come mais: o dia conta como fechado.
  const FIM_DO_DIA = 20
  const diaFechado = !ehHoje || new Date().getHours() >= FIM_DO_DIA

  const desfecho = desfechoDoDia({
    objetivo: (user?.goal ?? 'maintain') as Objetivo,
    kcal: totals.kcal,
    meta: metaDia,
    fechado: diaFechado,
  })
  const bomDesfecho = comemora(desfecho)

  const selo =
    desfecho === 'dentro'
      ? 'dia fechado dentro da meta'
      : desfecho === 'atingiu'
        ? 'meta batida'
        : ''

  // O bom desfecho merece mais que uma animacao: o telefone confirma no bolso.
  useEffect(() => {
    if (bomDesfecho && ehHoje) navigator.vibrate?.([14, 60, 26])
  }, [bomDesfecho, ehHoje])

  return (
    <AppShell>
      <Tabs
        tabs={[
          { id: 'today', label: t.dashboard.today },
          { id: 'history', label: t.ui.tabHistory },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'history' && (
        <div className="mt-6">
          <NutritionHistory />
        </div>
      )}

      {tab === 'today' && (
        <>
          {/* Numero do dia: o unico lugar onde o vermelho aparece grande. */}
          <section className="mt-6">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
                {rotuloDoDia}
                {!ehHoje && (
                  <button
                    type="button"
                    onClick={() => setDia(meiaNoite())}
                    className="ml-3 normal-case tracking-normal text-obliq-chalk underline decoration-obliq-line underline-offset-4"
                  >
                    voltar para hoje
                  </button>
                )}
              </span>
              <span className="text-[11px]">
                {selo && (
                  <span
                    key={selo}
                    className="bater mr-2 font-mono uppercase tracking-[0.14em] text-obliq-chalk"
                  >
                    {selo}
                  </span>
                )}
                <span className="num text-obliq-faint">{Math.round(pct)}%</span>
              </span>
            </div>

            <div className="relative mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              {ganho && (
                <span
                  aria-hidden="true"
                  className="brotar num pointer-events-none absolute -top-1 left-2 text-xl text-obliq-red"
                >
                  {ganho}
                </span>
              )}
              <p
                key={bomDesfecho ? 'desfecho' : 'andando'}
                className={`num text-[clamp(3.5rem,16vw,5.5rem)] font-medium leading-none text-obliq-red ${
                  bomDesfecho ? 'bater' : ''
                }`}
              >
                {exibido}
                <span className="num ml-2 align-baseline text-xl font-normal text-obliq-faint">
                  / {metaDia}
                </span>
              </p>
              <p className="text-right">
                <span className="block text-xs text-obliq-faint">
                  {remaining >= 0 ? t.dashboard.remaining : 'acima da meta'}
                </span>
                <span
                  className={`num text-2xl font-medium ${
                    remaining >= 0 ? 'text-obliq-chalk' : 'text-obliq-red'
                  }`}
                >
                  {Math.abs(remaining)}
                </span>
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-obliq-border">
              <div
                className={`relative h-full overflow-hidden rounded-full transition-[width] duration-500 ease-out ${
                  totals.kcal > metaDia ? 'bg-obliq-red' : 'bg-obliq-chalk'
                } ${pct > 4 && pct < 100 ? 'brilho' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </section>

          <div className="mt-6">
            <Gasto dia={dia} valor={gasto} onMudou={setGasto} />
          </div>

          <div className="mt-6">
            <Refeicoes
              entries={entries}
              meta={target}
              perfil={user}
              selecionado={periodo}
              onSelecionar={setPeriodo}
            />
          </div>

          <div className="mt-6">
            <Habito meta={target} versao={versao} selecionado={dia} onSelecionar={setDia} />
          </div>

          <div className="mt-6">
            <Avisos />
          </div>

          {/* Macros em tres colunas: mesma informacao, um terco da altura. */}
          <section className="mt-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
              {t.dashboard.macros}
            </span>
            <dl className="mt-2 grid grid-cols-3 gap-3">
              {[
                { l: t.dashboard.protein, cur: totals.protein_g, tgt: macros.protein_g },
                { l: t.dashboard.carbs, cur: totals.carbs_g, tgt: macros.carbs_g },
                { l: t.dashboard.fat, cur: totals.fat_g, tgt: macros.fat_g },
              ].map((m) => (
                <div key={m.l}>
                  <dt className="text-[12px] text-obliq-dim">{m.l}</dt>
                  <dd className="num mt-0.5 text-sm font-medium">
                    {Math.round(m.cur)}
                    <span className="text-obliq-faint">/{m.tgt}g</span>
                  </dd>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-obliq-border">
                    <div
                      className="h-full rounded-full bg-obliq-dim transition-[width] duration-500"
                      style={{ width: `${Math.min(100, (m.cur / (m.tgt || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-6">
            <NutritionStats
              target={target}
              maintenance={maintenance}
              currentWeight={user?.weight_kg ?? null}
            />
          </div>

          {/* Registro do dia em forma de livro-caixa. */}
          <section className="mt-6 pb-28">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
              {t.dashboard.foodLog}
            </span>

            {entries.length === 0 && pendentes.length === 0 ? (
              <div className="mt-3 border-y border-obliq-border py-12 text-center">
                <p className="text-obliq-dim">{t.dashboard.foodLogEmpty}</p>
                <p className="mt-1 text-sm text-obliq-faint">
                  Comece por algo simples, como {t.dashboard.foodPlaceholder}.
                </p>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-obliq-border border-y border-obliq-border">
                {pendentes.map((p) => (
                  <div key={p.id} className="rise flex items-center gap-3 py-2.5">
                    {p.foto && (
                      <img
                        src={p.foto}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded object-cover opacity-60 ring-1 ring-obliq-border"
                      />
                    )}
                    <span className="truncate text-obliq-dim">{p.texto}</span>
                    <span className="leader" aria-hidden="true" />
                    <span className="num shrink-0 animate-pulse text-[12px] text-obliq-faint">
                      calculando
                    </span>
                  </div>
                ))}

                {/* Uma secao por janela do dia. `details` e do navegador: abre e
                    fecha sozinho, sem estado nosso pra manter em sincronia.
                    Abre a janela que esta recebendo registro; as outras ficam
                    recolhidas, e o dia inteiro cabe na tela. */}
                {grupos.map((g) => (
                  <details key={g.id} open={g.id === periodo} className="group">
                    <summary className="flex cursor-pointer list-none items-baseline gap-2 py-2.5 [&::-webkit-details-marker]:hidden">
                      <Icon
                        name="chevron"
                        className="h-3.5 w-3.5 shrink-0 self-center text-obliq-faint transition-transform duration-200 group-open:rotate-180"
                      />
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-obliq-faint">
                        {g.rotulo}
                      </span>
                      <span className="num text-[11px] text-obliq-dim">
                        {g.itens.length} {g.itens.length === 1 ? 'item' : 'itens'}
                      </span>
                      <span className="leader" aria-hidden="true" />
                      <span className="num shrink-0 text-obliq-chalk">{g.kcal}</span>
                    </summary>

                    <ul className="divide-y divide-obliq-border border-t border-obliq-border pl-5">
                      {g.itens.map((item, i) => (
                        <li
                          key={item.id}
                          className={`rise py-2.5 ${item.id === novoId ? 'fisgada' : ''}`}
                          style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                        >
                          <div className="flex items-baseline">
                            <span className="text-obliq-chalk">{item.name}</span>
                            <span className="leader" aria-hidden="true" />

                            {editing === item.id ? (
                              <input
                                autoFocus
                                type="number"
                                inputMode="numeric"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(item)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit(item)
                                  if (e.key === 'Escape') setEditing(null)
                                }}
                                aria-label={`Calorias de ${item.name}`}
                                className="num w-20 shrink-0 rounded bg-obliq-raised px-2 py-0.5 text-right text-obliq-chalk ring-1 ring-obliq-dim outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                title="Editar calorias"
                                className="num shrink-0 rounded px-1 text-obliq-chalk transition-colors hover:text-obliq-red"
                              >
                                {item.kcal}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              aria-label={`Excluir ${item.name}`}
                              className="ml-2 shrink-0 p-1 text-obliq-faint transition-colors hover:text-obliq-red"
                            >
                              <Icon name="trash" className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="mt-1 flex gap-3 font-mono text-[12px] text-obliq-faint">
                            <span>{formatQuantidade(item.quantity, item.unit, item.kcal)}</span>
                            <span>P {item.protein_g}</span>
                            <span>C {item.carbs_g}</span>
                            <span>G {item.fat_g}</span>
                            {item.confidence === 'low' && <span>{t.common.estimated}</span>}
                          </div>
                        </li>

                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Composer onEnviar={handleAnalyze} erro={error} destino={destinoDoRegistro} />
    </AppShell>
  )
}
