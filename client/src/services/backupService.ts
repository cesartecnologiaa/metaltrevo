import { collection, getDocs, doc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { ref, uploadString, listAll, getDownloadURL, getMetadata, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

// Coleções para fazer backup
const COLLECTIONS_TO_BACKUP = [
  'products',
  'categories',
  'suppliers',
  'clients',
  'sales',
  'users',
  'accountsPayable',
  'accountsReceivable',
  'companySettings',
];

export interface BackupMetadata {
  name: string;
  url: string;
  createdAt: Date;
  size: number;
}

/**
 * Cria um backup completo do Firestore
 */
export async function createBackup(): Promise<string> {
  try {
    const backupData: Record<string, any[]> = {};
    
    // Exportar cada coleção
    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      backupData[collectionName] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    }
    
    // Criar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    
    // Converter para JSON
    const jsonData = JSON.stringify(backupData, null, 2);
    
    // Salvar no Firebase Storage
    const storageRef = ref(storage, `backups/${filename}`);
    await uploadString(storageRef, jsonData);
    
    console.log(`Backup criado com sucesso: ${filename}`);
    return filename;
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    throw error;
  }
}

/**
 * Lista todos os backups disponíveis
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  try {
    const backupsRef = ref(storage, 'backups');
    const result = await listAll(backupsRef);
    
    // Buscar URLs e metadados em paralelo para evitar timeout
    const backupsPromises = result.items.map(async (itemRef) => {
      const [url, metadata] = await Promise.all([
        getDownloadURL(itemRef),
        getMetadata(itemRef)
      ]);
      
      return {
        name: itemRef.name,
        url,
        createdAt: new Date(metadata.timeCreated),
        size: metadata.size,
      };
    });
    
    const backups = await Promise.all(backupsPromises);
    
    // Ordenar por data (mais recente primeiro)
    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    throw error;
  }
}

/**
 * Baixa um backup específico
 */
export async function downloadBackup(filename: string): Promise<void> {
  try {
    const storageRef = ref(storage, `backups/${filename}`);
    const url = await getDownloadURL(storageRef);
    
    // Abrir em nova aba para download
    window.open(url, '_blank');
  } catch (error) {
    console.error('Erro ao baixar backup:', error);
    throw error;
  }
}

/**
 * Formata tamanho de arquivo em bytes para formato legível
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Valida a estrutura de um arquivo de backup
 */
export function validateBackupStructure(data: any): { valid: boolean; error?: string } {
  try {
    // Verificar se é um objeto
    if (typeof data !== 'object' || data === null) {
      return { valid: false, error: 'Arquivo inválido: não é um objeto JSON válido' };
    }

    // Verificar se contém pelo menos uma coleção conhecida
    const hasValidCollection = COLLECTIONS_TO_BACKUP.some(col => col in data);
    if (!hasValidCollection) {
      return { valid: false, error: 'Arquivo inválido: nenhuma coleção reconhecida encontrada' };
    }

    // Verificar se cada coleção é um array
    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      if (collectionName in data && !Array.isArray(data[collectionName])) {
        return { valid: false, error: `Coleção "${collectionName}" deve ser um array` };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Erro ao validar estrutura do backup' };
  }
}

/**
 * Converte valores Timestamp serializados de volta para objetos Timestamp
 */
function deserializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Se for um objeto com _seconds e _nanoseconds, é um Timestamp serializado
  if (typeof obj === 'object' && '_seconds' in obj && '_nanoseconds' in obj) {
    return new Timestamp(obj._seconds, obj._nanoseconds);
  }

  // Se for um objeto, processar recursivamente
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    const result: any = {};
    for (const key in obj) {
      result[key] = deserializeTimestamps(obj[key]);
    }
    return result;
  }

  // Se for um array, processar cada elemento
  if (Array.isArray(obj)) {
    return obj.map(item => deserializeTimestamps(item));
  }

  return obj;
}

export interface RestoreProgress {
  collection: string;
  current: number;
  total: number;
  percentage: number;
}

/**
 * Restaura um backup do Firestore
 * @param backupData Dados do backup em formato JSON
 * @param onProgress Callback para acompanhar o progresso
 */
export async function restoreBackup(
  backupData: Record<string, any[]>,
  onProgress?: (progress: RestoreProgress) => void
): Promise<void> {
  try {
    // Validar estrutura
    const validation = validateBackupStructure(backupData);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Restaurar cada coleção
    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      if (!(collectionName in backupData)) {
        continue; // Pular coleções que não estão no backup
      }

      const documents = backupData[collectionName];
      const total = documents.length;

      // Processar em lotes de 500 documentos (limite do Firestore batch)
      const batchSize = 500;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = documents.slice(i, Math.min(i + batchSize, documents.length));

        for (const docData of batchDocs) {
          const { id, ...data } = docData;
          
          // Deserializar Timestamps
          const deserializedData = deserializeTimestamps(data);
          
          const docRef = doc(db, collectionName, id);
          batch.set(docRef, deserializedData);
        }

        await batch.commit();

        // Atualizar progresso
        if (onProgress) {
          const current = Math.min(i + batchSize, documents.length);
          onProgress({
            collection: collectionName,
            current,
            total,
            percentage: Math.round((current / total) * 100),
          });
        }
      }
    }

    console.log('Backup restaurado com sucesso');
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    throw error;
  }
}

/**
 * Lê e valida um arquivo JSON de backup
 */
export async function readBackupFile(file: File): Promise<Record<string, any[]>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        const validation = validateBackupStructure(data);
        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }

        resolve(data);
      } catch (error) {
        reject(new Error('Erro ao ler arquivo: formato JSON inválido'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsText(file);
  });
}

/**
 * Remove backups antigos, mantendo apenas os N mais recentes
 * @param keepCount Número de backups a manter (padrão: 30)
 * @returns Número de backups removidos
 */
export async function cleanupOldBackups(keepCount: number = 30): Promise<number> {
  try {
    // Listar todos os backups
    const backups = await listBackups();
    
    // Se temos menos backups que o limite, não fazer nada
    if (backups.length <= keepCount) {
      console.log(`Total de backups (${backups.length}) está dentro do limite (${keepCount}). Nenhuma limpeza necessária.`);
      return 0;
    }
    
    // Backups já estão ordenados por data (mais recente primeiro)
    // Pegar apenas os que devem ser removidos
    const backupsToDelete = backups.slice(keepCount);
    
    console.log(`Removendo ${backupsToDelete.length} backups antigos...`);
    
    // Remover backups em paralelo
    const deletePromises = backupsToDelete.map(async (backup) => {
      const backupRef = ref(storage, `backups/${backup.name}`);
      await deleteObject(backupRef);
      console.log(`Backup removido: ${backup.name}`);
    });
    
    await Promise.all(deletePromises);
    
    console.log(`Limpeza concluída: ${backupsToDelete.length} backups removidos`);
    return backupsToDelete.length;
  } catch (error) {
    console.error('Erro ao limpar backups antigos:', error);
    throw error;
  }
}
