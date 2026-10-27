import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { mensagemErro } from '../services/erro';

type Usuario = {
    id: string;
    nome: string | null;
    email: string;
    perfil: 'ADMIN' | 'FUNCIONARIO';
    ativo: boolean;
};

export function Usuarios() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'FUNCIONARIO' });

    async function carregar() {
        const res = await api.get('/usuarios');
        setUsuarios(res.data);
    }

    useEffect(() => {
        api.get('/usuarios').then((res) => setUsuarios(res.data));
    }, []);

    async function criar(e: FormEvent) {
        e.preventDefault();
        try {
            await api.post('/usuarios', form);
            toast.success('Usuário criado');
            setForm({ nome: '', email: '', senha: '', perfil: 'FUNCIONARIO' });
            carregar();
        } catch (err) {
            toast.error(mensagemErro(err, 'Erro ao criar usuário'));
        }
    }

    async function alternarAtivo(u: Usuario) {
        await api.patch(`/usuarios/${u.id}`, { ativo: !u.ativo });
        carregar();
    }

    const input =
        'campo sm:w-auto';

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-extrabold">Usuários</h1>

            <form onSubmit={criar} className="flex flex-wrap gap-2 cartao p-4">
                <input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={input} />
                <input placeholder="E-mail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
                <input placeholder="Senha" type="password" required value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className={input} />
                <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })} className={input}>
                    <option value="FUNCIONARIO">Funcionário</option>
                    <option value="ADMIN">Admin</option>
                </select>
                <button className="rounded-xl bg-marca-500 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600">Adicionar</button>
            </form>

            <div className="cartao overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left text-stone-500 dark:text-stone-400">
                        <tr>
                            <th className="px-4 py-3">Nome</th>
                            <th className="px-4 py-3">E-mail</th>
                            <th className="px-4 py-3">Perfil</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map((u) => (
                            <tr key={u.id} className="border-t border-stone-100 dark:border-stone-800">
                                <td className="px-4 py-3">{u.nome || '—'}</td>
                                <td className="px-4 py-3">{u.email}</td>
                                <td className="px-4 py-3">{u.perfil === 'ADMIN' ? 'Admin' : 'Funcionário'}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => alternarAtivo(u)} className={u.ativo ? 'text-emerald-600' : 'text-stone-400'}>
                                        {u.ativo ? 'Ativo' : 'Inativo'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
