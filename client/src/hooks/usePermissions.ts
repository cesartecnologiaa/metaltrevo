import { useAuthContext, UserRole } from '@/contexts/AuthContext';

export interface Permissions {
  // Gestão de Usuários
  canCreateUsers: boolean;
  
  // Vendas
  canMakeSales: boolean;
  canEditSales: boolean;
  canCancelSales: boolean;
  
  // Consultas
  canViewStock: boolean;
  canViewClients: boolean;
  canViewAccountsReceivable: boolean;
  canViewAccountsPayable: boolean;
  canViewDeposito: boolean;
  
  // Relatórios e Dashboard
  canViewDashboard: boolean;
  canViewReports: boolean;
  canExportFinancialData: boolean;
  canViewSalesRevenueCard: boolean;
  
  // Gestão de Produtos
  canManageProducts: boolean;
  canManageCategories: boolean;
  canManageSuppliers: boolean;
  
  // Depósito
  canManageWithdrawals: boolean;
  
  // Role do usuário
  role: UserRole;
  isAdmin: boolean;
  isVendedor: boolean;
  isCaixa: boolean;
  isDeposito: boolean;
}

export function usePermissions(): Permissions {
  const { userData } = useAuthContext();
  const role = userData?.role || 'vendedor';

  const isAdmin = role === 'admin';
  const isVendedor = role === 'vendedor';
  const isCaixa = role === 'caixa';
  const isDeposito = role === 'deposito';

  return {
    canCreateUsers: isAdmin,

    canMakeSales: isAdmin || isVendedor || isCaixa,
    canEditSales: isAdmin || isVendedor,
    canCancelSales: isAdmin || isVendedor,

    canViewStock: isAdmin || isVendedor,
    canViewClients: isAdmin || isVendedor,
    canViewAccountsReceivable: isAdmin || isVendedor,
    canViewAccountsPayable: isAdmin || isVendedor,
    canViewDeposito: isAdmin || isVendedor || isDeposito,

    canViewDashboard: isAdmin,
    canViewReports: isAdmin || isVendedor,
    canExportFinancialData: isAdmin,
    canViewSalesRevenueCard: isAdmin,

    canManageProducts: isAdmin,
    canManageCategories: isAdmin,
    canManageSuppliers: isAdmin,

    canManageWithdrawals: isAdmin || isDeposito,

    role,
    isAdmin,
    isVendedor,
    isCaixa,
    isDeposito,
  };
}