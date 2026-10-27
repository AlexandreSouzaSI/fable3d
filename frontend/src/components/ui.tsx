import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, Info, LoaderCircle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Estrutura
// ---------------------------------------------------------------------------

export function Cabecalho({
    titulo,
    descricao,
    acoes,
}: {
    titulo: string;
    descricao?: ReactNode;
    acoes?: ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">{titulo}</h1>
                {descricao && <p className="mt-1 max-w-2xl text-sm text-stone-500 dark:text-stone-400">{descricao}</p>}
            </div>
            {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
        </div>
    );
}

export function Secao({
    titulo,
    descricao,
    children,
    icone,
}: {
    titulo: string;
    descricao?: ReactNode;
    children: ReactNode;
    icone?: ReactNode;
}) {
    return (
        <section className="cartao p-5">
            <div className="mb-4 flex items-start gap-3">
                {icone && (
                    <div className="mt-0.5 rounded-xl bg-marca-50 p-2 text-marca-600 dark:bg-marca-500/10 dark:text-marca-300">
                        {icone}
                    </div>
                )}
                <div>
                    <h2 className="font-bold">{titulo}</h2>
                    {descricao && <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{descricao}</p>}
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </section>
    );
}

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
            <LoaderCircle size={18} className="animate-spin" /> {texto}
        </div>
    );
}

export function Aviso({
    tipo = 'info',
    children,
}: {
    tipo?: 'info' | 'alerta' | 'erro';
    children: ReactNode;
}) {
    const estilos = {
        info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
        alerta: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
        erro: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
    }[tipo];
    const Icone = tipo === 'info' ? Info : AlertTriangle;
    return (
        <div className={`flex gap-2 rounded-xl border px-3 py-2.5 text-sm ${estilos}`}>
            <Icone size={16} className="mt-0.5 shrink-0" />
            <div>{children}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma';

export function Botao({
    variante = 'primario',
    carregando,
    children,
    className = '',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao; carregando?: boolean }) {
    const estilos = {
        primario: 'bg-marca-500 text-white hover:bg-marca-600 shadow-sm',
        secundario:
            'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800',
        perigo: 'bg-red-600 text-white hover:bg-red-700',
        fantasma: 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
    }[variante];
    return (
        <button
            {...props}
            disabled={props.disabled || carregando}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${estilos} ${className}`}
        >
            {carregando && <LoaderCircle size={16} className="animate-spin" />}
            {children}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Campos
// ---------------------------------------------------------------------------

function Rotulo({ id, texto, obrigatorio }: { id: string; texto: string; obrigatorio?: boolean }) {
    return (
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
            {texto}
            {obrigatorio && <span className="text-marca-600"> *</span>}
        </label>
    );
}

function Rodape({ ajuda, erro }: { ajuda?: ReactNode; erro?: string }) {
    if (erro) return <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{erro}</p>;
    if (ajuda) return <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{ajuda}</p>;
    return null;
}

/**
 * Campo numérico em texto (aceita vírgula). Mostra a unidade à direita
 * e, ao sair do campo, normaliza a escrita ("0.9" → "0,9").
 */
export function CampoNumero({
    rotulo,
    valor,
    aoMudar,
    unidade,
    prefixo,
    ajuda,
    erro,
    obrigatorio,
    placeholder,
    largo,
    desabilitado,
}: {
    rotulo: string;
    valor: string;
    aoMudar: (v: string) => void;
    unidade?: string;
    prefixo?: string;
    ajuda?: ReactNode;
    erro?: string;
    obrigatorio?: boolean;
    placeholder?: string;
    largo?: boolean;
    desabilitado?: boolean;
}) {
    const id = useId();
    return (
        <div className={largo ? 'sm:col-span-2' : ''}>
            <Rotulo id={id} texto={rotulo} obrigatorio={obrigatorio} />
            <div className="relative">
                {prefixo && (
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">
                        {prefixo}
                    </span>
                )}
                <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={valor}
                    disabled={desabilitado}
                    placeholder={placeholder ?? '0'}
                    onChange={(e) => aoMudar(e.target.value)}
                    onBlur={() => {
                        // Normaliza "1234.5" → "1234,5" para deixar claro o que foi lido.
                        if (/^\s*-?\d+\.\d+\s*$/.test(valor)) aoMudar(valor.trim().replace('.', ','));
                    }}
                    className={`campo ${prefixo ? 'pl-10' : ''} ${unidade ? 'pr-16' : ''} ${erro ? 'campo-erro' : ''}`}
                    aria-invalid={!!erro}
                />
                {unidade && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400">
                        {unidade}
                    </span>
                )}
            </div>
            <Rodape ajuda={ajuda} erro={erro} />
        </div>
    );
}

export function CampoTexto({
    rotulo,
    valor,
    aoMudar,
    ajuda,
    erro,
    obrigatorio,
    placeholder,
    largo,
    multilinha,
}: {
    rotulo: string;
    valor: string;
    aoMudar: (v: string) => void;
    ajuda?: ReactNode;
    erro?: string;
    obrigatorio?: boolean;
    placeholder?: string;
    largo?: boolean;
    multilinha?: boolean;
}) {
    const id = useId();
    const classe = `campo ${erro ? 'campo-erro' : ''}`;
    return (
        <div className={largo ? 'sm:col-span-2' : ''}>
            <Rotulo id={id} texto={rotulo} obrigatorio={obrigatorio} />
            {multilinha ? (
                <textarea
                    id={id}
                    rows={3}
                    value={valor}
                    placeholder={placeholder}
                    onChange={(e) => aoMudar(e.target.value)}
                    className={classe}
                />
            ) : (
                <input
                    id={id}
                    type="text"
                    value={valor}
                    placeholder={placeholder}
                    onChange={(e) => aoMudar(e.target.value)}
                    className={classe}
                    aria-invalid={!!erro}
                />
            )}
            <Rodape ajuda={ajuda} erro={erro} />
        </div>
    );
}

export function CampoSelecao({
    rotulo,
    valor,
    aoMudar,
    opcoes,
    ajuda,
    erro,
    obrigatorio,
    largo,
    vazio,
}: {
    rotulo: string;
    valor: string;
    aoMudar: (v: string) => void;
    opcoes: Array<{ valor: string; rotulo: string }>;
    ajuda?: ReactNode;
    erro?: string;
    obrigatorio?: boolean;
    largo?: boolean;
    vazio?: string;
}) {
    const id = useId();
    return (
        <div className={largo ? 'sm:col-span-2' : ''}>
            <Rotulo id={id} texto={rotulo} obrigatorio={obrigatorio} />
            <select
                id={id}
                value={valor}
                onChange={(e) => aoMudar(e.target.value)}
                className={`campo ${erro ? 'campo-erro' : ''}`}
            >
                {vazio !== undefined && <option value="">{vazio}</option>}
                {opcoes.map((o) => (
                    <option key={o.valor} value={o.valor}>
                        {o.rotulo}
                    </option>
                ))}
            </select>
            <Rodape ajuda={ajuda} erro={erro} />
        </div>
    );
}

/** Grupo de opções exclusivas, em cartões clicáveis. */
export function EscolhaUnica<T extends string>({
    rotulo,
    valor,
    aoMudar,
    opcoes,
}: {
    rotulo: string;
    valor: T;
    aoMudar: (v: T) => void;
    opcoes: Array<{ valor: T; titulo: string; descricao: string }>;
}) {
    const nome = useId();
    return (
        <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">{rotulo}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
                {opcoes.map((o) => {
                    const ativo = o.valor === valor;
                    return (
                        <label
                            key={o.valor}
                            className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${
                                ativo
                                    ? 'border-marca-400 bg-marca-50 dark:border-marca-500/60 dark:bg-marca-500/10'
                                    : 'border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800/50'
                            }`}
                        >
                            <input
                                type="radio"
                                name={nome}
                                checked={ativo}
                                onChange={() => aoMudar(o.valor)}
                                className="mt-1 accent-marca-500"
                            />
                            <span>
                                <span className="block font-semibold">{o.titulo}</span>
                                <span className="block text-xs text-stone-500 dark:text-stone-400">{o.descricao}</span>
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}

export function Interruptor({
    rotulo,
    ajuda,
    marcado,
    aoMudar,
    largo,
}: {
    rotulo: string;
    ajuda?: ReactNode;
    marcado: boolean;
    aoMudar: (v: boolean) => void;
    largo?: boolean;
}) {
    return (
        <label className={`flex cursor-pointer items-start gap-3 ${largo ? 'sm:col-span-2' : ''}`}>
            <input
                type="checkbox"
                checked={marcado}
                onChange={(e) => aoMudar(e.target.checked)}
                className="mt-1 h-4 w-4 accent-marca-500"
            />
            <span className="text-sm">
                <span className="font-semibold">{rotulo}</span>
                {ajuda && <span className="block text-xs text-stone-500 dark:text-stone-400">{ajuda}</span>}
            </span>
        </label>
    );
}

// ---------------------------------------------------------------------------
// Janelas
// ---------------------------------------------------------------------------

export function Modal({
    aberto,
    titulo,
    aoFechar,
    children,
    rodape,
    largura = 'max-w-lg',
}: {
    aberto: boolean;
    titulo: string;
    aoFechar: () => void;
    children: ReactNode;
    rodape?: ReactNode;
    largura?: string;
}) {
    useEffect(() => {
        if (!aberto) return;
        const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, [aberto, aoFechar]);

    if (!aberto) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-4">
            <div
                role="dialog"
                aria-modal="true"
                className={`flex max-h-[92vh] w-full ${largura} flex-col rounded-t-2xl bg-white shadow-xl dark:bg-stone-900 sm:rounded-2xl`}
            >
                <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
                    <h2 className="text-lg font-bold">{titulo}</h2>
                    <button
                        onClick={aoFechar}
                        className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                        aria-label="Fechar"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
                {rodape && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 px-5 py-3 dark:border-stone-800">
                        {rodape}
                    </div>
                )}
            </div>
        </div>
    );
}

export function Confirmacao({
    aberto,
    titulo,
    mensagem,
    rotuloConfirmar = 'Confirmar',
    perigo,
    carregando,
    aoConfirmar,
    aoCancelar,
}: {
    aberto: boolean;
    titulo: string;
    mensagem: ReactNode;
    rotuloConfirmar?: string;
    perigo?: boolean;
    carregando?: boolean;
    aoConfirmar: () => void;
    aoCancelar: () => void;
}) {
    return (
        <Modal
            aberto={aberto}
            titulo={titulo}
            aoFechar={aoCancelar}
            largura="max-w-md"
            rodape={
                <>
                    <Botao variante="secundario" onClick={aoCancelar}>
                        Cancelar
                    </Botao>
                    <Botao variante={perigo ? 'perigo' : 'primario'} carregando={carregando} onClick={aoConfirmar}>
                        {rotuloConfirmar}
                    </Botao>
                </>
            }
        >
            <div className="text-sm text-stone-600 dark:text-stone-300">{mensagem}</div>
        </Modal>
    );
}
