jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { MateriaisService } from '../materiais/materiais.service';
import { PrecificacaoService } from '../precificacao/precificacao.service';
import { SimulacoesService } from './simulacoes.service';

/**
 * Teste de integração do serviço com um "banco" em memória: salva uma
 * simulação, altera o material no cadastro e confere que a simulação
 * salva continua com os valores originais.
 */
function montar() {
  const material: Record<string, any> = {
    id: 'mat-1',
    nome: 'PLA Branco (EXEMPLO FICTÍCIO)',
    fabricante: null,
    tipo: 'PLA',
    cor: 'Branco',
    pesoLiquidoG: '1000.000', // Decimal do Prisma chega como objeto/string
    precoRolo: '120.00',
    freteAquisicao: '20.00',
    freteIncluidoNoPreco: false,
    observacoes: null,
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const simulacoes = new Map<string, any>();
  let seq = 0;

  const prisma: any = {
    material: {
      findUnique: ({ where }: any) =>
        Promise.resolve(where.id === material.id ? { ...material } : null),
    },
    simulacao: {
      create: ({ data }: any) => {
        const reg = {
          id: `sim-${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        simulacoes.set(reg.id, JSON.parse(JSON.stringify(reg)));
        return Promise.resolve(simulacoes.get(reg.id));
      },
      findUnique: ({ where }: any) =>
        Promise.resolve(simulacoes.get(where.id) ?? null),
    },
  };

  const materiais = new MateriaisService(prisma);
  const service = new SimulacoesService(
    prisma,
    new PrecificacaoService(materiais),
  );
  return { service, material };
}

const corpo = {
  nome: 'Chaveiro logo (EXEMPLO FICTÍCIO)',
  quantidade: 10,
  materialId: 'mat-1',
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
  metodoDespesaFixa: 'RATEIO',
  despesasFixasMensais: 2000,
  unidadesVendidasMes: 400,
  taxaVendaPct: 12,
  impostosPct: 6,
  outrasVariaveisPct: 2,
  margemPct: 20,
};

describe('SimulacoesService', () => {
  it('10. mudança no material não altera simulação já salva', async () => {
    const { service, material } = montar();
    const salva = await service.criar(corpo);
    expect(salva.precoRecomendadoUnit).toBeCloseTo(50.175, 10);

    material.precoRolo = '200.00';
    material.freteAquisicao = '0.00';

    const lida = await service.obter(salva.id);
    expect(lida.snapshot.material.precoRolo).toBe(120);
    expect(lida.snapshot.material.custoPorGrama).toBeCloseTo(0.14, 12);
    expect(lida.resultado.precoRecomendado).toBeCloseTo(50.175, 10);
    expect(lida.precoRecomendadoUnit).toBeCloseTo(50.175, 10);

    // Duplicar copia o retrato antigo, não recalcula com o rolo novo.
    const copia = await service.duplicar(salva.id);
    expect(copia.nome).toBe('Cópia de Chaveiro logo (EXEMPLO FICTÍCIO)');
    expect(copia.resultado.precoRecomendado).toBeCloseTo(50.175, 10);

    // Uma simulação nova usa o custo atual (R$ 0,20/g).
    const nova = await service.criar(corpo);
    expect(nova.snapshot.material.custoPorGrama).toBeCloseTo(0.2, 12);
  });

  it('recusa salvar com dados inválidos, apontando os campos', async () => {
    const { service } = montar();
    await expect(
      service.criar({ ...corpo, nome: '', quantidade: 0, pesoPecaG: -1 }),
    ).rejects.toMatchObject({
      response: {
        erros: expect.arrayContaining([
          expect.objectContaining({ campo: 'nome' }),
          expect.objectContaining({ campo: 'quantidade' }),
          expect.objectContaining({ campo: 'pesoPecaG' }),
        ]),
      },
    });
  });

  it('recusa material inexistente', async () => {
    const { service } = montar();
    await expect(
      service.criar({ ...corpo, materialId: 'nao-existe' }),
    ).rejects.toMatchObject({
      response: { erros: [expect.objectContaining({ campo: 'materialId' })] },
    });
  });
});
