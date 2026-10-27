import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Copy, FileDown, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { errosDeCampo, mensagemErro } from '../services/erro';
import { baixarPdfSimulacao } from '../services/pdf';
import type { Simulacao } from '../lib/tipos';
import {
    formatarData,
    formatarHoras,
    formatarMoeda,
    formatarMoedaPrecisa,
    formatarNumero,
} from '../lib/numeros';
import { Aviso, Botao, CampoTexto, Carregando, Confirmacao, Modal } from '../components/ui';
import { ResultadoPainel } from '../components/ResultadoPainel';

function Item({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
    return (
        <div className="flex justify-between gap-3 border-b border-stone-100 py-1.5 text-sm last:border-0 dark:border-stone-800">
            <span className="text-stone-500 dark:text-stone-400">{rotulo}</span>
            <span className="text-right tabular-nums">{valor}</span>
        </div>
    );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-400">{titulo}</h3>
            {children}
        </div>
    );
}

const pct = (v: number | null) => (v === null || v === undefined ? '—' : `${formatarNumero(v, 4)}%`);
const min = (v: number | null) => (v === null || v === undefined ? '—' : `${formatarNumero(v, 2)} min`);

export function SimulacaoDetalhe() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [s, setS] = useState<Simulacao | null>(null);
    const [erroCarga, setErroCarga] = useState<string | null>(null);
    const [editar, setEditar] = useState(false);
    const [form, setForm] = useState({ nome: '', observacoes: '' });
    const [erros, setErros] = useState<Record<string, string>>({});
    const [salvando, setSalvando] = useState(false);
    const [excluir, setExcluir] = useState(false);
    const [ocupado, setOcupado] = useState(false);
    const [gerandoPdf, setGerandoPdf] = useState(false);

    useEffect(() => {
        api.get<Simulacao>(`/simulacoes/${id}`)
            .then((r) => setS(r.data))
            .catch((err) => setErroCarga(mensagemErro(err, 'Não foi possível carregar a simulação.')));
    }, [id]);

    if (erroCarga) return <Aviso tipo="erro">{erroCarga}</Aviso>;
    if (!s) return <Carregando />;

    const e = s.snapshot.entrada;
    const m = s.snapshot.material;
    const d = s.snapshot.despesaFixa;

    async function salvarEdicao() {
        setSalvando(true);
        try {
            const r = await api.patch<Simulacao>(`/simulacoes/${id}`, {
                nome: form.nome,
                observacoes: form.observacoes || null,
            });
            setS(r.data);
            setEditar(false);
            toast.success('Simulação atualizada.');
        } catch (err) {
            setErros(errosDeCampo(err));
            toast.error(mensagemErro(err, 'Não foi possível salvar.'));
        } finally {
            setSalvando(false);
        }
    }

    async function exportarPdf() {
        if (!s) return;
        setGerandoPdf(true);
        try {
            await baixarPdfSimulacao(s.id, s.nome);
        } catch (err) {
            toast.error(mensagemErro(err, 'Não foi possível gerar o PDF.'));
        } finally {
            setGerandoPdf(false);
        }
    }

    async function duplicar() {
        setOcupado(true);
        try {
            const r = await api.post<Simulacao>(`/simulacoes/${id}/duplicar`);
            toast.success('Simulação duplicada.');
            setS(r.data);
            navigate(`/simulacoes/${r.data.id}`);
        } catch (err) {
            toast.error(mensagemErro(err, 'Não foi possível duplicar.'));
        } finally {
            setOcupado(false);
        }
    }

    async function confirmarExclusao() {
        setOcupado(true);
        try {
            await api.delete(`/simulacoes/${id}`);
            toast.success('Simulação excluída.');
            navigate('/simulacoes');
        } catch (err) {
            toast.error(mensagemErro(err, 'Não foi possível excluir.'));
            setOcupado(false);
        }
    }

    return (
        <div className="space-y-5">
            <Link to="/simulacoes" className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-marca-600">
                <ArrowLeft size={16} /> Simulações salvas
            </Link>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">{s.nome}</h1>
                    <p className="mt-1 text-sm text-stone-500">
                        {s.codigo && <>{s.codigo} · </>}
                        Salva em {formatarData(s.createdAt)}
                        {s.updatedAt !== s.createdAt && <> · nome/observações editados em {formatarData(s.updatedAt)}</>}
                    </p>
                    {s.observacoes && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm">{s.observacoes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Botao onClick={exportarPdf} carregando={gerandoPdf}>
                        <FileDown size={16} /> Exportar PDF
                    </Botao>
                    <Botao
                        variante="secundario"
                        onClick={() => {
                            setForm({ nome: s.nome, observacoes: s.observacoes ?? '' });
                            setErros({});
                            setEditar(true);
                        }}
                    >
                        <Pencil size={16} /> Editar nome
                    </Botao>
                    <Botao variante="secundario" onClick={duplicar} carregando={ocupado && !excluir}>
                        <Copy size={16} /> Duplicar
                    </Botao>
                    <Botao variante="secundario" onClick={() => navigate('/calculadora', { state: { base: s } })}>
                        <Calculator size={16} /> Usar como base
                    </Botao>
                    <Botao variante="fantasma" onClick={() => setExcluir(true)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <Trash2 size={16} /> Excluir
                    </Botao>
                </div>
            </div>

            <Aviso>
                Valores congelados em {formatarData(s.snapshot.calculadoEm)}. Alterações posteriores no material ou nas
                configurações não mudam esta simulação.
            </Aviso>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="cartao space-y-5 p-5">
                    <h2 className="font-bold">Valores utilizados</h2>

                    {s.snapshot.identificacao.descricao && (
                        <p className="text-sm text-stone-600 dark:text-stone-300">{s.snapshot.identificacao.descricao}</p>
                    )}

                    <Grupo titulo="Material">
                        <Item rotulo="Material" valor={m.nome} />
                        <Item rotulo="Tipo / cor" valor={`${m.tipo} · ${m.cor}`} />
                        <Item rotulo="Peso líquido do rolo" valor={`${formatarNumero(m.pesoLiquidoG, 3)} g`} />
                        <Item rotulo="Preço do rolo" valor={formatarMoeda(m.precoRolo)} />
                        <Item
                            rotulo="Frete de aquisição"
                            valor={`${formatarMoeda(m.freteAquisicao)}${m.freteIncluidoNoPreco ? ' (já incluso no preço)' : ''}`}
                        />
                        <Item rotulo="Custo por grama" valor={formatarMoedaPrecisa(m.custoPorGrama, 6)} />
                    </Grupo>

                    <Grupo titulo="Peça">
                        <Item rotulo="Quantidade do lote" valor={`${formatarNumero(e.quantidade, 0)} un`} />
                        <Item
                            rotulo="Método de perda"
                            valor={e.metodoPerda === 'PERCENTUAL' ? 'Peso líquido + % de perda' : 'Peso total já com perdas'}
                        />
                        <Item rotulo="Peso informado por peça" valor={`${formatarNumero(e.pesoPecaG, 3)} g`} />
                        {e.metodoPerda === 'PERCENTUAL' && <Item rotulo="Perda" valor={pct(e.perdaPct ?? 0)} />}
                        <Item rotulo="Tempo de impressão por peça" valor={formatarHoras(e.tempoImpressaoMin / 60)} />
                    </Grupo>

                    <Grupo titulo="Energia, máquina e trabalho">
                        <Item rotulo="Consumo da impressora" valor={`${formatarNumero(e.consumoKw ?? 0, 4)} kW`} />
                        <Item rotulo="Tarifa de energia" valor={`${formatarMoedaPrecisa(e.tarifaKwh ?? 0, 4)}/kWh`} />
                        <Item rotulo="Manutenção e desgaste" valor={`${formatarMoedaPrecisa(e.manutencaoHora ?? 0, 4)}/h`} />
                        <Item rotulo="Hora de trabalho" valor={`${formatarMoedaPrecisa(e.custoHoraTrabalho ?? 0, 4)}/h`} />
                        <Item rotulo="Preparação (por pedido)" valor={min(e.preparacaoMin ?? 0)} />
                        <Item rotulo="Acabamento (por peça)" valor={min(e.acabamentoMin ?? 0)} />
                        <Item rotulo="Montagem e embalagem (por peça)" valor={min(e.montagemEmbalagemMin ?? 0)} />
                        <Item rotulo="Custos únicos do pedido" valor={formatarMoeda(e.custoUnicoPedido ?? 0)} />
                    </Grupo>

                    <Grupo titulo="Outros custos por unidade">
                        <Item rotulo="Embalagem" valor={formatarMoeda(e.embalagemUnit ?? 0)} />
                        <Item rotulo="Componentes" valor={formatarMoeda(e.componentesUnit ?? 0)} />
                        <Item rotulo="Terceirizados" valor={formatarMoeda(e.terceirizadosUnit ?? 0)} />
                        <Item rotulo="Outros" valor={formatarMoeda(e.outrosUnit ?? 0)} />
                    </Grupo>

                    <Grupo titulo="Despesas fixas">
                        {d.metodo === 'MANUAL' ? (
                            <Item rotulo="Método" valor="Valor fixo por unidade" />
                        ) : (
                            <>
                                <Item rotulo="Método" valor="Rateio pelo volume mensal (estimativa)" />
                                <Item rotulo="Despesas fixas mensais" valor={formatarMoeda(d.despesasMensais ?? 0)} />
                                <Item rotulo="Unidades por mês" valor={formatarNumero(d.unidadesMes ?? 0, 0)} />
                            </>
                        )}
                        <Item rotulo="Despesa fixa por unidade" valor={formatarMoedaPrecisa(d.valorUnit, 4)} />
                    </Grupo>

                    <Grupo titulo="Percentuais sobre o preço">
                        <Item rotulo="Taxa de venda" valor={pct(e.taxaVendaPct ?? 0)} />
                        <Item rotulo="Impostos" valor={pct(e.impostosPct ?? 0)} />
                        <Item rotulo="Outras despesas variáveis" valor={pct(e.outrasVariaveisPct ?? 0)} />
                        <Item rotulo="Margem desejada" valor={pct(e.margemPct ?? 0)} />
                        <Item rotulo="Preço atual informado" valor={e.precoAtual ? formatarMoeda(e.precoAtual) : '—'} />
                    </Grupo>
                </div>

                <aside className="lg:sticky lg:top-20 lg:self-start">
                    <div className="cartao p-5">
                        <h2 className="mb-3 font-bold">Resultado salvo</h2>
                        <ResultadoPainel r={s.resultado} quantidade={s.quantidade} />
                    </div>
                </aside>
            </div>

            <Modal
                aberto={editar}
                titulo="Editar nome e observações"
                aoFechar={() => setEditar(false)}
                rodape={
                    <>
                        <Botao variante="secundario" onClick={() => setEditar(false)}>
                            Cancelar
                        </Botao>
                        <Botao carregando={salvando} onClick={salvarEdicao}>
                            Salvar
                        </Botao>
                    </>
                }
            >
                <div className="space-y-4">
                    <CampoTexto
                        rotulo="Nome"
                        obrigatorio
                        valor={form.nome}
                        aoMudar={(v) => setForm((f) => ({ ...f, nome: v }))}
                        erro={erros.nome}
                    />
                    <CampoTexto
                        rotulo="Observações"
                        multilinha
                        valor={form.observacoes}
                        aoMudar={(v) => setForm((f) => ({ ...f, observacoes: v }))}
                        erro={erros.observacoes}
                    />
                    <p className="text-xs text-stone-500">
                        Os valores do cálculo não podem ser editados. Para mudar algo, use “Usar como base” e salve uma nova
                        simulação.
                    </p>
                </div>
            </Modal>

            <Confirmacao
                aberto={excluir}
                titulo="Excluir simulação"
                mensagem={
                    <>
                        Excluir <b>{s.nome}</b>? Essa ação não pode ser desfeita.
                    </>
                }
                rotuloConfirmar="Excluir"
                perigo
                carregando={ocupado}
                aoConfirmar={confirmarExclusao}
                aoCancelar={() => setExcluir(false)}
            />
        </div>
    );
}
