import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Trophy, Award, Medal } from 'lucide-react';

const liquidGlassCard = "backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl";

// Cores para os gráficos
const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

// Componente de Tooltip customizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white/90 text-sm">
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Gráfico de Vendas por Período (Linha)
interface SalesLineChartProps {
  data: { date: string; vendas: number; faturamento: number }[];
}

export function SalesLineChart({ data }: SalesLineChartProps) {
  return (
    <Card className={liquidGlassCard}>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Vendas por Período</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" />
            <YAxis stroke="rgba(255,255,255,0.7)" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#fff' }} />
            <Line
              type="monotone"
              dataKey="vendas"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', r: 5 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Gráfico de Faturamento (Área)
interface RevenueAreaChartProps {
  data: { date: string; faturamento: number }[];
}

export function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  return (
    <Card className={liquidGlassCard}>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Evolução de Faturamento</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" />
            <YAxis stroke="rgba(255,255,255,0.7)" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="faturamento"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Gráfico de Performance por Vendedor (Barras)
interface SellerPerformanceChartProps {
  data: { vendedor: string; vendas: number; faturamento: number }[];
}

export function SellerPerformanceChart({ data }: SellerPerformanceChartProps) {
  // Ordenar dados por faturamento (maior para menor)
  const sortedData = [...data].sort((a, b) => b.faturamento - a.faturamento);
  
  // Se não houver dados, mostrar mensagem
  if (sortedData.length === 0) {
    return (
      <Card className={liquidGlassCard}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-white" />
              <h3 className="text-2xl font-bold text-white">Ranking de Vendedores</h3>
            </div>
              <p className="text-white/60 text-sm">Performance e faturamento por vendedor</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-white/70 text-lg">Nenhuma venda registrada ainda</p>
            <p className="text-white/50 text-sm mt-2">Os dados aparecerão aqui após as primeiras vendas</p>
          </div>
        </div>
      </Card>
    );
  }
  
  // Cores gradiente para cada vendedor
  const gradientColors = [
    { start: '#8b5cf6', end: '#ec4899' }, // Roxo para Rosa
    { start: '#06b6d4', end: '#3b82f6' }, // Ciano para Azul
    { start: '#10b981', end: '#059669' }, // Verde
    { start: '#f59e0b', end: '#ef4444' }, // Laranja para Vermelho
    { start: '#ec4899', end: '#8b5cf6' }, // Rosa para Roxo
  ];

  return (
    <Card className={liquidGlassCard}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-white" />
              <h3 className="text-2xl font-bold text-white">Ranking de Vendedores</h3>
            </div>
            <p className="text-white/60 text-sm">Performance e faturamento por vendedor</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Total de Vendedores</p>
            <p className="text-white font-bold text-2xl">{sortedData.length}</p>
          </div>
        </div>

        {/* Gráfico de Barras com Gradiente */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              {sortedData.map((entry, index) => {
                const color = gradientColors[index % gradientColors.length];
                return (
                  <linearGradient key={`gradient-${index}`} id={`colorGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color.start} stopOpacity={1} />
                    <stop offset="100%" stopColor={color.end} stopOpacity={0.8} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis 
              dataKey="vendedor" 
              stroke="rgba(255,255,255,0.7)" 
              tick={{ fill: '#fff', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.7)" 
              tick={{ fill: '#fff', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/30 rounded-xl p-4 shadow-2xl">
                      <p className="text-white font-bold text-lg mb-2">{payload[0].payload.vendedor}</p>
                      <div className="space-y-1">
                        <p className="text-white/90 text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                          Vendas: <span className="font-bold">{payload[0].payload.vendas}</span>
                        </p>
                        <p className="text-white/90 text-sm flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                          Faturamento: <span className="font-bold">R$ {payload[0].payload.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="faturamento" 
              radius={[12, 12, 0, 0]}
              maxBarSize={80}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#colorGradient${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Ranking Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedData.slice(0, 3).map((seller, index) => {
            const MedalIcons = [Trophy, Award, Medal];
            const MedalIcon = MedalIcons[index];
            const bgColors = [
              'bg-white/10 border-white/20',
              'bg-white/10 border-white/20',
              'bg-white/10 border-white/20'
            ];
            
            return (
              <div key={index} className={`backdrop-blur-xl ${bgColors[index]} border rounded-xl p-4 transition-all hover:scale-105 hover:shadow-2xl`}>
                <div className="flex items-center gap-3 mb-2">
                  <MedalIcon className="w-8 h-8 text-white" />
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg">{seller.vendedor}</p>
                    <p className="text-white/60 text-xs">#{index + 1} no ranking</p>
                  </div>
                </div>
                <div className="space-y-1 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Vendas</span>
                    <span className="text-white font-bold">{seller.vendas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Faturamento</span>
                    <span className="text-white font-bold">R$ {seller.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// Gráfico de Vendas por Categoria (Pizza)
interface CategoryPieChartProps {
  data: { name: string; value: number }[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  return (
    <Card className={liquidGlassCard}>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Vendas por Categoria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Gráfico de Top Produtos (Barras Horizontais)
interface TopProductsChartProps {
  data: { produto: string; quantidade: number }[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <Card className={liquidGlassCard}>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Top 10 Produtos Mais Vendidos</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" stroke="rgba(255,255,255,0.7)" />
            <YAxis dataKey="produto" type="category" stroke="rgba(255,255,255,0.7)" width={150} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="quantidade" fill="#06b6d4" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Gráfico de Formas de Pagamento (Pizza)
interface PaymentMethodChartProps {
  data: { name: string; value: number }[];
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  return (
    <Card className={liquidGlassCard}>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Formas de Pagamento</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
