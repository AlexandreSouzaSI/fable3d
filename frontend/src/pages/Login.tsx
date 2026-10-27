import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { mensagemErro } from '../services/erro';

export function Login() {
    const { entrar, autenticado } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [enviando, setEnviando] = useState(false);

    if (autenticado) return <Navigate to="/" replace />;

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setEnviando(true);
        try {
            await entrar(email, senha);
            navigate('/', { replace: true });
        } catch (err) {
            toast.error(mensagemErro(err, 'Não foi possível entrar'));
        } finally {
            setEnviando(false);
        }
    }

    const input = 'campo';

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-sm space-y-5 cartao p-8"
            >
                <div className="flex flex-col items-center gap-2">
                    <img src="/favicon.svg" alt="" className="w-12 h-12" />
                    <h1 className="text-xl font-extrabold">FABLE</h1>
                    <p className="text-sm text-stone-500">Precificação de impressão 3D</p>
                </div>
                <label className="block space-y-1">
                    <span className="text-sm font-medium">E-mail</span>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
                </label>
                <label className="block space-y-1">
                    <span className="text-sm font-medium">Senha</span>
                    <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} className={input} />
                </label>
                <button
                    type="submit"
                    disabled={enviando}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-marca-500 py-2.5 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60"
                >
                    {enviando && <LoaderCircle size={16} className="animate-spin" />}
                    Entrar
                </button>
            </form>
        </div>
    );
}
