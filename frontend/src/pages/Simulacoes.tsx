import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, FileDown, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { mensagemErro } from '../services/erro';
import { baixarPdfSimulacao } from '../services/pdf';
import type { Simulacao, SimulacaoResumo } from '../lib/tipos';
import { formatarData, formatarMoeda, formatarNumero } from '../lib/numeros';
import { Aviso, Botao, Cabecalho, Carregando, Confirmacao } from '../components/ui';

export function Simulacoes() {
    const navigate = useNavigate();
    const [lista, setLista] = useState<SimulacaoResumo[] | null>(null);
    const [erroCarga, setErroCarga] = useState<string | null>(null);
    const [busca, setBusca] = useState('');
    const [excluir, setExcluir] = useState<SimulacaoResumo | null>(null);
    const [ocupado, setOcupado] = useState<string | null>(null);

    // Incrementar "versao" recarrega a lista.
    const [versao, setVersao] = useState(0);
    const carregar = () => setVersao((v) => v + 1);

    useEffect(() => {
        api.get<SimulacaoResumo[]>('/simulacoes')
            .then((r) => {
                setLista(r.data);
                setErroCarga(null);
            })
            .catch((err) => setErroCarga(mensagemErro(err, 'Não foi possível carregar as simulações.')));
    }, [versao]);

    async function exportarPdf(s: SimulacaoResumo) {
        setOcupado(s.id);
        try {
            await baixarPdfSimulacao(s.id, s.nome);
        } catch (err) {
            toast.error(mensagemErro(err, 'Não foi possível gerar o PDF.'));
        } finally {
            setOcupado(null);
        }
    }

    async function duplicar(s: SimulacaoResumo) {
        setOcupado(s.id);
        try {
            const r = await api.post<Simulacao>(`/simulacoes/${s.id}/duplicar`);
            toast.success('Simulação duplicada.');
            navigate(`/simulacoes/${r.data.id}`);
        } catch (err) {
            toast.error(mensagemErro(err, 'Não foi possível duplicar.'));
        } finally {
            setOcupado(null);
        }
    }

    async function confirmarExclusao() {
        if (!excluir) return;
        setOcupado(excluir.id);
        try {
            await api.delete(`/simulacoes/${excluir.id}`);
            toast.success('Simulação excluída.');
            setExcluir(null);
            carregar();
        } catch (err) {
            toast.error(mensagemErro(err, 'Não foi possível excluir.'));
        } finally {
            setOcupado(null);
        }
    }

    const termo = busca.trim().toLowerCase();
    const filtradas = (lista ?? []).filter(
        (s) =>
            !termo ||
            [s.nome, s.codigo, s.materialNome, s.observacoes].some((v) => (v ?? '').toLowerCase().includes(termo)),
    );

    return (
        <div>
            <Cabecalho
                titulo="Simulações salvas"
                descricao="Cada simulação guarda os valores da data em que foi salva."
                acoes={
                    <Link to="/calculadora">
                        <Botao>
                            <Plus size={16} /> Nova simulação
                        </Botao>
                    </Link>
                }
            />

            {erroCarga && <Aviso tipo="erro">{erroCarga}</Aviso>}
            {!lista && !erroCarga && <Carregando />}

            {lista && (
                <>
                    {lista.length > 0 && (
                        <div className="relative mb-4 max-w-sm">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar por nome, código ou material"
                                className="campo pl-9"
                            />
                        </div>
                    )}

                    {filtradas.length === 0 ? (
                        <div className="cartao p-10 text-center text-sm text-stone-500">
                            {lista.length === 0 ? (
                                <>
                                    Nenhuma simulação salva ainda.{' '}
                                    <Link to="/calculadora" className="font-semibold text-marca-600 underline">
                                        Abrir a calculadora
                                    </Link>
                                </>
                            ) : (
                                'Nenhuma simulação encontrada para essa busca.'
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtradas.map((s) => (
                                <div key={s.id} className="cartao flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                                    <Link to={`/simulacoes/${s.id}`} className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold hover:text-marca-600">{s.nome}</span>
                                            {s.codigo && (
                                                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                                    {s.codigo}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-xs text-stone-500">
                                            {formatarNumero(s.quantidade, 0)} un · {s.materialNome ?? 'material removido'} · salva em{' '}
                                            {formatarData(s.createdAt)}
                                        </p>
                                    </Link>
                                    <div className="flex items-center gap-4 sm:text-right">
                                        <div>
                                            <div className="text-[11px] text-stone-500">Custo unit.</div>
                                            <div className="text-sm font-semibold tabular-nums">{formatarMoeda(s.custoUnitarioCompleto)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] text-stone-500">Preço recom.</div>
                                            <div className="text-sm font-extrabold tabular-nums text-marca-600 dark:text-marca-300">
                                                {s.precoRecomendadoUnit === null ? 'Sem preço' : formatarMoeda(s.precoRecomendadoUnit)}
                                            </div>
                                        </div>
                                        <div className="ml-auto flex gap-1">
                                            <button
                                                onClick={() => exportarPdf(s)}
                                                disabled={ocupado === s.id}
                                                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-50 dark:hover:bg-stone-800"
                                                title="Exportar PDF"
                                            >
                                                <FileDown size={16} />
                                            </button>
                                            <button
                                                onClick={() => duplicar(s)}
                                                disabled={ocupado === s.id}
                                                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-50 dark:hover:bg-stone-800"
                                                title="Duplicar"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={() => setExcluir(s)}
                                                className="rounded-lg p-2 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <Confirmacao
                aberto={!!excluir}
                titulo="Excluir simulação"
                mensagem={
                    <>
                        Excluir <b>{excluir?.nome}</b>? Essa ação não pode ser desfeita.
                    </>
                }
                rotuloConfirmar="Excluir"
                perigo
                carregando={!!excluir && ocupado === excluir.id}
                aoConfirmar={confirmarExclusao}
                aoCancelar={() => setExcluir(null)}
            />
        </div>
    );
}
