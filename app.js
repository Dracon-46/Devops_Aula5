/**
 * Camada de apresentação: liga o formulário da página ao módulo de métricas.
 * Toda a regra de cálculo fica em `metrics.js`, que é o alvo dos testes.
 */

import { avaliarDesempenho } from './metrics.js';

const CLASSE_POR_NIVEL = {
  Elite: 'nivel-elite',
  Alto: 'nivel-alto',
  Medio: 'nivel-medio',
  Baixo: 'nivel-baixo',
};

function formatar(valor, casas) {
  return Number(valor).toFixed(casas);
}

function lerRegistrosLeadTime(texto) {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
    .map((linha) => {
      const [commit, deploy] = linha.split(';').map((parte) => parte.trim());
      return { commit, deploy };
    });
}

function lerIncidentes(texto) {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
    .map((linha) => {
      const [inicio, fim] = linha.split(';').map((parte) => parte.trim());
      return { inicio, fim };
    });
}

function montarCartao(titulo, metrica, casas) {
  const classe = CLASSE_POR_NIVEL[metrica.nivel] || '';
  return `
    <article class="cartao ${classe}">
      <h3>${titulo}</h3>
      <p class="valor">${formatar(metrica.valor, casas)}
        <span class="unidade">${metrica.unidade}</span>
      </p>
      <p class="nivel">${metrica.nivel}</p>
    </article>
  `;
}

function renderizar(relatorio, destino) {
  destino.innerHTML = [
    montarCartao('Frequencia de deploy', relatorio.frequenciaDeploy, 2),
    montarCartao('Lead time para mudancas', relatorio.leadTime, 1),
    montarCartao('Taxa de falha em mudancas', relatorio.taxaFalhaMudanca, 1),
    montarCartao('Tempo de restauracao (MTTR)', relatorio.tempoRestauracao, 1),
  ].join('');
}

function renderizarErro(mensagem, destino) {
  destino.innerHTML = `<p class="erro">${mensagem}</p>`;
}

export function iniciar(documento) {
  const formulario = documento.querySelector('#formulario');
  const resultado = documento.querySelector('#resultado');

  if (!formulario || !resultado) {
    return;
  }

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const dados = {
      totalDeploys: Number(documento.querySelector('#totalDeploys').value),
      dias: Number(documento.querySelector('#dias').value),
      deploysComFalha: Number(
        documento.querySelector('#deploysComFalha').value,
      ),
      registrosLeadTime: lerRegistrosLeadTime(
        documento.querySelector('#leadTime').value,
      ),
      incidentes: lerIncidentes(documento.querySelector('#incidentes').value),
    };

    try {
      renderizar(avaliarDesempenho(dados), resultado);
    } catch (erro) {
      renderizarErro(`Nao foi possivel calcular: ${erro.message}`, resultado);
    }
  });
}

if (typeof document !== 'undefined') {
  iniciar(document);
}
