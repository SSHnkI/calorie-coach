// Reduz a foto antes de enviar: celular tira 4 MB, o modelo nao precisa disso.
// Menos bytes = resposta mais rapida e menos dado do usuario trafegando.
export async function prepararFoto(file: File, ladoMax = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * escala)
  const h = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('sem canvas')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  return canvas.toDataURL('image/jpeg', 0.72)
}
