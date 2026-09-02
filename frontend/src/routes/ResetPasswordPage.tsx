import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/layout/Logo'

// Destino do link de recuperacao enviado por e-mail.
// O supabase-js troca o token da URL por sessao sozinho (detectSessionInUrl),
// entao aqui basta esperar a sessao aparecer e chamar updateUser.
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useApp()
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
          <Logo size="md" />
        </div>

        <Card glow>
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-5 h-px w-10 bg-obliq-red" aria-hidden="true" />
              <h1 className="font-display text-xl font-bold">Senha alterada</h1>
              <p className="mt-2 text-sm text-obliq-dim">Levando você para o painel.</p>
            </div>
          ) : ready === false ? (
            <div className="text-center">
              <div className="mx-auto mb-5 h-px w-10 bg-obliq-line" aria-hidden="true" />
              <h1 className="font-display text-xl font-bold">Link inválido ou expirado</h1>
              <p className="mt-2 text-sm text-obliq-dim">
                Peça um novo link de recuperação na tela de login.
              </p>
              <Button to="/auth" className="mt-5">
                Voltar ao login
              </Button>
            </div>
          ) : ready === null ? (
            <p className="text-center text-sm text-obliq-dim">Verificando o link…</p>
          ) : (
            <>
              <h1 className="font-display text-xl font-bold">Trocar senha</h1>
              <p className="mt-1 text-sm text-obliq-dim">
                Escolha uma senha nova. A atual deixa de valer.
              </p>
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
                <div className="flex items-center gap-5">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar senha'}
                  </Button>
                  {isAuthenticated && (
                    <Link
                      to="/dashboard"
                      className="text-sm text-obliq-dim underline decoration-obliq-line underline-offset-4 transition-colors hover:text-obliq-chalk"
                    >
                      Cancelar
                    </Link>
                  )}
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
