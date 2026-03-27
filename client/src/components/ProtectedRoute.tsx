import { Redirect } from 'wouter';
import { useAuthContext, UserRole } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, userData, loading } = useAuthContext();

  if (loading) {
    return <LoadingScreen message="Carregando..." />;
  }

  if (!currentUser || !userData) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-md p-8 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-4">Acesso Negado</h2>
          <p className="text-white/70 mb-6">
            Você não tem permissão para acessar esta página.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}