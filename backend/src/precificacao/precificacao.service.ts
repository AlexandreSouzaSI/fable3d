import { Injectable } from '@nestjs/common';
import { LeitorCampos } from '../common/validacao';
import { MateriaisService } from '../materiais/materiais.service';
import { FormularioCalculo, montarSnapshot, RetornoSnapshot } from './snapshot';

const QUALQUER = { min: -Infinity };

@Injectable()
export class PrecificacaoService {
  constructor(private readonly materiais: MateriaisService) {}

  /**
   * Converte o corpo da requisição em FormularioCalculo. Aqui só se checa
   * TIPO (número, texto); as regras de negócio ficam no motor, que é a
   * única fonte de validação dos valores.
   */
  lerFormulario(corpo: Record<string, unknown>): {
    form: FormularioCalculo;
    erros: LeitorCampos['erros'];
  } {
    const l = new LeitorCampos(corpo);
    const n = (campo: string, rotulo: string) =>
      l.numero(campo, rotulo, QUALQUER);
    const form = {
      nome: l.texto('nome', 'Nome da peça', { max: 160 }),
      codigo: l.texto('codigo', 'Código', { max: 60 }),
      descricao: l.texto('descricao', 'Descrição', { max: 2000 }),
      quantidade: l.numero('quantidade', 'Quantidade do lote', {
        ...QUALQUER,
        obrigatorio: true,
      }) as number,
      materialId:
        l.texto('materialId', 'Material', { obrigatorio: true }) ?? '',
      metodoPerda: l.opcao('metodoPerda', 'Método de perda', [
        'PERCENTUAL',
        'PESO_TOTAL',
      ] as const) as any,
      pesoPecaG: l.numero('pesoPecaG', 'Peso por peça', {
        ...QUALQUER,
        obrigatorio: true,
      }) as number,
      perdaPct: n('perdaPct', 'Percentual de perda'),
      tempoImpressaoMin: l.numero('tempoImpressaoMin', 'Tempo de impressão', {
        ...QUALQUER,
        obrigatorio: true,
      }) as number,
      consumoKw: n('consumoKw', 'Consumo da impressora'),
      tarifaKwh: n('tarifaKwh', 'Tarifa de energia'),
      manutencaoHora: n('manutencaoHora', 'Manutenção por hora'),
      custoHoraTrabalho: n('custoHoraTrabalho', 'Custo da hora de trabalho'),
      preparacaoMin: n('preparacaoMin', 'Tempo de preparação'),
      acabamentoMin: n('acabamentoMin', 'Tempo de acabamento'),
      montagemEmbalagemMin: n(
        'montagemEmbalagemMin',
        'Tempo de montagem e embalagem',
      ),
      custoUnicoPedido: n('custoUnicoPedido', 'Custos únicos do pedido'),
      embalagemUnit: n('embalagemUnit', 'Embalagem'),
      componentesUnit: n('componentesUnit', 'Componentes'),
      terceirizadosUnit: n('terceirizadosUnit', 'Serviços terceirizados'),
      outrosUnit: n('outrosUnit', 'Outros custos'),
      metodoDespesaFixa: l.opcao(
        'metodoDespesaFixa',
        'Método da despesa fixa',
        ['MANUAL', 'RATEIO'] as const,
      ) as any,
      despesaFixaManualUnit: n(
        'despesaFixaManualUnit',
        'Despesa fixa por unidade',
      ),
      despesasFixasMensais: n('despesasFixasMensais', 'Despesas fixas mensais'),
      unidadesVendidasMes: n(
        'unidadesVendidasMes',
        'Unidades vendidas por mês',
      ),
      taxaVendaPct: n('taxaVendaPct', 'Taxa de venda'),
      impostosPct: n('impostosPct', 'Impostos'),
      outrasVariaveisPct: n('outrasVariaveisPct', 'Outras despesas variáveis'),
      margemPct: n('margemPct', 'Margem de lucro'),
      precoAtual: n('precoAtual', 'Preço atual'),
    } satisfies FormularioCalculo;
    return { form, erros: l.erros };
  }

  async calcular(corpo: Record<string, unknown>): Promise<RetornoSnapshot> {
    const { form, erros } = this.lerFormulario(corpo);
    if (erros.length) return { ok: false, erros };
    const material = await this.materiais.buscar(form.materialId);
    return montarSnapshot(
      form,
      material ? this.materiais.paraSnapshot(material) : null,
    );
  }
}
