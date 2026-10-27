export type MetodoPerda = 'PERCENTUAL' | 'PESO_TOTAL';
export type MetodoDespesaFixa = 'MANUAL' | 'RATEIO';

export interface Material {
    id: string;
    nome: string;
    fabricante: string | null;
    tipo: string;
    cor: string;
    pesoLiquidoG: number;
    precoRolo: number;
    freteAquisicao: number;
    freteIncluidoNoPreco: boolean;
    observacoes: string | null;
    ativo: boolean;
    custoPorGrama: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface Configuracao {
    tarifaEnergiaKwh: number;
    consumoImpressoraKw: number;
    manutencaoHora: number;
    custoHoraTrabalho: number;
    despesasFixasMensais: number;
    unidadesVendidasMes: number;
    metodoDespesaFixa: MetodoDespesaFixa;
    despesaFixaManualUnit: number;
    taxaVendaPct: number;
    impostosPct: number;
    outrasVariaveisPct: number;
    margemLucroPct: number;
    updatedAt: string;
}

export interface ErroCampo {
    campo: string;
    mensagem: string;
}

export interface Rubrica {
    chave: string;
    rotulo: string;
    tipo: 'UNIDADE' | 'PEDIDO' | 'FIXA';
    porUnidade: number;
    lote: number;
}

export interface ResultadoCalculo {
    rubricas: Rubrica[];
    pesoConsumidoPecaG: number;
    materialLoteG: number;
    horasImpressaoPeca: number;
    horasMaquinaLote: number;
    energiaKwhLote: number;
    minutosTrabalhoLote: number;
    custoFabricacaoLote: number;
    custoFabricacaoUnit: number;
    despesaFixaLote: number;
    custoTotalLote: number;
    custoUnitarioCompleto: number;
    percentualVariavel: number;
    margemDesejada: number;
    precoEquilibrio: number | null;
    precoRecomendado: number | null;
    receitaLote: number | null;
    despesasVariaveisUnit: number | null;
    despesasVariaveisLote: number | null;
    lucroUnit: number | null;
    lucroLote: number | null;
    margemSobreReceita: number | null;
    markupSobreCusto: number | null;
    comparacao: {
        precoAtual: number;
        despesasVariaveisUnit: number;
        lucroUnit: number;
        lucroLote: number;
        margemSobreReceita: number;
        diferencaParaRecomendado: number | null;
        abaixoDoEquilibrio: boolean | null;
    } | null;
    avisos: string[];
}

export interface EntradaCalculo {
    quantidade: number;
    custoPorGrama: number;
    metodoPerda: MetodoPerda;
    pesoPecaG: number;
    perdaPct: number | null;
    tempoImpressaoMin: number;
    consumoKw: number | null;
    tarifaKwh: number | null;
    manutencaoHora: number | null;
    custoHoraTrabalho: number | null;
    preparacaoMin: number | null;
    acabamentoMin: number | null;
    montagemEmbalagemMin: number | null;
    custoUnicoPedido: number | null;
    embalagemUnit: number | null;
    componentesUnit: number | null;
    terceirizadosUnit: number | null;
    outrosUnit: number | null;
    despesaFixaUnit: number | null;
    taxaVendaPct: number | null;
    impostosPct: number | null;
    outrasVariaveisPct: number | null;
    margemPct: number | null;
    precoAtual: number | null;
}

export interface SnapshotSimulacao {
    versao: 1;
    calculadoEm: string;
    identificacao: { nome: string; codigo: string | null; descricao: string | null };
    material: {
        id: string;
        nome: string;
        fabricante: string | null;
        tipo: string;
        cor: string;
        pesoLiquidoG: number;
        precoRolo: number;
        freteAquisicao: number;
        freteIncluidoNoPreco: boolean;
        custoPorGrama: number;
    };
    despesaFixa: {
        metodo: MetodoDespesaFixa;
        valorManualUnit: number | null;
        despesasMensais: number | null;
        unidadesMes: number | null;
        valorUnit: number;
    };
    entrada: EntradaCalculo;
}

export type RetornoCalculo =
    | { ok: true; snapshot: SnapshotSimulacao; resultado: ResultadoCalculo }
    | { ok: false; erros: ErroCampo[] };

export interface SimulacaoResumo {
    id: string;
    nome: string;
    codigo: string | null;
    observacoes: string | null;
    quantidade: number;
    materialNome: string | null;
    custoUnitarioCompleto: number;
    precoRecomendadoUnit: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface Simulacao extends SimulacaoResumo {
    materialId: string | null;
    snapshot: SnapshotSimulacao;
    resultado: ResultadoCalculo;
}
