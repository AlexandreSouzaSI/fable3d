/**
 * Motor de cálculo de precificação da FABLE.
 *
 * Módulo PURO: não conhece banco, HTTP nem tela. Recebe números e devolve
 * números. Toda a regra de negócio de custo e preço mora aqui, para ser
 * testada isoladamente (ver calculo.spec.ts).
 *
 * Convenções:
 * - Valores monetários em reais (R$), sem arredondamento interno. Arredonde
 *   só na apresentação, com `arredondarMoeda`.
 * - Percentuais em pontos percentuais (12,5% = 12.5), nunca fração.
 * - Pesos em gramas, tempos em minutos, potência em kW, energia em kWh.
 */

export type MetodoPerda = 'PERCENTUAL' | 'PESO_TOTAL';
export type MetodoDespesaFixa = 'MANUAL' | 'RATEIO';

export interface EntradaCalculo {
  /** Unidades do lote (inteiro ≥ 1). */
  quantidade: number;
  /** Custo de aquisição do material, R$/g (já com frete, se for o caso). */
  custoPorGrama: number;
  /**
   * PERCENTUAL: `pesoPecaG` é o peso líquido da peça e `perdaPct` é aplicado.
   * PESO_TOTAL: `pesoPecaG` já inclui as perdas; `perdaPct` é ignorado.
   */
  metodoPerda: MetodoPerda;
  pesoPecaG: number;
  perdaPct?: number | null;

  /** Tempo de impressão de UMA peça, em minutos. */
  tempoImpressaoMin: number;
  consumoKw?: number | null;
  tarifaKwh?: number | null;
  /** Manutenção e desgaste por hora de máquina (sem energia). */
  manutencaoHora?: number | null;

  custoHoraTrabalho?: number | null;
  /** Preparação do arquivo — UMA vez por pedido. */
  preparacaoMin?: number | null;
  /** Acabamento — por peça. */
  acabamentoMin?: number | null;
  /** Montagem e embalagem — por peça. */
  montagemEmbalagemMin?: number | null;
  /** Outros custos únicos do pedido (ex.: impressão de teste), R$. */
  custoUnicoPedido?: number | null;

  embalagemUnit?: number | null;
  componentesUnit?: number | null;
  terceirizadosUnit?: number | null;
  outrosUnit?: number | null;

  /** Despesa fixa alocada por unidade, já resolvida pelo método escolhido. */
  despesaFixaUnit?: number | null;

  taxaVendaPct?: number | null;
  impostosPct?: number | null;
  outrasVariaveisPct?: number | null;
  margemPct?: number | null;

  /** Preço praticado hoje, para comparação (opcional). */
  precoAtual?: number | null;
}

export interface ErroValidacao {
  campo: string;
  mensagem: string;
}

export type TipoRubrica = 'UNIDADE' | 'PEDIDO' | 'FIXA';

export interface Rubrica {
  chave: string;
  rotulo: string;
  tipo: TipoRubrica;
  /** Valor por unidade (para PEDIDO, é o rateio lote ÷ quantidade). */
  porUnidade: number;
  /** Valor total no lote. */
  lote: number;
}

export interface ComparacaoPrecoAtual {
  precoAtual: number;
  despesasVariaveisUnit: number;
  lucroUnit: number;
  lucroLote: number;
  /** Fração (0,2 = 20%). null se o preço atual for zero. */
  margemSobreReceita: number;
  diferencaParaRecomendado: number | null;
  abaixoDoEquilibrio: boolean | null;
}

export interface ResultadoCalculo {
  rubricas: Rubrica[];

  pesoConsumidoPecaG: number;
  materialLoteG: number;
  horasImpressaoPeca: number;
  horasMaquinaLote: number;
  energiaKwhLote: number;
  minutosTrabalhoLote: number;

  /** Custos diretos (sem despesa fixa) — total e por unidade. */
  custoFabricacaoLote: number;
  custoFabricacaoUnit: number;
  despesaFixaLote: number;
  /** Fabricação + despesa fixa alocada. */
  custoTotalLote: number;
  custoUnitarioCompleto: number;

  /** Soma de taxas + impostos + outras despesas variáveis, em fração. */
  percentualVariavel: number;
  margemDesejada: number;

  /** Preço mínimo que cobre custos e despesas variáveis, sem lucro. */
  precoEquilibrio: number | null;
  precoRecomendado: number | null;
  receitaLote: number | null;
  despesasVariaveisUnit: number | null;
  despesasVariaveisLote: number | null;
  lucroUnit: number | null;
  lucroLote: number | null;
  /** Lucro ÷ receita, em fração. */
  margemSobreReceita: number | null;
  /** Preço ÷ custo completo − 1, em fração. NÃO confundir com margem. */
  markupSobreCusto: number | null;

  comparacao: ComparacaoPrecoAtual | null;
  avisos: string[];
}

export type RetornoCalculo =
  | { ok: true; resultado: ResultadoCalculo }
  | { ok: false; erros: ErroValidacao[] };

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Arredonda para centavos, metade para longe do zero (50,175 → 50,18).
 * O `toPrecision(15)` elimina o ruído de ponto flutuante antes de arredondar
 * (em JS, 50.175 * 100 pode virar 5017.499999...).
 */
export function arredondarMoeda(valor: number): number {
  if (!Number.isFinite(valor)) return valor;
  const sinal = valor < 0 ? -1 : 1;
  const centavos = Number((Math.abs(valor) * 100).toPrecision(15));
  return (sinal * Math.round(centavos)) / 100;
}

function opcional(v: number | null | undefined): number {
  return v === null || v === undefined ? 0 : v;
}

function ehNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// ---------------------------------------------------------------------------
// Material e despesas fixas (usados antes do cálculo da peça)
// ---------------------------------------------------------------------------

export interface DadosMaterial {
  pesoLiquidoG: number;
  precoRolo: number;
  freteAquisicao?: number | null;
  /** Se true, o frete já está dentro do preço do rolo e não é somado. */
  freteIncluidoNoPreco?: boolean;
}

export function validarMaterial(m: DadosMaterial): ErroValidacao[] {
  const erros: ErroValidacao[] = [];
  if (!ehNumero(m.pesoLiquidoG) || m.pesoLiquidoG <= 0) {
    erros.push({
      campo: 'pesoLiquidoG',
      mensagem: 'Informe um peso líquido maior que zero.',
    });
  }
  if (!ehNumero(m.precoRolo) || m.precoRolo < 0) {
    erros.push({
      campo: 'precoRolo',
      mensagem: 'O preço do rolo não pode ser negativo.',
    });
  }
  const frete = m.freteAquisicao;
  if (
    frete !== null &&
    frete !== undefined &&
    (!ehNumero(frete) || frete < 0)
  ) {
    erros.push({
      campo: 'freteAquisicao',
      mensagem: 'O frete não pode ser negativo.',
    });
  }
  return erros;
}

/** Custo por grama = (preço do rolo + frete, se não incluído) ÷ peso líquido. */
export function calcularCustoPorGrama(m: DadosMaterial): number {
  const erros = validarMaterial(m);
  if (erros.length) throw new Error(erros.map((e) => e.mensagem).join(' '));
  const frete = m.freteIncluidoNoPreco ? 0 : opcional(m.freteAquisicao);
  return (m.precoRolo + frete) / m.pesoLiquidoG;
}

export interface DadosDespesaFixa {
  metodo: MetodoDespesaFixa;
  valorManualUnit?: number | null;
  despesasMensais?: number | null;
  unidadesMes?: number | null;
}

export function resolverDespesaFixaUnit(
  d: DadosDespesaFixa,
): { ok: true; valor: number } | { ok: false; erros: ErroValidacao[] } {
  if (d.metodo === 'MANUAL') {
    const v = opcional(d.valorManualUnit);
    if (!ehNumero(v) || v < 0) {
      return {
        ok: false,
        erros: [
          {
            campo: 'despesaFixaManualUnit',
            mensagem: 'A despesa fixa por unidade não pode ser negativa.',
          },
        ],
      };
    }
    return { ok: true, valor: v };
  }

  const erros: ErroValidacao[] = [];
  const mensais = opcional(d.despesasMensais);
  const unidades = opcional(d.unidadesMes);
  if (!ehNumero(mensais) || mensais < 0) {
    erros.push({
      campo: 'despesasFixasMensais',
      mensagem: 'As despesas fixas mensais não podem ser negativas.',
    });
  }
  if (!ehNumero(unidades) || unidades <= 0) {
    erros.push({
      campo: 'unidadesVendidasMes',
      mensagem:
        'Para ratear as despesas fixas, informe uma estimativa de unidades por mês maior que zero.',
    });
  }
  if (erros.length) return { ok: false, erros };
  return { ok: true, valor: mensais / unidades };
}

// ---------------------------------------------------------------------------
// Validação da entrada da peça
// ---------------------------------------------------------------------------

const CAMPOS_OPCIONAIS_NAO_NEGATIVOS: Array<[keyof EntradaCalculo, string]> = [
  ['consumoKw', 'O consumo da impressora'],
  ['tarifaKwh', 'A tarifa de energia'],
  ['manutencaoHora', 'O custo de manutenção por hora'],
  ['custoHoraTrabalho', 'O custo da hora de trabalho'],
  ['preparacaoMin', 'O tempo de preparação'],
  ['acabamentoMin', 'O tempo de acabamento'],
  ['montagemEmbalagemMin', 'O tempo de montagem e embalagem'],
  ['custoUnicoPedido', 'O custo único do pedido'],
  ['embalagemUnit', 'O custo de embalagem'],
  ['componentesUnit', 'O custo de componentes'],
  ['terceirizadosUnit', 'O custo de serviços terceirizados'],
  ['outrosUnit', 'Outros custos'],
  ['despesaFixaUnit', 'A despesa fixa por unidade'],
];

const CAMPOS_PERCENTUAIS: Array<[keyof EntradaCalculo, string]> = [
  ['taxaVendaPct', 'A taxa de venda'],
  ['impostosPct', 'O percentual de impostos'],
  ['outrasVariaveisPct', 'Outras despesas variáveis'],
  ['margemPct', 'A margem de lucro'],
];

export function validarEntrada(e: EntradaCalculo): ErroValidacao[] {
  const erros: ErroValidacao[] = [];

  if (
    !ehNumero(e.quantidade) ||
    !Number.isInteger(e.quantidade) ||
    e.quantidade < 1
  ) {
    erros.push({
      campo: 'quantidade',
      mensagem:
        'A quantidade do lote deve ser um número inteiro maior que zero.',
    });
  }
  if (!ehNumero(e.custoPorGrama) || e.custoPorGrama < 0) {
    erros.push({
      campo: 'materialId',
      mensagem: 'Selecione um material com custo por grama válido.',
    });
  }
  if (e.metodoPerda !== 'PERCENTUAL' && e.metodoPerda !== 'PESO_TOTAL') {
    erros.push({
      campo: 'metodoPerda',
      mensagem: 'Escolha como as perdas de material serão informadas.',
    });
  }
  if (!ehNumero(e.pesoPecaG) || e.pesoPecaG <= 0) {
    erros.push({
      campo: 'pesoPecaG',
      mensagem: 'O peso de filamento por peça deve ser maior que zero.',
    });
  }
  if (e.metodoPerda === 'PERCENTUAL') {
    const p = e.perdaPct;
    if (p !== null && p !== undefined && (!ehNumero(p) || p < 0)) {
      erros.push({
        campo: 'perdaPct',
        mensagem: 'O percentual de perda não pode ser negativo.',
      });
    }
  }
  if (!ehNumero(e.tempoImpressaoMin) || e.tempoImpressaoMin < 0) {
    erros.push({
      campo: 'tempoImpressaoMin',
      mensagem: 'O tempo de impressão não pode ser negativo.',
    });
  }

  for (const [campo, nome] of CAMPOS_OPCIONAIS_NAO_NEGATIVOS) {
    const v = e[campo];
    if (v === null || v === undefined) continue;
    if (!ehNumero(v) || v < 0)
      erros.push({ campo, mensagem: `${nome} não pode ser negativo.` });
  }

  for (const [campo, nome] of CAMPOS_PERCENTUAIS) {
    const v = e[campo];
    if (v === null || v === undefined) continue;
    if (!ehNumero(v) || v < 0 || v > 100) {
      erros.push({ campo, mensagem: `${nome} deve estar entre 0% e 100%.` });
    }
  }

  const pa = e.precoAtual;
  if (pa !== null && pa !== undefined && (!ehNumero(pa) || pa <= 0)) {
    erros.push({
      campo: 'precoAtual',
      mensagem: 'O preço atual, se informado, deve ser maior que zero.',
    });
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

export function calcular(e: EntradaCalculo): RetornoCalculo {
  const erros = validarEntrada(e);
  if (erros.length) return { ok: false, erros };

  const q = e.quantidade;
  const horaTrabalho = opcional(e.custoHoraTrabalho);
  const avisos: string[] = [];

  // A. Material — a perda só é aplicada no método PERCENTUAL.
  const pesoConsumidoPecaG =
    e.metodoPerda === 'PERCENTUAL'
      ? e.pesoPecaG * (1 + opcional(e.perdaPct) / 100)
      : e.pesoPecaG;
  const material = pesoConsumidoPecaG * e.custoPorGrama;

  // B. Energia (estimativa) — kW × h × R$/kWh.
  const horasImpressaoPeca = e.tempoImpressaoMin / 60;
  const energiaKwhPeca = opcional(e.consumoKw) * horasImpressaoPeca;
  const energia = energiaKwhPeca * opcional(e.tarifaKwh);

  // C. Máquina — só manutenção e desgaste (energia fica em B).
  const maquina = horasImpressaoPeca * opcional(e.manutencaoHora);

  // D. Trabalho humano — minutos ÷ 60 × R$/h, separando pedido e peça.
  const acabamento = (opcional(e.acabamentoMin) / 60) * horaTrabalho;
  const montagem = (opcional(e.montagemEmbalagemMin) / 60) * horaTrabalho;
  const preparacaoLote = (opcional(e.preparacaoMin) / 60) * horaTrabalho;

  const porPeca = (chave: string, rotulo: string, valor: number): Rubrica => ({
    chave,
    rotulo,
    tipo: 'UNIDADE',
    porUnidade: valor,
    lote: valor * q,
  });
  const porPedido = (
    chave: string,
    rotulo: string,
    valorLote: number,
  ): Rubrica => ({
    chave,
    rotulo,
    tipo: 'PEDIDO',
    porUnidade: valorLote / q,
    lote: valorLote,
  });

  const rubricasFabricacao: Rubrica[] = [
    porPeca('material', 'Material', material),
    porPeca('energia', 'Energia (estimativa)', energia),
    porPeca('maquina', 'Manutenção e desgaste da máquina', maquina),
    porPeca('acabamento', 'Trabalho: acabamento', acabamento),
    porPeca('montagemEmbalagem', 'Trabalho: montagem e embalagem', montagem),
    porPeca('embalagem', 'Embalagem', opcional(e.embalagemUnit)),
    porPeca(
      'componentes',
      'Componentes adicionais',
      opcional(e.componentesUnit),
    ),
    porPeca(
      'terceirizados',
      'Serviços terceirizados',
      opcional(e.terceirizadosUnit),
    ),
    porPeca('outros', 'Outros custos por unidade', opcional(e.outrosUnit)),
    porPedido(
      'preparacao',
      'Trabalho: preparação do arquivo (único)',
      preparacaoLote,
    ),
    porPedido(
      'custoUnicoPedido',
      'Outros custos únicos do pedido',
      opcional(e.custoUnicoPedido),
    ),
  ];

  // E/F. Totais. Cada rubrica entra uma única vez.
  const custoFabricacaoLote = rubricasFabricacao.reduce(
    (s, r) => s + r.lote,
    0,
  );
  const despesaFixaUnit = opcional(e.despesaFixaUnit);
  const despesaFixaLote = despesaFixaUnit * q;
  const rubricaFixa: Rubrica = {
    chave: 'despesaFixa',
    rotulo: 'Despesa fixa alocada',
    tipo: 'FIXA',
    porUnidade: despesaFixaUnit,
    lote: despesaFixaLote,
  };

  const custoTotalLote = custoFabricacaoLote + despesaFixaLote;
  const custoFabricacaoUnit = custoFabricacaoLote / q;
  const custoUnitarioCompleto = custoTotalLote / q;

  // G. Formação de preço — percentuais sobre o PREÇO de venda.
  const percentualVariavel =
    (opcional(e.taxaVendaPct) +
      opcional(e.impostosPct) +
      opcional(e.outrasVariaveisPct)) /
    100;
  const margemDesejada = opcional(e.margemPct) / 100;

  // Os denominadores são calculados em pontos percentuais e arredondados a
  // 9 casas para não aceitar "quase zero" por ruído de ponto flutuante
  // (em JS, 1 − 0,7 − 0,3 = 0,0000000000000000555).
  const somaVariaveisPct =
    opcional(e.taxaVendaPct) +
    opcional(e.impostosPct) +
    opcional(e.outrasVariaveisPct);
  const denominadorEquilibrio = Number(
    ((100 - somaVariaveisPct) / 100).toFixed(9),
  );
  const denominadorPreco = Number(
    ((100 - somaVariaveisPct - opcional(e.margemPct)) / 100).toFixed(9),
  );

  const precoEquilibrio =
    denominadorEquilibrio > 0
      ? custoUnitarioCompleto / denominadorEquilibrio
      : null;
  if (precoEquilibrio === null) {
    avisos.push(
      'As despesas variáveis somam 100% ou mais do preço. Não existe preço que cubra os custos com esses percentuais.',
    );
  }

  let precoRecomendado: number | null = null;
  if (denominadorPreco > 0) {
    precoRecomendado = custoUnitarioCompleto / denominadorPreco;
  } else {
    avisos.push(
      'Taxas, impostos, outras despesas variáveis e margem somam 100% ou mais do preço de venda. ' +
        'Esses percentuais são incompatíveis: reduza algum deles para gerar um preço.',
    );
  }

  const despesasVariaveisUnit =
    precoRecomendado === null ? null : precoRecomendado * percentualVariavel;
  const lucroUnit =
    precoRecomendado === null
      ? null
      : precoRecomendado -
        custoUnitarioCompleto -
        (despesasVariaveisUnit as number);

  let comparacao: ComparacaoPrecoAtual | null = null;
  if (ehNumero(e.precoAtual) && e.precoAtual > 0) {
    const pa = e.precoAtual;
    const dvAtual = pa * percentualVariavel;
    const lucroAtual = pa - custoUnitarioCompleto - dvAtual;
    comparacao = {
      precoAtual: pa,
      despesasVariaveisUnit: dvAtual,
      lucroUnit: lucroAtual,
      lucroLote: lucroAtual * q,
      margemSobreReceita: lucroAtual / pa,
      diferencaParaRecomendado:
        precoRecomendado === null ? null : pa - precoRecomendado,
      abaixoDoEquilibrio:
        precoEquilibrio === null ? null : pa < precoEquilibrio,
    };
  }

  return {
    ok: true,
    resultado: {
      rubricas: [...rubricasFabricacao, rubricaFixa],
      pesoConsumidoPecaG,
      materialLoteG: pesoConsumidoPecaG * q,
      horasImpressaoPeca,
      horasMaquinaLote: horasImpressaoPeca * q,
      energiaKwhLote: energiaKwhPeca * q,
      minutosTrabalhoLote:
        opcional(e.preparacaoMin) +
        (opcional(e.acabamentoMin) + opcional(e.montagemEmbalagemMin)) * q,
      custoFabricacaoLote,
      custoFabricacaoUnit,
      despesaFixaLote,
      custoTotalLote,
      custoUnitarioCompleto,
      percentualVariavel,
      margemDesejada,
      precoEquilibrio,
      precoRecomendado,
      receitaLote: precoRecomendado === null ? null : precoRecomendado * q,
      despesasVariaveisUnit,
      despesasVariaveisLote:
        despesasVariaveisUnit === null ? null : despesasVariaveisUnit * q,
      lucroUnit,
      lucroLote: lucroUnit === null ? null : lucroUnit * q,
      margemSobreReceita:
        precoRecomendado === null || precoRecomendado === 0
          ? null
          : (lucroUnit as number) / precoRecomendado,
      markupSobreCusto:
        precoRecomendado === null || custoUnitarioCompleto === 0
          ? null
          : precoRecomendado / custoUnitarioCompleto - 1,
      comparacao,
      avisos,
    },
  };
}
