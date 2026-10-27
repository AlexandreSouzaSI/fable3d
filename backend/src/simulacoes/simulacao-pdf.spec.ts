import { montarSnapshot } from '../precificacao/snapshot';
import { gerarPdfSimulacao, nomeArquivoPdf } from './simulacao-pdf';

function simulacao(observacoes: string | null = null) {
  const r = montarSnapshot(
    {
      nome: 'Chaveiro com logo (EXEMPLO FICTÍCIO)',
      codigo: 'EX-001',
      descricao: 'Exemplo fictício para conferir o cálculo à mão.',
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
      precoAtual: 45,
    },
    {
      id: 'mat-1',
      nome: 'PLA Branco (EXEMPLO FICTÍCIO)',
      fabricante: null,
      tipo: 'PLA',
      cor: 'Branco',
      pesoLiquidoG: 1000,
      precoRolo: 120,
      freteAquisicao: 20,
      freteIncluidoNoPreco: false,
    },
  );
  if (!r.ok) throw new Error('falhou');
  return {
    nome: 'Chaveiro com logo (EXEMPLO FICTÍCIO)',
    codigo: 'EX-001',
    observacoes,
    quantidade: 10,
    createdAt: new Date('2026-10-24T13:00:00-03:00'),
    snapshot: r.snapshot,
    resultado: r.resultado,
  };
}

describe('PDF da simulação', () => {
  it('gera um PDF válido', async () => {
    const pdf = await gerarPdfSimulacao(simulacao('Pedido da empresa X.'));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(3000);
    if (process.env.SALVAR_PDF)
      require('fs').writeFileSync(process.env.SALVAR_PDF, pdf);
  });

  it('monta um nome de arquivo seguro', () => {
    expect(nomeArquivoPdf('Chaveiro com logo (EXEMPLO FICTÍCIO)')).toBe(
      'simulacao-chaveiro-com-logo-exemplo-ficticio.pdf',
    );
    expect(nomeArquivoPdf('***')).toBe('simulacao-fable.pdf');
  });
});
