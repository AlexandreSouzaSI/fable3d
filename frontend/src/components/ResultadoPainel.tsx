import type { ReactNode } from 'react';
import type { ResultadoCalculo } from '../lib/tipos';
import { formatarHoras, formatarMoeda, formatarNumero, formatarPercentual } from '../lib/numeros';
import { Aviso } from './ui';

function Linha({ rotulo, valor, forte, dica }: { rotulo: ReactNode; valor: ReactNode; forte?: boolean; dica?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
            <span className="text-stone-500 dark:text-stone-400" title={dica}>
                {rotulo}
            </span>
            <span className={`tabular-nums ${forte ? 'font-bold text-stone-900 dark:text-white' : ''}`}>{valor}</span>
        </div>
    );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <div className="border-t border-stone-100 pt-3 dark:border-stone-800">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-400">{titulo}</h3>
            {children}
        </div>
    );
}

const ROTULO_TIPO = { UNIDADE: 'por peça', PEDIDO: 'único do pedido', FIXA: 'despesa fixa' } as const;

export function ResultadoPainel({ r, quantidade }: { r: ResultadoCalculo; quantidade: number }) {
    const c = r.comparacao;
    return (
        <div className="space-y-4">
            {r.avisos.map((a) => (
                <Aviso key={a} tipo="erro">
                    {a}
                </Aviso>
            ))}

            <div className="rounded-2xl bg-marca-50 p-4 dark:bg-marca-500/10">
                <div className="text-xs font-bold uppercase tracking-wider text-marca-700 dark:text-marca-300">
                    Preço recomendado por unidade
                </div>
                <div className="mt-1 text-3xl font-extrabold tabular-nums text-marca-700 dark:text-marca-200">
                    {r.precoRecomendado === null ? 'Sem preço' : formatarMoeda(r.precoRecomendado)}
                </div>
                <div className="mt-1 text-xs text-marca-800/70 dark:text-marca-200/70">
                    Margem desejada de {formatarPercentual(r.margemDesejada)} sobre o preço · despesas variáveis de{' '}
                    {formatarPercentual(r.percentualVariavel)}
                </div>
            </div>

            <div>
                <Linha
                    rotulo="Preço mínimo (equilíbrio, sem lucro)"
                    valor={formatarMoeda(r.precoEquilibrio)}
                    forte
                    dica="Cobre custos, despesa fixa alocada e despesas variáveis, com lucro zero."
                />
                <Linha rotulo="Custo de fabricação por unidade" valor={formatarMoeda(r.custoFabricacaoUnit)} />
                <Linha rotulo="Despesa fixa alocada por unidade" valor={formatarMoeda(r.despesaFixaLote / quantidade)} />
                <Linha rotulo="Custo unitário completo" valor={formatarMoeda(r.custoUnitarioCompleto)} forte />
            </div>

            <Bloco titulo={`Lote de ${formatarNumero(quantidade, 0)} un.`}>
                <Linha rotulo="Custo total do lote" valor={formatarMoeda(r.custoTotalLote)} forte />
                <Linha rotulo="Receita bruta (preço recomendado)" valor={formatarMoeda(r.receitaLote)} />
                <Linha rotulo="Despesas variáveis estimadas" valor={formatarMoeda(r.despesasVariaveisLote)} />
                <Linha rotulo="Lucro estimado do lote" valor={formatarMoeda(r.lucroLote)} forte />
                <Linha rotulo="Lucro estimado por unidade" valor={formatarMoeda(r.lucroUnit)} />
                <Linha rotulo="Margem sobre a receita" valor={formatarPercentual(r.margemSobreReceita)} />
                <Linha
                    rotulo="Markup sobre o custo (referência)"
                    valor={formatarPercentual(r.markupSobreCusto)}
                    dica="Quanto o preço está acima do custo unitário completo. É diferente da margem sobre vendas."
                />
            </Bloco>

            {c && (
                <Bloco titulo="Preço atual informado">
                    <Linha rotulo="Preço atual" valor={formatarMoeda(c.precoAtual)} forte />
                    <Linha rotulo="Lucro por unidade a esse preço" valor={formatarMoeda(c.lucroUnit)} />
                    <Linha rotulo="Margem sobre a receita" valor={formatarPercentual(c.margemSobreReceita)} />
                    <Linha
                        rotulo="Diferença para o recomendado"
                        valor={c.diferencaParaRecomendado === null ? '—' : formatarMoeda(c.diferencaParaRecomendado)}
                    />
                    {c.abaixoDoEquilibrio && (
                        <div className="mt-2">
                            <Aviso tipo="alerta">O preço atual está abaixo do preço mínimo: cada venda dá prejuízo.</Aviso>
                        </div>
                    )}
                </Bloco>
            )}

            <Bloco titulo="Produção do lote">
                <Linha rotulo="Tempo de máquina" valor={formatarHoras(r.horasMaquinaLote)} />
                <Linha rotulo="Material consumido (com perdas)" valor={`${formatarNumero(r.materialLoteG, 1)} g`} />
                <Linha rotulo="Energia (estimativa)" valor={`${formatarNumero(r.energiaKwhLote, 2)} kWh`} />
                <Linha rotulo="Trabalho humano" valor={formatarHoras(r.minutosTrabalhoLote / 60)} />
            </Bloco>

            <Bloco titulo="Composição do custo">
                <div className="-mx-1 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-stone-400">
                                <th className="px-1 py-1 font-semibold">Rubrica</th>
                                <th className="px-1 py-1 text-right font-semibold">Por un.</th>
                                <th className="px-1 py-1 text-right font-semibold">Lote</th>
                            </tr>
                        </thead>
                        <tbody>
                            {r.rubricas
                                .filter((x) => x.lote !== 0)
                                .map((x) => (
                                    <tr key={x.chave} className="border-t border-stone-100 dark:border-stone-800">
                                        <td className="px-1 py-1.5">
                                            {x.rotulo}
                                            <span className="ml-1 text-[11px] text-stone-400">({ROTULO_TIPO[x.tipo]})</span>
                                        </td>
                                        <td className="px-1 py-1.5 text-right tabular-nums">{formatarMoeda(x.porUnidade)}</td>
                                        <td className="px-1 py-1.5 text-right tabular-nums">{formatarMoeda(x.lote)}</td>
                                    </tr>
                                ))}
                            <tr className="border-t-2 border-stone-200 font-bold dark:border-stone-700">
                                <td className="px-1 py-1.5">Total</td>
                                <td className="px-1 py-1.5 text-right tabular-nums">{formatarMoeda(r.custoUnitarioCompleto)}</td>
                                <td className="px-1 py-1.5 text-right tabular-nums">{formatarMoeda(r.custoTotalLote)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-[11px] text-stone-400">
                    Custos “únicos do pedido” aparecem rateados por unidade, mas entram uma única vez no lote. Valores
                    arredondados só na exibição.
                </p>
            </Bloco>
        </div>
    );
}
