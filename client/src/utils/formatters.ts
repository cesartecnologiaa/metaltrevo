/**
 * Formata valor monetário no padrão brasileiro (R$ 10.000,00)
 * @param value - Valor numérico
 * @param showSymbol - Se deve mostrar o símbolo R$ (padrão: true)
 * @returns String formatada
 */
export function formatCurrency(value: number, showSymbol: boolean = true): string {
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return showSymbol ? `R$ ${formatted}` : formatted;
}

/**
 * Formata data no padrão brasileiro (DD/MM/AAAA)
 * @param date - Data como Date, Timestamp ou string
 * @returns String formatada
 */
export function formatDate(date: any): string {
  if (!date) return '';
  
  let dateObj: Date;
  
  // Se é Timestamp do Firestore
  if (date?.toDate) {
    dateObj = date.toDate();
  }
  // Se é string
  else if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  // Se já é Date
  else if (date instanceof Date) {
    dateObj = date;
  }
  else {
    return '';
  }
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formata data e hora no padrão brasileiro (DD/MM/AAAA HH:MM)
 * @param date - Data como Date, Timestamp ou string
 * @returns String formatada
 */
export function formatDateTime(date: any): string {
  if (!date) return '';
  
  let dateObj: Date;
  
  // Se é Timestamp do Firestore
  if (date?.toDate) {
    dateObj = date.toDate();
  }
  // Se é string
  else if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  // Se já é Date
  else if (date instanceof Date) {
    dateObj = date;
  }
  else {
    return '';
  }
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
