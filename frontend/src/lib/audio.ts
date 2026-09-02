// Gravador de fala do composer. Usa o formato que o navegador suportar:
// o Chrome grava webm/opus, o Safari grava mp4, e o Whisper aceita os dois.
const FORMATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

export type Gravador = {
  parar: () => Promise<string>
  cancelar: () => void
}

export async function gravar(): Promise<Gravador> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = FORMATOS.find((f) => MediaRecorder.isTypeSupported(f))
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const pedacos: BlobPart[] = []

  rec.ondataavailable = (e) => {
    if (e.data.size) pedacos.push(e.data)
  }
  rec.start()

  const encerrarStream = () => stream.getTracks().forEach((t) => t.stop())

  return {
    parar: () =>
      new Promise<string>((resolve, reject) => {
        rec.onstop = () => {
          encerrarStream()
          const blob = new Blob(pedacos, { type: rec.mimeType || 'audio/webm' })
          const leitor = new FileReader()
          leitor.onload = () => resolve(String(leitor.result))
          leitor.onerror = () => reject(new Error('leitura falhou'))
          leitor.readAsDataURL(blob)
        }
        rec.stop()
      }),
    cancelar: () => {
      rec.onstop = encerrarStream
      if (rec.state !== 'inactive') rec.stop()
      else encerrarStream()
    },
  }
}
