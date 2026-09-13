
import { describe, it, expect } from 'vitest';

import {
  NIVEIS,
  avaliarDesempenho,
  classificarFrequencia,
  classificarLeadTime,
  classificarMttr,
  classificarTaxaFalha,
  frequenciaDeDeploy,
  leadTimeMedio,
  taxaFalhaMudanca,
  tempoMedioRestauracao,
} from '../src/metrics.js';

describe('frequenciaDeDeploy', () => {
  it('calcula a media de deploys por dia', () => {
    expect(frequenciaDeDeploy(30, 30)).toBe(1);
    expect(frequenciaDeDeploy(60, 30)).toBe(2);
  });

  it('aceita periodo sem nenhum deploy', () => {
    expect(frequenciaDeDeploy(0, 15)).toBe(0);
  });

  it('rejeita periodo igual a zero', () => {
    expect(() => frequenciaDeDeploy(10, 0)).toThrow(RangeError);
  });

  it('rejeita quantidade negativa de deploys', () => {
    expect(() => frequenciaDeDeploy(-1, 10)).toThrow(RangeError);
  });

  it('rejeita entrada que nao seja numero', () => {
    expect(() => frequenciaDeDeploy('10', 10)).toThrow(TypeError);
  });
});

describe('leadTimeMedio', () => {
  it('calcula a media em horas entre commit e deploy', () => {
    const registros = [
      { commit: '2026-09-01T00:00:00Z', deploy: '2026-09-01T04:00:00Z' },
      { commit: '2026-09-02T00:00:00Z', deploy: '2026-09-02T08:00:00Z' },
    ];
    expect(leadTimeMedio(registros)).toBe(6);
  });

  it('considera lead time zero quando o deploy e imediato', () => {
    const registros = [
      { commit: '2026-09-01T10:00:00Z', deploy: '2026-09-01T10:00:00Z' },
    ];
    expect(leadTimeMedio(registros)).toBe(0);
  });

  it('rejeita lista vazia', () => {
    expect(() => leadTimeMedio([])).toThrow(TypeError);
  });

  it('rejeita data invalida', () => {
    const registros = [{ commit: 'ontem', deploy: '2026-09-01T10:00:00Z' }];
    expect(() => leadTimeMedio(registros)).toThrow(TypeError);
  });

  it('rejeita deploy anterior ao commit', () => {
    const registros = [
      { commit: '2026-09-02T10:00:00Z', deploy: '2026-09-01T10:00:00Z' },
    ];
    expect(() => leadTimeMedio(registros)).toThrow(RangeError);
  });
});

describe('taxaFalhaMudanca', () => {
  it('calcula o percentual de deploys com falha', () => {
    expect(taxaFalhaMudanca(20, 1)).toBe(5);
    expect(taxaFalhaMudanca(50, 10)).toBe(20);
  });

  it('retorna zero quando nao houve deploy', () => {
    expect(taxaFalhaMudanca(0, 0)).toBe(0);
  });

  it('rejeita mais falhas do que deploys', () => {
    expect(() => taxaFalhaMudanca(5, 6)).toThrow(RangeError);
  });
});

describe('tempoMedioRestauracao', () => {
  it('calcula a media de horas para restaurar o servico', () => {
    const incidentes = [
      { inicio: '2026-09-01T00:00:00Z', fim: '2026-09-01T02:00:00Z' },
      { inicio: '2026-09-05T00:00:00Z', fim: '2026-09-05T04:00:00Z' },
    ];
    expect(tempoMedioRestauracao(incidentes)).toBe(3);
  });

  it('retorna zero quando nao houve incidentes', () => {
    expect(tempoMedioRestauracao([])).toBe(0);
  });

  it('rejeita incidente com fim anterior ao inicio', () => {
    const incidentes = [
      { inicio: '2026-09-01T05:00:00Z', fim: '2026-09-01T01:00:00Z' },
    ];
    expect(() => tempoMedioRestauracao(incidentes)).toThrow(RangeError);
  });
});

describe('classificacoes DORA', () => {
  it('classifica a frequencia de deploy', () => {
    expect(classificarFrequencia(3)).toBe(NIVEIS.ELITE);
    expect(classificarFrequencia(0.5)).toBe(NIVEIS.ALTO);
    expect(classificarFrequencia(0.05)).toBe(NIVEIS.MEDIO);
    expect(classificarFrequencia(0.01)).toBe(NIVEIS.BAIXO);
  });

  it('classifica o lead time', () => {
    expect(classificarLeadTime(2)).toBe(NIVEIS.ELITE);
    expect(classificarLeadTime(48)).toBe(NIVEIS.ALTO);
    expect(classificarLeadTime(300)).toBe(NIVEIS.MEDIO);
    expect(classificarLeadTime(1000)).toBe(NIVEIS.BAIXO);
  });

  it('classifica a taxa de falha', () => {
    expect(classificarTaxaFalha(3)).toBe(NIVEIS.ELITE);
    expect(classificarTaxaFalha(9)).toBe(NIVEIS.ALTO);
    expect(classificarTaxaFalha(14)).toBe(NIVEIS.MEDIO);
    expect(classificarTaxaFalha(40)).toBe(NIVEIS.BAIXO);
  });

  it('classifica o tempo de restauracao', () => {
    expect(classificarMttr(0.5)).toBe(NIVEIS.ELITE);
    expect(classificarMttr(6)).toBe(NIVEIS.ALTO);
    expect(classificarMttr(72)).toBe(NIVEIS.MEDIO);
    expect(classificarMttr(500)).toBe(NIVEIS.BAIXO);
  });
});

describe('avaliarDesempenho', () => {
  const entrada = {
    totalDeploys: 40,
    dias: 30,
    deploysComFalha: 2,
    registrosLeadTime: [
      { commit: '2026-09-01T00:00:00Z', deploy: '2026-09-01T06:00:00Z' },
      { commit: '2026-09-02T00:00:00Z', deploy: '2026-09-02T10:00:00Z' },
    ],
    incidentes: [
      { inicio: '2026-09-03T00:00:00Z', fim: '2026-09-03T00:30:00Z' },
    ],
  };

  it('consolida as quatro metricas DORA', () => {
    const relatorio = avaliarDesempenho(entrada);

    expect(Object.keys(relatorio)).toEqual([
      'frequenciaDeploy',
      'leadTime',
      'taxaFalhaMudanca',
      'tempoRestauracao',
    ]);
  });

  it('calcula os valores esperados para o periodo', () => {
    const relatorio = avaliarDesempenho(entrada);

    expect(relatorio.frequenciaDeploy.valor).toBeCloseTo(1.333, 3);
    expect(relatorio.leadTime.valor).toBe(8);
    expect(relatorio.taxaFalhaMudanca.valor).toBe(5);
    expect(relatorio.tempoRestauracao.valor).toBe(0.5);
  });

  it('classifica o time como Elite nas quatro metricas', () => {
    const relatorio = avaliarDesempenho(entrada);

    expect(relatorio.frequenciaDeploy.nivel).toBe(NIVEIS.ELITE);
    expect(relatorio.leadTime.nivel).toBe(NIVEIS.ELITE);
    expect(relatorio.taxaFalhaMudanca.nivel).toBe(NIVEIS.ELITE);
    expect(relatorio.tempoRestauracao.nivel).toBe(NIVEIS.ELITE);
  });

  it('funciona sem incidentes registrados', () => {
    const semIncidentes = { ...entrada, incidentes: undefined };
    const relatorio = avaliarDesempenho(semIncidentes);

    expect(relatorio.tempoRestauracao.valor).toBe(0);
    expect(relatorio.tempoRestauracao.nivel).toBe(NIVEIS.ELITE);
  });

  it('rejeita entrada que nao seja objeto', () => {
    expect(() => avaliarDesempenho(null)).toThrow(TypeError);
  });
});
