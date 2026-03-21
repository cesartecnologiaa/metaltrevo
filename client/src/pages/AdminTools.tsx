import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminTools() {
  const { userData } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  // Verificar se é admin
  if (userData?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="bg-white/10 border-white/20 max-w-md">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h3 className="text-xl font-semibold text-white mb-2">Acesso Negado</h3>
              <p className="text-white/70">Apenas administradores podem acessar esta página.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const handleClearSales = async () => {
    try {
      setLoading(true);
      const salesSnapshot = await getDocs(collection(db, 'sales'));
      
      if (salesSnapshot.empty) {
        toast.info('Nenhuma venda encontrada para deletar');
        return;
      }

      let deleted = 0;
      for (const saleDoc of salesSnapshot.docs) {
        await deleteDoc(doc(db, 'sales', saleDoc.id));
        deleted++;
      }

      toast.success(`${deleted} vendas deletadas com sucesso!`);
      setConfirmDialog(null);
    } catch (error) {
      console.error('Error clearing sales:', error);
      toast.error('Erro ao deletar vendas');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCashRegisters = async () => {
    try {
      setLoading(true);
      const cashSnapshot = await getDocs(collection(db, 'cashRegisters'));
      
      if (cashSnapshot.empty) {
        toast.info('Nenhum caixa encontrado para deletar');
        return;
      }

      let deleted = 0;
      for (const cashDoc of cashSnapshot.docs) {
        await deleteDoc(doc(db, 'cashRegisters', cashDoc.id));
        deleted++;
      }

      toast.success(`${deleted} caixas deletados com sucesso!`);
      setConfirmDialog(null);
    } catch (error) {
      console.error('Error clearing cash registers:', error);
      toast.error('Erro ao deletar caixas');
    } finally {
      setLoading(false);
    }
  };

  const handleClearWithdrawals = async () => {
    try {
      setLoading(true);
      const withdrawalsSnapshot = await getDocs(collection(db, 'cashWithdrawals'));
      
      if (withdrawalsSnapshot.empty) {
        toast.info('Nenhuma sangria encontrada para deletar');
        return;
      }

      let deleted = 0;
      for (const withdrawalDoc of withdrawalsSnapshot.docs) {
        await deleteDoc(doc(db, 'cashWithdrawals', withdrawalDoc.id));
        deleted++;
      }

      toast.success(`${deleted} sangrias deletadas com sucesso!`);
      setConfirmDialog(null);
    } catch (error) {
      console.error('Error clearing withdrawals:', error);
      toast.error('Erro ao deletar sangrias');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setLoading(true);
      
      // Deletar vendas
      const salesSnapshot = await getDocs(collection(db, 'sales'));
      for (const saleDoc of salesSnapshot.docs) {
        await deleteDoc(doc(db, 'sales', saleDoc.id));
      }

      // Deletar caixas
      const cashSnapshot = await getDocs(collection(db, 'cashRegisters'));
      for (const cashDoc of cashSnapshot.docs) {
        await deleteDoc(doc(db, 'cashRegisters', cashDoc.id));
      }

      // Deletar sangrias
      const withdrawalsSnapshot = await getDocs(collection(db, 'cashWithdrawals'));
      for (const withdrawalDoc of withdrawalsSnapshot.docs) {
        await deleteDoc(doc(db, 'cashWithdrawals', withdrawalDoc.id));
      }

      const total = salesSnapshot.size + cashSnapshot.size + withdrawalsSnapshot.size;
      toast.success(`${total} registros deletados com sucesso!`);
      setConfirmDialog(null);
    } catch (error) {
      console.error('Error clearing all data:', error);
      toast.error('Erro ao deletar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Ferramentas Administrativas</h1>
          <p className="text-white/70">Gerenciamento e limpeza de dados do sistema</p>
        </div>

        {/* Aviso de Perigo */}
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">⚠️ Zona de Perigo</h3>
                <p className="text-white/80">
                  As ações abaixo são <strong>irreversíveis</strong> e deletarão permanentemente os dados do banco de dados.
                  Use com extrema cautela!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações de Limpeza */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Limpar Vendas */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Limpar Vendas
              </CardTitle>
              <CardDescription className="text-white/70">
                Deleta todas as vendas registradas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setConfirmDialog('sales')}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar Todas as Vendas
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Limpar Caixas */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Limpar Caixas
              </CardTitle>
              <CardDescription className="text-white/70">
                Deleta todos os registros de caixas abertos/fechados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setConfirmDialog('cash')}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar Todos os Caixas
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Limpar Sangrias */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Limpar Sangrias
              </CardTitle>
              <CardDescription className="text-white/70">
                Deleta todos os registros de sangrias de caixa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setConfirmDialog('withdrawals')}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar Todas as Sangrias
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Limpar Tudo */}
          <Card className="bg-red-500/20 border-red-500/40">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Limpar TUDO
              </CardTitle>
              <CardDescription className="text-white/70">
                Deleta TODOS os dados: vendas, caixas e sangrias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setConfirmDialog('all')}
                disabled={loading}
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    DELETAR TUDO
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Dialog de Confirmação */}
        <Dialog open={confirmDialog !== null} onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent className="bg-gray-900 text-white border-gray-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Confirmar Exclusão
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Esta ação é <strong>irreversível</strong> e deletará permanentemente os dados selecionados.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-white/90">
                Tem certeza que deseja continuar?
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirmDialog === 'sales') handleClearSales();
                  else if (confirmDialog === 'cash') handleClearCashRegisters();
                  else if (confirmDialog === 'withdrawals') handleClearWithdrawals();
                  else if (confirmDialog === 'all') handleClearAll();
                }}
                disabled={loading}
              >
                {loading ? 'Deletando...' : 'Sim, Deletar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
