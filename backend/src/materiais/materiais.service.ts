import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeitorCampos, num } from '../common/validacao';
import { calcularCustoPorGrama } from '../precificacao/motor/calculo';
import { MaterialParaSnapshot } from '../precificacao/snapshot';

export const NOME_MATERIAL_EXEMPLO = 'PLA Branco (EXEMPLO FICTÍCIO)';

type MaterialBanco = {
  id: string;
  nome: string;
  fabricante: string | null;
  tipo: string;
  cor: string;
  pesoLiquidoG: unknown;
  precoRolo: unknown;
  freteAquisicao: unknown;
  freteIncluidoNoPreco: boolean;
  observacoes: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MateriaisService {
  constructor(private readonly prisma: PrismaService) {}

  /** Converte o registro do banco (Decimal) para números + custo por grama. */
  paraResposta(m: MaterialBanco) {
    const dados = this.paraSnapshot(m);
    let custoPorGrama: number | null = null;
    try {
      custoPorGrama = calcularCustoPorGrama(dados);
    } catch {
      custoPorGrama = null;
    }
    return {
      ...dados,
      observacoes: m.observacoes,
      ativo: m.ativo,
      custoPorGrama,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }

  paraSnapshot(m: MaterialBanco): MaterialParaSnapshot {
    return {
      id: m.id,
      nome: m.nome,
      fabricante: m.fabricante,
      tipo: m.tipo,
      cor: m.cor,
      pesoLiquidoG: num(m.pesoLiquidoG),
      precoRolo: num(m.precoRolo),
      freteAquisicao: num(m.freteAquisicao),
      freteIncluidoNoPreco: m.freteIncluidoNoPreco,
    };
  }

  async listar(apenasAtivos: boolean) {
    const itens = await this.prisma.material.findMany({
      where: apenasAtivos ? { ativo: true } : undefined,
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    });
    return itens.map((m: MaterialBanco) => this.paraResposta(m));
  }

  buscar(id: string): Promise<MaterialBanco | null> {
    return this.prisma.material.findUnique({ where: { id } });
  }

  async obter(id: string) {
    const m = await this.buscar(id);
    if (!m) throw new NotFoundException('Material não encontrado.');
    return this.paraResposta(m);
  }

  private ler(corpo: Record<string, unknown>) {
    const l = new LeitorCampos(corpo);
    const dados = {
      nome: l.texto('nome', 'Nome do material', {
        obrigatorio: true,
        max: 120,
      }),
      fabricante: l.texto('fabricante', 'Fabricante', { max: 120 }),
      tipo: l.texto('tipo', 'Tipo de material', { obrigatorio: true, max: 60 }),
      cor: l.texto('cor', 'Cor', { obrigatorio: true, max: 60 }),
      pesoLiquidoG: l.numero('pesoLiquidoG', 'Peso líquido', {
        obrigatorio: true,
        maiorQueZero: true,
      }),
      precoRolo: l.numero('precoRolo', 'Preço do rolo', { obrigatorio: true }),
      freteAquisicao: l.numero('freteAquisicao', 'Frete de aquisição') ?? 0,
      freteIncluidoNoPreco:
        l.booleano('freteIncluidoNoPreco', 'Frete incluso') ?? false,
      observacoes: l.texto('observacoes', 'Observações', { max: 2000 }),
      ativo: l.booleano('ativo', 'Status') ?? true,
    };
    l.validar();
    return dados as typeof dados & {
      nome: string;
      tipo: string;
      cor: string;
      pesoLiquidoG: number;
      precoRolo: number;
    };
  }

  async criar(corpo: Record<string, unknown>) {
    const m = await this.prisma.material.create({ data: this.ler(corpo) });
    return this.paraResposta(m);
  }

  async atualizar(id: string, corpo: Record<string, unknown>) {
    await this.obter(id);
    const m = await this.prisma.material.update({
      where: { id },
      data: this.ler(corpo),
    });
    return this.paraResposta(m);
  }

  /** Cria (uma vez) um material claramente marcado como fictício, para testar a calculadora. */
  async criarExemplo() {
    const existente = await this.prisma.material.findFirst({
      where: { nome: NOME_MATERIAL_EXEMPLO },
    });
    if (existente) return this.paraResposta(existente);
    const m = await this.prisma.material.create({
      data: {
        nome: NOME_MATERIAL_EXEMPLO,
        fabricante: 'Exemplo',
        tipo: 'PLA',
        cor: 'Branco',
        pesoLiquidoG: 1000,
        precoRolo: 120,
        freteAquisicao: 20,
        freteIncluidoNoPreco: false,
        observacoes:
          'Dados fictícios para demonstração. Pode desativar ou editar à vontade.',
        ativo: true,
      },
    });
    return this.paraResposta(m);
  }
}
