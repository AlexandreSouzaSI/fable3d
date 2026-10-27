import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Box, Calculator, Clock, FlaskConical, Hammer, Receipt, Save, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { errosDeCampo, mapaErros, mensagemErro } from '../services/erro';
import type {
    Configuracao,
    Material,
    MetodoDespesaFixa,
    MetodoPerda,
    ResultadoCalculo,
    RetornoCalculo,
    Simulacao,
} from '../lib/tipos';
import { formatarMoeda, formatarMoedaPrecisa, lerNumero, paraCampo } from '../lib/numeros';
import {
    Aviso,
    Botao,
    Cabecalho,
    CampoNumero,
    CampoSelecao,
    CampoTexto,
    Carregando,
    EscolhaUnica,
    Modal,
    Secao,
} from '../components/ui';
import { ResultadoPainel } from '../components/ResultadoPainel';

// ---------------------------------------------------------------------------
// Formulário (strings, como digitado) ↔ payload (números)
// ---------------------------------------------------------------------------

const NUMERICOS = [
    'quantidade',
    'pesoPecaG',
    'perdaPct',
    'impressaoHoras',
    'impressaoMinutos',
    'consumoKw',
    'tarifaKwh',
    'manutencaoHora',
    'custoHoraTrabalho',
    'preparacaoMin',
    'acabamentoMin',
    'montagemEmbalagemMin',
    'custoUnicoPedido',
    'embalagemUnit',
    'componentesUnit',
    'terceirizadosUnit',
    'outrosUnit',
    'despesaFixaManualUnit',
    'despesasFixasMensais',
    'unidadesVendidasMes',
    'taxaVendaPct',
    'impostosPct',
    'outrasVariaveisPct',
    'margemPct',
    'precoAtual',
] as const;
type CampoNum = (typeof NUMERICOS)[number];

type Form = Record<CampoNum, string> & {
    nome: string;
    codigo: string;
    descricao: string;
    materialId: string;
    metodoPerda: MetodoPerda;
    metodoDespesaFixa: MetodoDespesaFixa;
};

function formInicial(c: Configuracao): Form {
    return {
        nome: '',
        codigo: '',
        descricao: '',
        quantidade: '1',
        materialId: '',
        metodoPerda: 'PERCENTUAL',
        pesoPecaG: '',
        perdaPct: '5',
        impressaoHoras: '',
        impressaoMinutos: '',
        consumoKw: paraCampo(c.consumoImpressoraKw),
        tarifaKwh: paraCampo(c.tarifaEnergiaKwh),
        manutencaoHora: paraCampo(c.manutencaoHora),
        custoHoraTrabalho: paraCampo(c.custoHoraTrabalho),
        preparacaoMin: '',
        acabamentoMin: '',
        montagemEmbalagemMin: '',
        custoUnicoPedido: '',
        embalagemUnit: '',
        componentesUnit: '',
        terceirizadosUnit: '',
        outrosUnit: '',
        metodoDespesaFixa: c.metodoDespesaFixa,
        despesaFixaManualUnit: paraCampo(c.despesaFixaManualUnit),
        despesasFixasMensais: paraCampo(c.despesasFixasMensais),
        unidadesVendidasMes: paraCampo(c.unidadesVendidasMes),
        taxaVendaPct: paraCampo(c.taxaVendaPct),
        impostosPct: paraCampo(c.impostosPct),
        outrasVariaveisPct: paraCampo(c.outrasVariaveisPct),
        margemPct: paraCampo(c.margemLucroPct),
        precoAtual: '',
    };
}

/** Carrega os valores de uma simulação salva (para usar como base). */
function formDeSimulacao(s: Simulacao, c: Configuracao): Form {
    const e = s.snapshot.entrada;
    const d = s.snapshot.despesaFixa;
    const campo = (v: number | null) => (v === null || v === undefined ? '' : paraCampo(v));
    return {
        ...formInicial(c),
        nome: s.nome,
        codigo: s.codigo ?? '',
        descricao: s.snapshot.identificacao.descricao ?? '',
        quantidade: campo(e.quantidade),
        materialId: s.materialId ?? '',
        metodoPerda: e.metodoPerda,
        pesoPecaG: campo(e.pesoPecaG),
        perdaPct: campo(e.perdaPct),
        impressaoHoras: String(Math.floor(e.tempoImpressaoMin / 60)),
        impressaoMinutos: paraCampo(Number((e.tempoImpressaoMin % 60).toFixed(4))),
        consumoKw: campo(e.consumoKw),
        tarifaKwh: campo(e.tarifaKwh),
        manutencaoHora: campo(e.manutencaoHora),
        custoHoraTrabalho: campo(e.custoHoraTrabalho),
        preparacaoMin: campo(e.preparacaoMin),
        acabamentoMin: campo(e.acabamentoMin),
        montagemEmbalagemMin: campo(e.montagemEmbalagemMin),
        custoUnicoPedido: campo(e.custoUnicoPedido),
        embalagemUnit: campo(e.embalagemUnit),
        componentesUnit: campo(e.componentesUnit),
        terceirizadosUnit: campo(e.terceirizadosUnit),
        outrosUnit: campo(e.outrosUnit),
        metodoDespesaFixa: d.metodo,
        despesaFixaManualUnit: d.metodo === 'MANUAL' ? campo(d.valorManualUnit) : paraCampo(c.despesaFixaManualUnit),
        despesasFixasMensais: d.metodo === 'RATEIO' ? campo(d.despesasMensais) : paraCampo(c.despesasFixasMensais),
        unidadesVendidasMes: d.metodo === 'RATEIO' ? campo(d.unidadesMes) : paraCampo(c.unidadesVendidasMes),
        taxaVendaPct: campo(e.taxaVendaPct),
        impostosPct: campo(e.impostosPct),
        outrasVariaveisPct: campo(e.outrasVariaveisPct),
        margemPct: campo(e.margemPct),
        precoAtual: campo(e.precoAtual),
    };
}

function montarPayload(f: Form): { payload: Record<string, unknown>; erros: Record<string, string> } {
    const erros: Record<string, string> = {};
    const n: Partial<Record<CampoNum, number | null>> = {};
    for (const k of NUMERICOS) {
        const v = lerNumero(f[k]);
        if (v !== null && Number.isNaN(v)) erros[k] = 'Número inválido. Use vírgula para decimais.';
        n[k] = v;
    }
    const horas = n.impressaoHoras ?? 0;
    const minutos = n.impressaoMinutos ?? 0;
    const temTempo = n.impressaoHoras !== null || n.impressaoMinutos !== null;
    return {
        erros,
        payload: {
            nome: f.nome,
            codigo: f.codigo || null,
            descricao: f.descricao || null,
            quantidade: n.quantidade,
            materialId: f.materialId,
            metodoPerda: f.metodoPerda,
            pesoPecaG: n.pesoPecaG,
            perdaPct: f.metodoPerda === 'PERCENTUAL' ? n.perdaPct : null,
            tempoImpressaoMin: temTempo ? horas * 60 + minutos : null,
            consumoKw: n.consumoKw,
            tarifaKwh: n.tarifaKwh,
            manutencaoHora: n.manutencaoHora,
            custoHoraTrabalho: n.custoHoraTrabalho,
            preparacaoMin: n.preparacaoMin,
            acabamentoMin: n.acabamentoMin,
            montagemEmbalagemMin: n.montagemEmbalagemMin,
            custoUnicoPedido: n.custoUnicoPedido,
            embalagemUnit: n.embalagemUnit,
            componentesUnit: n.componentesUnit,
            terceirizadosUnit: n.terceirizadosUnit,
            outrosUnit: n.outrosUnit,
            metodoDespesaFixa: f.metodoDespesaFixa,
            despesaFixaManualUnit: n.despesaFixaManualUnit,
            despesasFixasMensais: n.despesasFixasMensais,
            unidadesVendidasMes: n.unidadesVendidasMes,
            taxaVendaPct: n.taxaVendaPct,
            impostosPct: n.impostosPct,
            outrasVariaveisPct: n.outrasVariaveisPct,
            margemPct: n.margemPct,
            precoAtual: n.precoAtual,
        },
    };
}

/** O backend devolve erro de tempo em "tempoImpressaoMin"; na tela ele vai no campo de horas. */
function ajustarErros(m: Record<string, string>): Record<string, string> {
    if (m.tempoImpressaoMin && !m.impressaoHoras) m.impressaoHoras = m.tempoImpressaoMin;
    return m;
}

const NOME_EXEMPLO = 'EXEMPLO FICTÍCIO';

// ---------------------------------------------------------------------------

export function Calculadora() {
    const location = useLocation();
    const navigate = useNavigate();
    const base = (location.state as { base?: Simulacao } | null)?.base ?? null;

    const [config, setConfig] = useState<Configuracao | null>(null);
    const [materiais, setMateriais] = useState<Material[]>([]);
    const [form, setForm] = useState<Form | null>(null);
    const [erroCarga, setErroCarga] = useState<string | null>(null);

    const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
    const [erros, setErros] = useState<Record<string, string>>({});
    const [calculando, setCalculando] = useState(false);
    const seq = useRef(0);

    const [salvarAberto, setSalvarAberto] = useState(false);
    const [observacoes, setObservacoes] = useState('');
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        Promise.all([api.get<Configuracao>('/configuracoes'), api.get<Material[]>('/materiais', { params: { ativos: true } })])
            .then(([c, m]) => {
                setConfig(c.data);
                setMateriais(m.data);
                // Se a simulação-base usa um material hoje inativo, inclui na lista para não perder a seleção.
                if (base?.materialId && !m.data.some((x) => x.id === base.materialId)) {
                    api.get<Material>(`/materiais/${base.materialId}`)
                        .then((r) => setMateriais((atual) => [...atual, r.data]))
                        .catch(() => undefined);
                }
                setForm(base ? formDeSimulacao(base, c.data) : formInicial(c.data));
            })
            .catch((err) => setErroCarga(mensagemErro(err, 'Não foi possível carregar os dados da calculadora.')));
    }, [base]);

    // Conversão do formulário (derivada, sem efeito colateral).
    const preparo = useMemo(() => (form ? montarPayload(form) : null), [form]);
    const pronto =
        !!form &&
        !!preparo &&
        Object.keys(preparo.erros).length === 0 &&
        !!form.materialId &&
        preparo.payload.quantidade !== null &&
        preparo.payload.pesoPecaG !== null &&
        preparo.payload.tempoImpressaoMin !== null;

    // Recalcula (sem salvar) sempre que o formulário muda, com uma pequena espera.
    useEffect(() => {
        if (!pronto || !preparo) return;
        const meu = ++seq.current;
        const t = setTimeout(() => {
            setCalculando(true);
            api.post<RetornoCalculo>('/precificacao/calcular', preparo.payload)
                .then((r) => {
                    if (meu !== seq.current) return;
                    if (r.data.ok) {
                        setResultado(r.data.resultado);
                        setErros({});
                    } else {
                        setResultado(null);
                        setErros(ajustarErros(mapaErros(r.data.erros)));
                    }
                })
                .catch((err) => {
                    if (meu !== seq.current) return;
                    setResultado(null);
                    toast.error(mensagemErro(err, 'Não foi possível calcular.'), { id: 'calc' });
                })
                .finally(() => {
                    if (meu === seq.current) setCalculando(false);
                });
        }, 350);
        return () => clearTimeout(t);
    }, [preparo, pronto]);

    // Erros locais (texto inválido) têm prioridade; os da API valem enquanto o formulário está completo.
    const errosVisiveis = { ...(pronto ? erros : {}), ...(preparo?.erros ?? {}) };
    const resultadoVisivel = pronto ? resultado : null;

    if (erroCarga) return <Aviso tipo="erro">{erroCarga}</Aviso>;
    if (!form || !config) return <Carregando />;

    const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
    const material = materiais.find((m) => m.id === form.materialId) ?? null;
    const quantidade = lerNumero(form.quantidade) ?? 1;
    const mensais = lerNumero(form.despesasFixasMensais);
    const unidades = lerNumero(form.unidadesVendidasMes);
    const rateio = mensais !== null && unidades && unidades > 0 && mensais >= 0 ? mensais / unidades : null;

    function preencherExemplo() {
        if (!config) return;
        const exemplo = materiais.find((m) => m.nome.toUpperCase().includes(NOME_EXEMPLO));
        if (!exemplo) {
            toast('Crie primeiro o material de exemplo na tela Início (ou selecione um material seu).', { icon: 'ℹ️' });
        }
        setForm({
            ...formInicial(config),
            nome: 'Chaveiro com logo (EXEMPLO FICTÍCIO)',
            codigo: 'EX-001',
            descricao: 'Exemplo fictício para conferir o cálculo à mão.',
            quantidade: '10',
            materialId: exemplo?.id ?? form?.materialId ?? '',
            metodoPerda: 'PERCENTUAL',
            pesoPecaG: '50',
            perdaPct: '10',
            impressaoHoras: '3',
            impressaoMinutos: '0',
            consumoKw: '0,15',
            tarifaKwh: '0,9',
            manutencaoHora: '1,5',
            custoHoraTrabalho: '30',
            preparacaoMin: '30',
            acabamentoMin: '10',
            montagemEmbalagemMin: '5',
            embalagemUnit: '1,5',
            componentesUnit: '2',
            metodoDespesaFixa: 'RATEIO',
            despesasFixasMensais: '2000',
            unidadesVendidasMes: '400',
            taxaVendaPct: '12',
            impostosPct: '6',
            outrasVariaveisPct: '2',
            margemPct: '20',
            precoAtual: '45',
        });
    }

    async function salvar() {
        if (!form) return;
        const { payload, erros: locais } = montarPayload(form);
        if (!form.nome.trim()) locais.nome = 'Dê um nome à peça para salvar.';
        if (Object.keys(locais).length) {
            setErros(locais);
            setSalvarAberto(false);
            toast.error('Verifique os campos destacados.');
            return;
        }
        setSalvando(true);
        try {
            const r = await api.post<Simulacao>('/simulacoes', { ...payload, observacoes: observacoes || null });
            toast.success('Simulação salva.');
            navigate(`/simulacoes/${r.data.id}`);
        } catch (err) {
            setErros(ajustarErros(errosDeCampo(err)));
            setSalvarAberto(false);
            toast.error(mensagemErro(err, 'Não foi possível salvar a simulação.'));
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div>
            <Cabecalho
                titulo="Calculadora de preços"
                descricao="Os campos de energia, máquina, trabalho, despesas e percentuais vêm das Configurações de custos e podem ser ajustados só para esta simulação."
                acoes={
                    <>
                        <Botao variante="secundario" onClick={preencherExemplo}>
                            <FlaskConical size={16} /> Preencher exemplo fictício
                        </Botao>
                        <Botao onClick={() => setSalvarAberto(true)} disabled={!resultadoVisivel}>
                            <Save size={16} /> Salvar simulação
                        </Botao>
                    </>
                }
            />

            {base && (
                <div className="mb-4">
                    <Aviso>
                        Valores carregados da simulação <b>{base.nome}</b>. O custo do material usado agora é o do cadastro
                        atual; a simulação original continua guardada como estava.
                    </Aviso>
                </div>
            )}
            {materiais.length === 0 && (
                <div className="mb-4">
                    <Aviso tipo="alerta">
                        Nenhum material ativo. <Link to="/materiais" className="font-semibold underline">Cadastre um material</Link>{' '}
                        antes de calcular.
                    </Aviso>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-5">
                    <Secao titulo="Identificação" icone={<Tag size={18} />}>
                        <CampoTexto
                            rotulo="Nome da peça"
                            obrigatorio
                            valor={form.nome}
                            aoMudar={set('nome')}
                            erro={errosVisiveis.nome}
                            placeholder="Ex.: Chaveiro personalizado"
                        />
                        <CampoTexto rotulo="Código" valor={form.codigo} aoMudar={set('codigo')} erro={errosVisiveis.codigo} />
                        <CampoTexto
                            rotulo="Descrição"
                            largo
                            valor={form.descricao}
                            aoMudar={set('descricao')}
                            erro={errosVisiveis.descricao}
                        />
                        <CampoNumero
                            rotulo="Quantidade do lote"
                            obrigatorio
                            unidade="un"
                            valor={form.quantidade}
                            aoMudar={set('quantidade')}
                            erro={errosVisiveis.quantidade}
                        />
                    </Secao>

                    <Secao
                        titulo="Material"
                        icone={<Box size={18} />}
                        descricao="As perdas (suportes, purga, testes, falhas) são contadas uma única vez."
                    >
                        <CampoSelecao
                            rotulo="Material"
                            obrigatorio
                            largo
                            vazio="Selecione..."
                            valor={form.materialId}
                            aoMudar={set('materialId')}
                            erro={errosVisiveis.materialId}
                            opcoes={materiais.map((m) => ({
                                valor: m.id,
                                rotulo: `${m.nome}${m.ativo ? '' : ' (inativo)'} — ${formatarMoedaPrecisa(m.custoPorGrama)}/g`,
                            }))}
                        />
                        <EscolhaUnica<MetodoPerda>
                            rotulo="Como informar as perdas"
                            valor={form.metodoPerda}
                            aoMudar={set('metodoPerda')}
                            opcoes={[
                                {
                                    valor: 'PERCENTUAL',
                                    titulo: 'Peso da peça + % de perda',
                                    descricao: 'O sistema acrescenta o percentual ao peso líquido.',
                                },
                                {
                                    valor: 'PESO_TOTAL',
                                    titulo: 'Peso total já com perdas',
                                    descricao: 'Ex.: o peso que o fatiador mostra, com suportes. Nenhum % é somado.',
                                },
                            ]}
                        />
                        <CampoNumero
                            rotulo={form.metodoPerda === 'PERCENTUAL' ? 'Peso líquido por peça' : 'Material consumido por peça (com perdas)'}
                            obrigatorio
                            unidade="g"
                            valor={form.pesoPecaG}
                            aoMudar={set('pesoPecaG')}
                            erro={errosVisiveis.pesoPecaG}
                        />
                        {form.metodoPerda === 'PERCENTUAL' ? (
                            <CampoNumero
                                rotulo="Percentual de perda"
                                unidade="%"
                                valor={form.perdaPct}
                                aoMudar={set('perdaPct')}
                                erro={errosVisiveis.perdaPct}
                            />
                        ) : (
                            <div className="self-center text-xs text-stone-500">O percentual de perda não é aplicado neste método.</div>
                        )}
                        {material && (
                            <p className="text-xs text-stone-500 sm:col-span-2">
                                Custo do material: <b>{formatarMoedaPrecisa(material.custoPorGrama)}</b> por grama (cadastro atual).
                            </p>
                        )}
                    </Secao>

                    <Secao
                        titulo="Impressão"
                        icone={<Clock size={18} />}
                        descricao="Energia é uma estimativa: consumo × horas × tarifa. A manutenção não inclui energia."
                    >
                        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            <CampoNumero
                                rotulo="Tempo por peça"
                                obrigatorio
                                unidade="h"
                                valor={form.impressaoHoras}
                                aoMudar={set('impressaoHoras')}
                                erro={errosVisiveis.impressaoHoras}
                            />
                            <CampoNumero
                                rotulo="e"
                                unidade="min"
                                valor={form.impressaoMinutos}
                                aoMudar={set('impressaoMinutos')}
                                erro={errosVisiveis.impressaoMinutos}
                            />
                        </div>
                        <CampoNumero
                            rotulo="Consumo da impressora"
                            unidade="kW"
                            valor={form.consumoKw}
                            aoMudar={set('consumoKw')}
                            erro={errosVisiveis.consumoKw}
                        />
                        <CampoNumero
                            rotulo="Tarifa de energia"
                            unidade="R$/kWh"
                            valor={form.tarifaKwh}
                            aoMudar={set('tarifaKwh')}
                            erro={errosVisiveis.tarifaKwh}
                        />
                        <CampoNumero
                            rotulo="Manutenção e desgaste"
                            unidade="R$/h"
                            valor={form.manutencaoHora}
                            aoMudar={set('manutencaoHora')}
                            erro={errosVisiveis.manutencaoHora}
                        />
                    </Secao>

                    <Secao
                        titulo="Trabalho humano"
                        icone={<Hammer size={18} />}
                        descricao="A preparação é contada uma vez por pedido; acabamento e montagem, em cada peça."
                    >
                        <CampoNumero
                            rotulo="Custo da hora de trabalho"
                            unidade="R$/h"
                            valor={form.custoHoraTrabalho}
                            aoMudar={set('custoHoraTrabalho')}
                            erro={errosVisiveis.custoHoraTrabalho}
                        />
                        <CampoNumero
                            rotulo="Preparação do arquivo (por pedido)"
                            unidade="min"
                            valor={form.preparacaoMin}
                            aoMudar={set('preparacaoMin')}
                            erro={errosVisiveis.preparacaoMin}
                            ajuda="Modelagem, fatiamento, testes. Não é multiplicado pela quantidade."
                        />
                        <CampoNumero
                            rotulo="Acabamento (por peça)"
                            unidade="min"
                            valor={form.acabamentoMin}
                            aoMudar={set('acabamentoMin')}
                            erro={errosVisiveis.acabamentoMin}
                        />
                        <CampoNumero
                            rotulo="Montagem e embalagem (por peça)"
                            unidade="min"
                            valor={form.montagemEmbalagemMin}
                            aoMudar={set('montagemEmbalagemMin')}
                            erro={errosVisiveis.montagemEmbalagemMin}
                        />
                        <CampoNumero
                            rotulo="Outros custos únicos do pedido"
                            prefixo="R$"
                            valor={form.custoUnicoPedido}
                            aoMudar={set('custoUnicoPedido')}
                            erro={errosVisiveis.custoUnicoPedido}
                            ajuda="Ex.: protótipo, impressão de teste. Entra uma vez no lote."
                            largo
                        />
                    </Secao>

                    <Secao titulo="Outros custos por unidade" icone={<Calculator size={18} />}>
                        <CampoNumero rotulo="Embalagem" prefixo="R$" valor={form.embalagemUnit} aoMudar={set('embalagemUnit')} erro={errosVisiveis.embalagemUnit} />
                        <CampoNumero
                            rotulo="Componentes adicionais"
                            prefixo="R$"
                            valor={form.componentesUnit}
                            aoMudar={set('componentesUnit')}
                            erro={errosVisiveis.componentesUnit}
                            ajuda="Argolas, ímãs, parafusos..."
                        />
                        <CampoNumero
                            rotulo="Serviços terceirizados"
                            prefixo="R$"
                            valor={form.terceirizadosUnit}
                            aoMudar={set('terceirizadosUnit')}
                            erro={errosVisiveis.terceirizadosUnit}
                        />
                        <CampoNumero rotulo="Outros custos" prefixo="R$" valor={form.outrosUnit} aoMudar={set('outrosUnit')} erro={errosVisiveis.outrosUnit} />
                    </Secao>

                    <Secao titulo="Despesas fixas" icone={<Receipt size={18} />}>
                        <EscolhaUnica<MetodoDespesaFixa>
                            rotulo="Alocação nesta simulação"
                            valor={form.metodoDespesaFixa}
                            aoMudar={set('metodoDespesaFixa')}
                            opcoes={[
                                { valor: 'MANUAL', titulo: 'Valor fixo por unidade', descricao: 'Informe quanto cada unidade cobre.' },
                                {
                                    valor: 'RATEIO',
                                    titulo: 'Rateio pelo volume mensal',
                                    descricao: 'Estimativa: despesas do mês ÷ unidades vendidas.',
                                },
                            ]}
                        />
                        {form.metodoDespesaFixa === 'MANUAL' ? (
                            <CampoNumero
                                rotulo="Despesa fixa por unidade"
                                prefixo="R$"
                                valor={form.despesaFixaManualUnit}
                                aoMudar={set('despesaFixaManualUnit')}
                                erro={errosVisiveis.despesaFixaManualUnit}
                            />
                        ) : (
                            <>
                                <CampoNumero
                                    rotulo="Despesas fixas mensais"
                                    prefixo="R$"
                                    valor={form.despesasFixasMensais}
                                    aoMudar={set('despesasFixasMensais')}
                                    erro={errosVisiveis.despesasFixasMensais}
                                />
                                <CampoNumero
                                    rotulo="Unidades vendidas por mês"
                                    unidade="un/mês"
                                    valor={form.unidadesVendidasMes}
                                    aoMudar={set('unidadesVendidasMes')}
                                    erro={errosVisiveis.unidadesVendidasMes}
                                />
                                <p className="text-xs text-stone-500 sm:col-span-2">
                                    Rateio: <b>{rateio === null ? '—' : formatarMoedaPrecisa(rateio, 2)}</b> por unidade. É uma estimativa e
                                    pode distorcer o preço de peças muito diferentes da média.
                                </p>
                            </>
                        )}
                    </Secao>

                    <Secao
                        titulo="Taxas, impostos e margem"
                        icone={<Tag size={18} />}
                        descricao="Percentuais sobre o preço de venda. Ajuste conforme o canal desta venda."
                    >
                        <CampoNumero rotulo="Taxa de venda" unidade="%" valor={form.taxaVendaPct} aoMudar={set('taxaVendaPct')} erro={errosVisiveis.taxaVendaPct} />
                        <CampoNumero rotulo="Impostos sobre vendas" unidade="%" valor={form.impostosPct} aoMudar={set('impostosPct')} erro={errosVisiveis.impostosPct} />
                        <CampoNumero
                            rotulo="Outras despesas variáveis"
                            unidade="%"
                            valor={form.outrasVariaveisPct}
                            aoMudar={set('outrasVariaveisPct')}
                            erro={errosVisiveis.outrasVariaveisPct}
                        />
                        <CampoNumero
                            rotulo="Margem de lucro desejada"
                            unidade="%"
                            valor={form.margemPct}
                            aoMudar={set('margemPct')}
                            erro={errosVisiveis.margemPct}
                            ajuda="Sobre o preço de venda (não é markup)."
                        />
                        <CampoNumero
                            rotulo="Preço de venda atual (opcional)"
                            prefixo="R$"
                            valor={form.precoAtual}
                            aoMudar={set('precoAtual')}
                            erro={errosVisiveis.precoAtual}
                            ajuda="Para comparar com o preço recomendado."
                            largo
                        />
                    </Secao>
                </div>

                <aside id="resultado" className="lg:sticky lg:top-20 lg:self-start">
                    <div className="cartao p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-bold">Resultado</h2>
                            {calculando && <span className="text-xs text-stone-400">calculando…</span>}
                        </div>
                        {resultadoVisivel ? (
                            <ResultadoPainel r={resultadoVisivel} quantidade={quantidade} />
                        ) : (
                            <p className="py-8 text-center text-sm text-stone-500">
                                {Object.keys(errosVisiveis).length
                                    ? 'Corrija os campos destacados para ver o resultado.'
                                    : 'Preencha material, quantidade, peso e tempo de impressão para calcular.'}
                            </p>
                        )}
                    </div>
                </aside>
            </div>

            {/* Resumo fixo no celular */}
            {resultadoVisivel && (
                <a
                    href="#resultado"
                    className="fixed inset-x-3 bottom-[72px] z-30 flex items-center justify-between rounded-2xl bg-stone-900 px-4 py-3 text-white shadow-lg dark:bg-stone-800 lg:hidden"
                >
                    <span className="text-xs text-stone-300">Preço recomendado</span>
                    <span className="font-extrabold">
                        {resultadoVisivel.precoRecomendado === null
                            ? 'Sem preço'
                            : formatarMoeda(resultadoVisivel.precoRecomendado)}
                    </span>
                </a>
            )}

            <Modal
                aberto={salvarAberto}
                titulo="Salvar simulação"
                aoFechar={() => setSalvarAberto(false)}
                rodape={
                    <>
                        <Botao variante="secundario" onClick={() => setSalvarAberto(false)}>
                            Cancelar
                        </Botao>
                        <Botao carregando={salvando} onClick={salvar}>
                            Salvar
                        </Botao>
                    </>
                }
            >
                <div className="space-y-4">
                    <CampoTexto rotulo="Nome da peça" obrigatorio valor={form.nome} aoMudar={set('nome')} erro={errosVisiveis.nome} />
                    <CampoTexto rotulo="Observações" multilinha valor={observacoes} aoMudar={setObservacoes} />
                    <Aviso>
                        Serão guardados todos os valores usados agora (custo do material, tempos, taxas, margem e resultado).
                        Mudanças futuras no cadastro não alteram esta simulação.
                    </Aviso>
                </div>
            </Modal>
        </div>
    );
}
