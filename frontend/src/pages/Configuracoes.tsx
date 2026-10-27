import { useEffect, useState } from 'react';
import { Percent, Receipt, Users, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { errosDeCampo, mensagemErro } from '../services/erro';
import type { Configuracao, MetodoDespesaFixa } from '../lib/tipos';
import { formatarData, formatarMoedaPrecisa, lerNumero, paraCampo } from '../lib/numeros';
import { Aviso, Botao, Cabecalho, CampoNumero, Carregando, EscolhaUnica, Secao } from '../components/ui';

const CAMPOS = [
    'tarifaEnergiaKwh',
    'consumoImpressoraKw',
    'manutencaoHora',
    'custoHoraTrabalho',
    'despesasFixasMensais',
    'unidadesVendidasMes',
    'despesaFixaManualUnit',
    'taxaVendaPct',
    'impostosPct',
    'outrasVariaveisPct',
    'margemLucroPct',
] as const;
type CampoNum = (typeof CAMPOS)[number];
type Form = Record<CampoNum, string> & { metodoDespesaFixa: MetodoDespesaFixa };

function deConfig(c: Configuracao): Form {
    const f = { metodoDespesaFixa: c.metodoDespesaFixa } as Form;
    for (const k of CAMPOS) f[k] = paraCampo(c[k]);
    return f;
}

export function Configuracoes() {
    const [config, setConfig] = useState<Configuracao | null>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [erroCarga, setErroCarga] = useState<string | null>(null);
    const [erros, setErros] = useState<Record<string, string>>({});
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        api.get<Configuracao>('/configuracoes')
            .then((r) => {
                setConfig(r.data);
                setForm(deConfig(r.data));
            })
            .catch((err) => setErroCarga(mensagemErro(err, 'Não foi possível carregar as configurações.')));
    }, []);

    if (erroCarga) return <Aviso tipo="erro">{erroCarga}</Aviso>;
    if (!form) return <Carregando />;

    const set = (k: CampoNum) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

    const mensais = lerNumero(form.despesasFixasMensais);
    const unidades = lerNumero(form.unidadesVendidasMes);
    const rateio = mensais !== null && unidades && unidades > 0 && mensais >= 0 ? mensais / unidades : null;
    const somaPct = (['taxaVendaPct', 'impostosPct', 'outrasVariaveisPct', 'margemLucroPct'] as const).reduce(
        (s, k) => s + (lerNumero(form[k]) || 0),
        0,
    );

    async function salvar() {
        if (!form) return;
        const corpo: Record<string, unknown> = { metodoDespesaFixa: form.metodoDespesaFixa };
        const locais: Record<string, string> = {};
        for (const k of CAMPOS) {
            const v = lerNumero(form[k]);
            if (v !== null && Number.isNaN(v)) locais[k] = 'Número inválido. Use vírgula para decimais.';
            corpo[k] = v ?? 0;
        }
        if (Object.keys(locais).length) {
            setErros(locais);
            return;
        }
        setSalvando(true);
        try {
            const r = await api.put<Configuracao>('/configuracoes', corpo);
            setConfig(r.data);
            setForm(deConfig(r.data));
            setErros({});
            toast.success('Configurações salvas.');
        } catch (err) {
            setErros(errosDeCampo(err));
            toast.error(mensagemErro(err, 'Não foi possível salvar.'));
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="space-y-5">
            <Cabecalho
                titulo="Configurações de custos"
                descricao="Valores padrão que a calculadora já traz preenchidos. Em cada simulação você pode ajustá-los (por exemplo, a taxa de um canal de venda diferente) sem alterar estes padrões."
            />

            <Secao
                titulo="Energia e máquina"
                icone={<Zap size={18} />}
                descricao="A energia é calculada à parte da manutenção, para não ser contada duas vezes."
            >
                <CampoNumero
                    rotulo="Tarifa de energia elétrica"
                    unidade="R$/kWh"
                    valor={form.tarifaEnergiaKwh}
                    aoMudar={set('tarifaEnergiaKwh')}
                    erro={erros.tarifaEnergiaKwh}
                    ajuda="Valor do kWh na conta de luz, com impostos e bandeira, se quiser incluí-los."
                />
                <CampoNumero
                    rotulo="Consumo estimado da impressora"
                    unidade="kW"
                    valor={form.consumoImpressoraKw}
                    aoMudar={set('consumoImpressoraKw')}
                    erro={erros.consumoImpressoraKw}
                    ajuda="Potência média durante a impressão. Ex.: 150 W = 0,15 kW."
                />
                <CampoNumero
                    rotulo="Manutenção e desgaste por hora de máquina"
                    unidade="R$/h"
                    valor={form.manutencaoHora}
                    aoMudar={set('manutencaoHora')}
                    erro={erros.manutencaoHora}
                    ajuda="Bicos, correias, mesa, peças de reposição e depreciação, divididos pelas horas de uso. Sem energia."
                    largo
                />
            </Secao>

            <Secao titulo="Trabalho humano" icone={<Users size={18} />}>
                <CampoNumero
                    rotulo="Custo da hora de trabalho"
                    unidade="R$/h"
                    valor={form.custoHoraTrabalho}
                    aoMudar={set('custoHoraTrabalho')}
                    erro={erros.custoHoraTrabalho}
                    ajuda="Quanto vale uma hora do seu trabalho (preparação, acabamento, montagem)."
                />
            </Secao>

            <Secao
                titulo="Despesas fixas"
                icone={<Receipt size={18} />}
                descricao="Aluguel, internet, software, contador etc. Escolha como alocar uma parte delas em cada unidade vendida."
            >
                <EscolhaUnica<MetodoDespesaFixa>
                    rotulo="Método padrão de alocação"
                    valor={form.metodoDespesaFixa}
                    aoMudar={(v) => setForm((f) => (f ? { ...f, metodoDespesaFixa: v } : f))}
                    opcoes={[
                        {
                            valor: 'MANUAL',
                            titulo: 'Valor fixo por unidade',
                            descricao: 'Você informa diretamente quanto cada unidade deve cobrir.',
                        },
                        {
                            valor: 'RATEIO',
                            titulo: 'Rateio pelo volume mensal',
                            descricao: 'Despesas fixas do mês ÷ unidades vendidas por mês.',
                        },
                    ]}
                />
                <CampoNumero
                    rotulo="Despesa fixa alocada por unidade"
                    prefixo="R$"
                    valor={form.despesaFixaManualUnit}
                    aoMudar={set('despesaFixaManualUnit')}
                    erro={erros.despesaFixaManualUnit}
                    ajuda="Usada no método “valor fixo por unidade”."
                />
                <div />
                <CampoNumero
                    rotulo="Despesas fixas mensais"
                    prefixo="R$"
                    valor={form.despesasFixasMensais}
                    aoMudar={set('despesasFixasMensais')}
                    erro={erros.despesasFixasMensais}
                />
                <CampoNumero
                    rotulo="Unidades vendidas por mês (estimativa)"
                    unidade="un/mês"
                    valor={form.unidadesVendidasMes}
                    aoMudar={set('unidadesVendidasMes')}
                    erro={erros.unidadesVendidasMes}
                />
                <div className="sm:col-span-2">
                    <Aviso tipo={form.metodoDespesaFixa === 'RATEIO' ? 'alerta' : 'info'}>
                        Pelo rateio, cada unidade cobriria <b>{rateio === null ? '—' : formatarMoedaPrecisa(rateio, 2)}</b>.
                        Isso é só uma <b>estimativa</b>: trata um chaveiro e uma peça grande como se consumissem a mesma
                        parcela das despesas fixas, o que pode distorcer o preço quando os produtos têm complexidades muito
                        diferentes.
                    </Aviso>
                </div>
            </Secao>

            <Secao
                titulo="Taxas, impostos e margem"
                icone={<Percent size={18} />}
                descricao="Todos são percentuais sobre o PREÇO DE VENDA. Os percentuais tributários dependem do seu regime — confirme com sua contabilidade."
            >
                <CampoNumero
                    rotulo="Taxa de venda"
                    unidade="%"
                    valor={form.taxaVendaPct}
                    aoMudar={set('taxaVendaPct')}
                    erro={erros.taxaVendaPct}
                    ajuda="Marketplace, maquininha, plataforma de pagamento."
                />
                <CampoNumero
                    rotulo="Impostos sobre vendas (estimativa)"
                    unidade="%"
                    valor={form.impostosPct}
                    aoMudar={set('impostosPct')}
                    erro={erros.impostosPct}
                    ajuda="Informado por você. O sistema não presume regime tributário."
                />
                <CampoNumero
                    rotulo="Outras despesas variáveis"
                    unidade="%"
                    valor={form.outrasVariaveisPct}
                    aoMudar={set('outrasVariaveisPct')}
                    erro={erros.outrasVariaveisPct}
                    ajuda="Comissões, campanhas ou outros custos proporcionais ao preço."
                />
                <CampoNumero
                    rotulo="Margem de lucro desejada"
                    unidade="%"
                    valor={form.margemLucroPct}
                    aoMudar={set('margemLucroPct')}
                    erro={erros.margemLucroPct}
                    ajuda="Lucro como % do preço de venda (não é markup sobre o custo)."
                />
                {somaPct >= 100 && (
                    <div className="sm:col-span-2">
                        <Aviso tipo="erro">
                            Os percentuais somam {somaPct.toLocaleString('pt-BR')}% — com 100% ou mais não existe preço possível.
                        </Aviso>
                    </div>
                )}
            </Secao>

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-stone-500">
                    {config && `Última alteração: ${formatarData(config.updatedAt)}`}
                </p>
                <Botao carregando={salvando} onClick={salvar}>
                    Salvar configurações
                </Botao>
            </div>
        </div>
    );
}
