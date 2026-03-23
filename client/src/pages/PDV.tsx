import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus,
  DollarSign,
  CreditCard,
  Banknote,
  Loader2,
  Package,
  X,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import SaleReceipt from '@/components/SaleReceipt';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import type { Sale, Product } from '@/types';
import { getActiveProducts } from '@/services/productService';
import { createSale } from '@/services/salesService';
import { getClientPendingBalance } from '@/services/accountsReceivableService';
import { cashService } from '@/services/cashService';
import { formatCurrency } from '@/lib/formatters';
import { Timestamp } from 'firebase/firestore';

interface CartItem {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  subtotal: number;
  availableStock: number;
}

export default function PDV() {
  const { userData } = useAuthContext();
  const { printRef, printReceipt } = usePrintReceipt();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clientSearchInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'boleto'>('dinheiro');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cashRegisterOpen, setCashRegisterOpen] = useState(false);
  const [checkingCash, setCheckingCash] = useState(true);
  
  // Estados para cliente e frete
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientBalance, setClientBalance] = useState<{ total: number; overdue: number } | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [deliveryType, setDeliveryType] = useState<'balcao' | 'deposito' | 'entrega'>('balcao');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [boletoEntryAmount, setBoletoEntryAmount] = useState('');
  const [boletoEntryDialogOpen, setBoletoEntryDialogOpen] = useState(false);

  // Verificar se caixa está aberto
  useEffect(() => {
    checkCashRegister();
  }, []);

  // Carregar produtos e clientes do Firebase
  useEffect(() => {
    loadProducts();
    loadClients();
  }, []);

  const checkCashRegister = async () => {
    try {
      setCheckingCash(true);
      const openCash = await cashService.getOpenCashRegister();
      setCashRegisterOpen(!!openCash);
    } catch (error) {
      console.error('Error checking cash register:', error);
      setCashRegisterOpen(false);
    } finally {
      setCheckingCash(false);
    }
  };


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (productSearch) {
          setProductSearch('');
          searchInputRef.current?.focus();
          return;
        }
        if (clientSearch) {
          setClientSearch('');
          clientSearchInputRef.current?.focus();
          return;
        }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      if (event.key === 'F2') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === 'F3') {
        event.preventDefault();
        clientSearchInputRef.current?.focus();
        clientSearchInputRef.current?.select();
        return;
      }

      if (event.key === 'F4') {
        event.preventDefault();
        setPaymentMethod('dinheiro');
        return;
      }

      if (event.key === 'F5') {
        event.preventDefault();

        if (processing) {
          toast.error('Já existe uma venda sendo processada.');
          return;
        }
        if (!cashRegisterOpen) {
          toast.error('Caixa fechado! Abra o caixa antes de realizar vendas.');
          return;
        }
        if (cart.length === 0) {
          toast.error('Adicione pelo menos um produto ao carrinho.');
          return;
        }
        if (!selectedClient) {
          toast.error('Selecione um cliente!');
          return;
        }

        requestAnimationFrame(() => {
          finalizeSale();
        });
        return;
      }

      if (event.key === 'F6') {
        event.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
        return;
      }

      if (event.key === 'F8') {
        event.preventDefault();
        if (cart.length > 0) clearCart();
        return;
      }

      if (isTyping) return;

      if (event.ctrlKey && event.key === 'Delete') {
        event.preventDefault();
        if (selectedCartItemId) {
          removeFromCart(selectedCartItemId);
        }
        return;
      }

      if (event.ctrlKey && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        const selectedItem = cart.find(item => item.id === selectedCartItemId);
        if (selectedItem) updateQuantity(selectedItem.id, selectedItem.quantity + 1);
        return;
      }

      if (event.ctrlKey && event.key === '-') {
        event.preventDefault();
        const selectedItem = cart.find(item => item.id === selectedCartItemId);
        if (selectedItem) updateQuantity(selectedItem.id, selectedItem.quantity - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [productSearch, clientSearch, processing, cart, cashRegisterOpen, selectedCartItemId, selectedClient]);

  // Recalcular preços do carrinho quando forma de pagamento ou parcelas mudam
  useEffect(() => {
    if (cart.length > 0) {
      setCart(prevCart => 
        prevCart.map(item => {
          const product = products.find(p => p.id === item.id);
          if (!product) return item;
          
          const newPrice = getProductPrice(product);
          return {
            ...item,
            price: newPrice,
            subtotal: newPrice * item.quantity
          };
        })
      );
    }
  }, [paymentMethod, installmentCount]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await getActiveProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { getActiveClients } = await import('@/services/clientService');
      const clientsData = await getActiveClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  // Selecionar preço baseado na forma de pagamento e parcelas
  const getProductPrice = (product: Product): number => {
    // Boleto = sempre preço a prazo
    if (paymentMethod === 'boleto') {
      return product.creditPrice || product.price;
    }
    // Crédito = preço a prazo apenas se 2x ou mais
    if (paymentMethod === 'cartao_credito' && installmentCount >= 2) {
      return product.creditPrice || product.price;
    }
    // Dinheiro, PIX, Débito, Crédito 1x = preço à vista
    return product.cashPrice || product.price;
  };

  // Filtrar produtos em tempo real
  const filteredProducts = products.filter(product => {
    if (!productSearch.trim()) return false;
    const term = productSearch.toLowerCase();
    return (
      product.code.toLowerCase().includes(term) ||
      product.name.toLowerCase().includes(term)
    );
  }).slice(0, 5); // Limitar a 5 resultados

  // Selecionar produto da lista filtrada
  const selectProduct = (product: Product) => {
    addToCart(product);
    setProductSearch('');
    searchInputRef.current?.focus();
  };

  // Buscar e adicionar produto ao carrinho (Enter)
  const handleSearchProduct = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && productSearch.trim()) {
      if (filteredProducts.length > 0) {
        selectProduct(filteredProducts[0]);
      } else {
        toast.error('Produto não encontrado!');
      }
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // Verificar estoque disponível
      if (existingItem.quantity >= product.currentStock) {
        toast.error(`Estoque insuficiente! Disponível: ${product.currentStock}`);
        return;
      }
      setSelectedCartItemId(product.id);
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      // Verificar se há estoque
      if (product.currentStock <= 0) {
        toast.error('Produto sem estoque!');
        return;
      }

      const price = getProductPrice(product);
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        code: product.code,
        price,
        quantity: 1,
        subtotal: price,
        availableStock: product.currentStock,
      };
      setCart([...cart, newItem]);
      setSelectedCartItemId(product.id);
      toast.success(`${product.name} adicionado ao carrinho`);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }

    const item = cart.find(i => i.id === id);
    if (item && newQuantity > item.availableStock) {
      toast.error(`Estoque insuficiente! Disponível: ${item.availableStock}`);
      return;
    }

    setCart(cart.map(item => 
      item.id === id 
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
    if (selectedCartItemId === id) {
      setSelectedCartItemId(null);
    }
    toast.info('Item removido do carrinho');
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCartItemId(null);
    setSelectedClient(null);
    setDeliveryType('balcao');
      setDeliveryAddress('');
      setDeliveryDate('');
      setDeliveryTime('');
      setDeliveryFee('');
      setDiscount('');
    setInstallmentCount(1);
    setBoletoEntryAmount('');
    setBoletoEntryDialogOpen(false);
    toast.info('Carrinho limpo');
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateTotal = () => {
    const fee = parseFloat(deliveryFee as string) || 0;
    const disc = parseFloat(discount as string) || 0;
    return Math.max(0, calculateSubtotal() + fee - disc);
  };

  const getBoletoEntryValue = () => {
    const parsed = Number(String(boletoEntryAmount || '0').replace(',', '.'));
    const total = calculateTotal();
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(parsed, total);
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio!');
      return;
    }

    if (!userData) {
      toast.error('Usuário não autenticado!');
      return;
    }

    if (!cashRegisterOpen) {
      toast.error('Caixa fechado! Abra o caixa antes de realizar vendas.');
      return;
    }

    if (!selectedClient) {
      toast.error('Selecione um cliente!');
      return;
    }

    const boletoEntryValue = paymentMethod === 'boleto' ? getBoletoEntryValue() : 0;
    if (paymentMethod === 'boleto' && boletoEntryValue < 0) {
      toast.error('Valor de entrada inválido.');
      return;
    }
    if (paymentMethod === 'boleto' && boletoEntryValue > calculateTotal()) {
      toast.error('A entrada não pode ser maior que o total da venda.');
      return;
    }

    if (deliveryType === 'entrega' && !deliveryAddress.trim()) {
      toast.error('Informe o endereço de entrega!');
      return;
    }

    setProcessing(true);

    try {
      // Criar objeto de venda (remover campos undefined)
      const saleData: any = {
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          productCode: item.code,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.subtotal,
        })),
        subtotal: calculateSubtotal(),
        discount: parseFloat(discount as string) || 0,
        deliveryFee: parseFloat(deliveryFee as string) || 0,
        deliveryType,
        total: calculateTotal(),
        paymentMethod,
        boletoEntryAmount: boletoEntryValue,
        status: 'concluida',
        sellerId: userData.uid,
        sellerName: userData.name || 'Vendedor',
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientDocument: selectedClient.cpfCnpj,
      };

      // Adicionar endereço e status para entrega ou depósito
      if (deliveryType === 'entrega' && deliveryAddress.trim()) {
        saleData.deliveryAddress = deliveryAddress.trim();
        saleData.deliveryStatus = 'pendente';
        
        // Combinar data + hora em um único Timestamp
        if (deliveryDate) {
          const dateTimeString = deliveryTime 
            ? `${deliveryDate}T${deliveryTime}:00`
            : `${deliveryDate}T00:00:00`;
          saleData.deliveryDate = Timestamp.fromDate(new Date(dateTimeString));
        }
      } else if (deliveryType === 'deposito') {
        saleData.deliveryStatus = 'pendente'; // Aguardando retirada
      }

      // Adicionar parcelamento APENAS se for boleto
      if (paymentMethod === 'boleto' && installmentCount > 1) {
        saleData.installmentCount = installmentCount;
        
        // Calcular parcelas
        const installmentAmount = calculateTotal() / installmentCount;
        const installments = [];
        
        for (let i = 1; i <= installmentCount; i++) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (30 * i)); // 30 dias entre cada parcela
          
          installments.push({
            installmentNumber: i,
            dueDate,
            amount: installmentAmount,
            status: 'pendente',
          });
        }
        
        saleData.installments = installments;
      }

      const saleNumber = `VD${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

      // Salvar venda no Firebase
      const saleId = await createSale(saleData);
      
      // Boleto gera conta a receber apenas do saldo restante; crédito só quando parcelado
      if (paymentMethod === 'boleto' || (paymentMethod === 'cartao_credito' && installmentCount > 1)) {
        const { createAccountReceivable } = await import('@/services/accountsReceivableService');
        const receivableTotal = paymentMethod === 'boleto'
          ? Math.max(0, calculateTotal() - boletoEntryValue)
          : calculateTotal();

        if (receivableTotal > 0) {
          await createAccountReceivable(
            saleId,
            saleNumber,
            selectedClient.id,
            selectedClient.name,
            selectedClient.cpfCnpj,
            receivableTotal,
            paymentMethod === 'boleto' ? Math.max(1, installmentCount) : installmentCount
          );
        }
      }
      
      toast.success('Venda finalizada com sucesso!');

      // Criar objeto completo para impressão
      const completeSale: Sale = {
        ...saleData,
        id: saleId,
        saleNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setLastSale(completeSale);
      setShowReceipt(true);
      
      // Recarregar produtos para atualizar estoque
      await loadProducts();
      
      // Limpar carrinho
      clearCart();
      
      // Imprimir automaticamente após 500ms
      setTimeout(() => {
        printReceipt();
      }, 500);

    } catch (error: any) {
      console.error('Error finalizing sale:', error);
      toast.error(error.message || 'Erro ao finalizar venda');
    } finally {
      setProcessing(false);
    }
  };

  const liquidGlassCard = "backdrop-blur-2xl bg-white/10 border-white/20 shadow-lg";

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-white/70">Carregando produtos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">PDV - Ponto de Venda</h1>
          <p className="text-white/70">Realize vendas de forma rápida e eficiente</p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/88 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.25)]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-3 py-3 md:justify-between">
            <div className="text-sm font-semibold text-white">
              Atalhos do PDV
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
              {[
                ['F2', 'Produto'],
                ['F3', 'Cliente'],
                ['F4', 'Dinheiro'],
                ['F5', 'Finalizar'],
                ['F6', 'Desconto'],
                ['F8', 'Limpar'],
                ['Ctrl+Del', 'Remover'],
                ['Ctrl + / -', 'Qtd.'],
              ].map(([shortcut, label]) => (
                <span key={shortcut} className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 border border-white/10">
                  <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[11px] font-bold text-cyan-200">
                    {shortcut}
                  </kbd>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Alerta de Caixa Fechado */}
        {!checkingCash && !cashRegisterOpen && (
          <Card className="bg-red-500/20 border-red-500/50">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-white font-semibold">Caixa Fechado</p>
                  <p className="text-white/70 text-sm">Abra o caixa antes de realizar vendas</p>
                </div>
              </div>
              <Button 
                onClick={() => window.location.href = '/caixa'}
                className="bg-red-600 hover:bg-red-700"
              >
                Abrir Caixa
              </Button>
            </div>
          </Card>
        )}

        {/* Cliente e Busca de Produtos - Grid 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Seleção de Cliente */}
          <Card className={liquidGlassCard}>
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-white/70" />
              <Label className="text-white text-lg">Cliente *</Label>
            </div>
            
            {/* Campo de Busca de Cliente */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
              <Input
                ref={clientSearchInputRef}
                placeholder="Buscar por código ou nome..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-12 h-12 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {/* Cliente Selecionado ou Lista Filtrada */}
            {selectedClient ? (
              <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg border border-white/20">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-white font-semibold text-lg">#{selectedClient.code} - {selectedClient.name}</p>
                    {clientBalance && clientBalance.total > 0 && (
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        clientBalance.overdue > 0 
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      }`}>
                        Débito: R$ {formatCurrency(clientBalance.total)}
                        {clientBalance.overdue > 0 && (
                          <span className="ml-1 text-red-400">(⚠ Vencido)</span>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedClient.cpfCnpj && (
                    <p className="text-white/60 text-sm">{selectedClient.cpfCnpj}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientBalance(null);
                    setClientSearch('');
                  }}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            ) : clientSearch.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {clients
                  .filter(client => 
                    client?.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    client?.code?.includes(clientSearch)
                  )
                  .map((client) => (
                    <button
                      key={client.id}
                      onClick={async () => {
                        setSelectedClient(client);
                        setClientSearch('');
                        // Buscar saldo pendente
                        try {
                          const balance = await getClientPendingBalance(client.id);
                          setClientBalance(balance);
                        } catch (error) {
                          console.error('Error loading client balance:', error);
                        }
                      }}
                      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                    >
                      <p className="text-white font-semibold">#{client.code} - {client.name}</p>
                      {client.cpfCnpj && (
                        <p className="text-white/60 text-sm">{client.cpfCnpj}</p>
                      )}
                    </button>
                  ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm text-center py-2">Digite para buscar um cliente</p>
            )}
          </div>
          </Card>

          {/* Campo de Busca de Produtos */}
          <Card className={liquidGlassCard}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-white/70" />
              <Label className="text-white text-lg">Buscar Produto (Nome ou Código)</Label>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
              <Input
                ref={searchInputRef}
                placeholder="Digite o nome ou código do produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={handleSearchProduct}
                className="pl-12 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
            {/* Lista de produtos filtrados */}
            {filteredProducts.length > 0 && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => selectProduct(product)}
                    className="w-full p-3 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{product.name}</p>
                        <p className="text-white/60 text-sm">Código: {product.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">R$ {formatCurrency(getProductPrice(product))}</p>
                        <p className="text-white/60 text-sm">Estoque: {product.currentStock}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          </Card>
        </div>

        {/* Carrinho */}
        <Card className={liquidGlassCard}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                Carrinho
                {cart.length > 0 && (
                  <span className="text-lg text-white/70">({cart.length} {cart.length === 1 ? 'item' : 'itens'})</span>
                )}
              </h2>
              {cart.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Carrinho
                </Button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/50 text-lg">Carrinho vazio</p>
                <p className="text-white/40 text-sm mt-2">Use o campo de busca acima para adicionar produtos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCartItemId(item.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${selectedCartItemId === item.id ? 'bg-blue-500/15 border-blue-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate">{item.name}</h3>
                      <p className="text-white/60 text-xs">Código: {item.code}</p>
                      <p className="text-blue-300 font-semibold text-xs mt-0.5">
                        R$ {formatCurrency(item.price)} x {item.quantity} = R$ {formatCurrency(item.subtotal)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-8 w-8 p-0 border-white/20 text-white hover:bg-white/10"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={item.availableStock}
                          value={item.quantity}
                          readOnly={false}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0 && val <= item.availableStock) {
                              updateQuantity(item.id, val);
                            } else if (e.target.value === '') {
                              // Permite campo vazio temporariamente durante edição
                              return;
                            }
                          }}
                          onBlur={(e) => {
                            // Se campo estiver vazio ao perder foco, volta para 1
                            if (e.target.value === '' || parseInt(e.target.value) < 1) {
                              updateQuantity(item.id, 1);
                            }
                          }}
                          className="w-16 h-8 text-center bg-white/10 border-white/20 text-white font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-8 w-8 p-0 border-white/20 text-white hover:bg-white/10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromCart(item.id)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Informações de Venda */}
        {cart.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Entrega */}
            <Card className={liquidGlassCard}>
              <div className="p-4 space-y-3">
                <h3 className="text-xl font-bold text-white mb-4">Entrega</h3>

                {/* Tipo de Entrega */}
                <div>
                  <Label className="text-white mb-3 block">Tipo de Retirada/Entrega</Label>
                  <RadioGroup value={deliveryType} onValueChange={(value: any) => setDeliveryType(value)}>
                    <div className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg">
                      <RadioGroupItem value="balcao" id="balcao" className="border-white/40" />
                      <Label htmlFor="balcao" className="text-white cursor-pointer flex-1">
                        Retirar no Balcão
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg">
                      <RadioGroupItem value="deposito" id="deposito" className="border-white/40" />
                      <Label htmlFor="deposito" className="text-white cursor-pointer flex-1">
                        Retirar no Depósito
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-white/5 rounded-lg">
                      <RadioGroupItem value="entrega" id="entrega" className="border-white/40" />
                      <Label htmlFor="entrega" className="text-white cursor-pointer flex-1">
                        Entrega
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Endereço de Entrega */}
                {deliveryType === 'entrega' && (
                  <>
                    <div>
                      <Label className="text-white mb-2 block">Endereço de Entrega *</Label>
                      <Input
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Rua, número, bairro, cidade..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-white mb-2 block">Data da Entrega</Label>
                        <Input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">Horário</Label>
                        <Input
                          type="time"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Valor do Frete (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        placeholder="0.00"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Pagamento e Totais */}
            <Card className={liquidGlassCard}>
              <div className="p-4 space-y-3">
                <h3 className="text-xl font-bold text-white mb-4">Pagamento</h3>

                {/* Forma de Pagamento - Botões Visuais */}
                <div>
                  <Label className="text-white mb-3 block text-lg">Forma de Pagamento</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={paymentMethod === 'dinheiro' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('dinheiro')}
                      className={`h-16 flex flex-col items-center justify-center gap-2 ${
                        paymentMethod === 'dinheiro'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-none'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      <Banknote className="h-6 w-6" />
                      <span className="text-sm font-semibold">Dinheiro</span>
                    </Button>

                    <Button
                      type="button"
                      variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('pix')}
                      className={`h-16 flex flex-col items-center justify-center gap-2 ${
                        paymentMethod === 'pix'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-none'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      <DollarSign className="h-6 w-6" />
                      <span className="text-sm font-semibold">PIX</span>
                    </Button>

                    <Button
                      type="button"
                      variant={paymentMethod === 'cartao_debito' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('cartao_debito')}
                      className={`h-16 flex flex-col items-center justify-center gap-2 ${
                        paymentMethod === 'cartao_debito'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-none'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="text-sm font-semibold">Débito</span>
                    </Button>

                    <Button
                      type="button"
                      variant={paymentMethod === 'cartao_credito' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('cartao_credito')}
                      className={`h-16 flex flex-col items-center justify-center gap-2 ${
                        paymentMethod === 'cartao_credito'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-none'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="text-sm font-semibold">Crédito</span>
                    </Button>

                    <Button
                      type="button"
                      variant={paymentMethod === 'boleto' ? 'default' : 'outline'}
                      onClick={() => { setPaymentMethod('boleto'); setBoletoEntryDialogOpen(true); }}
                      className={`h-16 flex flex-col items-center justify-center gap-2 col-span-2 ${
                        paymentMethod === 'boleto'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-none'
                          : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      <Banknote className="h-6 w-6" />
                      <span className="text-sm font-semibold">Boleto</span>
                    </Button>
                  </div>
                </div>

                {/* Parcelas (boleto e crédito) */}
                {(paymentMethod === 'boleto' || paymentMethod === 'cartao_credito') && (
                  <div>
                    <Label className="text-white mb-2 block">Número de Parcelas</Label>
                    <Select 
                      value={installmentCount.toString()} 
                      onValueChange={(value) => setInstallmentCount(parseInt(value))}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}x de R$ {formatCurrency((calculateTotal() / num))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentMethod === 'boleto' && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                    <div className="flex items-center justify-between">
                      <span>Entrada no ato</span>
                      <button
                        type="button"
                        onClick={() => setBoletoEntryDialogOpen(true)}
                        className="text-cyan-300 hover:text-cyan-200 font-medium"
                      >
                        {getBoletoEntryValue() > 0 ? 'Editar entrada' : 'Informar entrada'}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-white/60">Entrada</span>
                      <span className="font-semibold">R$ {formatCurrency(getBoletoEntryValue())}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-white/60">Saldo a cobrar</span>
                      <span className="font-semibold text-yellow-300">R$ {formatCurrency(Math.max(0, calculateTotal() - getBoletoEntryValue()))}</span>
                    </div>
                  </div>
                )}

                {/* Desconto */}
                <div>
                  <Label className="text-white mb-2 block">Desconto (R$)</Label>
                  <Input
                    ref={discountInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    max={calculateSubtotal()}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                {/* Totais */}
                <div className="space-y-2 pt-4 border-t border-white/20">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal:</span>
                    <span>R$ {formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {parseFloat(deliveryFee as string) > 0 && (
                    <div className="flex justify-between text-white/70">
                      <span>Frete:</span>
                      <span>R$ {formatCurrency(parseFloat(deliveryFee as string))}</span>
                    </div>
                  )}
                  {parseFloat(discount as string) > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Desconto:</span>
                      <span>- R$ {formatCurrency(parseFloat(discount as string))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white text-2xl font-bold pt-2">
                    <span>TOTAL:</span>
                    <span>R$ {formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                {/* Botão Finalizar */}
                <Button
                  onClick={finalizeSale}
                  disabled={processing || cart.length === 0 || !cashRegisterOpen}
                  className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Finalizar Venda
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        <Dialog open={boletoEntryDialogOpen} onOpenChange={setBoletoEntryDialogOpen}>
          <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Entrada no boleto</DialogTitle>
              <DialogDescription className="text-white/60">
                Informe um valor de entrada, se houver. O restante seguirá para contas a receber.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Total da venda</span>
                  <span className="font-semibold">R$ {formatCurrency(calculateTotal())}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-white/60">Saldo a cobrar</span>
                  <span className="font-semibold text-yellow-300">R$ {formatCurrency(Math.max(0, calculateTotal() - getBoletoEntryValue()))}</span>
                </div>
              </div>

              <div>
                <Label className="text-white mb-2 block">Valor de entrada (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={calculateTotal()}
                  value={boletoEntryAmount}
                  onChange={(e) => setBoletoEntryAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setBoletoEntryAmount(''); setBoletoEntryDialogOpen(false); }} className="border-white/20 text-white hover:bg-white/10">
                Sem entrada
              </Button>
              <Button type="button" onClick={() => setBoletoEntryDialogOpen(false)} className="bg-cyan-600 hover:bg-cyan-700">
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comprovante (oculto, apenas para impressão) */}
        {lastSale && (
          <div style={{ display: 'none' }}>
            <SaleReceipt ref={printRef} sale={lastSale} />
          </div>
        )}
      </div>
    </Layout>
  );
}
