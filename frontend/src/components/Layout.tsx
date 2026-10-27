import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Calculator, FolderClock, Home, Layers, LogOut, Settings2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

const itens = [
    { to: '/', label: 'Início', curto: 'Início', icon: Home, admin: false },
    { to: '/calculadora', label: 'Calculadora', curto: 'Calcular', icon: Calculator, admin: false },
    { to: '/materiais', label: 'Materiais', curto: 'Materiais', icon: Layers, admin: false },
    { to: '/simulacoes', label: 'Simulações salvas', curto: 'Salvas', icon: FolderClock, admin: false },
    { to: '/configuracoes', label: 'Configurações de custos', curto: 'Custos', icon: Settings2, admin: false },
    { to: '/usuarios', label: 'Usuários', curto: 'Usuários', icon: Users, admin: true },
];

function Logo() {
    return (
        <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="leading-tight">
                <span className="block text-lg font-extrabold tracking-wide">FABLE</span>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Precificação 3D
                </span>
            </span>
        </Link>
    );
}

export function Layout({ children }: { children: ReactNode }) {
    const { usuario, sair } = useAuth();
    const isAdmin = usuario?.perfil === 'ADMIN';
    const visiveis = itens.filter((i) => !i.admin || isAdmin);
    const noCelular = itens.filter((i) => !i.admin);

    return (
        <div className="flex min-h-screen">
            {/* Barra lateral — computador */}
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 lg:flex">
                <div className="flex h-16 items-center px-5">
                    <Logo />
                </div>
                <nav className="flex-1 space-y-1 p-3">
                    {visiveis.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                    isActive
                                        ? 'bg-marca-50 text-marca-700 dark:bg-marca-500/15 dark:text-marca-300'
                                        : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
                                }`
                            }
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90 sm:px-6">
                    <div className="lg:hidden">
                        <Logo />
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                        <span className="mr-2 hidden text-sm text-stone-500 sm:inline">
                            {usuario?.nome || usuario?.email}
                        </span>
                        {isAdmin && (
                            <Link
                                to="/usuarios"
                                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 lg:hidden"
                                title="Usuários"
                            >
                                <Users size={18} />
                            </Link>
                        )}
                        <ThemeToggle />
                        <button
                            onClick={sair}
                            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                            title="Sair"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">{children}</main>
            </div>

            {/* Barra inferior — celular e tablet */}
            <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-stone-800 dark:bg-stone-900 lg:hidden">
                {noCelular.map(({ to, curto, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                                isActive ? 'text-marca-600 dark:text-marca-300' : 'text-stone-500'
                            }`
                        }
                    >
                        <Icon size={20} />
                        {curto}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
