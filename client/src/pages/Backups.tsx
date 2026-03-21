import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Database, Download, Clock, HardDrive, Calendar, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import {
  createBackup,
  listBackups,
  downloadBackup,
  formatFileSize,
  restoreBackup,
  readBackupFile,
  cleanupOldBackups,
  type BackupMetadata,
  type RestoreProgress,
} from '@/services/backupService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
// Agendamentos de backup
const BACKUP_SCHEDULES = [
  {
    name: 'Backup meio-dia (seg-sex)',
    cron: '0 12 * * 1-5',
    description: 'Segunda a sexta às 12:00',
  },
  {
    name: 'Backup tarde (seg-sex)',
    cron: '30 17 * * 1-5',
    description: 'Segunda a sexta às 17:30',
  },
  {
    name: 'Backup sábado',
    cron: '30 12 * * 6',
    description: 'Sábado às 12:30',
  },
];
import { formatDate } from '@/lib/firestoreUtils';

export default function Backups() {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const data = await listBackups();
      setBackups(data);
    } catch (error) {
      toast.error('Não foi possível carregar os backups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await createBackup();
      toast.success('Backup criado com sucesso');
      
      // Executar limpeza automática após criar backup
      try {
        const deletedCount = await cleanupOldBackups(30);
        if (deletedCount > 0) {
          toast.info(`${deletedCount} backup(s) antigo(s) removido(s) automaticamente`);
        }
      } catch (cleanupError) {
        console.error('Erro na limpeza automática:', cleanupError);
        // Não mostrar erro ao usuário, apenas logar
      }
      
      await loadBackups();
    } catch (error) {
      toast.error('Não foi possível criar o backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      await downloadBackup(filename);
      toast.success('Download iniciado');
    } catch (error) {
      toast.error('Não foi possível baixar o backup');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar se é um arquivo JSON
    if (!file.name.endsWith('.json')) {
      toast.error('Por favor, selecione um arquivo JSON válido');
      return;
    }

    try {
      // Validar estrutura do arquivo
      await readBackupFile(file);
      setSelectedFile(file);
      setRestoreDialogOpen(true);
    } catch (error: any) {
      toast.error(error.message || 'Arquivo de backup inválido');
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRestoreConfirm = async () => {
    if (!selectedFile) return;

    try {
      setRestoring(true);
      setRestoreDialogOpen(false);
      
      // Ler arquivo
      const backupData = await readBackupFile(selectedFile);
      
      // Restaurar com callback de progresso
      await restoreBackup(backupData, (progress) => {
        setRestoreProgress(progress);
      });

      toast.success('Backup restaurado com sucesso!');
      setRestoreProgress(null);
      await loadBackups();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao restaurar backup');
      setRestoreProgress(null);
    } finally {
      setRestoring(false);
      setSelectedFile(null);
    }
  };

  const handleRestoreCancel = () => {
    setRestoreDialogOpen(false);
    setSelectedFile(null);
  };

  const handleCleanupBackups = async () => {
    try {
      setCleaning(true);
      const deletedCount = await cleanupOldBackups(30);
      
      if (deletedCount === 0) {
        toast.info('Nenhum backup antigo para remover. Total de backups está dentro do limite.');
      } else {
        toast.success(`${deletedCount} backup(s) antigo(s) removido(s) com sucesso`);
      }
      
      await loadBackups();
    } catch (error) {
      toast.error('Não foi possível executar a limpeza de backups');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Database className="w-8 h-8" />
            Backups do Sistema
          </h1>
          <p className="text-white/60 mt-1">
            Gerencie backups automáticos e manuais do banco de dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCleanupBackups}
            disabled={cleaning || backups.length <= 30}
            variant="outline"
            className="bg-red-600/10 border-red-600/30 hover:bg-red-600/20 text-red-200 disabled:opacity-50"
            title={backups.length <= 30 ? 'Limpeza não necessária (menos de 30 backups)' : 'Remover backups antigos (manter últimos 30)'}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {cleaning ? 'Limpando...' : 'Limpar Antigos'}
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
            variant="outline"
            className="bg-orange-600/10 border-orange-600/30 hover:bg-orange-600/20 text-orange-200"
          >
            <Upload className="w-4 h-4 mr-2" />
            {restoring ? 'Restaurando...' : 'Restaurar Backup'}
          </Button>
          <Button
            onClick={handleCreateBackup}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700"
          >
            <Database className="w-4 h-4 mr-2" />
            {creating ? 'Criando...' : 'Criar Backup Manual'}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Agendamento */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Agendamento Automático</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BACKUP_SCHEDULES.map((schedule, index) => (
            <div
              key={index}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <p className="text-white font-semibold">{schedule.name}</p>
              </div>
              <p className="text-white/70 text-sm">{schedule.description}</p>
              <p className="text-white/50 text-xs mt-2 font-mono">{schedule.cron}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-200 text-sm">
            <strong>📌 Horários Recomendados:</strong> Recomendamos criar backups manuais nos horários acima para manter seus dados seguros. Configure lembretes no seu celular ou computador para não esquecer!
          </p>
          <p className="text-blue-200/70 text-xs mt-2">
            <strong>Dica:</strong> O sistema mantém automaticamente os últimos 30 backups. Backups mais antigos são removidos automaticamente após cada novo backup criado.
          </p>
        </div>
      </Card>

      {/* Lista de Backups */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-bold text-white">Backups Disponíveis</h2>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="text-white/60 mt-2">Carregando backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8">
            <Database className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">Nenhum backup disponível</p>
            <p className="text-white/40 text-sm mt-1">
              Clique em "Criar Backup Manual" para criar o primeiro backup
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup, index) => (
              <div
                key={index}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-white font-semibold">{backup.name}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-white/60 text-sm">
                      {formatDate(backup.createdAt)}
                    </span>
                    <span className="text-white/60 text-sm">
                      {formatFileSize(backup.size)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(backup.name)}
                  variant="outline"
                  size="sm"
                  className="bg-transparent hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal de Confirmação de Restauração */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent className="backdrop-blur-xl bg-slate-900/95 border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              Confirmar Restauração de Backup
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80 space-y-3">
              <p>
                Você está prestes a restaurar o backup:
              </p>
              <p className="font-semibold text-white bg-white/10 p-2 rounded">
                {selectedFile?.name}
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                <p className="font-bold text-red-300">⚠️ ATENÇÃO:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-200/90">
                  <li>Esta ação irá <strong>SUBSTITUIR</strong> todos os dados atuais do sistema</li>
                  <li>Todos os dados existentes serão <strong>SOBRESCRITOS</strong></li>
                  <li>Esta operação <strong>NÃO PODE SER DESFEITA</strong></li>
                  <li>Recomendamos criar um backup atual antes de prosseguir</li>
                </ul>
              </div>
              <p className="text-yellow-300 text-sm">
                Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRestoreCancel} className="bg-white/10 hover:bg-white/20">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, Restaurar Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Indicador de Progresso da Restauração */}
      {restoring && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="backdrop-blur-xl bg-slate-900/95 border-blue-500/30 p-8 max-w-md w-full mx-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <div>
                  <h3 className="text-xl font-bold text-white">Restaurando Backup...</h3>
                  <p className="text-white/60 text-sm">Por favor, aguarde</p>
                </div>
              </div>

              {restoreProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">
                      Coleção: <strong className="text-blue-400">{restoreProgress.collection}</strong>
                    </span>
                    <span className="text-white/60">
                      {restoreProgress.current} / {restoreProgress.total}
                    </span>
                  </div>
                  <Progress value={restoreProgress.percentage} className="h-2" />
                  <p className="text-center text-white/60 text-sm">
                    {restoreProgress.percentage}% concluído
                  </p>
                </div>
              )}

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-200 text-sm text-center">
                  ⚠️ Não feche esta janela durante a restauração
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
