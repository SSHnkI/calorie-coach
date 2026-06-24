/**
 * Import exercises from ExerciseDB (RapidAPI) → Supabase
 *
 * Usage:
 *   node import-exercisedb.mjs
 *
 * Requirements:
 *   npm install node-fetch  (or Node 18+ que já tem fetch nativo)
 */

const RAPIDAPI_KEY  = '37ecd7608amsh5612c3d1aebc00ap195d77jsn85fec3ddb0a9'
const SUPABASE_URL  = 'https://ucdagoaokdqgkqfprfuv.supabase.co'
const SUPABASE_KEY  = 'COLE_SUA_SERVICE_ROLE_KEY_AQUI'   // ← substitua

// ── Mapeamento bodyPart → muscle_group ───────────────────────────────────────
const BODYPART_MAP = {
  chest:        'peito',
  back:         'costas',
  shoulders:    'ombro',
  'upper arms': null,    // resolvido pelo target abaixo
  'upper legs': 'pernas',
  'lower legs': 'pernas',
  waist:        'abdomen',
}

function getMuscleGroup(bodyPart, target) {
  if (bodyPart === 'upper arms') {
    if (target.includes('bicep')) return 'biceps'
    if (target.includes('tricep')) return 'triceps'
    return 'biceps'
  }
  return BODYPART_MAP[bodyPart] ?? null
}

// ── Mapeamento de dificuldade ─────────────────────────────────────────────────
function getDifficulty(equipment, name) {
  const n = name.toLowerCase()
  if (['body weight', 'band', 'resistance band', 'foam roll'].includes(equipment)) return 'iniciante'
  if (['barbell', 'ez barbell'].includes(equipment)) {
    if (n.includes('deadlift') || n.includes('squat') || n.includes('clean') || n.includes('snatch')) return 'avancado'
    return 'intermediario'
  }
  if (['dumbbell', 'cable', 'kettlebell'].includes(equipment)) return 'intermediario'
  return 'iniciante'
}

// ── Traduções de nomes mais comuns ────────────────────────────────────────────
const NAME_MAP = {
  'bench press': 'Supino Reto',
  'incline bench press': 'Supino Inclinado',
  'decline bench press': 'Supino Declinado',
  'push-up': 'Flexão de Braço',
  'push up': 'Flexão de Braço',
  'chest fly': 'Crucifixo',
  'cable crossover': 'Crossover no Cabo',
  'cable fly': 'Crossover no Cabo',
  'chest dip': 'Mergulho (Paralelas)',
  'pull-up': 'Barra Fixa',
  'pull up': 'Barra Fixa',
  'chin-up': 'Barra Fixa (Supinada)',
  'chin up': 'Barra Fixa (Supinada)',
  'lat pulldown': 'Puxada Frontal',
  'seated row': 'Remada Sentada',
  'cable row': 'Remada no Cabo',
  'bent over row': 'Remada Curvada',
  'one arm row': 'Remada Unilateral',
  'deadlift': 'Levantamento Terra',
  'romanian deadlift': 'Levantamento Terra Romeno',
  'stiff leg deadlift': 'Stiff',
  'squat': 'Agachamento',
  'hack squat': 'Agachamento Hack',
  'leg press': 'Leg Press',
  'lunge': 'Avanço',
  'walking lunge': 'Avanço Caminhando',
  'leg curl': 'Rosca Femoral',
  'lying leg curl': 'Rosca Femoral Deitado',
  'leg extension': 'Extensão de Pernas',
  'calf raise': 'Panturrilha',
  'hip thrust': 'Hip Thrust',
  'glute bridge': 'Ponte de Glúteo',
  'shoulder press': 'Desenvolvimento',
  'overhead press': 'Desenvolvimento',
  'military press': 'Desenvolvimento Militar',
  'arnold press': 'Desenvolvimento Arnold',
  'lateral raise': 'Elevação Lateral',
  'front raise': 'Elevação Frontal',
  'rear delt': 'Crucifixo Inverso',
  'face pull': 'Face Pull',
  'upright row': 'Remada Alta',
  'shrug': 'Encolhimento de Ombros',
  'bicep curl': 'Rosca Bíceps',
  'barbell curl': 'Rosca Bíceps com Barra',
  'dumbbell curl': 'Rosca Bíceps com Haltere',
  'hammer curl': 'Rosca Martelo',
  'preacher curl': 'Rosca Scott',
  'concentration curl': 'Rosca Concentrada',
  'spider curl': 'Rosca Spider',
  'tricep pushdown': 'Puxada de Tríceps',
  'triceps pushdown': 'Puxada de Tríceps',
  'skull crusher': 'Tríceps Testa',
  'tricep dip': 'Mergulho de Tríceps',
  'overhead tricep': 'Extensão de Tríceps sobre a Cabeça',
  'crunch': 'Abdominal',
  'plank': 'Prancha',
  'leg raise': 'Elevação de Pernas',
  'russian twist': 'Torção Russa',
  'ab rollout': 'Roda Abdominal',
  'pullover': 'Pullover',
}

function translateName(englishName) {
  const lower = englishName.toLowerCase()
  for (const [key, pt] of Object.entries(NAME_MAP)) {
    if (lower.includes(key)) {
      // Substituir a parte conhecida e manter prefixos como "barbell", "dumbbell"
      const prefix = lower.startsWith('barbell') ? 'com Barra'
        : lower.startsWith('dumbbell') ? 'com Halteres'
        : lower.startsWith('cable') ? 'no Cabo'
        : lower.startsWith('machine') ? 'na Máquina'
        : lower.startsWith('smith machine') ? 'no Smith'
        : lower.startsWith('ez bar') ? 'com Barra EZ'
        : lower.startsWith('kettlebell') ? 'com Kettlebell'
        : ''
      const base = pt
      return prefix ? `${base} ${prefix}` : base
    }
  }
  // Sem tradução: retornar o nome original capitalizado
  return englishName
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── Buscar todos os exercícios da API ─────────────────────────────────────────
async function fetchAllExercises() {
  const limit = 100
  let offset = 0
  const all = []

  while (true) {
    console.log(`Buscando offset ${offset}...`)
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    )

    if (!res.ok) {
      console.error(`Erro ${res.status}: ${await res.text()}`)
      break
    }

    const batch = await res.json()
    if (!batch.length) break

    all.push(...batch)
    offset += limit

    if (batch.length < limit) break

    // Respeitar rate limit
    await new Promise(r => setTimeout(r, 300))
  }

  return all
}

// ── Inserir no Supabase em lotes ──────────────────────────────────────────────
async function insertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase error ${res.status}: ${text}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (SUPABASE_KEY === 'COLE_SUA_SERVICE_ROLE_KEY_AQUI') {
    console.error('❌ Substitua SUPABASE_KEY pela sua service_role key antes de rodar.')
    process.exit(1)
  }

  console.log('🔄 Buscando exercícios na ExerciseDB...')
  const raw = await fetchAllExercises()
  console.log(`✅ ${raw.length} exercícios recebidos`)

  const rows = []
  let skipped = 0

  for (const ex of raw) {
    const muscleGroup = getMuscleGroup(ex.bodyPart, ex.target)
    if (!muscleGroup) { skipped++; continue }

    rows.push({
      name:          translateName(ex.name),
      muscle_group:  muscleGroup,
      difficulty:    getDifficulty(ex.equipment, ex.name),
      description:   ex.instructions?.join(' ').slice(0, 800) ?? null,
      muscles_worked: [ex.target, ...(ex.secondaryMuscles ?? [])].join(', '),
      image_url:     ex.gifUrl ?? null,
    })
  }

  console.log(`📦 ${rows.length} exercícios para inserir (${skipped} ignorados)`)

  // Inserir em lotes de 50
  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await insertBatch(batch)
    inserted += batch.length
    console.log(`  ✓ ${inserted}/${rows.length}`)
  }

  console.log('🎉 Importação concluída!')
}

main().catch(e => { console.error('Erro fatal:', e.message); process.exit(1) })
