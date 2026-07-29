import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

/**
 * As páginas fiscais encadeiam três camadas assíncronas (contexto → detalhe → blocos
 * dependentes), e o default de 1s do RTL vira flaky em jsdom carregado. A espera maior
 * não muda comportamento: só evita falso negativo de tempo.
 */
configure({ asyncUtilTimeout: 5000 });

// jsdom não implementa Element.scrollTo; páginas com rolagem automática (o chat do
// assistente) quebrariam por falta de API do ambiente, não por defeito do produto.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
