import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeitorCampos, num } from '../common/validacao';

const ID = 1;

@Injectable()
export class ConfiguracoesService {
  constructor(private readonly prisma: PrismaService) {}

  private paraResposta(c: any) {
    return {
      tarifaEnergiaKwh: num(c.tarifaEnergiaKwh),
      consumoImpressoraKw: num(c.consumoImpressoraKw),
      manutencaoHora: num(c.manutencaoHora),
      custoHoraTrabalho: num(c.custoHoraTrabalho),
      despesasFixasMensais: num(c.despesasFixasMensais),
      unidadesVendidasMes: num(c.unidadesVendidasMes),
      metodoDespesaFixa: c.metodoDespesaFixa as 'MANUAL' | 'RATEIO',
      despesaFixaManualUnit: num(c.despesaFixaManualUnit),
      taxaVendaPct: num(c.taxaVendaPct),
      impostosPct: num(c.impostosPct),
      outrasVariaveisPct: num(c.outrasVariaveisPct),
      margemLucroPct: num(c.margemLucroPct),
      updatedAt: c.updatedAt as Date,
    };
  }

  async obter() {
    const c = await this.prisma.configuracao.upsert({
      where: { id: ID },
      update: {},
      create: { id: ID },
    });
    return this.paraResposta(c);
  }

  async salvar(corpo: Record<string, unknown>) {
    const l = new LeitorCampos(corpo);
    const pct = (campo: string, rotulo: string) =>
      l.numero(campo, rotulo, { obrigatorio: true, max: 100 });
    const dados = {
      tarifaEnergiaKwh: l.numero('tarifaEnergiaKwh', 'Tarifa de energia', {
        obrigatorio: true,
      }),
      consumoImpressoraKw: l.numero(
        'consumoImpressoraKw',
        'Consumo da impressora',
        { obrigatorio: true },
      ),
      manutencaoHora: l.numero(
        'manutencaoHora',
        'Manutenção e desgaste por hora',
        { obrigatorio: true },
      ),
      custoHoraTrabalho: l.numero(
        'custoHoraTrabalho',
        'Custo da hora de trabalho',
        { obrigatorio: true },
      ),
      despesasFixasMensais: l.numero(
        'despesasFixasMensais',
        'Despesas fixas mensais',
        { obrigatorio: true },
      ),
      unidadesVendidasMes: l.numero(
        'unidadesVendidasMes',
        'Unidades vendidas por mês',
        {
          obrigatorio: true,
          inteiro: true,
        },
      ),
      metodoDespesaFixa: l.opcao(
        'metodoDespesaFixa',
        'Método da despesa fixa',
        ['MANUAL', 'RATEIO'] as const,
      ),
      despesaFixaManualUnit: l.numero(
        'despesaFixaManualUnit',
        'Despesa fixa por unidade',
        { obrigatorio: true },
      ),
      taxaVendaPct: pct('taxaVendaPct', 'Taxa de venda'),
      impostosPct: pct('impostosPct', 'Impostos sobre vendas'),
      outrasVariaveisPct: pct(
        'outrasVariaveisPct',
        'Outras despesas variáveis',
      ),
      margemLucroPct: pct('margemLucroPct', 'Margem de lucro desejada'),
    };
    if (
      dados.metodoDespesaFixa === 'RATEIO' &&
      dados.unidadesVendidasMes !== null &&
      dados.unidadesVendidasMes <= 0
    ) {
      l.erros.push({
        campo: 'unidadesVendidasMes',
        mensagem:
          'Para usar o rateio, informe uma estimativa de unidades por mês maior que zero.',
      });
    }
    const somaPct =
      (dados.taxaVendaPct ?? 0) +
      (dados.impostosPct ?? 0) +
      (dados.outrasVariaveisPct ?? 0) +
      (dados.margemLucroPct ?? 0);
    if (somaPct >= 100) {
      l.erros.push({
        campo: 'margemLucroPct',
        mensagem:
          'Taxas, impostos, outras despesas variáveis e margem somam 100% ou mais — não seria possível formar preço.',
      });
    }
    l.validar();
    const c = await this.prisma.configuracao.upsert({
      where: { id: ID },
      update: dados as any,
      create: { id: ID, ...(dados as any) },
    });
    return this.paraResposta(c);
  }
}
