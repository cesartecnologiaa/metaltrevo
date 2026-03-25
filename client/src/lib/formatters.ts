/**
 * Formata um valor numérico para o formato de moeda brasileira
 * @param value - Valor numérico a ser formatado
 * @returns String formatada no padrão brasileiro (ex: "10.000,00")
 */
export function formatCurrency(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0);
  return numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formata um valor numérico para o formato de moeda brasileira com símbolo R$
 * @param value - Valor numérico a ser formatado
 * @returns String formatada com R$ (ex: "R$ 10.000,00")
 */
export function formatBRL(value: number): string {
  return `R$ ${formatCurrency(value)}`;
}

/**
 * Formata uma porcentagem
 * @param value - Valor numérico a ser formatado
 * @param decimals - Número de casas decimais (padrão: 1)
 * @returns String formatada (ex: "15,5%")
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
/**
 * Formata formas de pagamento para exibição profissional
 * @param method - Forma de pagamento (ex: "pix", "cartao_credito")
 * @returns String formatada (ex: "Pix", "Cartão de Crédito")
 */
export function formatPaymentMethod(method: string): string {
  const paymentMethods: Record<string, string> = {
    'dinheiro': 'Dinheiro',
    'pix': 'Pix',
    'cartao_debito': 'Cartão de Débito',
    'cartao_credito': 'Cartão de Crédito',
    'boleto': 'Boleto',
    'credito': 'Cartão de Crédito',
    'debito': 'Cartão de Débito',
  };
  
  return paymentMethods[method?.toLowerCase()] || method;
}
