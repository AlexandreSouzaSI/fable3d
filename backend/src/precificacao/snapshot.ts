/**
 * Monta o "retrato" de uma simulação: todos os valores usados no cálculo
 * naquele momento, copiados (não referenciados). É isso que é salvo no banco,
 * para que mudanças futuras no material ou nas configurações não alterem
 * simulações antigas.
 *
 * Também é puro (sem banco), para ser testável.
 */
import {
  calcular,
  calcularCustoPorGrama,
  EntradaCalculo,
  ErroValidacao,
  MetodoDespesaFixa,
  MetodoPerda,
  resolverDespesaFixaUnit,
  ResultadoCalculo,
  validarMaterial,
} from './motor/calculo';

/** O que a tela da calculadora envia para a API. */
export interface FormularioCalculo {
  nome?: string | null;
  codigo?: string | null;
  descricao?: string | null;
  quantidade: number;
  materialId: string;
  metodoPerda: MetodoPerda;
  pesoPecaG: number;
  perdaPct?: number | null;
  tempoImpressaoMin: number;
  consumoKw?: number | null;
  tarifaKwh?: number | null;
  manutencaoHora?: number | null;
  custoHoraTrabalho?: number | null;
  preparacaoMin?: number | null;
  acabamentoMin?: number | null;
  montagemEmbalagemMin?: number | null;
  custoUnicoPedido?: number | null;
  embalagemUnit?: number | null;
  componentesUnit?: number | null;
  terceirizadosUnit?: number | null;
  outrosUnit?: number | null;
  metodoDespesaFixa: MetodoDespesaFixa;
  despesaFixaManualUnit?: number | null;
  despesasFixasMensais?: number | null;
  unidadesVendidasMes?: number | null;
  taxaVendaPct?: number | null;
  impostosPct?: number | null;
  outrasVariaveisPct?: number | null;
  margemPct?: number | null;
  precoAtual?: number | null;
}

/** Dados do material como vêm do banco (já convertidos para number). */
export interface MaterialParaSnapshot {
  id: string;
  nome: string;
  fabricante: string | null;
  tipo: string;
  cor: string;
  pesoLiquidoG: number;
  precoRolo: number;
  freteAquisicao: number;
  freteIncluidoNoPreco: boolean;
}

export interface SnapshotSimulacao {
  versao: 1;
  calculadoEm: string;
  identificacao: {
    nome: string;
    codigo: string | null;
    descricao: string | null;
  };
  material: MaterialParaSnapshot & { custoPorGrama: number };
  despesaFixa: {
    metodo: MetodoDespesaFixa;
    valorManualUnit: number | null;
    despesasMensais: number | null;
    unidadesMes: number | null;
    valorUnit: number;
  };
  entrada: EntradaCalculo;
}

export type RetornoSnapshot =
  | { ok: true; snapshot: SnapshotSimulacao; resultado: ResultadoCalculo }
  | { ok: false; erros: ErroValidacao[] };

function texto(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t ? t : null;
}

export function montarSnapshot(
  form: FormularioCalculo,
  material: MaterialParaSnapshot | null,
  agora: Date = new Date(),
): RetornoSnapshot {
  if (!material) {
    return {
      ok: false,
      erros: [
        { campo: 'materialId', mensagem: 'Selecione um material cadastrado.' },
      ],
    };
  }
  const errosMaterial = validarMaterial(material);
  if (errosMaterial.length) {
    return {
      ok: false,
      erros: [
        {
          campo: 'materialId',
          mensagem: `O cadastro deste material tem dados inválidos: ${errosMaterial.map((e) => e.mensagem).join(' ')}`,
        },
      ],
    };
  }
  const custoPorGrama = calcularCustoPorGrama(material);

  if (
    form.metodoDespesaFixa !== 'MANUAL' &&
    form.metodoDespesaFixa !== 'RATEIO'
  ) {
    return {
      ok: false,
      erros: [
        {
          campo: 'metodoDespesaFixa',
          mensagem: 'Escolha o método da despesa fixa.',
        },
      ],
    };
  }

  const despesa = resolverDespesaFixaUnit({
    metodo: form.metodoDespesaFixa,
    valorManualUnit: form.despesaFixaManualUnit,
    despesasMensais: form.despesasFixasMensais,
    unidadesMes: form.unidadesVendidasMes,
  });

  const entrada: EntradaCalculo = {
    quantidade: form.quantidade,
    custoPorGrama,
    metodoPerda: form.metodoPerda,
    pesoPecaG: form.pesoPecaG,
    perdaPct:
      form.metodoPerda === 'PERCENTUAL' ? (form.perdaPct ?? null) : null,
    tempoImpressaoMin: form.tempoImpressaoMin,
    consumoKw: form.consumoKw ?? null,
    tarifaKwh: form.tarifaKwh ?? null,
    manutencaoHora: form.manutencaoHora ?? null,
    custoHoraTrabalho: form.custoHoraTrabalho ?? null,
    preparacaoMin: form.preparacaoMin ?? null,
    acabamentoMin: form.acabamentoMin ?? null,
    montagemEmbalagemMin: form.montagemEmbalagemMin ?? null,
    custoUnicoPedido: form.custoUnicoPedido ?? null,
    embalagemUnit: form.embalagemUnit ?? null,
    componentesUnit: form.componentesUnit ?? null,
    terceirizadosUnit: form.terceirizadosUnit ?? null,
    outrosUnit: form.outrosUnit ?? null,
    despesaFixaUnit: despesa.ok ? despesa.valor : 0,
    taxaVendaPct: form.taxaVendaPct ?? null,
    impostosPct: form.impostosPct ?? null,
    outrasVariaveisPct: form.outrasVariaveisPct ?? null,
    margemPct: form.margemPct ?? null,
    precoAtual: form.precoAtual ?? null,
  };

  const calculo = calcular(entrada);
  const erros = [
    ...(despesa.ok ? [] : despesa.erros),
    ...(calculo.ok ? [] : calculo.erros),
  ];
  if (erros.length || !calculo.ok || !despesa.ok) return { ok: false, erros };

  const snapshot: SnapshotSimulacao = {
    versao: 1,
    calculadoEm: agora.toISOString(),
    identificacao: {
      nome: texto(form.nome) ?? '',
      codigo: texto(form.codigo),
      descricao: texto(form.descricao),
    },
    material: { ...material, custoPorGrama },
    despesaFixa: {
      metodo: form.metodoDespesaFixa,
      valorManualUnit:
        form.metodoDespesaFixa === 'MANUAL'
          ? (form.despesaFixaManualUnit ?? 0)
          : null,
      despesasMensais:
        form.metodoDespesaFixa === 'RATEIO'
          ? (form.despesasFixasMensais ?? 0)
          : null,
      unidadesMes:
        form.metodoDespesaFixa === 'RATEIO'
          ? (form.unidadesVendidasMes ?? 0)
          : null,
      valorUnit: despesa.valor,
    },
    entrada,
  };

  // Cópia profunda: nada no retrato aponta para objetos que possam mudar depois.
  return {
    ok: true,
    snapshot: structuredClone(snapshot),
    resultado: calculo.resultado,
  };
}
