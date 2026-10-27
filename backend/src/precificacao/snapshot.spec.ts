import { calcular } from './motor/calculo';
import {
  FormularioCalculo,
  MaterialParaSnapshot,
  montarSnapshot,
} from './snapshot';

const formulario: FormularioCalculo = {
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

function materialV1(): MaterialParaSnapshot {
  return {
    id: 'mat-1',
    nome: 'PLA Branco (EXEMPLO FICTÍCIO)',
    fabricante: null,
    tipo: 'PLA',
    cor: 'Branco',
    pesoLiquidoG: 1000,
    precoRolo: 120,
    freteAquisicao: 20,
    freteIncluidoNoPreco: false,
  };
}

describe('retrato (snapshot) da simulação', () => {
  it('monta o retrato com custo por grama e despesa fixa resolvida', () => {
    const r = montarSnapshot(formulario, materialV1());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot.material.custoPorGrama).toBeCloseTo(0.14, 12);
    expect(r.snapshot.despesaFixa.valorUnit).toBeCloseTo(5, 12);
    expect(r.resultado.precoRecomendado).toBeCloseTo(50.175, 10);
  });

  it('10. alterar o material depois não altera a simulação salva', () => {
    const material = materialV1();
    const salvo = montarSnapshot(formulario, material);
    if (!salvo.ok) throw new Error('falhou');
    // Simula o que vai para o banco (JSON).
    const registro = JSON.parse(
      JSON.stringify({ snapshot: salvo.snapshot, resultado: salvo.resultado }),
    );

    // O cadastro do filamento muda depois (rolo ficou mais caro).
    material.precoRolo = 200;
    material.freteAquisicao = 0;

    // O retrato guardado continua com os valores da data em que foi salvo...
    expect(registro.snapshot.material.precoRolo).toBe(120);
    expect(registro.snapshot.material.custoPorGrama).toBeCloseTo(0.14, 12);
    expect(registro.resultado.precoRecomendado).toBeCloseTo(50.175, 10);

    // ...e recalcular a partir do retrato reproduz exatamente o mesmo resultado.
    const recalculado = calcular(registro.snapshot.entrada);
    expect(recalculado.ok).toBe(true);
    if (recalculado.ok) {
      expect(recalculado.resultado.precoRecomendado).toBeCloseTo(
        registro.resultado.precoRecomendado,
        12,
      );
      expect(recalculado.resultado.custoTotalLote).toBeCloseTo(
        registro.resultado.custoTotalLote,
        12,
      );
    }

    // Uma simulação NOVA, essa sim, usa o custo atualizado.
    const nova = montarSnapshot(formulario, material);
    if (!nova.ok) throw new Error('falhou');
    expect(nova.snapshot.material.custoPorGrama).toBeCloseTo(0.2, 12);
    expect(nova.resultado.precoRecomendado).not.toBeCloseTo(
      registro.resultado.precoRecomendado,
      2,
    );
  });

  it('o retrato não compartilha referência com o objeto do material', () => {
    const material = materialV1();
    const r = montarSnapshot(formulario, material);
    if (!r.ok) throw new Error('falhou');
    material.nome = 'Outro nome';
    expect(r.snapshot.material.nome).toBe('PLA Branco (EXEMPLO FICTÍCIO)');
  });

  it('exige material e unidades do rateio', () => {
    expect(montarSnapshot(formulario, null).ok).toBe(false);
    const r = montarSnapshot(
      { ...formulario, unidadesVendidasMes: 0 },
      materialV1(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.erros.map((e) => e.campo)).toContain('unidadesVendidasMes');
  });

  it('ignora a perda percentual quando o peso já inclui perdas', () => {
    const r = montarSnapshot(
      { ...formulario, metodoPerda: 'PESO_TOTAL', pesoPecaG: 55 },
      materialV1(),
    );
    if (!r.ok) throw new Error('falhou');
    expect(r.snapshot.entrada.perdaPct).toBeNull();
    expect(r.resultado.pesoConsumidoPecaG).toBeCloseTo(55, 12);
  });
});
