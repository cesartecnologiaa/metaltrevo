import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Trash2, Wallet, Banknote, Database } from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ActionKey = 'sales' | 'cash' | 'withdrawals' | 'payables' | 'receivables' | 'all';

const COLLECTIONS: Record<ActionKey, { title: string; description: string; collections: string[]; danger?: boolean; icon: any }> = {
  sales: {
    title: 'Limpar Vendas',
    description: 'Deleta todas as vendas registradas no sistema.',
    collections: ['sales'],
    icon: Trash2,
  },
  cash: {
    title: 'Limpar Caixas',
    description: 'Deleta todos os registros de caixas abertos/fechados.',
    collections: ['cashRegisters'],
    icon: Wallet,
  },
  withdrawals: {
    title: 'Limpar Sangrias',
    description: 'Deleta todos os registros de sangrias de caixa.',
    collections: ['cashWithdrawals'],
    icon: Banknote,
  },
  payables: {
    title: 'Limpar Contas a Pagar',
    description: 'Deleta todas as contas a pagar cadastradas.',
    collections: ['accountsPayable'],
    icon: Wallet,
  },
  receivables: {
    title: 'Limpar Contas a Receber',
    description: 'Deleta todas as contas a receber cadastradas.',
    collections: ['accountsReceivable'],
    icon: Wallet,
  },
  all: {
    title: 'Apagar tudo do banco',
    description: 'Deleta os principais dados do sistema: vendas, caixa, sangrias, contas a pagar/receber, clientes, produtos, categorias, fornecedores, cotações, usuários, estoque e configurações.',
    collections: ['sales', 'cashRegisters', 'cashWithdrawals', 'accountsPayable', 'accountsReceivable', 'clients', 'products', 'categories', 'suppliers', 'quotations', 'stock_movements', 'users', 'settings'],
    danger: true,
    icon: Database,
  },
};

export default function AdminTools() {
  const { userData } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ActionKey | null>(null);

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

  const deleteCollections = async (collectionsToClear: string[]) => {
    let deleted = 0;
    for (const collectionName of collectionsToClear) {
      const snapshot = await getDocs(collection(db, collectionName));
      for (const snapshotDoc of snapshot.docs) {
        await deleteDoc(doc(db, collectionName, snapshotDoc.id));
        deleted++;
      }
    }
    return deleted;
  };

  const handleAction = async (action: ActionKey) => {
    try {
      setLoading(true);
      const deleted = await deleteCollections(COLLECTIONS[action].collections);
      if (deleted === 0) {
        toast.info('Nenhum registro encontrado para deletar.');
      } else {
        toast.success(`${deleted} registro(s) deletado(s) com sucesso!`);
      }
      setConfirmDialog(null);
    } catch (error) {
      console.error(`Error clearing ${action}:`, error);
      toast.error('Erro ao deletar registros.');
    } finally {
      setLoading(false);
    }
  };

  const cards: ActionKey[] = ['sales', 'cash', 'withdrawals', 'payables', 'receivables', 'all'];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Ferramentas Administrativas</h1>
          <p className="text-white/70">Gerenciamento e limpeza de dados do sistema</p>
        </div>

        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">⚠️ Zona de Perigo</h3>
                <p className="text-white/80">
                  As ações abaixo são <strong>irreversíveis</strong> e deletam permanentemente os dados do banco.
                  O botão de apagar tudo remove as principais coleções conhecidas do sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((key) => {
            const cfg = COLLECTIONS[key];
            const Icon = cfg.icon;
            const danger = !!cfg.danger;
            return (
              <Card key={key} className={danger ? 'bg-red-500/20 border-red-500/40' : 'bg-white/10 border-white/20'}>
                <CardHeader>
                  <CardTitle className={`${danger ? 'text-red-400' : 'text-white'} flex items-center gap-2`}>
                    <Icon className="w-5 h-5" />
                    {cfg.title}
                  </CardTitle>
                  <CardDescription className="text-white/70">{cfg.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setConfirmDialog(key)}
                    disabled={loading}
                    variant="destructive"
                    className={`w-full ${danger ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Icon className="w-4 h-4 mr-2" />
                        {danger ? 'APAGAR TUDO' : `Deletar ${cfg.title.replace('Limpar ', '')}`}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
                {confirmDialog ? COLLECTIONS[confirmDialog].description : 'Tem certeza que deseja continuar?'}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmDialog && handleAction(confirmDialog)}
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
