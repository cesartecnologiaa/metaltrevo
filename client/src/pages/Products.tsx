import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, CheckCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/formatters';
import { addPDFHeader, addPDFFooter } from '@/utils/pdfHeader';
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
import { useCompanySettings } from '@/hooks/useCompanySettings';
import Layout from '@/components/Layout';

export default function Products() {
  const permissions = usePermissions();
  const { settings } = useCompanySettings();
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

  const normalizeProduct = (product: any): Product & any => {
    const currentStock = Number(product?.currentStock ?? product?.stock ?? 0);
    const minStock = Number(product?.minStock ?? product?.minimumStock ?? 0);
    const salePrice = Number(product?.salePrice ?? product?.cashPrice ?? product?.price ?? 0);
    const cashPrice = Number(product?.cashPrice ?? product?.salePrice ?? product?.price ?? 0);
    const creditPrice = Number(product?.creditPrice ?? product?.salePrice ?? product?.price ?? 0);
    const costPrice = Number(product?.costPrice ?? product?.purchasePrice ?? 0);

    return {
      ...product,
      currentStock,
      stock: currentStock,
      minStock,
      salePrice,
      price: salePrice,
      cashPrice,
      creditPrice,
      costPrice,
      purchasePrice: costPrice,
      barCode: product?.barCode ?? product?.barcode ?? '',
      categoryName: product?.categoryName ?? product?.family ?? '',
      active: product?.active !== false,
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getAllProducts(),
        getAllCategories()
      ]);
      const normalizedProducts = (productsData || []).map((product: any) => normalizeProduct(product));
      setProducts(normalizedProducts);
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
      const normalizedProduct = normalizeProduct(product as any);
      setEditingProduct(normalizedProduct);
      setFormData({
        name: normalizedProduct.name,
        code: normalizedProduct.code,
        description: normalizedProduct.description || '',
        cashPrice: Number(normalizedProduct.cashPrice ?? normalizedProduct.salePrice ?? normalizedProduct.price ?? 0).toString(),
        creditPrice: Number(normalizedProduct.creditPrice ?? normalizedProduct.salePrice ?? normalizedProduct.price ?? 0).toString(),
        costPrice: Number(normalizedProduct.costPrice ?? normalizedProduct.purchasePrice ?? 0).toString(),
        stock: Number(normalizedProduct.currentStock ?? normalizedProduct.stock ?? 0).toString(),
        minStock: Number(normalizedProduct.minStock ?? 0).toString(),
        categoryId: normalizedProduct.categoryId || '',
        imageFile: null,
        imageUrl: normalizedProduct.imageUrl || '',
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
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      setFormData({ ...formData, imageFile: file });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code || !formData.cashPrice || !formData.creditPrice || !formData.costPrice || !formData.stock || !formData.minStock) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = formData.imageUrl;

      if (formData.imageFile) {
        imageUrl = await uploadProductImage(formData.imageFile);
      }

      const productData = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        price: Number(formData.cashPrice),
        cashPrice: Number(formData.cashPrice),
        creditPrice: Number(formData.creditPrice),
        costPrice: Number(formData.costPrice),
        currentStock: Number(formData.stock),
        minStock: Number(formData.minStock),
        categoryId: formData.categoryId || undefined,
        categoryName: formData.categoryId
          ? categories.find(c => c.id === formData.categoryId)?.name
          : undefined,
        imageUrl,
        active: true,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        toast.success('Produto atualizado com sucesso');
      } else {
        await createProduct(productData);
        toast.success('Produto cadastrado com sucesso');
      }

      setDialogOpen(false);
      loadData();
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

  const filteredProducts = products.filter(product => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return false;

    const productName = String(product?.name || '').toLowerCase();
    const productCode = String(product?.code || '').toLowerCase();

    return productName.includes(search) || productCode.includes(search);
  });

  const visibleProducts = filteredProducts.filter(product => {
    const matchesCategory =
      filterCategory === 'all' || product.categoryId === filterCategory;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && product.active) ||
      (filterStatus === 'inactive' && !product.active);

    return matchesCategory && matchesStatus;
  });

  const exportFilteredProducts = products.filter((product: any) => {
    const search = searchTerm.trim().toLowerCase();
    const productName = String(product?.name || '').toLowerCase();
    const productCode = String(product?.code || '').toLowerCase();

    const matchesSearch = !search || productName.includes(search) || productCode.includes(search);
    const matchesCategory = filterCategory === 'all' || String(product?.categoryId || '') === filterCategory;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && product.active) ||
      (filterStatus === 'inactive' && !product.active);

    return matchesSearch && matchesCategory && matchesStatus;
  }).map((product: any) => ({
    ...product,
    currentStock: Number(product?.currentStock ?? product?.stock ?? 0),
    minStock: Number(product?.minStock ?? product?.minimumStock ?? 0),
    cashPrice: Number(product?.cashPrice ?? product?.salePrice ?? product?.price ?? 0),
    creditPrice: Number(product?.creditPrice ?? product?.salePrice ?? product?.price ?? 0),
    costPrice: Number(product?.costPrice ?? product?.purchasePrice ?? 0),
  }));

  const activeFilterParts = [
    searchTerm.trim() ? `Busca: "${searchTerm.trim()}"` : null,
    filterCategory !== 'all'
      ? `Categoria: ${categories.find(c => c.id === filterCategory)?.name || 'Selecionada'}`
      : null,
    filterStatus !== 'all'
      ? `Status: ${filterStatus === 'active' ? 'Ativos' : 'Inativos'}`
      : null,
  ].filter(Boolean);

  const activeFiltersLabel = activeFilterParts.length
    ? activeFilterParts.join(' | ')
    : 'Sem filtros específicos';

  const handleExportProductsPDF = async () => {
    const exportList = exportFilteredProducts;

    if (exportList.length === 0) {
      toast.error('Nenhum produto encontrado para os filtros selecionados');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      let y = await addPDFHeader(
        doc,
        settings,
        'Relatório de Produtos',
        activeFiltersLabel
      );

      const totalItems = exportList.length;
      const totalStock = exportList.reduce((sum, product) => sum + Number(product.currentStock || 0), 0);
      const totalCost = exportList.reduce((sum, product) => sum + (Number(product.costPrice || 0) * Number(product.currentStock || 0)), 0);
      const totalSale = exportList.reduce((sum, product) => sum + (Number(product.cashPrice || 0) * Number(product.currentStock || 0)), 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Produtos listados: ${totalItems}`, 14, y);
      doc.text(`Estoque total: ${totalStock.toLocaleString('pt-BR')}`, 82, y);
      y += 8;

      doc.setFillColor(235, 242, 255);
      doc.rect(14, y, 182, 10, 'F');
      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Código', 16, y + 6.5);
      doc.text('Produto', 34, y + 6.5);
      doc.text('Categoria', 108, y + 6.5);
      doc.text('Estoque', 143, y + 6.5);
      doc.text('À Vista', 160, y + 6.5);
      doc.text('Custo', 181, y + 6.5, { align: 'right' });
      y += 12;

      exportList.forEach((product, index) => {
        if (y > 272) {
          addPDFFooter(doc);
          doc.addPage();
          y = 20;
        }

        const codeLabel = String(product.code || '-');
        const nameLabel = String(product.name || 'Produto sem nome');
        const categoryLabel = String(product.categoryName || 'Sem categoria');
        const stockLabel = Number(product.currentStock || 0).toLocaleString('pt-BR');
        const cashLabel = formatCurrency(Number(product.cashPrice || 0));
        const costLabel = formatCurrency(Number(product.costPrice || 0));

        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 4, 182, 9, 'F');
        }

        doc.setTextColor(25, 25, 25);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(codeLabel, 16, y);
        doc.text(nameLabel.length > 38 ? `${nameLabel.slice(0, 38)}...` : nameLabel, 34, y);
        doc.text(categoryLabel.length > 20 ? `${categoryLabel.slice(0, 20)}...` : categoryLabel, 108, y);
        doc.text(stockLabel, 143, y);
        doc.text(cashLabel, 160, y);
        doc.text(costLabel, 181, y, { align: 'right' });

        y += 9;
      });

      y += 4;
      if (y > 270) {
        addPDFFooter(doc);
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, 196, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Valor de custo em estoque: ${formatCurrency(totalCost)}`, 14, y);
      y += 6;
      doc.text(`Valor de venda à vista em estoque: ${formatCurrency(totalSale)}`, 14, y);

      addPDFFooter(doc);
      doc.save('relatorio-produtos-filtrados.pdf');
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error exporting products PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleExportProductsExcel = () => {
    const exportList = exportFilteredProducts;

    if (exportList.length === 0) {
      toast.error('Nenhum produto encontrado para os filtros selecionados');
      return;
    }

    try {
      const data = exportList.map((product: any) => ({
        'Código': String(product.code || ''),
        'Produto': String(product.name || ''),
        'Descrição': String(product.description || ''),
        'Categoria': String(product.categoryName || 'Sem categoria'),
        'Estoque Atual': Number(product.currentStock || 0),
        'Estoque Mínimo': Number(product.minStock || 0),
        'Preço à Vista': Number(product.cashPrice || 0),
        'Preço a Prazo': Number(product.creditPrice || 0),
        'Preço de Custo': Number(product.costPrice || 0),
        'Status': product.active === false ? 'Inativo' : 'Ativo',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
      XLSX.writeFile(wb, 'relatorio-produtos-filtrados.xlsx');
      toast.success('Excel gerado com sucesso!');
    } catch (error) {
      console.error('Error exporting products Excel:', error);
      toast.error('Erro ao gerar Excel');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestão de Produtos</h1>
            <p className="text-white/70 mt-1">Cadastre e gerencie seus produtos</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportProductsPDF}
              variant="outline"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <FileText className="w-5 h-5 mr-2" />
              PDF
            </Button>
            <Button
              onClick={handleExportProductsExcel}
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

        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label className="text-white mb-2 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Digite o nome ou código do produto..."
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

        {loading ? (
          <div className="text-center py-12 text-white/70">
            Carregando produtos...
          </div>
        ) : !searchTerm.trim() ? (
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg">Pesquise para localizar um produto</p>
            <p className="text-white/50 text-sm mt-2">Digite o nome ou código do produto para buscar.</p>
          </Card>
        ) : visibleProducts.length === 0 ? (
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg">Nenhum produto encontrado</p>
            <p className="text-white/50 text-sm mt-2">Tente buscar pelo nome ou código do produto.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProducts.map((product) => (
              <Card
                key={product.id}
                className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl overflow-hidden hover:border-white/40 transition-all"
              >
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

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-white/50 text-xs">Preço à Vista</p>
                      <p className="text-green-400 font-bold text-lg">
                        R$ {formatCurrency(Number((product as any).cashPrice ?? product.price ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs">Preço a Prazo</p>
                      <p className="text-cyan-300 font-bold text-lg">
                        R$ {formatCurrency(Number((product as any).creditPrice ?? product.price ?? 0))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white/50 text-xs">Custo</p>
                      <p className="text-white font-medium">
                        R$ {formatCurrency(Number((product as any).costPrice ?? (product as any).purchasePrice ?? 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-xs">Estoque</p>
                      <p className={`font-bold text-lg ${
                        Number((product as any).currentStock ?? product.stock ?? 0) <= 0
                          ? 'text-red-400'
                          : Number((product as any).currentStock ?? product.stock ?? 0) <= Number(product.minStock ?? 0)
                          ? 'text-orange-400'
                          : 'text-white'
                      }`}>
                        {Number((product as any).currentStock ?? product.stock ?? 0).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {Number((product as any).currentStock ?? product.stock ?? 0) <= Number(product.minStock ?? 0) &&
                    Number((product as any).currentStock ?? product.stock ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-orange-400 text-xs mb-3">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Estoque baixo (mín: {Number(product.minStock ?? 0).toLocaleString('pt-BR')})</span>
                    </div>
                  )}

                  {Number((product as any).currentStock ?? product.stock ?? 0) <= 0 && (
                    <div className="flex items-center gap-1 text-red-400 text-xs mb-3">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Sem estoque</span>
                    </div>
                  )}

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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {editingProduct
                  ? 'Atualize as informações do produto selecionado.'
                  : 'Preencha os campos para cadastrar um novo produto.'}
              </DialogDescription>
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
                <Label className="text-white mb-2 block">Categoria</Label>
                <Select value={formData.categoryId || 'none'} onValueChange={(value) => setFormData({ ...formData, categoryId: value === 'none' ? '' : value })}>
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
    </Layout>
  );
}