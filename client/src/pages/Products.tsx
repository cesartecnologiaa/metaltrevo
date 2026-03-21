import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, CheckCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { exportProductsToPDF, exportStockToExcel } from '@/lib/exportUtils';
import { formatCurrency } from '@/lib/formatters';
import { Product } from '@/types';
import { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deactivateProduct,
  reactivateProduct,
  deleteProduct 
} from '@/services/productService';
import { getAllCategories } from '@/services/categoryService';
import { uploadProductImage } from '@/services/storageService';
import { Category } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';

export default function Products() {
  const permissions = usePermissions();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    cashPrice: '',
    creditPrice: '',
    costPrice: '',
    stock: '',
    minStock: '',
    categoryId: '',
    imageFile: null as File | null,
    imageUrl: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getAllProducts(),
        getAllCategories()
      ]);
      console.log('Categories loaded:', categoriesData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        code: product.code,
        description: product.description || '',
        cashPrice: product.cashPrice?.toString() || product.price.toString(),
        creditPrice: product.creditPrice?.toString() || product.price.toString(),
        costPrice: product.costPrice.toString(),
        stock: ((product as any).currentStock || (product as any).stock || 0).toString(),
        minStock: product.minStock.toString(),
        categoryId: product.categoryId || '',
        imageFile: null,
        imageUrl: product.imageUrl || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        cashPrice: '',
        creditPrice: '',
        costPrice: '',
        stock: '',
        minStock: '',
        categoryId: '',
        imageFile: null,
        imageUrl: '',
      });
    }
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 5MB');
        return;
      }
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return;
      }
      setFormData({ ...formData, imageFile: file });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return false;
    }
    if (!formData.code.trim()) {
      toast.error('Código do produto é obrigatório');
      return false;
    }
    if (!formData.cashPrice || parseFloat(formData.cashPrice) <= 0) {
      toast.error('Preço à vista deve ser maior que zero');
      return false;
    }
    if (!formData.creditPrice || parseFloat(formData.creditPrice) <= 0) {
      toast.error('Preço a prazo deve ser maior que zero');
      return false;
    }
    if (!formData.costPrice || parseFloat(formData.costPrice) < 0) {
      toast.error('Preço de custo inválido');
      return false;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      toast.error('Estoque inválido');
      return false;
    }
    if (!formData.minStock || parseInt(formData.minStock) < 0) {
      toast.error('Estoque mínimo inválido');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setUploading(true);
    try {
      let imageUrl = formData.imageUrl;

      // Upload de imagem se houver
      if (formData.imageFile) {
        console.log('Uploading image...');
        const tempId = editingProduct?.id || `temp_${Date.now()}`;
        imageUrl = await uploadProductImage(formData.imageFile, tempId);
        console.log('Image uploaded:', imageUrl);
      }

      const category = categories.find(c => c.id === formData.categoryId);

      const cashPrice = parseFloat(formData.cashPrice);
      const creditPrice = parseFloat(formData.creditPrice);

      const productData = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        price: cashPrice, // Manter compatibilidade
        cashPrice,
        creditPrice,
        costPrice: parseFloat(formData.costPrice),
        currentStock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        categoryId: formData.categoryId || undefined,
        categoryName: category?.name || undefined,
        imageUrl: imageUrl || undefined,
        active: true,
      };

      console.log('Saving product:', productData);

      if (editingProduct) {
        console.log('Updating product:', editingProduct.id);
        await updateProduct(editingProduct.id, productData);
        toast.success('Produto atualizado com sucesso!');
      } else {
        console.log('Creating new product');
        await createProduct(productData);
        toast.success('Produto cadastrado com sucesso!');
      }

      setDialogOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Erro ao salvar produto: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      if (product.active) {
        await deactivateProduct(product.id);
        toast.success('Produto desativado');
      } else {
        await reactivateProduct(product.id);
        toast.success('Produto reativado');
      }
      loadData();
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error('Erro ao alterar status do produto');
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    
    try {
      await deleteProduct(productToDelete.id);
      toast.success('Produto excluído permanentemente');
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  // Filtros
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || product.categoryId === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && product.active) ||
      (filterStatus === 'inactive' && !product.active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Produtos</h1>
          <p className="text-white/70 mt-1">Cadastre e gerencie seus produtos</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => exportProductsToPDF(filteredProducts)}
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <FileText className="w-5 h-5 mr-2" />
            PDF
          </Button>
          <Button
            onClick={() => exportStockToExcel(filteredProducts)}
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Excel
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label className="text-white mb-2 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <Input
                type="text"
                placeholder="Nome, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>

          <div>
            <Label className="text-white mb-2 block">Categoria</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white mb-2 block">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de Produtos */}
      {loading ? (
        <div className="text-center py-12 text-white/70">
          Carregando produtos...
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70 text-lg">Nenhum produto encontrado</p>
          <p className="text-white/50 text-sm mt-2">Cadastre seu primeiro produto para começar</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl overflow-hidden hover:border-white/40 transition-all"
            >
              {/* Imagem */}
              {product.imageUrl ? (
                <div className="h-48 overflow-hidden bg-white/5">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-blue-900/50 to-cyan-900/50 flex items-center justify-center">
                  <Package className="w-16 h-16 text-white/30" />
                </div>
              )}

              {/* Conteúdo */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">{product.name}</h3>
                    <p className="text-white/50 text-sm">Cód: {product.code}</p>
                  </div>
                  {!product.active && (
                    <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-300 text-xs">
                      Inativo
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="text-white/70 text-sm mb-3 line-clamp-2">{product.description}</p>
                )}

                {product.categoryName && (
                  <span className="inline-block px-2 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs mb-3">
                    {product.categoryName}
                  </span>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white/50 text-xs">Preço de Venda</p>
                    <p className="text-green-400 font-bold text-xl">
                      R$ {formatCurrency(product.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs">Estoque</p>
                    <p className={`font-bold text-lg ${
                      product.currentStock <= 0 
                        ? 'text-red-400' 
                        : product.currentStock <= product.minStock 
                        ? 'text-orange-400' 
                        : 'text-white'
                    }`}>
                      {product.currentStock}
                    </p>
                  </div>
                </div>

                {product.currentStock <= product.minStock && product.currentStock > 0 && (
                  <div className="flex items-center gap-1 text-orange-400 text-xs mb-3">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Estoque baixo (mín: {product.minStock})</span>
                  </div>
                )}

                {product.currentStock <= 0 && (
                  <div className="flex items-center gap-1 text-red-400 text-xs mb-3">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Sem estoque</span>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleOpenDialog(product)}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleToggleStatus(product)}
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${
                      product.active 
                        ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                        : 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20'
                    }`}
                  >
                    {product.active ? (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Reativar
                      </>
                    )}
                  </Button>
                  {permissions.isAdmin && (
                    <Button
                      onClick={() => handleDeleteClick(product)}
                      variant="outline"
                      size="sm"
                      className="bg-red-600/10 border-red-600/30 text-red-400 hover:bg-red-600/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Nome do Produto *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cimento CP II 50kg"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Código do Produto *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Digite o código do produto"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição detalhada do produto..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Preço de Custo *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="0.00"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Preço à Vista * <span className="text-white/50 text-xs">(Dinheiro, PIX, Débito)</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cashPrice}
                  onChange={(e) => setFormData({ ...formData, cashPrice: e.target.value })}
                  placeholder="0.00"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Preço a Prazo * <span className="text-white/50 text-xs">(Crédito, Boleto)</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.creditPrice}
                  onChange={(e) => setFormData({ ...formData, creditPrice: e.target.value })}
                  placeholder="0.00"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Estoque Atual *</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">Estoque Mínimo *</Label>
                <Input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  placeholder="0"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Categoria</Label>              <Select value={formData.categoryId || 'none'} onValueChange={(value) => setFormData({ ...formData, categoryId: value === 'none' ? '' : value })}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white mb-2 block">Imagem do Produto</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="bg-white/10 border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"
              />
              <p className="text-white/50 text-xs mt-1">Máximo 5MB. Formatos: JPG, PNG, GIF</p>
              {formData.imageUrl && !formData.imageFile && (
                <div className="mt-2">
                  <img src={formData.imageUrl} alt="Preview" className="h-24 rounded-lg" />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setDialogOpen(false)}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                disabled={uploading}
              >
                {uploading ? 'Salvando...' : editingProduct ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900/95 backdrop-blur-xl border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Tem certeza que deseja excluir permanentemente o produto <strong>{productToDelete?.name}</strong>?
              <br />
              <span className="text-red-400 font-semibold">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/20 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
