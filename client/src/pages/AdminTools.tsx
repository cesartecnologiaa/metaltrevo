import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Trash2, Wallet, Banknote, Database, Upload, FileJson, Eraser, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, deleteDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
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
    title: 'Apagar dados operacionais',
    description: 'Deleta dados operacionais do sistema, mas preserva os usuários atuais para você não perder acesso.',
    collections: [
      'sales',
      'cashRegisters',
      'cashWithdrawals',
      'accountsPayable',
      'accountsReceivable',
      'clients',
      'products',
      'categories',
      'suppliers',
      'quotations',
      'stock_movements',
      'settings',
      'legacyVendors'
    ],
    danger: true,
    icon: Database,
  },
};

const IMPORT_COLLECTIONS = ['products', 'clients', 'accountsReceivable', 'accountsPayable', 'legacyVendors'];

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function convertValue(value: any): any {
  if (Array.isArray(value)) return value.map(convertValue);

  if (value && typeof value === 'object') {
    if (value.seconds !== undefined && value.nanoseconds !== undefined) {
      return new Timestamp(value.seconds, value.nanoseconds);
    }

    const out: Record<string, any> = {};
    Object.entries(value).forEach(([key, inner]) => {
      if (inner !== undefined) out[key] = convertValue(inner);
    });
    return out;
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return Timestamp.fromDate(parsed);
    }
  }

  return value;
}

async function readJsonFile(file: File | null) {
  if (!file) return [];
  const raw = await file.text();
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export default function AdminTools() {
  const { userData } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ActionKey | null>(null);

  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [receivablesFile, setReceivablesFile] = useState<File | null>(null);
  const [payablesFile, setPayablesFile] = useState<File | null>(null);
  const [vendorsFile, setVendorsFile] = useState<File | null>(null);
  const [summaryFile, setSummaryFile] = useState<File | null>(null);
  const [clearBeforeImport, setClearBeforeImport] = useState(true);

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

  const importSummary = useMemo(() => ({
    products: productsFile?.name || 'Nenhum arquivo',
    clients: clientsFile?.name || 'Nenhum arquivo',
    receivables: receivablesFile?.name || 'Nenhum arquivo',
    payables: payablesFile?.name || 'Nenhum arquivo',
    vendors: vendorsFile?.name || 'Nenhum arquivo',
    summary: summaryFile?.name || 'Nenhum arquivo',
  }), [productsFile, clientsFile, receivablesFile, payablesFile, vendorsFile, summaryFile]);

  const importLegacyData = async () => {
    try {
      setLoading(true);

      const [products, clients, accountsReceivable, accountsPayable, vendors, summary] = await Promise.all([
        readJsonFile(productsFile),
        readJsonFile(clientsFile),
        readJsonFile(receivablesFile),
        readJsonFile(payablesFile),
        readJsonFile(vendorsFile),
        summaryFile ? summaryFile.text().then((txt) => JSON.parse(txt)) : Promise.resolve(null),
      ]);

      const totalRecords =
        products.length +
        clients.length +
        accountsReceivable.length +
        accountsPayable.length +
        vendors.length;

      if (totalRecords === 0) {
        toast.error('Nenhum JSON válido foi selecionado para importar.');
        return;
      }

      if (clearBeforeImport) {
        await deleteCollections(IMPORT_COLLECTIONS);
      }

      const importMap: Array<{ collectionName: string; records: any[] }> = [
        { collectionName: 'products', records: products },
        { collectionName: 'clients', records: clients },
        { collectionName: 'accountsReceivable', records: accountsReceivable },
        { collectionName: 'accountsPayable', records: accountsPayable },
        { collectionName: 'legacyVendors', records: vendors },
      ];

      let written = 0;

      for (const entry of importMap) {
        const chunks = chunk(entry.records, 350);

        for (const recordsChunk of chunks) {
          const batch = writeBatch(db);

          recordsChunk.forEach((record: any, index) => {
            const id =
              record?.id ||
              `${entry.collectionName}-legacy-${written + index + 1}`;

            const payload = convertValue({ ...record });
            delete payload.id;

            batch.set(doc(db, entry.collectionName, id), payload);
          });

          await batch.commit();
          written += recordsChunk.length;
        }
      }

      if (summary) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'settings', 'legacyImportSummary'), convertValue(summary));
        await batch.commit();
      }

      toast.success(`Importação concluída com sucesso. ${written} registro(s) importado(s). Usuários atuais preservados.`);
    } catch (error) {
      console.error('Error importing legacy data:', error);
      toast.error('Erro ao importar os dados do legado.');
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
          <p className="text-white/70">Gerenciamento, limpeza e importação de dados do sistema</p>
        </div>

        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-emerald-400 mb-2">Proteção de acesso</h3>
                <p className="text-white/80">
                  Esta versão do importador <strong>não apaga a coleção users</strong>. Os vendedores do sistema legado são importados para <code className="text-emerald-300">legacyVendors</code>, preservando seu acesso atual ao sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar dados do sistema legado
            </CardTitle>
            <CardDescription className="text-white/70">
              Envie os arquivos JSON recuperados do sistema antigo. Produtos, clientes e cobranças serão importados para o Firestore. Os usuários atuais serão preservados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['Produtos (products.json)', setProductsFile, importSummary.products],
                ['Clientes (clients.json)', setClientsFile, importSummary.clients],
                ['Contas a Receber (accountsReceivable.json)', setReceivablesFile, importSummary.receivables],
                ['Contas a Pagar (accountsPayable.json)', setPayablesFile, importSummary.payables],
                ['Vendedores (vendors.json)', setVendorsFile, importSummary.vendors],
                ['Resumo (summary.json) - opcional', setSummaryFile, importSummary.summary],
              ].map(([label, setter, fileName]) => (
                <div key={label as string} className="space-y-2">
                  <label className="block text-sm font-medium text-white">{label as string}</label>
                  <label className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors">
                    <FileJson className="w-4 h-4 text-cyan-300" />
                    <span className="text-white/80 text-sm truncate">{fileName as string}</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => (setter as any)(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
              <input
                id="clearBeforeImport"
                type="checkbox"
                checked={clearBeforeImport}
                onChange={(e) => setClearBeforeImport(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="clearBeforeImport" className="text-sm text-white/90">
                Limpar antes as coleções de destino (<code>products</code>, <code>clients</code>, <code>accountsReceivable</code>, <code>accountsPayable</code>, <code>legacyVendors</code>)
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={importLegacyData}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar JSONs para o Firestore
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setProductsFile(null);
                  setClientsFile(null);
                  setReceivablesFile(null);
                  setPayablesFile(null);
                  setVendorsFile(null);
                  setSummaryFile(null);
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Eraser className="w-4 h-4 mr-2" />
                Limpar seleção
              </Button>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              <p className="font-semibold text-white mb-2">Como esta importação funciona</p>
              <ul className="space-y-1 list-disc ml-5">
                <li>Produtos serão importados com estoque, preço de compra, preço de venda e código.</li>
                <li>Clientes serão importados com nome, documento, telefone e saldo legado.</li>
                <li>Contas a receber em aberto serão importadas para <code>accountsReceivable</code>. Os 351 registros recuperados mostram cada cobrança como pendente com saldo atual. </li>
                <li>Os vendedores recuperados serão importados em <code>legacyVendors</code>, preservando os usuários atuais.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">⚠️ Zona de Perigo</h3>
                <p className="text-white/80">
                  As ações abaixo são <strong>irreversíveis</strong>. Esta versão preserva seus usuários atuais, mas pode apagar dados operacionais do sistema.
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
                        {danger ? 'APAGAR DADOS OPERACIONAIS' : `Deletar ${cfg.title.replace('Limpar ', '')}`}
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
