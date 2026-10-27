import {
  arredondarMoeda,
  calcular,
  calcularCustoPorGrama,
  EntradaCalculo,
  ResultadoCalculo,
  resolverDespesaFixaUnit,
} from './calculo';

/**
 * EXEMPLO FICTÍCIO — conferível à mão (também está no README).
 *
 * Material: rolo R$ 120,00 + frete R$ 20,00 (não incluso), 1.000 g
 *   custo/g = 140 / 1000 = R$ 0,14
 * Peça: 50 g líquidos + 10% de perda = 55 g → 55 × 0,14 = R$ 7,70
 * Impressão 3 h: energia 0,15 kW × 3 h × R$ 0,90 = R$ 0,405
 *                máquina 3 h × R$ 1,50          = R$ 4,50
 * Trabalho R$ 30/h: acabamento 10 min = R$ 5,00; montagem/embalagem 5 min = R$ 2,50
 * Embalagem R$ 1,50; componentes R$ 2,00
 *   custo direto por peça = 23,605
 * Lote de 10: 236,05 + preparação única 30 min (R$ 15,00) = 251,05
 * Despesa fixa: R$ 2.000 / 400 un = R$ 5,00/un → 50,00 no lote
 *   custo total do lote = 301,05 → custo unitário completo = 30,105
 * Taxa 12% + impostos 6% + outras 2% = 20%; margem 20%
 *   preço = 30,105 / (1 − 0,20 − 0,20) = 50,175 → R$ 50,18
 *   equilíbrio = 30,105 / 0,80 = 37,63125 → R$ 37,63
 */
const MATERIAL_EXEMPLO = {
  pesoLiquidoG: 1000,
  precoRolo: 120,
  freteAquisicao: 20,
  freteIncluidoNoPreco: false,
};

function entradaExemplo(
  sobrescrever: Partial<EntradaCalculo> = {},
): EntradaCalculo {
  return {
    quantidade: 10,
    custoPorGrama: calcularCustoPorGrama(MATERIAL_EXEMPLO),
    metodoPerda: 'PERCENTUAL',
    pesoPecaG: 50,
    perdaPct: 10,
    tempoImpressaoMin: 180,
    consumoKw: 0.15,
    tarifaKwh: 0.9,
    manutencaoHora: 1.5,
    custoHoraTrabalho: 30,
    preparacaoMin: 30,
    acabamentoMin: 10,
    montagemEmbalagemMin: 5,
    embalagemUnit: 1.5,
    componentesUnit: 2,
    despesaFixaUnit: 5,
    taxaVendaPct: 12,
    impostosPct: 6,
    outrasVariaveisPct: 2,
    margemPct: 20,
    ...sobrescrever,
  };
}

function ok(e: EntradaCalculo): ResultadoCalculo {
  const r = calcular(e);
  if (!r.ok) throw new Error('Esperava sucesso: ' + JSON.stringify(r.erros));
  return r.resultado;
}

function rubrica(r: ResultadoCalculo, chave: string) {
  const x = r.rubricas.find((i) => i.chave === chave);
  if (!x) throw new Error('rubrica ausente: ' + chave);
  return x;
}

describe('custo por grama do material', () => {
  it('soma o frete quando não está incluso no preço', () => {
    expect(calcularCustoPorGrama(MATERIAL_EXEMPLO)).toBeCloseTo(0.14, 12);
  });

  it('não soma o frete de novo quando já está incluso no preço', () => {
    expect(
      calcularCustoPorGrama({
        ...MATERIAL_EXEMPLO,
        freteIncluidoNoPreco: true,
      }),
    ).toBeCloseTo(0.12, 12);
  });

  it('rejeita peso zero ou negativo e valores negativos', () => {
    expect(() =>
      calcularCustoPorGrama({ ...MATERIAL_EXEMPLO, pesoLiquidoG: 0 }),
    ).toThrow();
    expect(() =>
      calcularCustoPorGrama({ ...MATERIAL_EXEMPLO, pesoLiquidoG: -1 }),
    ).toThrow();
    expect(() =>
      calcularCustoPorGrama({ ...MATERIAL_EXEMPLO, precoRolo: -5 }),
    ).toThrow();
    expect(() =>
      calcularCustoPorGrama({ ...MATERIAL_EXEMPLO, freteAquisicao: -5 }),
    ).toThrow();
  });
});

describe('1. peça com material, energia, máquina, mão de obra e embalagem', () => {
  const r = ok(
    entradaExemplo({ quantidade: 1, preparacaoMin: 0, despesaFixaUnit: 0 }),
  );

  it('calcula cada rubrica por unidade', () => {
    expect(rubrica(r, 'material').porUnidade).toBeCloseTo(7.7, 10);
    expect(rubrica(r, 'energia').porUnidade).toBeCloseTo(0.405, 10);
    expect(rubrica(r, 'maquina').porUnidade).toBeCloseTo(4.5, 10);
    expect(rubrica(r, 'acabamento').porUnidade).toBeCloseTo(5, 10);
    expect(rubrica(r, 'montagemEmbalagem').porUnidade).toBeCloseTo(2.5, 10);
    expect(rubrica(r, 'embalagem').porUnidade).toBeCloseTo(1.5, 10);
    expect(rubrica(r, 'componentes').porUnidade).toBeCloseTo(2, 10);
  });

  it('soma o custo de fabricação por unidade', () => {
    expect(r.custoFabricacaoUnit).toBeCloseTo(23.605, 10);
    expect(r.custoUnitarioCompleto).toBeCloseTo(23.605, 10);
  });

  it('não inclui energia dentro da manutenção da máquina', () => {
    const semEnergia = ok(entradaExemplo({ quantidade: 1, consumoKw: 0 }));
    expect(rubrica(semEnergia, 'maquina').porUnidade).toBeCloseTo(4.5, 10);
    expect(rubrica(semEnergia, 'energia').porUnidade).toBe(0);
  });
});

describe('2. lote com preparação única e custos recorrentes', () => {
  const r = ok(entradaExemplo());

  it('não multiplica a preparação pela quantidade', () => {
    expect(rubrica(r, 'preparacao').lote).toBeCloseTo(15, 10);
    expect(rubrica(r, 'preparacao').porUnidade).toBeCloseTo(1.5, 10);
  });

  it('multiplica os custos por peça pela quantidade', () => {
    expect(rubrica(r, 'material').lote).toBeCloseTo(77, 10);
    expect(rubrica(r, 'embalagem').lote).toBeCloseTo(15, 10);
  });

  it('confere o exemplo manual completo', () => {
    expect(r.custoFabricacaoLote).toBeCloseTo(251.05, 10);
    expect(r.despesaFixaLote).toBeCloseTo(50, 10);
    expect(r.custoTotalLote).toBeCloseTo(301.05, 10);
    expect(r.custoFabricacaoUnit).toBeCloseTo(25.105, 10);
    expect(r.custoUnitarioCompleto).toBeCloseTo(30.105, 10);
    expect(r.precoEquilibrio).toBeCloseTo(37.63125, 10);
    expect(r.precoRecomendado).toBeCloseTo(50.175, 10);
    expect(r.receitaLote).toBeCloseTo(501.75, 10);
    expect(r.despesasVariaveisUnit).toBeCloseTo(10.035, 10);
    expect(r.despesasVariaveisLote).toBeCloseTo(100.35, 10);
    expect(r.lucroUnit).toBeCloseTo(10.035, 10);
    expect(r.lucroLote).toBeCloseTo(100.35, 10);
    expect(r.margemSobreReceita).toBeCloseTo(0.2, 12);
    expect(r.horasMaquinaLote).toBeCloseTo(30, 10);
    expect(r.materialLoteG).toBeCloseTo(550, 10);
    expect(r.energiaKwhLote).toBeCloseTo(4.5, 10);
    expect(r.minutosTrabalhoLote).toBeCloseTo(180, 10);
  });

  it('cada custo entra uma única vez: soma das rubricas = custo total', () => {
    const soma = r.rubricas.reduce((s, x) => s + x.lote, 0);
    expect(soma).toBeCloseTo(r.custoTotalLote, 10);
    const chaves = r.rubricas.map((x) => x.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it('diferencia margem sobre venda de markup sobre custo', () => {
    expect(r.margemSobreReceita).toBeCloseTo(0.2, 12);
    expect(r.markupSobreCusto).toBeCloseTo(50.175 / 30.105 - 1, 12); // ≈ 66,67%
    expect(r.markupSobreCusto).not.toBeCloseTo(
      r.margemSobreReceita as number,
      2,
    );
  });
});

describe('3. material com percentual de perdas', () => {
  it('aplica a perda sobre o peso líquido', () => {
    const r = ok(entradaExemplo({ quantidade: 1, perdaPct: 10 }));
    expect(r.pesoConsumidoPecaG).toBeCloseTo(55, 10);
    expect(rubrica(r, 'material').porUnidade).toBeCloseTo(7.7, 10);
  });

  it('não aplica a perda de novo quando o peso já inclui perdas', () => {
    const r = ok(
      entradaExemplo({
        quantidade: 1,
        metodoPerda: 'PESO_TOTAL',
        pesoPecaG: 55,
        perdaPct: 10,
      }),
    );
    expect(r.pesoConsumidoPecaG).toBeCloseTo(55, 10);
    expect(rubrica(r, 'material').porUnidade).toBeCloseTo(7.7, 10);
  });

  it('rejeita perda negativa', () => {
    const r = calcular(entradaExemplo({ perdaPct: -5 }));
    expect(r.ok).toBe(false);
  });
});

describe('4. diferentes taxas de venda e margem', () => {
  it('canal com taxa maior gera preço maior para a mesma margem', () => {
    const loja = ok(entradaExemplo({ taxaVendaPct: 0 }));
    const marketplace = ok(entradaExemplo({ taxaVendaPct: 20 }));
    // custo completo 30,105; loja: 30,105/(1-0,08-0,20)=41,8125; marketplace: 30,105/(1-0,28-0,20)=57,894...
    expect(loja.precoRecomendado).toBeCloseTo(30.105 / 0.72, 10);
    expect(marketplace.precoRecomendado).toBeCloseTo(30.105 / 0.52, 10);
    expect(loja.margemSobreReceita).toBeCloseTo(0.2, 12);
    expect(marketplace.margemSobreReceita).toBeCloseTo(0.2, 12);
  });

  it('margem zero faz o preço recomendado igual ao de equilíbrio', () => {
    const r = ok(entradaExemplo({ margemPct: 0 }));
    expect(r.precoRecomendado).toBeCloseTo(r.precoEquilibrio as number, 12);
    expect(r.lucroUnit).toBeCloseTo(0, 10);
  });

  it('compara com o preço atual informado', () => {
    const r = ok(entradaExemplo({ precoAtual: 45 }));
    const c = r.comparacao!;
    expect(c.despesasVariaveisUnit).toBeCloseTo(9, 10);
    expect(c.lucroUnit).toBeCloseTo(45 - 30.105 - 9, 10);
    expect(c.margemSobreReceita).toBeCloseTo((45 - 30.105 - 9) / 45, 12);
    expect(c.diferencaParaRecomendado).toBeCloseTo(45 - 50.175, 10);
    expect(c.abaixoDoEquilibrio).toBe(false);
    const barato = ok(entradaExemplo({ precoAtual: 30 })).comparacao!;
    expect(barato.abaixoDoEquilibrio).toBe(true);
    expect(barato.lucroUnit).toBeLessThan(0);
  });
});

describe('5. denominador zero ou negativo', () => {
  it('não gera preço quando percentuais + margem = 100%', () => {
    const r = ok(
      entradaExemplo({
        taxaVendaPct: 40,
        impostosPct: 20,
        outrasVariaveisPct: 10,
        margemPct: 30,
      }),
    );
    expect(r.precoRecomendado).toBeNull();
    expect(r.receitaLote).toBeNull();
    expect(r.lucroUnit).toBeNull();
    expect(r.avisos.join(' ')).toMatch(/incompatíveis/);
    expect(r.precoEquilibrio).toBeCloseTo(30.105 / 0.3, 10);
  });

  it('não gera preço nem equilíbrio quando passam de 100%', () => {
    const r = ok(
      entradaExemplo({
        taxaVendaPct: 60,
        impostosPct: 30,
        outrasVariaveisPct: 10,
        margemPct: 20,
      }),
    );
    expect(r.precoRecomendado).toBeNull();
    expect(r.precoEquilibrio).toBeNull();
    expect(r.avisos.length).toBe(2);
  });
});

describe('6. quantidade zero ou negativa', () => {
  it.each([0, -3, 2.5])('rejeita quantidade %p', (q) => {
    const r = calcular(entradaExemplo({ quantidade: q }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.map((e) => e.campo)).toContain('quantidade');
  });
});

describe('7. peso zero ou negativo', () => {
  it.each([0, -10])('rejeita peso da peça %p', (p) => {
    const r = calcular(entradaExemplo({ pesoPecaG: p }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.map((e) => e.campo)).toContain('pesoPecaG');
  });

  it('rejeita outros valores negativos', () => {
    const r = calcular(entradaExemplo({ embalagemUnit: -1, tarifaKwh: -0.5 }));
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.erros.map((e) => e.campo).sort()).toEqual([
        'embalagemUnit',
        'tarifaKwh',
      ]);
  });

  it('rejeita percentual acima de 100%', () => {
    const r = calcular(entradaExemplo({ impostosPct: 120 }));
    expect(r.ok).toBe(false);
  });
});

describe('8. ausência de taxa ou campo opcional', () => {
  it('trata campos opcionais ausentes como zero', () => {
    const r = ok({
      quantidade: 2,
      custoPorGrama: 0.1,
      metodoPerda: 'PESO_TOTAL',
      pesoPecaG: 20,
      tempoImpressaoMin: 60,
    });
    expect(r.custoUnitarioCompleto).toBeCloseTo(2, 10);
    expect(r.precoRecomendado).toBeCloseTo(2, 10);
    expect(r.percentualVariavel).toBe(0);
    expect(r.comparacao).toBeNull();
    expect(r.avisos).toEqual([]);
  });

  it('aceita null nos opcionais', () => {
    const r = ok(
      entradaExemplo({
        taxaVendaPct: null,
        precoAtual: null,
        componentesUnit: null,
      }),
    );
    expect(r.percentualVariavel).toBeCloseTo(0.08, 12);
    expect(rubrica(r, 'componentes').lote).toBe(0);
  });
});

describe('9. arredondamento monetário', () => {
  it('arredonda metade para longe do zero, sem erro de ponto flutuante', () => {
    expect(arredondarMoeda(50.175)).toBe(50.18);
    expect(arredondarMoeda(1.005)).toBe(1.01);
    expect(arredondarMoeda(37.63125)).toBe(37.63);
    expect(arredondarMoeda(0.405)).toBe(0.41);
    expect(arredondarMoeda(-2.675)).toBe(-2.68);
    expect(arredondarMoeda(10)).toBe(10);
  });

  it('o motor não arredonda internamente', () => {
    const r = ok(entradaExemplo());
    expect(r.precoRecomendado).not.toBe(50.18);
    expect(arredondarMoeda(r.precoRecomendado as number)).toBe(50.18);
  });
});

describe('despesa fixa', () => {
  it('rateio = despesas mensais ÷ unidades', () => {
    expect(
      resolverDespesaFixaUnit({
        metodo: 'RATEIO',
        despesasMensais: 2000,
        unidadesMes: 400,
      }),
    ).toEqual({
      ok: true,
      valor: 5,
    });
  });

  it('rateio exige unidades maiores que zero', () => {
    const r = resolverDespesaFixaUnit({
      metodo: 'RATEIO',
      despesasMensais: 2000,
      unidadesMes: 0,
    });
    expect(r.ok).toBe(false);
  });

  it('manual usa o valor informado', () => {
    expect(
      resolverDespesaFixaUnit({ metodo: 'MANUAL', valorManualUnit: 3.2 }),
    ).toEqual({ ok: true, valor: 3.2 });
  });
});
