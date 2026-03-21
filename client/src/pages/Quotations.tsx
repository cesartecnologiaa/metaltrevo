import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus,
  Loader2,
  Package,
  X,
  User,
  FileText,
  List
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import QuotationReceipt from '@/components/QuotationReceipt';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import type { Product } from '@/types';
import { getActiveProducts } from '@/services/productService';
import { createQuotation, type Quotation } from '@/services/quotationService';
import { getAllClients } from '@/services/clientService';
import { Timestamp } from 'firebase/firestore';
import { formatCurrency } from '@/lib/formatters';

interface CartItem {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  subtotal: number;
  availableStock: number;
}

export default function Quotations() {
  const { userData } = useAuthContext();
  const { printRef, printReceipt, exportToPDF } = usePrintReceipt();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastQuotation, setLastQuotation] = useState<Quotation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  
  // Estados para cliente e frete
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [deliveryType, setDeliveryType] = useState<'balcao' | 'deposito' | 'entrega'>('balcao');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [observations, setObservations] = useState('');

  // Carregar produtos e clientes
  useEffect(() => {
    loadProducts();
    loadClients();
  }, []);

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
      const clientsData = await getAllClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.currentStock) {
        toast.error('Quantidade máxima em estoque atingida');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        code: product.code,
        price: product.price,
        quantity: 1,
        subtotal: product.price,
        availableStock: product.currentStock
      };
      setCart([...cart, newItem]);
      toast.success(`${product.name} adicionado ao carrinho`);
    }
    
    setProductSearch('');
    searchInputRef.current?.focus();
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    if (newQuantity > item.availableStock) {
      toast.error('Quantidade maior que o estoque disponível');
      return;
    }

    setCart(cart.map(item => 
      item.id === itemId
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    ));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.success('Item removido do carrinho');
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient(null);
    setClientSearch('');
    setDeliveryType('balcao');
    setDeliveryAddress('');
    setDeliveryFee('');
    setDiscount('');
    setObservations('');
    setShowReceipt(false);
    setLastQuotation(null);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountValue = parseFloat(discount) || 0;
    const feeValue = parseFloat(deliveryFee) || 0;
    return subtotal - discountValue + feeValue;
  };

  const generateQuotationCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `ORC${timestamp}`;
  };

  const finalizeQuotation = async () => {
    if (cart.length === 0) {
      toast.error('Adicione produtos ao carrinho');
      return;
    }

    if (!selectedClient) {
      toast.error('Selecione um cliente');
      return;
    }

    if (deliveryType === 'entrega' && !deliveryAddress.trim()) {
      toast.error('Informe o endereço de entrega');
      return;
    }

    if (!userData) {
      toast.error('Usuário não autenticado');
      return;
    }

    setProcessing(true);

    try {
      const subtotal = calculateSubtotal();
      const discountValue = parseFloat(discount) || 0;
      const feeValue = parseFloat(deliveryFee) || 0;
      const total = calculateTotal();

      // Criar data de validade (7 dias)
      const now = new Date();
      const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const quotationData: any = {
        code: generateQuotationCode(),
        date: Timestamp.now(),
        validUntil: Timestamp.fromDate(validUntil),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientDocument: selectedClient.cpfCnpj,
        sellerId: userData.uid,
        sellerName: userData.name,
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          productCode: item.code,
          quantity: item.quantity,
          unitPrice: item.price,
          priceType: 'vista' as const,
          total: item.subtotal
        })),
        subtotal,
        discount: discountValue,
        deliveryFee: feeValue,
        total,
        status: 'pendente' as const
      };

      // Adicionar observations apenas se não estiver vazio
      if (observations.trim()) {
        quotationData.observations = observations.trim();
      }

      await createQuotation(quotationData);

      // Criar objeto para o comprovante
      const quotationForReceipt: Quotation = {
        ...quotationData,
        id: 'temp-' + Date.now()
      };

      setLastQuotation(quotationForReceipt);
      setShowReceipt(true);
      
      toast.success('Orçamento gerado com sucesso!');
      
      // Carrinho será limpo apenas quando o usuário fechar o modal

    } catch (error: any) {
      console.error('Error creating quotation:', error);
      toast.error(error.message || 'Erro ao gerar orçamento');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredClients = clients.filter(client =>
    client?.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client?.cpfCnpj && client.cpfCnpj.includes(clientSearch))
  );

  const liquidGlassCard = "bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl";

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <FileText className="w-8 h-8" />
              Orçamentos
            </h1>
            <p className="text-white/60 mt-1">Gere orçamentos para seus clientes</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocation('/orcamentos/consulta')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <List className="w-4 h-4 mr-2" />
              Consultar Orçamentos
            </Button>
            {cart.length > 0 && (
            <Button
              onClick={clearCart}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Tudo
            </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Produtos */}
          <div className="space-y-6">
            {/* Busca de Produtos */}
            <Card className={liquidGlassCard}>
              <div className="p-6">
                <Label className="text-white mb-3 block">Buscar Produto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                  <Input
                    ref={searchInputRef}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Digite o nome ou código do produto..."
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                {/* Lista de Produtos */}
                {productSearch && (
                  <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                    {filteredProducts.length === 0 ? (
                      <p className="text-white/50 text-center py-4">Nenhum produto encontrado</p>
                    ) : (
                      filteredProducts.slice(0, 10).map(product => (
                        <div
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors border border-white/10"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{product.name}</p>
                              <p className="text-white/50 text-sm">Cód: {product.code}</p>
                              <p className="text-white/50 text-sm">Estoque: {product.currentStock}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 font-bold">R$ {formatCurrency(product.price)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Cliente */}
            <Card className={liquidGlassCard}>
              <div className="p-6">
                <Label className="text-white mb-3 block flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente *
                </Label>
                
                {selectedClient ? (
                  <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{selectedClient.name}</p>
                        {selectedClient.cpfCnpj && (
                          <p className="text-white/50 text-sm">{selectedClient.cpfCnpj}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedClient(null);
                          setClientSearch('');
                        }}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    
                    {clientSearch && (
                      <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                        {filteredClients.length === 0 ? (
                          <p className="text-white/50 text-center py-4">Nenhum cliente encontrado</p>
                        ) : (
                          filteredClients.map(client => (
                            <div
                              key={client.id}
                              onClick={() => {
                                setSelectedClient(client);
                                setClientSearch('');
                              }}
                              className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                            >
                              <p className="text-white font-medium">{client.name}</p>
                              {client.cpfCnpj && (
                                <p className="text-white/50 text-sm">{client.cpfCnpj}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Entrega */}
            <Card className={liquidGlassCard}>
              <div className="p-6 space-y-4">
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
          </div>

          {/* Coluna Direita - Carrinho e Resumo */}
          <div className="space-y-6">
            {/* Carrinho */}
            <Card className={liquidGlassCard}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Carrinho ({cart.length})
                  </h3>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-white/20 mx-auto mb-3" />
                    <p className="text-white/60">Carrinho vazio</p>
                    <p className="text-white/40 text-sm">Adicione produtos para criar um orçamento</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="text-white font-medium">{item.name}</p>
                            <p className="text-white/50 text-sm">Cód: {item.code}</p>
                            <p className="text-green-400 font-bold mt-1">
                              R$ {formatCurrency(item.price)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
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
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val > 0 && val <= item.availableStock) {
                                  updateQuantity(item.id, val);
                                } else if (e.target.value === '') {
                                  return;
                                }
                              }}
                              onBlur={(e) => {
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

                          <div className="flex items-center gap-3">
                            <p className="text-white font-bold">
                              R$ {formatCurrency(item.subtotal)}
                            </p>
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Resumo e Finalização */}
            {cart.length > 0 && (
              <Card className={liquidGlassCard}>
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">Resumo</h3>

                  <div>
                    <Label className="text-white mb-2 block">Desconto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div>
                    <Label className="text-white mb-2 block">Observações</Label>
                    <textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={3}
                      className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <div className="flex justify-between text-white/70">
                      <span>Subtotal</span>
                      <span>R$ {formatCurrency(calculateSubtotal())}</span>
                    </div>
                    {parseFloat(discount) > 0 && (
                      <div className="flex justify-between text-red-300">
                        <span>Desconto</span>
                        <span>- R$ {formatCurrency(parseFloat(discount))}</span>
                      </div>
                    )}
                    {parseFloat(deliveryFee) > 0 && (
                      <div className="flex justify-between text-white/70">
                        <span>Frete</span>
                        <span>R$ {formatCurrency(parseFloat(deliveryFee))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-bold text-xl pt-2 border-t border-white/10">
                      <span>Total</span>
                      <span className="text-green-400">R$ {formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <Button
                    onClick={finalizeQuotation}
                    disabled={processing || cart.length === 0}
                    className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Gerando Orçamento...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 mr-2" />
                        Gerar Orçamento
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Comprovante de Orçamento */}
        {showReceipt && lastQuotation && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Orçamento Gerado</h2>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      const filename = `Orcamento_${lastQuotation.code}_${lastQuotation.clientName.replace(/\s+/g, '_')}.pdf`;
                      exportToPDF(filename);
                    }} 
                    variant="outline"
                    className="bg-green-500 text-white hover:bg-green-600"
                  >
                    Baixar PDF
                  </Button>
                  <Button onClick={() => printReceipt()} variant="outline">
                    Imprimir
                  </Button>
                  <Button onClick={() => {
                    setShowReceipt(false);
                    clearCart();
                  }} variant="outline">
                    Fechar
                  </Button>
                </div>
              </div>
              <div ref={printRef}>
                <QuotationReceipt quotation={lastQuotation} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
