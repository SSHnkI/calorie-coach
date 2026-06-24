const RAPIDAPI_KEY = '37ecd7608amsh5612c3d1aebc00ap195d77jsn85fec3ddb0a9'
const SUPABASE_URL = 'https://ucdagoaokdqgkqfprfuv.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZGFnb2Fva2RxZ2txZnByZnV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE4Mjg0MCwiZXhwIjoyMDk3NzU4ODQwfQ.nR9TxdyoqD84FmRKhzbo6XUA34YXiIf9Aqgu1fuRtDY'

const BODYPART_MAP = {
  chest: 'peito', back: 'costas', shoulders: 'ombro',
  'upper legs': 'pernas', 'lower legs': 'pernas', waist: 'abdomen',
}

function getMuscleGroup(bodyPart, target) {
  if (bodyPart === 'upper arms')
    return target.includes('tricep') ? 'triceps' : 'biceps'
  return BODYPART_MAP[bodyPart] ?? null
}

function getDifficulty(equipment, name) {
  const n = name.toLowerCase()
  if (['body weight','band','resistance band'].includes(equipment)) return 'iniciante'
  if (['barbell','ez barbell'].includes(equipment))
    return (n.includes('deadlift')||n.includes('squat')||n.includes('clean')) ? 'avancado' : 'intermediario'
  if (['dumbbell','cable','kettlebell'].includes(equipment)) return 'intermediario'
  return 'iniciante'
}

async function fetchAll() {
  const all = []
  let offset = 0
  const LIMIT = 10  // máximo do plano gratuito
  while (true) {
    process.stdout.write(`\rBuscando... ${all.length} exercícios`)
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises?limit=${LIMIT}&offset=${offset}`,
      { headers: { 'x-rapidapi-host': 'exercisedb.p.rapidapi.com', 'x-rapidapi-key': RAPIDAPI_KEY } }
    )
    if (!res.ok) { console.error('\nErro:', res.status, await res.text()); break }
    const batch = await res.json()
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < LIMIT) break
    offset += LIMIT
    await new Promise(r => setTimeout(r, 400))
  }
  return all
}

async function insert(rows) {
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
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
}

const raw = await fetchAll()
console.log(`\n✅ ${raw.length} recebidos`)

const rows = []
for (const ex of raw) {
  const muscle_group = getMuscleGroup(ex.bodyPart, ex.target)
  if (!muscle_group) continue
  rows.push({
    name: ex.name.replace(/\b\w/g, c => c.toUpperCase()),
    muscle_group,
    difficulty: getDifficulty(ex.equipment, ex.name),
    description: (ex.instructions ?? []).join(' ').slice(0, 800) || null,
    muscles_worked: [ex.target, ...(ex.secondaryMuscles ?? [])].join(', '),
    image_url: ex.gifUrl ?? null,
  })
}

console.log(`📦 Inserindo ${rows.length} exercícios...`)
for (let i = 0; i < rows.length; i += 50) {
  await insert(rows.slice(i, i + 50))
  process.stdout.write(`\r  ✓ ${Math.min(i+50, rows.length)}/${rows.length}`)
}
console.log('\n🎉 Pronto!')