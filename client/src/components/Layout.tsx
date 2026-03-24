import { useState, useEffect, ReactNode } from 'react';
import QuickSearch from './QuickSearch';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getUpcomingDueDates } from '@/services/accountsPayableService';
import { getDueTodayReceivables } from '@/services/accountsReceivableService';
import { Link, useLocation } from 'wouter';
import { useAuthContext } from '@/contexts/AuthContext';
import { getAllProducts } from '@/services/productService';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  Settings,
  LogOut,
  Store,
  UserPlus,
  Truck,
  FolderTree,
  DollarSign,
  FileText,
  Wallet,
  Wrench,
  Menu,
  X,
  Database
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { userData, signOut } = useAuthContext();
  const permissions = usePermissions();
  const { settings } = useCompanySettings();
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [upcomingDuesCount, setUpcomingDuesCount] = useState(0);
  const [receivablesDueTodayCount, setReceivablesDueTodayCount] = useState(0);

  // Buscar contas próximas ao vencimento e contas a receber vencendo hoje
  useEffect(() => {
    const loadUpcomingDues = async () => {
      if (permissions.isAdmin) {
        try {
          const upcoming = await getUpcomingDueDates(3); // 3 dias antes do vencimento
          setUpcomingDuesCount(upcoming.length);
        } catch (error) {
          console.error('Erro ao buscar contas próximas ao vencimento:', error);
        }
      }
    };

    const loadReceivablesDueToday = async () => {
      if (permissions.isAdmin) {
        try {
          const dueToday = await getDueTodayReceivables();
          setReceivablesDueTodayCount(dueToday.length);
        } catch (error) {
          console.error('Erro ao buscar contas a receber vencendo hoje:', error);
        }
      }
    };

    loadUpcomingDues();
    loadReceivablesDueToday();
    // Atualizar a cada 5 minutos
    const interval = setInterval(() => {
      loadUpcomingDues();
      loadReceivablesDueToday();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [permissions.isAdmin]);

  const handleLogout = async () => {
    await signOut();
  };

  // Atalhos de teclado globais
  useKeyboardShortcuts({
    onF2: () => setQuickSearchOpen(true),
    onF4: () => setLocation('/pdv'),
    onEscape: () => setQuickSearchOpen(false),
  });

  // Buscar produtos com estoque baixo
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const products = await getAllProducts();
        const lowStock = products.filter(
          (p: any) => (p.currentStock || 0) <= (p.minStock || 0)
        );
        setLowStockCount(lowStock.length);
      } catch (error) {
        console.error('Error fetching low stock:', error);
      }
    };
    fetchLowStock();
  }, []);

  const menuItems = [
    // DASHBOARD SEMPRE PRIMEIRO
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/',
      show: permissions.canViewDashboard,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    // FUNCIONALIDADES ESSENCIAIS
    {
      icon: ShoppingCart,
      label: 'PDV',
      path: '/pdv',
      show: permissions.canMakeSales,
    },
    {
      icon: Wallet,
      label: 'Caixa',
      path: '/caixa',
      show: permissions.canMakeSales,
      submenu: [
        { label: 'Caixa Atual', path: '/caixa' },
        { label: 'Histórico', path: '/caixa/historico' },
      ],
    },
    {
      icon: TrendingUp,
      label: 'Vendas',
      path: '/vendas',
      show: permissions.canMakeSales,
    },
    {
      icon: FileText,
      label: 'Orçamentos',
      path: '/orcamentos',
      show: permissions.canMakeSales,
      submenu: [
        { label: 'Novo Orçamento', path: '/orcamentos' },
        { label: 'Consultar', path: '/orcamentos/consulta' },
      ],
    },
    {
      icon: Package,
      label: 'Depósito',
      path: '/deposito',
      show: permissions.isAdmin || userData?.role === 'deposito',
    },
    // CADASTROS (ABAIXO)
    {
      icon: Package,
      label: 'Produtos',
      path: '/produtos',
      show: permissions.canManageProducts,
    },
    {
      icon: Users,
      label: 'Clientes',
      path: '/clientes',
      show: permissions.canViewClients,
    },
    {
      icon: Truck,
      label: 'Fornecedores',
      path: '/fornecedores',
      show: permissions.canManageSuppliers,
    },
    {
      icon: FolderTree,
      label: 'Categorias',
      path: '/categorias',
      show: permissions.canManageCategories,
    },
    {
      icon: UserPlus,
      label: 'Usuários',
      path: '/usuarios',
      show: permissions.canCreateUsers,
    },
    {
      icon: DollarSign,
      label: 'Contas a Receber',
      path: '/contas-receber',
      show: permissions.canViewAccountsReceivable,
      badge: receivablesDueTodayCount > 0 ? receivablesDueTodayCount : undefined,
    },
    {
      icon: DollarSign,
      label: 'Contas a Pagar',
      path: '/contas-pagar',
      show: permissions.canViewAccountsPayable,
      badge: upcomingDuesCount > 0 ? upcomingDuesCount : undefined,
    },
    {
      icon: TrendingUp,
      label: 'Relatórios',
      path: '/relatorios',
      show: permissions.canViewReports,
    },
    {
      icon: Settings,
      label: 'Configurações',
      path: '/configuracoes',
      show: permissions.isAdmin,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 backdrop-blur-2xl bg-white/5 border-r border-white/10 z-40 transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              {settings.logo ? (
                <img src={settings.logo} alt={settings.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-white font-bold text-lg">{settings.name || 'Metal Trevo'}</h1>
                <p className="text-white/50 text-xs">{settings.subtitle || 'Sistema de Gestão Comercial'}</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)}>
                  <div
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative cursor-pointer
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-white border border-blue-500/30' 
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium flex-1">{item.label}</span>
                    {(item as any).badge && (
                      <span className="w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-xs font-bold text-white animate-pulse">
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-white/10">
            <div className="mb-3 p-3 rounded-lg bg-white/5">
              <p className="text-white/90 text-sm font-medium">{userData?.name}</p>
              <p className="text-white/50 text-xs">{userData?.email}</p>
              <p className="text-blue-400 text-xs mt-1 font-semibold uppercase">
                {userData?.role === 'admin' ? 'ADMIN' : userData?.role === 'deposito' ? 'DEPÓSITO' : 'VENDEDOR'}
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay para fechar menu mobile */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen flex flex-col">
        <div className="p-8 flex-1">
          {children}
        </div>
        
        {/* Footer */}
        <Footer />
      </main>

      {/* Botão Flutuante WhatsApp */}
      <WhatsAppButton />

      {/* Busca Rápida (F2) */}
      <QuickSearch 
        open={quickSearchOpen} 
        onClose={() => setQuickSearchOpen(false)}
      />
    </div>
  );
}
