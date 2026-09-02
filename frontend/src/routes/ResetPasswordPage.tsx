import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/layout/Logo'

// Destino do link de recuperacao enviado por e-mail.
// O supabase-js troca o token da URL por sessao sozinho (detectSessionInUrl),
// entao aqui basta esperar a sessao aparecer e chamar updateUser.
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setReady(!!data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (alive && session) setReady(true)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setError('')
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) {
      setError('Não foi possível alterar a senha. Peça um link novo.')
      return
    }
    setDone(true)
    setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-obliq-black px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size="lg" />
        </div>

        <Card glow>
          {done ? (
            <div className="text-center">
              <div className="text-4xl">✅</div>
              <h1 className="mt-3 text-xl font-black uppercase">Senha alterada</h1>
              <p className="mt-2 text-sm text-white/60">Levando você para o painel.</p>
            </div>
          ) : ready === false ? (
            <div className="text-center">
              <div className="text-4xl">⏳</div>
              <h1 className="mt-3 text-xl font-black uppercase">Link inválido ou expirado</h1>
              <p className="mt-2 text-sm text-white/60">
                Peça um novo link de recuperação na tela de login.
              </p>
              <Button to="/auth" className="mt-5">
                Voltar ao login
              </Button>
            </div>
          ) : ready === null ? (
            <p className="text-center text-sm text-white/60">Verificando o link…</p>
          ) : (
            <>
              <h1 className="text-xl font-black uppercase">Nova senha</h1>
              <p className="mt-1 text-sm text-white/60">Escolha uma senha para entrar.</p>
              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <Input
                  label="Nova senha"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={saving}
                />
                <Input
                  label="Confirmar senha"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={saving}
                />
                {error && <p className="text-sm text-obliq-red">{error}</p>}
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar senha'}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
