import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Tag, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Category } from '@/types';
import { 
  getAllCategories, 
  createCategory, 
  updateCategory, 
  deactivateCategory,
  reactivateCategory,
  deleteCategory 
} from '@/services/categoryService';
import { getAllProducts } from '@/services/productService';
import { usePermissions } from '@/hooks/usePermissions';

export default function Categories() {
  const permissions = usePermissions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesData, productsData] = await Promise.all([
        getAllCategories(),
        getAllProducts()
      ]);
      
      setCategories(categoriesData);
      
      // Contar produtos por categoria
      const counts: Record<string, number> = {};
      productsData.forEach(product => {
        if (product.categoryId) {
          counts[product.categoryId] = (counts[product.categoryId] || 0) + 1;
        }
      });
      setProductCounts(counts);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
        toast.success('Categoria atualizada com sucesso!');
      } else {
        await createCategory(
          formData.name.trim(),
          formData.description.trim()
        );
        toast.success('Categoria cadastrada com sucesso!');
      }

      setDialogOpen(false);
      await loadData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(`Erro ao salvar categoria: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (category: Category) => {
    try {
      if (category.active) {
        await deactivateCategory(category.id);
        toast.success('Categoria desativada');
      } else {
        await reactivateCategory(category.id);
        toast.success('Categoria reativada');
      }
      loadData();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast.error('Erro ao alterar status da categoria');
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    
    try {
      await deleteCategory(categoryToDelete.id);
      toast.success('Categoria excluída permanentemente');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  // Filtros
  const filteredCategories = categories.filter(category => {
    const matchesSearch = 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && category.active) ||
      (filterStatus === 'inactive' && !category.active);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Tag className="h-8 w-8" />
            Categorias
          </h1>
          <p className="text-white/60 mt-1">Gerencie as categorias de produtos</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 bg-white/5 border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white mb-2 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          <div>
            <Label className="text-white mb-2 block">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de Categorias */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-white/60 mt-4">Carregando categorias...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="p-12 text-center bg-white/5 border-white/10">
          <Tag className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Nenhuma categoria encontrada
          </h3>
          <p className="text-white/60 mb-6">
            {searchTerm || filterStatus !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando sua primeira categoria'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <Card
              key={category.id}
              className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Tag className="h-5 w-5 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {category.name}
                    </h3>
                    <p className="text-sm text-white/60">
                      {productCounts[category.id] || 0} produtos
                    </p>
                  </div>
                </div>
                {category.active ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
              </div>

              {category.description && (
                <p className="text-white/70 text-sm mb-4 line-clamp-2">
                  {category.description}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(category)}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(category)}
                  className={`flex-1 border-white/20 ${
                    category.active
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  {category.active ? (
                    <>
                      <XCircle className="h-4 w-4 mr-1" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Ativar
                    </>
                  )}
                </Button>
                {permissions.isAdmin && (
                  <Button
                    onClick={() => handleDeleteClick(category)}
                    variant="outline"
                    size="sm"
                    className="bg-red-600/10 border-red-600/30 text-red-400 hover:bg-red-600/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
          <DialogHeader>
  <DialogTitle className="text-2xl font-bold text-white">
    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
  </DialogTitle>
  <DialogDescription className="text-white/70">
    {editingCategory
      ? 'Atualize os dados da categoria selecionada.'
      : 'Preencha os campos para cadastrar uma nova categoria.'}
  </DialogDescription>
</DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Nome da Categoria *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Ferramentas"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da categoria..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                disabled={saving}
              >
                {saving ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Cadastrar'}
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
              Tem certeza que deseja excluir permanentemente a categoria <strong>{categoryToDelete?.name}</strong>?
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
