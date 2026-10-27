import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains('dark'),
    );

    function alternar() {
        const novo = !dark;
        document.documentElement.classList.toggle('dark', novo);
        try {
            localStorage.setItem('theme', novo ? 'dark' : 'light');
        } catch {
            // sem storage — só não lembra a escolha
        }
        setDark(novo);
    }

    return (
        <button
            onClick={alternar}
            className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            title={dark ? 'Tema claro' : 'Tema escuro'}
        >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}
