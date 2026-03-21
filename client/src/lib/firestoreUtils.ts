/**
 * Remove campos undefined de um objeto para evitar erros no Firestore
 * Firestore não aceita valores undefined - eles devem ser removidos ou convertidos para null
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const cleaned: any = {};
  
  for (const key in obj) {
    if (obj[key] !== undefined) {
      // Se for um objeto aninhado, limpar recursivamente
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && Object.prototype.toString.call(obj[key]) !== '[object Date]') {
        cleaned[key] = removeUndefinedFields(obj[key]);
      }
      // Se for um array, limpar cada elemento
      else if (Array.isArray(obj[key])) {
        cleaned[key] = obj[key].map((item: any) => {
          if (item !== null && typeof item === 'object' && Object.prototype.toString.call(item) !== '[object Date]') {
            return removeUndefinedFields(item);
          }
          return item;
        }).filter((item: any) => item !== undefined);
      }
      // Valor primitivo ou Date
      else {
        cleaned[key] = obj[key];
      }
    }
  }
  
  return cleaned as T;
}

/**
 * Prepara dados para update no Firestore removendo undefined
 */
export function prepareForFirestore<T extends Record<string, any>>(data: T): T {
  return removeUndefinedFields(data);
}

/**
 * Converte Timestamp do Firestore para Date de forma segura
 * Evita erros "Invalid Date" ao lidar com diferentes formatos
 * IMPORTANTE: Retorna data no timezone LOCAL do usuário
 */
export function safeToDate(date: any): Date {
  if (!date) {
    return new Date();
  }
  
  let converted: Date | null = null;
  
  // Se já é uma Date válida
  if (date instanceof Date && !isNaN(date.getTime())) {
    converted = date;
  }
  // Se é um Timestamp do Firestore
  else if (date.toDate && typeof date.toDate === 'function') {
    try {
      const d = date.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) {
        converted = d;
      }
    } catch (e) {
      console.error('Error converting Timestamp to Date:', e);
    }
  }
  // Se é um objeto com seconds (Timestamp serializado)
  else if (date.seconds !== undefined) {
    try {
      const d = new Date(date.seconds * 1000);
      if (!isNaN(d.getTime())) {
        converted = d;
      }
    } catch (e) {
      console.error('Error converting seconds to Date:', e);
    }
  }
  // Tentar converter como string ou number
  else {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        converted = d;
      }
    } catch (e) {
      console.error('Error converting to Date:', e);
    }
  }
  
  // Se conseguiu converter, retornar a data
  if (converted) {
    return converted;
  }
  
  // Fallback: retornar data atual
  console.warn('Could not convert date, returning current date:', date);
  return new Date();
}

/**
 * Formata data para exibição em português (DD/MM/YYYY)
 */
export function formatDate(date: any): string {
  const d = safeToDate(date);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora para exibição em português (DD/MM/YYYY HH:MM)
 */
export function formatDateTime(date: any): string {
  const d = safeToDate(date);
  return d.toLocaleString('pt-BR');
}

/**
 * Formata data e hora de forma compacta (DD/MM HH:MM)
 */
export function formatDateTimeCompact(date: any): string {
  const d = safeToDate(date);
  return d.toLocaleString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

/**
 * Cria uma data no horário local ao meio-dia
 * Usar meio-dia evita problemas de timezone ao converter para/de UTC
 * @param year - Ano
 * @param month - Mês (0-11)
 * @param day - Dia do mês
 */
export function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

/**
 * Converte uma data para meia-noite local (início do dia)
 * Útil para comparações de datas sem considerar horário
 */
export function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Calcula a diferença em dias entre duas datas (ignora horário)
 * Usa datas locais para cálculo correto no Brasil
 */
export function daysDifference(date1: Date, date2: Date): number {
  const d1 = toLocalMidnight(date1);
  const d2 = toLocalMidnight(date2);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
