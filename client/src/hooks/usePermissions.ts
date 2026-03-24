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
    // Gestão de Usuários - APENAS ADMIN
    canCreateUsers: isAdmin,
    
    // Vendas - ADMIN, VENDEDOR e CAIXA
    canMakeSales: isAdmin || isVendedor || isCaixa,
    canEditSales: isAdmin || isVendedor,
    canCancelSales: isAdmin || isVendedor,
    
    // Consultas
    canViewStock: isAdmin || isVendedor,
    canViewClients: isAdmin || isVendedor,
    canViewAccountsReceivable: isAdmin || isVendedor,
    canViewDeposito: isAdmin || isVendedor || isDeposito,
    
    // Relatórios e Dashboard - APENAS ADMIN
    canViewDashboard: isAdmin,
    canViewReports: isAdmin,
    canExportFinancialData: isAdmin,
    canViewSalesRevenueCard: isAdmin,
    
    // Gestão de Produtos - APENAS ADMIN
    canManageProducts: isAdmin,
    canManageCategories: isAdmin,
    canManageSuppliers: isAdmin,
    
    // Depósito - ADMIN e DEPÓSITO
    canManageWithdrawals: isAdmin || isDeposito,
    
    // Role info
    role,
    isAdmin,
    isVendedor,
    isCaixa,
    isDeposito,
  };
}