/**
 * Cálculo das quatro métricas DORA (DevOps Research and Assessment).
 *
 * Este módulo concentra apenas lógica pura (sem DOM e sem I/O), justamente
 * para que possa ser coberto por testes automatizados na pipeline de CI.
 */

const MS_POR_HORA = 1000 * 60 * 60;
const HORAS_POR_DIA = 24;
const HORAS_POR_SEMANA = HORAS_POR_DIA * 7;
const HORAS_POR_MES = HORAS_POR_DIA * 30;

/** Níveis de desempenho usados pelo relatório DORA. */
export const NIVEIS = {
  ELITE: 'Elite',
  ALTO: 'Alto',
  MEDIO: 'Medio',
  BAIXO: 'Baixo',
};

function exigirNumeroFinito(valor, nome) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new TypeError(`${nome} deve ser um numero finito`);
  }
}

function exigirNaoNegativo(valor, nome) {
  exigirNumeroFinito(valor, nome);
  if (valor < 0) {
    throw new RangeError(`${nome} nao pode ser negativo`);
  }
}

/**
 * Frequência de implantação: quantos deploys são feitos por dia, em média.
 *
 * @param {number} totalDeploys quantidade de deploys realizados no período
 * @param {number} dias tamanho do período observado, em dias
 * @returns {number} deploys por dia
 */
export function frequenciaDeDeploy(totalDeploys, dias) {
  exigirNaoNegativo(totalDeploys, 'totalDeploys');
  exigirNumeroFinito(dias, 'dias');
  if (dias <= 0) {
    throw new RangeError('dias deve ser maior que zero');
  }
  return totalDeploys / dias;
}

/**
 * Lead time para mudanças: tempo médio entre o commit e a chegada em produção.
 *
 * @param {Array<{commit: string, deploy: string}>} registros datas ISO 8601
 * @returns {number} média em horas
 */
export function leadTimeMedio(registros) {
  if (!Array.isArray(registros) || registros.length === 0) {
    throw new TypeError('registros deve ser uma lista nao vazia');
  }

  const horas = registros.map((registro, indice) => {
    const commit = new Date(registro.commit).getTime();
    const deploy = new Date(registro.deploy).getTime();

    if (Number.isNaN(commit) || Number.isNaN(deploy)) {
      throw new TypeError(`registro ${indice} possui data invalida`);
    }
    if (deploy < commit) {
      throw new RangeError(`registro ${indice}: deploy anterior ao commit`);
    }
    return (deploy - commit) / MS_POR_HORA;
  });

  const soma = horas.reduce((acumulado, valor) => acumulado + valor, 0);
  return soma / horas.length;
}

/**
 * Taxa de falha em mudanças: percentual de deploys que causaram incidente.
 *
 * @param {number} totalDeploys deploys realizados
 * @param {number} deploysComFalha deploys que exigiram correção ou rollback
 * @returns {number} percentual entre 0 e 100
 */
export function taxaFalhaMudanca(totalDeploys, deploysComFalha) {
  exigirNaoNegativo(totalDeploys, 'totalDeploys');
  exigirNaoNegativo(deploysComFalha, 'deploysComFalha');
  if (deploysComFalha > totalDeploys) {
    throw new RangeError('deploysComFalha nao pode exceder totalDeploys');
  }
  if (totalDeploys === 0) {
    return 0;
  }
  return (deploysComFalha / totalDeploys) * 100;
}

/**
 * Tempo médio para restaurar o serviço (MTTR).
 *
 * @param {Array<{inicio: string, fim: string}>} incidentes datas ISO 8601
 * @returns {number} média em horas
 */
export function tempoMedioRestauracao(incidentes) {
  if (!Array.isArray(incidentes)) {
    throw new TypeError('incidentes deve ser uma lista');
  }
  if (incidentes.length === 0) {
    return 0;
  }

  const horas = incidentes.map((incidente, indice) => {
    const inicio = new Date(incidente.inicio).getTime();
    const fim = new Date(incidente.fim).getTime();

    if (Number.isNaN(inicio) || Number.isNaN(fim)) {
      throw new TypeError(`incidente ${indice} possui data invalida`);
    }
    if (fim < inicio) {
      throw new RangeError(`incidente ${indice}: fim anterior ao inicio`);
    }
    return (fim - inicio) / MS_POR_HORA;
  });

  const soma = horas.reduce((acumulado, valor) => acumulado + valor, 0);
  return soma / horas.length;
}

/** Classifica a frequência de deploy (deploys por dia). */
export function classificarFrequencia(deploysPorDia) {
  exigirNaoNegativo(deploysPorDia, 'deploysPorDia');
  if (deploysPorDia >= 1) {
    return NIVEIS.ELITE;
  }
  if (deploysPorDia >= 1 / 7) {
    return NIVEIS.ALTO;
  }
  if (deploysPorDia >= 1 / 30) {
    return NIVEIS.MEDIO;
  }
  return NIVEIS.BAIXO;
}

/** Classifica o lead time médio (em horas). */
export function classificarLeadTime(horas) {
  exigirNaoNegativo(horas, 'horas');
  if (horas < HORAS_POR_DIA) {
    return NIVEIS.ELITE;
  }
  if (horas < HORAS_POR_SEMANA) {
    return NIVEIS.ALTO;
  }
  if (horas < HORAS_POR_MES) {
    return NIVEIS.MEDIO;
  }
  return NIVEIS.BAIXO;
}

/** Classifica a taxa de falha em mudanças (percentual). */
export function classificarTaxaFalha(percentual) {
  exigirNaoNegativo(percentual, 'percentual');
  if (percentual <= 5) {
    return NIVEIS.ELITE;
  }
  if (percentual <= 10) {
    return NIVEIS.ALTO;
  }
  if (percentual <= 15) {
    return NIVEIS.MEDIO;
  }
  return NIVEIS.BAIXO;
}

/** Classifica o tempo médio de restauração (em horas). */
export function classificarMttr(horas) {
  exigirNaoNegativo(horas, 'horas');
  if (horas < 1) {
    return NIVEIS.ELITE;
  }
  if (horas < HORAS_POR_DIA) {
    return NIVEIS.ALTO;
  }
  if (horas < HORAS_POR_SEMANA) {
    return NIVEIS.MEDIO;
  }
  return NIVEIS.BAIXO;
}

/**
 * Consolida as quatro métricas e devolve valores e classificações.
 *
 * @param {object} dados entrada completa do período analisado
 * @returns {object} relatório com as quatro métricas DORA
 */
export function avaliarDesempenho(dados) {
  if (typeof dados !== 'object' || dados === null) {
    throw new TypeError('dados deve ser um objeto');
  }

  const {
    totalDeploys,
    dias,
    deploysComFalha,
    registrosLeadTime,
    incidentes = [],
  } = dados;

  const deploysPorDia = frequenciaDeDeploy(totalDeploys, dias);
  const leadTime = leadTimeMedio(registrosLeadTime);
  const taxaFalha = taxaFalhaMudanca(totalDeploys, deploysComFalha);
  const mttr = tempoMedioRestauracao(incidentes);

  return {
    frequenciaDeploy: {
      valor: deploysPorDia,
      unidade: 'deploys/dia',
      nivel: classificarFrequencia(deploysPorDia),
    },
    leadTime: {
      valor: leadTime,
      unidade: 'horas',
      nivel: classificarLeadTime(leadTime),
    },
    taxaFalhaMudanca: {
      valor: taxaFalha,
      unidade: '%',
      nivel: classificarTaxaFalha(taxaFalha),
    },
    tempoRestauracao: {
      valor: mttr,
      unidade: 'horas',
      nivel: classificarMttr(mttr),
    },
  };
}

