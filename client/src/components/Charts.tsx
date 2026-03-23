import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type SalesChartItem = {
  date: string;
  vendas: number;
  faturamento?: number;
};

type RevenueChartItem = {
  date: string;
  faturamento: number;
};

type SellerChartItem = {
  vendedor: string;
  vendas: number;
  faturamento: number;
};

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-white/60">
      {message}
    </div>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function SalesLineChart({ data }: { data: SalesChartItem[] }) {
  return (
    <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-white">Vendas dos últimos 7 dias</CardTitle>
        <CardDescription className="text-white/70">
          Quantidade de vendas realizadas por dia
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {!data || data.length === 0 ? (
          <EmptyChartState message="Sem dados para exibir no período." />
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.6)" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(24,24,27,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  name="Vendas"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueAreaChart({ data }: { data: RevenueChartItem[] }) {
  return (
    <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-white">Faturamento dos últimos 7 dias</CardTitle>
        <CardDescription className="text-white/70">
          Evolução do faturamento por dia
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {!data || data.length === 0 ? (
          <EmptyChartState message="Sem faturamento para exibir no período." />
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                <YAxis
                  stroke="rgba(255,255,255,0.6)"
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value || 0)), "Faturamento"]}
                  contentStyle={{
                    background: "rgba(24,24,27,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  name="Faturamento"
                  stroke="#22c55e"
                  fill="url(#revenueFill)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SellerPerformanceChart({ data }: { data: SellerChartItem[] }) {
  return (
    <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-white">Desempenho por vendedor</CardTitle>
        <CardDescription className="text-white/70">
          Comparativo de faturamento entre vendedores
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {!data || data.length === 0 ? (
          <EmptyChartState message="Sem vendedores com vendas para exibir." />
        ) : (
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="vendedor"
                  stroke="rgba(255,255,255,0.6)"
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.6)"
                  tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip
                  formatter={(value: any, name: any) =>
                    name === "faturamento"
                      ? [formatCurrency(Number(value || 0)), "Faturamento"]
                      : [value, "Vendas"]
                  }
                  contentStyle={{
                    background: "rgba(24,24,27,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Legend />
                <Bar dataKey="faturamento" name="faturamento" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}