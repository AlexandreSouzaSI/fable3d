import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  erroValidacao,
  LeitorCampos,
  num,
  numOuNull,
  paraJson,
} from '../common/validacao';
import { PrecificacaoService } from '../precificacao/precificacao.service';
import type { SnapshotSimulacao } from '../precificacao/snapshot';
import type { ResultadoCalculo } from '../precificacao/motor/calculo';
import { gerarPdfSimulacao, nomeArquivoPdf } from './simulacao-pdf';

type SimulacaoBanco = {
  id: string;
  nome: string;
  codigo: string | null;
  observacoes: string | null;
  quantidade: number;
  materialId: string | null;
  snapshot: unknown;
  resultado: unknown;
  custoUnitarioCompleto: unknown;
  precoRecomendadoUnit: unknown;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SimulacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly precificacao: PrecificacaoService,
  ) {}

  private resumo(s: SimulacaoBanco) {
    const snap = s.snapshot as SnapshotSimulacao;
    return {
      id: s.id,
      nome: s.nome,
      codigo: s.codigo,
      observacoes: s.observacoes,
      quantidade: s.quantidade,
      materialNome: snap?.material?.nome ?? null,
      custoUnitarioCompleto: num(s.custoUnitarioCompleto),
      precoRecomendadoUnit: numOuNull(s.precoRecomendadoUnit),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private completa(s: SimulacaoBanco) {
    return {
      ...this.resumo(s),
      materialId: s.materialId,
      // Valores da data em que foi salva — nunca recalculados.
      snapshot: s.snapshot as SnapshotSimulacao,
      resultado: s.resultado as ResultadoCalculo,
    };
  }

  async listar() {
    const itens = await this.prisma.simulacao.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return itens.map((s: SimulacaoBanco) => this.resumo(s));
  }

  private async buscar(id: string): Promise<SimulacaoBanco> {
    const s = await this.prisma.simulacao.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Simulação não encontrada.');
    return s;
  }

  async obter(id: string) {
    return this.completa(await this.buscar(id));
  }

  async criar(corpo: Record<string, unknown>) {
    const l = new LeitorCampos(corpo);
    const nome = l.texto('nome', 'Nome da peça', {
      obrigatorio: true,
      max: 160,
    });
    const observacoes = l.texto('observacoes', 'Observações', { max: 2000 });

    const calculo = await this.precificacao.calcular(corpo);
    const erros = [...l.erros, ...(calculo.ok ? [] : calculo.erros)];
    if (erros.length || !calculo.ok) throw erroValidacao(erros);

    const s = await this.prisma.simulacao.create({
      data: {
        nome: nome as string,
        codigo: calculo.snapshot.identificacao.codigo,
        observacoes,
        quantidade: calculo.snapshot.entrada.quantidade,
        materialId: calculo.snapshot.material.id,
        snapshot: paraJson(calculo.snapshot),
        resultado: paraJson(calculo.resultado),
        custoUnitarioCompleto: calculo.resultado.custoUnitarioCompleto,
        precoRecomendadoUnit: calculo.resultado.precoRecomendado,
      },
    });
    return this.completa(s);
  }

  /** Copia a simulação com o MESMO retrato (não recalcula com valores atuais). */
  async duplicar(id: string) {
    const o = await this.buscar(id);
    const s = await this.prisma.simulacao.create({
      data: {
        nome: `Cópia de ${o.nome}`.slice(0, 160),
        codigo: o.codigo,
        observacoes: o.observacoes,
        quantidade: o.quantidade,
        materialId: o.materialId,
        snapshot: paraJson(o.snapshot),
        resultado: paraJson(o.resultado),
        custoUnitarioCompleto: num(o.custoUnitarioCompleto),
        precoRecomendadoUnit: numOuNull(o.precoRecomendadoUnit),
      },
    });
    return this.completa(s);
  }

  /** Só nome e observações podem ser editados — os valores são históricos. */
  async atualizar(id: string, corpo: Record<string, unknown>) {
    await this.buscar(id);
    const l = new LeitorCampos(corpo);
    const nome = l.texto('nome', 'Nome', { obrigatorio: true, max: 160 });
    const observacoes = l.texto('observacoes', 'Observações', { max: 2000 });
    l.validar();
    const s = await this.prisma.simulacao.update({
      where: { id },
      data: { nome: nome as string, observacoes },
    });
    return this.completa(s);
  }

  async excluir(id: string) {
    await this.buscar(id);
    await this.prisma.simulacao.delete({ where: { id } });
    return { ok: true };
  }

  /** PDF da simulação, com os valores congelados. */
  async pdf(id: string): Promise<{ arquivo: Buffer; nome: string }> {
    const s = await this.buscar(id);
    const arquivo = await gerarPdfSimulacao({
      nome: s.nome,
      codigo: s.codigo,
      observacoes: s.observacoes,
      quantidade: s.quantidade,
      createdAt: s.createdAt,
      snapshot: s.snapshot as SnapshotSimulacao,
      resultado: s.resultado as ResultadoCalculo,
    });
    return { arquivo, nome: nomeArquivoPdf(s.nome) };
  }
}
