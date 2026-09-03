// Para onde mandar alguem que acabou de abrir o app.
//
// A distincao que importa: ter sessao NAO e a mesma coisa que saber quem a pessoa e.
// Numa abertura fria pelo push, o Supabase entrega a sessao guardada na hora e o perfil
// so chega uma ida de rede depois. Quem tratar essa janela como "onboarding incompleto"
// joga usuario antigo na tela de cadastro, perguntando a idade de novo.
export type EstadoDaSessao = {
  carregando: boolean
  autenticado: boolean
  // O perfil ja foi buscado ao menos uma vez, com resultado ou com erro.
  perfilPronto: boolean
  onboardingCompleto: boolean
}

export type Destino = 'espera' | 'auth' | 'onboarding' | 'app'

export function destinoDaRota(e: EstadoDaSessao): Destino {
  if (e.carregando) return 'espera'
  if (!e.autenticado) return 'auth'
  // Sessao de pe e perfil a caminho: esperar, nunca chutar.
  if (!e.perfilPronto) return 'espera'
  if (!e.onboardingCompleto) return 'onboarding'
  return 'app'
}
