import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { errosDeCampo, mensagemErro } from '../services/erro';
import type { Material } from '../lib/tipos';
import { formatarMoeda, formatarMoedaPrecisa, formatarNumero, lerNumero, paraCampo } from '../lib/numeros';
import {
    Aviso,
    Botao,
    Cabecalho,
    CampoNumero,
    CampoSelecao,
    CampoTexto,
    Carregando,
    Interruptor,
    Modal,
} from '../components/ui';

const TIPOS = ['PLA', 'PLA+', 'PLA Silk', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resina', 'Outro'];

type Form = {
    nome: string;
    fabricante: string;
    tipo: string;
    cor: string;
    pesoLiquidoG: string;
    precoRolo: string;
    freteAquisicao: string;
    freteIncluidoNoPreco: boolean;
    observacoes: string;
    ativo: boolean;
};

const VAZIO: Form = {
    nome: '',
    fabricante: '',
    tipo: 'PLA',
    cor: '',
    pesoLiquidoG: '1000',
    precoRolo: '',
    freteAquisicao: '',
    freteIncluidoNoPreco: false,
    observacoes: '',
    ativo: true,
};

function deMaterial(m: Material): Form {
    return {
        nome: m.nome,
        fabricante: m.fabricante ?? '',
        tipo: m.tipo,
        cor: m.cor,
        pesoLiquidoG: paraCampo(m.pesoLiquidoG),
        precoRolo: paraCampo(m.precoRolo),
        freteAquisicao: m.freteAquisicao ? paraCampo(m.freteAquisicao) : '',
        freteIncluidoNoPreco: m.freteIncluidoNoPreco,
        observacoes: m.observacoes ?? '',
        ativo: m.ativo,
    };
}

export function Materiais() {
    const [lista, setLista] = useState<Material[] | null>(null);
    const [erroCarga, setErroCarga] = useState<string | null>(null);
    const [mostrarInativos, setMostrarInativos] = useState(false);
    const [editando, setEditando] = useState<Material | 'novo' | null>(null);

    // Incrementar "versao" recarrega a lista.
    const [versao, setVersao] = useState(0);
    const carregar = () => setVersao((v) => v + 1);

    useEffect(() => {
        api.get<Material[]>('/materiais')
            .then((r) => {
                setLista(r.data);
                setErroCarga(null);
            })
            .catch((err) => setErroCarga(mensagemErro(err, 'Não foi possível carregar os materiais.')));
    }, [versao]);

    const visiveis = (lista ?? []).filter((m) => mostrarInativos || m.ativo);
    const inativos = (lista ?? []).filter((m) => !m.ativo).length;

    return (
        <div>
            <Cabecalho
                titulo="Materiais"
                descricao="Filamentos usados nas peças. O custo por grama é calculado a partir do preço e do peso líquido do rolo."
                acoes={
                    <Botao onClick={() => setEditando('novo')}>
                        <Plus size={16} /> Novo material
                    </Botao>
                }
            />

            {erroCarga && <Aviso tipo="erro">{erroCarga}</Aviso>}
            {!lista && !erroCarga && <Carregando />}

            {lista && (
                <>
                    {inativos > 0 && (
                        <label className="mb-3 inline-flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                            <input
                                type="checkbox"
                                className="accent-marca-500"
                                checked={mostrarInativos}
                                onChange={(e) => setMostrarInativos(e.target.checked)}
                            />
                            Mostrar inativos ({inativos})
                        </label>
                    )}

                    {visiveis.length === 0 ? (
                        <div className="cartao p-10 text-center text-sm text-stone-500">
                            Nenhum material cadastrado ainda. Clique em <b>Novo material</b> para começar.
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {visiveis.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setEditando(m)}
                                    className={`cartao flex items-start gap-4 p-4 text-left transition hover:border-marca-300 ${
                                        m.ativo ? '' : 'opacity-60'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold">{m.nome}</span>
                                            {!m.ativo && (
                                                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                                    Inativo
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                                            {[m.tipo, m.cor, m.fabricante].filter(Boolean).join(' · ')}
                                        </p>
                                        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                                            Rolo {formatarNumero(m.pesoLiquidoG, 0)} g · {formatarMoeda(m.precoRolo)}
                                            {m.freteAquisicao > 0 &&
                                                (m.freteIncluidoNoPreco
                                                    ? ' (frete incluso)'
                                                    : ` + ${formatarMoeda(m.freteAquisicao)} de frete`)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-stone-500">Custo por grama</div>
                                        <div className="text-lg font-extrabold text-marca-600 dark:text-marca-300">
                                            {formatarMoedaPrecisa(m.custoPorGrama)}
                                        </div>
                                        <Pencil size={14} className="ml-auto mt-2 text-stone-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {editando && (
                <FormMaterial
                    material={editando === 'novo' ? null : editando}
                    aoFechar={() => setEditando(null)}
                    aoSalvar={() => {
                        setEditando(null);
                        carregar();
                    }}
                />
            )}
        </div>
    );
}

function FormMaterial({
    material,
    aoFechar,
    aoSalvar,
}: {
    material: Material | null;
    aoFechar: () => void;
    aoSalvar: () => void;
}) {
    const [form, setForm] = useState<Form>(material ? deMaterial(material) : VAZIO);
    const [erros, setErros] = useState<Record<string, string>>({});
    const [salvando, setSalvando] = useState(false);
    const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

    const peso = lerNumero(form.pesoLiquidoG);
    const preco = lerNumero(form.precoRolo);
    const frete = lerNumero(form.freteAquisicao) ?? 0;
    const previa =
        peso && peso > 0 && preco !== null && preco >= 0 && Number.isFinite(frete) && frete >= 0
            ? (preco + (form.freteIncluidoNoPreco ? 0 : frete)) / peso
            : null;

    async function salvar() {
        const locais: Record<string, string> = {};
        const numeros: Record<string, number | null> = {};
        for (const campo of ['pesoLiquidoG', 'precoRolo', 'freteAquisicao'] as const) {
            const v = lerNumero(form[campo]);
            if (v !== null && Number.isNaN(v)) locais[campo] = 'Número inválido. Use vírgula para decimais.';
            numeros[campo] = v;
        }
        if (Object.keys(locais).length) {
            setErros(locais);
            return;
        }
        setSalvando(true);
        try {
            const corpo = {
                ...form,
                ...numeros,
                fabricante: form.fabricante || null,
                observacoes: form.observacoes || null,
            };
            if (material) await api.put(`/materiais/${material.id}`, corpo);
            else await api.post('/materiais', corpo);
            toast.success(material ? 'Material atualizado.' : 'Material cadastrado.');
            aoSalvar();
        } catch (err) {
            setErros(errosDeCampo(err));
            toast.error(mensagemErro(err, 'Não foi possível salvar o material.'));
        } finally {
            setSalvando(false);
        }
    }

    const opcoesTipo = TIPOS.includes(form.tipo) ? TIPOS : [form.tipo, ...TIPOS];

    return (
        <Modal
            aberto
            titulo={material ? 'Editar material' : 'Novo material'}
            aoFechar={aoFechar}
            largura="max-w-2xl"
            rodape={
                <>
                    <Botao variante="secundario" onClick={aoFechar}>
                        Cancelar
                    </Botao>
                    <Botao carregando={salvando} onClick={salvar}>
                        Salvar
                    </Botao>
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                    rotulo="Nome do material"
                    obrigatorio
                    largo
                    valor={form.nome}
                    aoMudar={set('nome')}
                    erro={erros.nome}
                    placeholder="Ex.: PLA Branco Fosco"
                />
                <CampoTexto
                    rotulo="Fabricante ou marca"
                    valor={form.fabricante}
                    aoMudar={set('fabricante')}
                    erro={erros.fabricante}
                />
                <CampoSelecao
                    rotulo="Tipo de material"
                    obrigatorio
                    valor={form.tipo}
                    aoMudar={set('tipo')}
                    opcoes={opcoesTipo.map((t) => ({ valor: t, rotulo: t }))}
                    erro={erros.tipo}
                />
                <CampoTexto rotulo="Cor" obrigatorio valor={form.cor} aoMudar={set('cor')} erro={erros.cor} />
                <CampoNumero
                    rotulo="Peso líquido do filamento"
                    obrigatorio
                    unidade="g"
                    valor={form.pesoLiquidoG}
                    aoMudar={set('pesoLiquidoG')}
                    erro={erros.pesoLiquidoG}
                    ajuda="Só o filamento, sem o carretel. Um rolo de 1 kg = 1000 g."
                />
                <CampoNumero
                    rotulo="Preço de compra do rolo"
                    obrigatorio
                    prefixo="R$"
                    valor={form.precoRolo}
                    aoMudar={set('precoRolo')}
                    erro={erros.precoRolo}
                />
                <CampoNumero
                    rotulo="Frete de aquisição"
                    prefixo="R$"
                    valor={form.freteAquisicao}
                    aoMudar={set('freteAquisicao')}
                    erro={erros.freteAquisicao}
                    ajuda="Valor do frete atribuído a este rolo, se houver."
                />
                <div className="flex items-end">
                    <Interruptor
                        rotulo="O frete já está incluído no preço do rolo"
                        ajuda="Marque se o preço acima já veio com frete. Assim o frete não é somado de novo."
                        marcado={form.freteIncluidoNoPreco}
                        aoMudar={set('freteIncluidoNoPreco')}
                    />
                </div>
                <CampoTexto
                    rotulo="Observações"
                    largo
                    multilinha
                    valor={form.observacoes}
                    aoMudar={set('observacoes')}
                    erro={erros.observacoes}
                />
                <Interruptor
                    rotulo="Material ativo"
                    ajuda="Materiais inativos não aparecem na calculadora, mas continuam nas simulações antigas."
                    marcado={form.ativo}
                    aoMudar={set('ativo')}
                    largo
                />
                <div className="sm:col-span-2">
                    <Aviso>
                        <b>Custo por grama</b> = (preço do rolo + frete) ÷ peso líquido.
                        {form.freteIncluidoNoPreco && ' Como o frete já está no preço, ele não é somado.'}
                        <br />
                        Prévia: <b>{previa === null ? '—' : `${formatarMoedaPrecisa(previa)} por grama`}</b>
                    </Aviso>
                </div>
            </div>
        </Modal>
    );
}
