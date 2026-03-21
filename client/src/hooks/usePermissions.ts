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
  
  // Relatórios e Dashboard
  canViewDashboard: boolean;
  canViewReports: boolean;
  canExportFinancialData: boolean;
  
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
    
    // Vendas - ADMIN e VENDEDOR
    canMakeSales: isAdmin || isVendedor || isCaixa,
    canEditSales: isAdmin || isVendedor,
    canCancelSales: isAdmin || isVendedor,
    
    // Consultas - ADMIN e VENDEDOR
    canViewStock: isAdmin || isVendedor,
    canViewClients: isAdmin || isVendedor,
    
    // Relatórios e Dashboard - APENAS ADMIN
    canViewDashboard: isAdmin,
    canViewReports: isAdmin,
    canExportFinancialData: isAdmin,
    
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
