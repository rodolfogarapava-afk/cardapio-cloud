import type { NavigateFunction } from 'react-router-dom';

/**
 * Volta para a página anterior quando existe histórico do SPA.
 * Caso o usuário tenha entrado direto na rota (sem histórico interno),
 * faz fallback para uma rota segura informada pela tela.
 */
export function goBack(navigate: NavigateFunction, fallback: string = '/') {
  // window.history.length inclui a aba/entrada inicial. Se > 1 há para onde voltar.
  if (typeof window !== 'undefined' && window.history.length > 1) {
    navigate(-1);
    return;
  }
  navigate(fallback, { replace: true });
}
