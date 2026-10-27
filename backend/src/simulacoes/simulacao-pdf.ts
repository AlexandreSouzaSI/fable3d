/**
 * Gera o PDF de uma simulação salva, a partir dos valores congelados
 * (snapshot + resultado). Não recalcula nada.
 */
import PDFDocument from 'pdfkit';
import type { SnapshotSimulacao } from '../precificacao/snapshot';
import {
  arredondarMoeda,
  type ResultadoCalculo,
} from '../precificacao/motor/calculo';

export interface SimulacaoParaPdf {
  nome: string;
  codigo: string | null;
  observacoes: string | null;
  quantidade: number;
  createdAt: Date | string;
  snapshot: SnapshotSimulacao;
  resultado: ResultadoCalculo;
}

// ---------------------------------------------------------------------------
// Formatação pt-BR (mesma regra de arredondamento da tela)
// ---------------------------------------------------------------------------

const ESPACO_FIXO = / | /g;

function moeda(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(arredondarMoeda(v))
    .replace(ESPACO_FIXO, ' ');
}

function moedaPrecisa(v: number | null | undefined, casas = 4): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: casas,
  })
    .format(v)
    .replace(ESPACO_FIXO, ' ');
}

function numero(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas })
    .format(v)
    .replace(ESPACO_FIXO, ' ');
}

/** Fração (0,2) → "20,0%". */
function fracao(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${numero(v * 100, 1)}%`;
}

/** Pontos percentuais (12,5) → "12,5%". */
function pct(v: number | null | undefined): string {
  return `${numero(v ?? 0, 4)}%`;
}

function horas(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) return `${mm} min`;
  return mm === 0 ? `${hh} h` : `${hh} h ${mm} min`;
}

function data(v: Date | string): string {
  return new Date(v)
    .toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    })
    .replace(ESPACO_FIXO, ' ');
}

// ---------------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------------

const COR = {
  marca: '#C94C1F',
  marcaClara: '#FFF4EF',
  texto: '#292524',
  cinza: '#78716C',
  linha: '#E7E5E4',
};

const ROTULO_TIPO = {
  UNIDADE: 'por peça',
  PEDIDO: 'único do pedido',
  FIXA: 'despesa fixa',
} as const;

export function gerarPdfSimulacao(
  s: SimulacaoParaPdf,
  geradoEm: Date = new Date(),
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 48, bottom: 56, left: 48, right: 48 },
    bufferPages: true,
    info: { Title: `Simulação — ${s.nome}`, Author: 'FABLE' },
  });

  const partes: Buffer[] = [];
  doc.on('data', (c: Buffer) => partes.push(c));
  const pronto = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });

  const X = doc.page.margins.left;
  const L = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const limite = () => doc.page.height - doc.page.margins.bottom;
  const garantir = (altura: number) => {
    if (doc.y + altura > limite()) doc.addPage();
  };

  const r = s.resultado;
  const e = s.snapshot.entrada;
  const m = s.snapshot.material;
  const d = s.snapshot.despesaFixa;

  // --- Cabeçalho ---
  doc.roundedRect(X, doc.y, 22, 22, 5).fill('#E4612F');
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('F', X, doc.y + 4, { width: 22, align: 'center' });
  doc
    .fillColor(COR.texto)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('FABLE', X + 30, 50);
  doc
    .fillColor(COR.cinza)
    .font('Helvetica')
    .fontSize(8)
    .text('PRECIFICAÇÃO 3D · SIMULAÇÃO', X + 30, 64);

  doc.y = 92;
  doc
    .fillColor(COR.texto)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(s.nome, X, doc.y, { width: L });
  doc
    .moveDown(0.2)
    .fillColor(COR.cinza)
    .font('Helvetica')
    .fontSize(9)
    .text(
      [
        s.codigo,
        `Salva em ${data(s.createdAt)}`,
        `valores congelados em ${data(s.snapshot.calculadoEm)}`,
      ]
        .filter(Boolean)
        .join('  ·  '),
      { width: L },
    );
  if (s.snapshot.identificacao.descricao) {
    doc
      .moveDown(0.4)
      .fillColor(COR.texto)
      .fontSize(10)
      .text(s.snapshot.identificacao.descricao, { width: L });
  }
  doc.moveDown(0.8);

  // --- Destaque do preço ---
  const yBox = doc.y;
  const hBox = 64;
  doc.roundedRect(X, yBox, L, hBox, 8).fill(COR.marcaClara);
  doc
    .fillColor(COR.marca)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('PREÇO RECOMENDADO POR UNIDADE', X + 14, yBox + 12);
  doc
    .fontSize(22)
    .text(
      r.precoRecomendado === null ? 'Sem preço' : moeda(r.precoRecomendado),
      X + 14,
      yBox + 25,
    );
  const colDir = X + L / 2 + 10;
  const miniLinha = (rot: string, val: string, y: number) => {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COR.cinza)
      .text(rot, colDir, y, { width: L / 2 - 24 });
    doc
      .font('Helvetica-Bold')
      .fillColor(COR.texto)
      .text(val, colDir, y, { width: L / 2 - 24, align: 'right' });
  };
  miniLinha('Preço mínimo (equilíbrio)', moeda(r.precoEquilibrio), yBox + 12);
  miniLinha(
    'Custo unitário completo',
    moeda(r.custoUnitarioCompleto),
    yBox + 27,
  );
  miniLinha('Quantidade do lote', `${numero(s.quantidade, 0)} un`, yBox + 42);
  doc.y = yBox + hBox + 8;
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COR.cinza)
    .text(
      `Margem desejada de ${fracao(r.margemDesejada)} sobre o preço · despesas variáveis de ${fracao(r.percentualVariavel)} do preço.`,
      X,
      doc.y,
      { width: L },
    );

  // --- Helpers de seção ---
  const secao = (titulo: string) => {
    garantir(40);
    doc.moveDown(0.9);
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(COR.marca)
      .text(titulo.toUpperCase(), X, doc.y, {
        width: L,
        characterSpacing: 0.6,
      });
    doc.moveDown(0.3);
  };

  const linha = (rotulo: string, valor: string, forte = false) => {
    doc.font('Helvetica').fontSize(9);
    const larguraRot = L * 0.62;
    const h =
      Math.max(doc.heightOfString(rotulo, { width: larguraRot }), 10) + 4;
    garantir(h);
    const y = doc.y;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COR.cinza)
      .text(rotulo, X, y + 2, { width: larguraRot });
    doc
      .font(forte ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(COR.texto)
      .text(valor, X, y + 2, { width: L, align: 'right' });
    doc
      .moveTo(X, y + h)
      .lineTo(X + L, y + h)
      .lineWidth(0.5)
      .strokeColor(COR.linha)
      .stroke();
    doc.y = y + h;
  };

  // --- Resultado ---
  secao('Por unidade');
  linha('Custo de fabricação por unidade', moeda(r.custoFabricacaoUnit));
  linha(
    'Despesa fixa alocada por unidade',
    moeda(r.despesaFixaLote / s.quantidade),
  );
  linha('Custo unitário completo', moeda(r.custoUnitarioCompleto), true);
  linha(
    'Despesas variáveis estimadas por unidade',
    moeda(r.despesasVariaveisUnit),
  );
  linha('Lucro estimado por unidade', moeda(r.lucroUnit), true);

  secao(`Lote de ${numero(s.quantidade, 0)} unidades`);
  linha('Custo total do lote', moeda(r.custoTotalLote), true);
  linha('Receita bruta ao preço recomendado', moeda(r.receitaLote));
  linha('Despesas variáveis estimadas', moeda(r.despesasVariaveisLote));
  linha('Lucro estimado do lote', moeda(r.lucroLote), true);
  linha('Margem sobre a receita', fracao(r.margemSobreReceita));
  linha('Markup sobre o custo (referência)', fracao(r.markupSobreCusto));
  linha('Tempo de máquina', horas(r.horasMaquinaLote));
  linha('Material consumido (com perdas)', `${numero(r.materialLoteG, 1)} g`);
  linha('Energia (estimativa)', `${numero(r.energiaKwhLote, 2)} kWh`);
  linha('Trabalho humano', horas(r.minutosTrabalhoLote / 60));

  if (r.comparacao) {
    const c = r.comparacao;
    secao('Comparação com o preço atual');
    linha('Preço atual informado', moeda(c.precoAtual), true);
    linha('Lucro por unidade a esse preço', moeda(c.lucroUnit));
    linha('Margem sobre a receita', fracao(c.margemSobreReceita));
    linha(
      'Diferença para o preço recomendado',
      c.diferencaParaRecomendado === null
        ? '—'
        : moeda(c.diferencaParaRecomendado),
    );
    if (c.abaixoDoEquilibrio) {
      linha('Atenção', 'Abaixo do preço mínimo: cada venda dá prejuízo', true);
    }
  }

  for (const aviso of r.avisos) {
    garantir(30);
    doc.moveDown(0.6).font('Helvetica-Bold').fontSize(9).fillColor('#B91C1C');
    doc.text(aviso, X, doc.y, { width: L });
  }

  // --- Composição do custo (tabela) ---
  secao('Composição do custo');
  const cRub = L * 0.56;
  const cUn = L * 0.2;
  const cabecalhoTabela = () => {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COR.cinza);
    doc.text('Rubrica', X, y, { width: cRub });
    doc.text('Por unidade', X + cRub, y, { width: cUn, align: 'right' });
    doc.text('Lote', X + cRub + cUn, y, {
      width: L - cRub - cUn,
      align: 'right',
    });
    doc.y = y + 13;
  };
  cabecalhoTabela();
  const linhaTabela = (
    rot: string,
    tipo: string,
    un: string,
    lote: string,
    forte = false,
  ) => {
    const fonte = forte ? 'Helvetica-Bold' : 'Helvetica';
    const texto = tipo ? `${rot} (${tipo})` : rot;
    doc.font(fonte).fontSize(9);
    const h = Math.max(doc.heightOfString(texto, { width: cRub - 6 }), 10) + 4;
    if (doc.y + h > limite()) {
      doc.addPage();
      cabecalhoTabela();
    }
    const y = doc.y;
    doc.font(fonte).fontSize(9).fillColor(COR.texto);
    doc.text(rot, X, y + 2, { width: cRub - 6, continued: !!tipo });
    if (tipo) doc.font('Helvetica').fillColor(COR.cinza).text(` (${tipo})`);
    doc.font(fonte).fontSize(9).fillColor(COR.texto);
    doc.text(un, X + cRub, y + 2, { width: cUn, align: 'right' });
    doc.text(lote, X + cRub + cUn, y + 2, {
      width: L - cRub - cUn,
      align: 'right',
    });
    doc
      .moveTo(X, y + h)
      .lineTo(X + L, y + h)
      .lineWidth(forte ? 1 : 0.5)
      .strokeColor(forte ? COR.cinza : COR.linha)
      .stroke();
    doc.y = y + h;
  };
  for (const x of r.rubricas.filter((i) => i.lote !== 0)) {
    linhaTabela(
      x.rotulo,
      ROTULO_TIPO[x.tipo],
      moeda(x.porUnidade),
      moeda(x.lote),
    );
  }
  linhaTabela(
    'Total',
    '',
    moeda(r.custoUnitarioCompleto),
    moeda(r.custoTotalLote),
    true,
  );
  doc
    .moveDown(0.3)
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(COR.cinza)
    .text(
      'Custos "únicos do pedido" aparecem rateados por unidade, mas entram uma única vez no lote.',
      X,
      doc.y,
      { width: L },
    );

  // --- Valores utilizados ---
  secao('Material');
  linha('Material', m.nome);
  linha('Tipo / cor', `${m.tipo} · ${m.cor}`);
  linha('Peso líquido do rolo', `${numero(m.pesoLiquidoG, 3)} g`);
  linha('Preço do rolo', moeda(m.precoRolo));
  linha(
    'Frete de aquisição',
    `${moeda(m.freteAquisicao)}${m.freteIncluidoNoPreco ? ' (já incluso no preço)' : ''}`,
  );
  linha('Custo por grama', moedaPrecisa(m.custoPorGrama, 6));

  secao('Peça e impressão');
  linha('Quantidade do lote', `${numero(e.quantidade, 0)} un`);
  linha(
    'Método de perda',
    e.metodoPerda === 'PERCENTUAL'
      ? 'Peso líquido + % de perda'
      : 'Peso total já com perdas',
  );
  linha('Peso informado por peça', `${numero(e.pesoPecaG, 3)} g`);
  if (e.metodoPerda === 'PERCENTUAL') linha('Perda', pct(e.perdaPct));
  linha('Tempo de impressão por peça', horas(e.tempoImpressaoMin / 60));
  linha('Consumo da impressora', `${numero(e.consumoKw ?? 0, 4)} kW`);
  linha('Tarifa de energia', `${moedaPrecisa(e.tarifaKwh ?? 0)}/kWh`);
  linha('Manutenção e desgaste', `${moedaPrecisa(e.manutencaoHora ?? 0)}/h`);

  secao('Trabalho e outros custos');
  linha('Hora de trabalho', `${moedaPrecisa(e.custoHoraTrabalho ?? 0)}/h`);
  linha(
    'Preparação do arquivo (por pedido)',
    `${numero(e.preparacaoMin ?? 0)} min`,
  );
  linha('Acabamento (por peça)', `${numero(e.acabamentoMin ?? 0)} min`);
  linha(
    'Montagem e embalagem (por peça)',
    `${numero(e.montagemEmbalagemMin ?? 0)} min`,
  );
  linha('Outros custos únicos do pedido', moeda(e.custoUnicoPedido ?? 0));
  linha('Embalagem (por unidade)', moeda(e.embalagemUnit ?? 0));
  linha('Componentes (por unidade)', moeda(e.componentesUnit ?? 0));
  linha('Terceirizados (por unidade)', moeda(e.terceirizadosUnit ?? 0));
  linha('Outros (por unidade)', moeda(e.outrosUnit ?? 0));

  secao('Despesas fixas e percentuais');
  if (d.metodo === 'MANUAL') {
    linha('Método da despesa fixa', 'Valor fixo por unidade');
  } else {
    linha('Método da despesa fixa', 'Rateio pelo volume mensal (estimativa)');
    linha('Despesas fixas mensais', moeda(d.despesasMensais ?? 0));
    linha('Unidades vendidas por mês', numero(d.unidadesMes ?? 0, 0));
  }
  linha('Despesa fixa por unidade', moedaPrecisa(d.valorUnit));
  linha('Taxa de venda', pct(e.taxaVendaPct));
  linha('Impostos sobre vendas', pct(e.impostosPct));
  linha('Outras despesas variáveis', pct(e.outrasVariaveisPct));
  linha('Margem de lucro desejada', pct(e.margemPct));

  if (s.observacoes) {
    secao('Observações');
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(COR.texto)
      .text(s.observacoes, X, doc.y, {
        width: L,
      });
  }

  // --- Rodapé em todas as páginas ---
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(paginas.start + i);
    const y = doc.page.height - 36;
    // Desliga a margem inferior temporariamente para escrever no rodapé sem criar página nova.
    const margemOriginal = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COR.cinza)
      .text(
        `FABLE · Gerado em ${data(geradoEm)} · Valores arredondados apenas na exibição.`,
        X,
        y,
        { width: L - 60, lineBreak: false },
      );
    doc.text(`Página ${i + 1} de ${paginas.count}`, X, y, {
      width: L,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = margemOriginal;
  }

  doc.end();
  return pronto;
}

/** Nome de arquivo seguro: "simulacao-chaveiro-logo.pdf". */
export function nomeArquivoPdf(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `simulacao-${base || 'fable'}.pdf`;
}
