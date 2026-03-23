import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { usePermissions } from '@/hooks/usePermissions';
import { Card } from '@/components/ui/card';
import LowStockAlert from '@/components/LowStockAlert';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUpcomingDueDates } from '@/services/accountsPayableService';
import {
  getDueTodayReceivables,
  getTodayReceivablePayments,
} from '@/services/accountsReceivableService';
import { formatDate } from '@/lib/firestoreUtils';
import {
  SalesLineChart,
  RevenueAreaChart,
  SellerPerformanceChart,
} from '@/components/Charts';
import {
  ShoppingCart,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Redirect } from 'wouter';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

function getSaleReceivedAmount(sale: any) {
  const total = Number(sale?.total || 0);
  const paymentMethod = String(sale?.paymentMethod || '').toLowerCase();
  const entryAmount = Number(
    sale?.entryAmount ??
    sale?.boletoEntryAmount ??
    sale?.entrada ??
    0
  );

  // boleto mensal não entra inteiro no faturamento do dia
  // só entra a entrada, se houver
  if (paymentMethod === 'boleto') {
    return Math.max(entryAmount, 0);
  }

  return total;
}

export default function Home() {
  const permissions = usePermissions();

  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    yesterdaySales: 0,
    yesterdayRevenue: 0,
    lowStockProducts: 0,
    totalClients: 0,
    totalProducts: 0,
  });

  const [salesData, setSalesData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [sellerData, setSellerData] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [upcomingDues, setUpcomingDues] = useState<any[]>([]);
  const [receivablesDueToday, setReceivablesDueToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadUpcomingDues();
    loadReceivablesDueToday();
  }, []);

  const loadUpcomingDues = async () => {
    try {
      const upcoming = await getUpcomingDueDates(3);
      setUpcomingDues(upcoming);
    } catch (error) {
      console.error('Erro ao buscar contas próximas ao vencimento:', error);
    }
  };

  const loadReceivablesDueToday = async () => {
    try {
      const dueToday = await getDueTodayReceivables();
      setReceivablesDueToday(dueToday);
    } catch (error) {
      console.error('Erro ao buscar contas a receber vencendo hoje:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const yesterdayStart = startOfDay(subDays(today, 1));
      const yesterdayEnd = endOfDay(subDays(today, 1));

      // Vendas de hoje
      const todaySalesQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(todayStart)),
        where('createdAt', '<=', Timestamp.fromDate(todayEnd))
      );
      const todaySalesSnapshot = await getDocs(todaySalesQuery);
      const todaySalesFiltered = todaySalesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((data: any) => data.status === 'concluida');

      const todaySalesCount = todaySalesFiltered.length;

      const todaySalesRevenue = todaySalesFiltered.reduce((sum, sale: any) => {
        return sum + getSaleReceivedAmount(sale);
      }, 0);

      // Baixas de contas a receber feitas hoje
      const todayReceivablePayments = await getTodayReceivablePayments();
      const todayReceivablesRevenue = todayReceivablePayments.reduce((sum, payment) => {
        return sum + Number(payment.paidAmount || 0);
      }, 0);

      const todayRevenueTotal = Number((todaySalesRevenue + todayReceivablesRevenue).toFixed(2));

      // Vendas de ontem
      const yesterdaySalesQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(yesterdayStart)),
        where('createdAt', '<=', Timestamp.fromDate(yesterdayEnd))
      );
      const yesterdaySalesSnapshot = await getDocs(yesterdaySalesQuery);
      const yesterdaySalesFiltered = yesterdaySalesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((data: any) => data.status === 'concluida');

      const yesterdaySalesCount = yesterdaySalesFiltered.length;

      const yesterdaySalesRevenue = yesterdaySalesFiltered.reduce((sum, sale: any) => {
        return sum + getSaleReceivedAmount(sale);
      }, 0);

      // Baixas de contas a receber de ontem
      const allReceivablePayments = await getTodayReceivablePayments();
      const yesterdayReceivablesRevenue = allReceivablePayments
        .filter(payment => {
          const paidAt = payment.paidAt?.toDate?.() || new Date(payment.paidAt);
          return paidAt >= yesterdayStart && paidAt <= yesterdayEnd;
        })
        .reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0);

      const yesterdayRevenueTotal = Number((yesterdaySalesRevenue + yesterdayReceivablesRevenue).toFixed(2));

      // Produtos com estoque baixo
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const lowStock = productsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return (data.currentStock || 0) <= (data.minStock || 0);
        })
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

      const lowStockCount = lowStock.length;

      // Total de clientes
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const totalClientsCount = clientsSnapshot.size;

      // Total de produtos
      const totalProductsCount = productsSnapshot.size;

      setStats({
        todaySales: todaySalesCount,
        todayRevenue: todayRevenueTotal,
        yesterdaySales: yesterdaySalesCount,
        yesterdayRevenue: yesterdayRevenueTotal,
        lowStockProducts: lowStockCount,
        totalClients: totalClientsCount,
        totalProducts: totalProductsCount,
      });

      setLowStockProducts(lowStock);

      await loadChartData();
      await loadSellerData();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const last7Days = [];
      const salesByDay: any = {};
      const revenueByDay: any = {};

      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateKey = format(date, 'dd/MM');
        last7Days.push(dateKey);
        salesByDay[dateKey] = 0;
        revenueByDay[dateKey] = 0;
      }

      const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
      const now = endOfDay(new Date());

      const salesQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
        where('createdAt', '<=', Timestamp.fromDate(now))
      );

      const salesSnapshot = await getDocs(salesQuery);

      salesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'concluida') {
          const saleDate = data.createdAt.toDate();
          const dateKey = format(saleDate, 'dd/MM');
          if (salesByDay[dateKey] !== undefined) {
            salesByDay[dateKey]++;
            revenueByDay[dateKey] += getSaleReceivedAmount(data);
          }
        }
      });

      // Somar baixas de contas a receber nos últimos 7 dias ao faturamento do gráfico
      const receivablePayments = await getTodayReceivablePayments();
      receivablePayments.forEach(payment => {
        const paidDate = payment.paidAt?.toDate?.() || new Date(payment.paidAt);
        const dateKey = format(paidDate, 'dd/MM');
        if (revenueByDay[dateKey] !== undefined) {
          revenueByDay[dateKey] += Number(payment.paidAmount || 0);
        }
      });

      const salesChartData = last7Days.map(date => ({
        date,
        vendas: salesByDay[date],
        faturamento: Number((revenueByDay[date] || 0).toFixed(2)),
      }));

      const revenueChartData = last7Days.map(date => ({
        date,
        faturamento: Number((revenueByDay[date] || 0).toFixed(2)),
      }));

      setSalesData(salesChartData);
      setRevenueData(revenueChartData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const loadSellerData = async () => {
    try {
      const salesQuery = query(collection(db, 'sales'));
      const salesSnapshot = await getDocs(salesQuery);

      const sellerStats: any = {};

      salesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const sellerName = data.sellerName || data.createdByName || data.userName || 'Vendedor Desconhecido';

        if (data.status === 'concluida') {
          if (!sellerStats[sellerName]) {
            sellerStats[sellerName] = {
              vendedor: sellerName,
              vendas: 0,
              faturamento: 0,
            };
          }

          sellerStats[sellerName].vendas++;
          sellerStats[sellerName].faturamento += getSaleReceivedAmount(data);
        }
      });

      const sellersArray = Object.values(sellerStats)
        .sort((a: any, b: any) => b.faturamento - a.faturamento);

      setSellerData(sellersArray);
    } catch (error) {
      console.error('Error loading seller data:', error);
    }
  };

  const salesVariation = stats.yesterdaySales > 0
    ? ((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales) * 100
    : 0;

  const revenueVariation = stats.yesterdayRevenue > 0
    ? ((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100
    : 0;

  if (!permissions.canViewDashboard) {
    return <Redirect to="/pdv" />;
  }

  const liquidGlassCard = "backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300";

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-white/70">Visão geral do seu negócio</p>
        </div>

        {loading && (
          <div className="text-center text-white/70 py-8">
            Carregando dados...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className={liquidGlassCard}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                {salesVariation !== 0 && (
                  <div className={`flex items-center gap-1 text-sm font-semibold ${salesVariation > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {salesVariation > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(salesVariation).toFixed(1)}%
                  </div>
                )}
              </div>
              <h3 className="text-white/70 text-sm mb-1">Vendas Hoje</h3>
              <p className="text-3xl font-bold text-white">{stats.todaySales}</p>
              <p className="text-white/50 text-xs mt-2">vs. {stats.yesterdaySales} ontem</p>
            </div>
          </Card>

          <Card className={liquidGlassCard}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                {revenueVariation !== 0 && (
                  <div className={`flex items-center gap-1 text-sm font-semibold ${revenueVariation > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {revenueVariation > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(revenueVariation).toFixed(1)}%
                  </div>
                )}
              </div>
              <h3 className="text-white/70 text-sm mb-1">Faturamento Hoje</h3>
              <p className="text-3xl font-bold text-white">
                R$ {stats.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-white/50 text-xs mt-2">
                vs. R$ {stats.yesterdayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ontem
              </p>
            </div>
          </Card>

          <Card className={liquidGlassCard}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center ${stats.lowStockProducts > 0 ? 'animate-pulse' : ''}`}>
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                {stats.lowStockProducts > 0 && (
                  <span className="text-orange-400 text-sm font-semibold">Atenção</span>
                )}
              </div>
              <h3 className="text-white/70 text-sm mb-1">Estoque Baixo</h3>
              <p className="text-3xl font-bold text-white">{stats.lowStockProducts}</p>
              <p className="text-white/50 text-xs mt-2">
                {stats.lowStockProducts === 0 ? 'Tudo OK!' : 'produtos precisam reposição'}
              </p>
            </div>
          </Card>

          <Card className={liquidGlassCard}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-white/70 text-sm mb-1">Clientes</h3>
              <p className="text-3xl font-bold text-white">{stats.totalClients}</p>
              <p className="text-white/50 text-xs mt-2">{stats.totalClients} clientes cadastrados</p>
            </div>
          </Card>
        </div>

        {lowStockProducts.length > 0 && (
          <LowStockAlert products={lowStockProducts} />
        )}

        {upcomingDues.length > 0 && (
          <Card className="backdrop-blur-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Contas Próximas ao Vencimento</h3>
                    <p className="text-white/70 text-sm">{upcomingDues.length} conta(s) vence(m) nos próximos 3 dias</p>
                  </div>
                </div>
                <a
                  href="/contas-pagar"
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/20"
                >
                  Ver Contas a Pagar
                </a>
              </div>

              <div className="space-y-3 mt-4">
                {upcomingDues.slice(0, 5).map((item, index) => {
                  const isUrgent = item.daysUntilDue <= 1;
                  const bgColor = isUrgent ? 'bg-red-500/20 border-red-500/30' : 'bg-yellow-500/20 border-yellow-500/30';
                  const textColor = isUrgent ? 'text-red-400' : 'text-yellow-400';

                  return (
                    <div key={index} className={`p-4 rounded-lg border ${bgColor} backdrop-blur-sm`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.account.description}</p>
                          <p className="text-white/60 text-sm mt-1">
                            Categoria: {item.account.category} | Parcela {item.installment.installmentNumber}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-white font-bold text-lg">
                            R$ {item.installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className={`text-sm font-semibold ${textColor}`}>
                            {item.daysUntilDue === 0 ? 'Vence HOJE' :
                             item.daysUntilDue === 1 ? 'Vence AMANHÃ' :
                             `Vence em ${item.daysUntilDue} dias`}
                          </p>
                          <p className="text-white/50 text-xs mt-1">
                            {formatDate(item.installment.dueDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {upcomingDues.length > 5 && (
                  <p className="text-white/50 text-sm text-center pt-2">
                    + {upcomingDues.length - 5} conta(s) adicional(is)
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {receivablesDueToday.length > 0 && (
          <Card className="backdrop-blur-2xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Contas a Receber - Vencendo Hoje</h3>
                    <p className="text-white/70 text-sm">{receivablesDueToday.length} parcela(s) vence(m) hoje</p>
                  </div>
                </div>
                <a
                  href="/contas-receber"
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/20"
                >
                  Ver Contas a Receber
                </a>
              </div>

              <div className="space-y-3 mt-4">
                {receivablesDueToday.slice(0, 5).map((item, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-blue-500/20 border-blue-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{item.account.clientName || 'Cliente não informado'}</p>
                        <p className="text-white/50 text-sm">Venda #{item.account.saleNumber} | Parcela {item.installment.installmentNumber}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-white font-bold text-lg">
                          R$ {item.installment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm font-semibold text-blue-400">Vence HOJE</p>
                        <p className="text-white/50 text-xs mt-1">
                          {formatDate(item.installment.dueDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {receivablesDueToday.length > 5 && (
                  <p className="text-white/50 text-sm text-center pt-2">
                    + {receivablesDueToday.length - 5} parcela(s) adicional(is)
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesLineChart data={salesData} />
          <RevenueAreaChart data={revenueData} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <SellerPerformanceChart data={sellerData} />
        </div>
      </div>
    </Layout>
  );
}