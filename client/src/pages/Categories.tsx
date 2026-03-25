import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Tag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import Layout from '@/components/Layout';

function normalizeText(value: string | undefined | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

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
        getAllProducts(),
      ]);

      setCategories(categoriesData);

      const categoryById = new Map(categoriesData.map((category) => [category.id, category]));
      const categoryIdByName = new Map(
        categoriesData.map((category) => [normalizeText(category.name), category.id])
      );

      const counts: Record<string, number> = {};

      productsData.forEach((product: any) => {
        let resolvedCategoryId = product.categoryId;

        if (!resolvedCategoryId) {
          const importedCategoryName =
            product.categoryName ||
            product.family ||
            product.category ||
            '';

          resolvedCategoryId = categoryIdByName.get(normalizeText(importedCategoryName));
        }

        if (resolvedCategoryId && categoryById.has(resolvedCategoryId)) {
          counts[resolvedCategoryId] = (counts[resolvedCategoryId] || 0) + 1;
        }
      });

      setProductCounts(counts);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar categorias');
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

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Informe o nome da categoria');
      return;
    }

    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        active: true,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
        toast.success('Categoria atualizada com sucesso');
      } else {
        await createCategory(categoryData);
        toast.success('Categoria cadastrada com sucesso');
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(`Erro ao salvar categoria: ${error?.message || 'Erro desconhecido'}`);
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
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error?.message || 'Erro ao excluir categoria');
    }
  };

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
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestão de Categorias</h1>
            <p className="text-white/70 mt-1">Organize os produtos em categorias</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Categoria
          </Button>
        </div>

        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label className="text-white mb-2 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-10 rounded-md bg-white/5 border border-white/20 text-white px-3"
              >
                <option value="active" className="text-black">Ativas</option>
                <option value="inactive" className="text-black">Inativas</option>
                <option value="all" className="text-black">Todas</option>
              </select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-white/70">
            Carregando categorias...
          </div>
        ) : filteredCategories.length === 0 ? (
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
            <Tag className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg">Nenhuma categoria encontrada</p>
            <p className="text-white/50 text-sm mt-2">Cadastre sua primeira categoria para começar</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <Card
                key={category.id}
                className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5 hover:border-white/40 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        <Tag className="w-6 h-6 text-blue-300" />
                      </div>
                      {!category.active && (
                        <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-300 text-xs">
                          Inativa
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-lg">{category.name}</h3>
                    {category.description && (
                      <p className="text-white/70 text-sm mt-2 line-clamp-3">{category.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 rounded-lg bg-white/5 p-3">
                  <Package className="w-4 h-4 text-cyan-300" />
                  <span className="text-white/70 text-sm">Produtos vinculados:</span>
                  <span className="text-white font-semibold">{productCounts[category.id] || 0}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleOpenDialog(category)}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>

                  <Button
                    onClick={() => handleToggleStatus(category)}
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${
                      category.active
                        ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                        : 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20'
                    }`}
                  >
                    {category.active ? 'Desativar' : 'Reativar'}
                  </Button>

                  <Button
                    onClick={() => handleDeleteClick(category)}
                    variant="outline"
                    size="sm"
                    className="bg-red-600/10 border-red-600/30 text-red-400 hover:bg-red-600/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {editingCategory
                  ? 'Atualize as informações da categoria selecionada.'
                  : 'Preencha os campos para cadastrar uma nova categoria.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Nome da Categoria *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cimentos"
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
                  onClick={() => setDialogOpen(false)}
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {editingCategory ? 'Atualizar' : 'Cadastrar'}
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
    </Layout>
  );
}
