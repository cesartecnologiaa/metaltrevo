import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import PDV from "./pages/PDV";
import Products from "./pages/Products";
import Clients from "./pages/Clients";
import Sales from "./pages/Sales";
import Suppliers from "./pages/Suppliers";
import Settings from "./pages/Settings";
import Users from './pages/Users';
import Categories from './pages/Categories';
import AccountsReceivable from './pages/AccountsReceivable';
import DepositoPage from './pages/DepositoPage';
import AccountsPayable from './pages/AccountsPayable';
import Quotations from './pages/Quotations';
import QuotationsList from './pages/QuotationsList';
import CashRegister from './pages/CashRegister';
import CashHistory from './pages/CashHistory';
import AdminTools from './pages/AdminTools';
import Reports from './pages/Reports';
import Backups from './pages/Backups';
import NotFound from "./pages/NotFound";

function AppRoutes() {
  const { currentUser, userData, loading } = useAuthContext();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirecionar automaticamente por perfil após login
  const getDefaultRoute = () => {
    if (!userData) return '/';
    
    switch (userData.role) {
      case 'admin':
        return '/'; // Dashboard (Home)
      case 'vendedor':
        return '/pdv';
      case 'deposito':
        return '/deposito';
      default:
        return '/';
    }
  };

  return (
    <Switch>
      {/* Rota de Login */}
      <Route path="/login">
        {currentUser && userData ? <Redirect to={getDefaultRoute()} /> : <Login />}
      </Route>

      {/* Rotas Protegidas */}
      <Route path="/pdv">
        <ProtectedRoute allowedRoles={['admin', 'vendedor', 'caixa']}>
          <PDV />
        </ProtectedRoute>
      </Route>

      <Route path="/produtos">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <Products />
        </ProtectedRoute>
      </Route>

      <Route path="/vendas">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <Sales />
        </ProtectedRoute>
      </Route>

      <Route path="/clientes">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <Clients />
        </ProtectedRoute>
      </Route>

      <Route path="/fornecedores">
        <ProtectedRoute allowedRoles={['admin']}>
          <Suppliers />
        </ProtectedRoute>
      </Route>

      <Route path="/categorias">
        <ProtectedRoute allowedRoles={['admin']}>
          <Categories />
        </ProtectedRoute>
      </Route>

      <Route path="/usuarios">
        <ProtectedRoute allowedRoles={['admin']}>
          <Users />
        </ProtectedRoute>
      </Route>

      <Route path="/configuracoes">
        <ProtectedRoute allowedRoles={['admin']}>
          <Settings />
        </ProtectedRoute>
      </Route>

      <Route path="/contas-receber">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <AccountsReceivable />
        </ProtectedRoute>
      </Route>

      <Route path="/deposito">
        <ProtectedRoute allowedRoles={['admin', 'vendedor', 'deposito']}>
          <DepositoPage />
        </ProtectedRoute>
      </Route>

      <Route path="/contas-pagar">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <AccountsPayable />
        </ProtectedRoute>
      </Route>

      <Route path="/caixa">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <CashRegister />
        </ProtectedRoute>
      </Route>

      <Route path="/caixa/historico">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <CashHistory />
        </ProtectedRoute>
      </Route>

      <Route path="/orcamentos">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <Quotations />
        </ProtectedRoute>
      </Route>

      <Route path="/orcamentos/consulta">
        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
          <QuotationsList />
        </ProtectedRoute>
      </Route>

      <Route path="/relatorios">
        <ProtectedRoute allowedRoles={['admin']}>
          <Reports />
        </ProtectedRoute>
      </Route>

      <Route path="/admin-tools">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminTools />
        </ProtectedRoute>
      </Route>

      <Route path="/backups">
        <ProtectedRoute allowedRoles={['admin']}>
          <Backups />
        </ProtectedRoute>
      </Route>

      {/* Rota 404 */}
      <Route path="/404" component={NotFound} />

      {/* Rota Home (deve ficar antes do fallback) */}
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>

      {/* Fallback - Redireciona para 404 */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
