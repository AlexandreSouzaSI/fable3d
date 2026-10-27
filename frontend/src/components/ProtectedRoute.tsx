import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { autenticado, carregando } = useAuth();

    if (carregando) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoaderCircle className="animate-spin text-stone-400" size={28} />
            </div>
        );
    }

    if (!autenticado) return <Navigate to="/login" replace />;

    return <>{children}</>;
}
