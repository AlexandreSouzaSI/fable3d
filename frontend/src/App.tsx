import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { Inicio } from './pages/Inicio';
import { Calculadora } from './pages/Calculadora';
import { Materiais } from './pages/Materiais';
import { Configuracoes } from './pages/Configuracoes';
import { Simulacoes } from './pages/Simulacoes';
import { SimulacaoDetalhe } from './pages/SimulacaoDetalhe';
import { Usuarios } from './pages/Usuarios';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ style: { borderRadius: '12px', fontSize: '14px' } }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Inicio />} />
                    <Route path="/calculadora" element={<Calculadora />} />
                    <Route path="/materiais" element={<Materiais />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/simulacoes" element={<Simulacoes />} />
                    <Route path="/simulacoes/:id" element={<SimulacaoDetalhe />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
