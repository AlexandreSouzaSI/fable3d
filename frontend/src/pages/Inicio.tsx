import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, FlaskConical, FolderClock, Layers, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { mensagemErro } from '../services/erro';
import { Botao } from '../components/ui';

const atalhos = [
    {
        to: '/calculadora',
        titulo: 'Calculadora de preços',
        texto: 'Simule custo e preço de uma peça ou de um lote.',
        icone: Calculator,
        destaque: true,
    },
    {
        to: '/materiais',
        titulo: 'Materiais',
        texto: 'Filamentos cadastrados e custo por grama.',
        icone: Layers,
    },
    {
        to: '/configuracoes',
        titulo: 'Configurações de custos',
        texto: 'Energia, máquina, mão de obra, taxas e margem padrão.',
        icone: Settings2,
    },
    {
        to: '/simulacoes',
        titulo: 'Simulações salvas',
        texto: 'Consulte, duplique ou exclua cálculos anteriores.',
        icone: FolderClock,
    },
];

export function Inicio() {
    const { usuario } = useAuth();
    const [criando, setCriando] = useState(false);
    const primeiroNome = (usuario?.nome || '').split(' ')[0];

    async function criarExemplo() {
        setCriando(true);
        try {
            await api.post('/materiais/exemplo');
            toast.success('Material de exemplo (fictício) disponível em Materiais.');
        } catch (err) {
            toast.error(mensagemErro(err, 'Não foi possível criar o exemplo.'));
        } finally {
            setCriando(false);
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Olá{primeiroNome ? `, ${primeiroNome}` : ''}!
                </h1>
                <p className="mt-1 text-stone-500 dark:text-stone-400">O que vamos precificar hoje?</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {atalhos.map(({ to, titulo, texto, icone: Icone, destaque }) => (
                    <Link
                        key={to}
                        to={to}
                        className={`group flex items-start gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
                            destaque
                                ? 'border-marca-200 bg-marca-50 dark:border-marca-500/30 dark:bg-marca-500/10'
                                : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
                        }`}
                    >
                        <div
                            className={`rounded-xl p-3 ${
                                destaque
                                    ? 'bg-marca-500 text-white'
                                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                            }`}
                        >
                            <Icone size={22} />
                        </div>
                        <div className="flex-1">
                            <h2 className="font-bold">{titulo}</h2>
                            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{texto}</p>
                        </div>
                        <ArrowRight
                            size={18}
                            className="mt-1 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-marca-500"
                        />
                    </Link>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="cartao p-5">
                    <h2 className="font-bold">Primeiros passos</h2>
                    <ol className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                        <li>
                            <b>1.</b> Preencha as <Link className="font-semibold text-marca-600 underline" to="/configuracoes">configurações de custos</Link> (energia, hora de trabalho, taxas, margem).
                        </li>
                        <li>
                            <b>2.</b> Cadastre seus <Link className="font-semibold text-marca-600 underline" to="/materiais">filamentos</Link> com preço e peso do rolo.
                        </li>
                        <li>
                            <b>3.</b> Abra a <Link className="font-semibold text-marca-600 underline" to="/calculadora">calculadora</Link>, preencha a peça e salve a simulação.
                        </li>
                    </ol>
                </div>

                <div className="cartao p-5">
                    <div className="flex items-center gap-2">
                        <FlaskConical size={18} className="text-marca-500" />
                        <h2 className="font-bold">Quer testar antes?</h2>
                    </div>
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                        Crie um filamento de <b>exemplo fictício</b> (“PLA Branco (EXEMPLO FICTÍCIO)”, rolo de 1 kg a R$ 120 +
                        R$ 20 de frete). Ele fica salvo no banco com esse nome, para não ser confundido com um material real —
                        depois é só desativá-lo.
                    </p>
                    <Botao variante="secundario" className="mt-4" carregando={criando} onClick={criarExemplo}>
                        Criar material de exemplo
                    </Botao>
                </div>
            </div>
        </div>
    );
}
