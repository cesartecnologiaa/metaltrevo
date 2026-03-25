import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building2, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Supplier } from '@/types';
import { 
  getAllSuppliers, 
  createSupplier, 
  updateSupplier, 
  deactivateSupplier,
  reactivateSupplier,
  getSupplierByCnpj,
  deleteSupplier
} from '@/services/supplierService';
import { 
  validateCNPJ, 
  formatCNPJ, 
  formatCEP, 
  formatPhone 
} from '@/lib/validators';
import { usePermissions } from '@/hooks/usePermissions';
import Layout from '@/components/Layout';

export default function Suppliers() {
  const permissions = usePermissions();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const suppliersData = await getAllSuppliers();
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        cnpj: supplier.cnpj,
        email: supplier.email || '',
        phone: supplier.phone || '',
        street: supplier.address?.street || '',
        number: supplier.address?.number || '',
        complement: supplier.address?.complement || '',
        neighborhood: supplier.address?.neighborhood || '',
        city: supplier.address?.city || '',
        state: supplier.address?.state || '',
        zipCode: supplier.address?.zipCode || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCnpjChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setFormData({ ...formData, cnpj: formatted });
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCEP(value);
    setFormData({ ...formData, zipCode: formatted });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Nome/Razão Social é obrigatório');
      return false;
    }
    if (!formData.cnpj.trim()) {
      toast.error('CNPJ é obrigatório');
      return false;
    }
    if (!validateCNPJ(formData.cnpj)) {
      toast.error('CNPJ inválido');
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('E-mail inválido');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Verificar se CNPJ já existe (apenas para novo cadastro)
      if (!editingSupplier) {
        const existingSupplier = await getSupplierByCnpj(formData.cnpj);
        if (existingSupplier) {
          toast.error('CNPJ já cadastrado');
          setSaving(false);
          return;
        }
      }

      const supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        cnpj: formData.cnpj.replace(/[^\d]/g, ''),
        email: formData.email.trim() || undefined,
        phone: formData.phone.replace(/[^\d]/g, '') || undefined,
        address: formData.street ? {
          street: formData.street.trim(),
          number: formData.number.trim(),
          complement: formData.complement.trim() || undefined,
          neighborhood: formData.neighborhood.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zipCode: formData.zipCode.replace(/[^\d]/g, ''),
        } : undefined,
        active: true,
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, supplierData);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await createSupplier(supplierData);
        toast.success('Fornecedor cadastrado com sucesso!');
      }

      setDialogOpen(false);
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      if (supplier.active) {
        await deactivateSupplier(supplier.id);
        toast.success('Fornecedor desativado');
      } else {
        await reactivateSupplier(supplier.id);
        toast.success('Fornecedor reativado');
      }
      loadSuppliers();
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      toast.error('Erro ao alterar status do fornecedor');
    }
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;
    
    try {
      await deleteSupplier(supplierToDelete.id);
      toast.success('Fornecedor excluído permanentemente');
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Erro ao excluir fornecedor');
    }
  };

  // Filtros
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.cnpj.includes(searchTerm.replace(/[^\d]/g, '')) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.phone && supplier.phone.includes(searchTerm.replace(/[^\d]/g, '')));
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && supplier.active) ||
      (filterStatus === 'inactive' && !supplier.active);

    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Fornecedores</h1>
          <p className="text-white/70 mt-1">Cadastre e gerencie seus fornecedores</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Filtros */}
      <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label className="text-white mb-2 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <Input
                type="text"
                placeholder="Nome, CNPJ, e-mail ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50"
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
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de Fornecedores */}
      {loading ? (
        <div className="text-center py-12 text-white/70">
          Carregando fornecedores...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70 text-lg">Nenhum fornecedor encontrado</p>
          <p className="text-white/50 text-sm mt-2">Cadastre seu primeiro fornecedor para começar</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <Card
              key={supplier.id}
              className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5 hover:border-white/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">{supplier.name}</h3>
                  <p className="text-white/50 text-sm">
                    CNPJ: {formatCNPJ(supplier.cnpj)}
                  </p>
                </div>
                {!supplier.active && (
                  <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-300 text-xs">
                    Inativo
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                {supplier.email && (
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{formatPhone(supplier.phone)}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-2 text-white/70 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">
                      {supplier.address.city}, {supplier.address.state}
                    </span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleOpenDialog(supplier)}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  onClick={() => handleToggleStatus(supplier)}
                  variant="outline"
                  size="sm"
                  className={`flex-1 ${
                    supplier.active 
                      ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                      : 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20'
                  }`}
                >
                  {supplier.active ? (
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
                    onClick={() => handleDeleteClick(supplier)}
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
        <DialogContent className="max-w-3xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {editingSupplier
                ? 'Atualize os dados do fornecedor selecionado.'
                : 'Preencha os campos para cadastrar um novo fornecedor.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Dados Básicos */}
            <div>
              <h3 className="text-white font-semibold mb-3">Dados Básicos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-white mb-2 block">Razão Social / Nome *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Distribuidora ABC Ltda"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">CNPJ *</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-white mb-2 block">E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@fornecedor.com.br"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h3 className="text-white font-semibold mb-3">Endereço (Opcional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">CEP</Label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Número</Label>
                  <Input
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="123"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-white mb-2 block">Rua</Label>
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Rua Exemplo"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-white mb-2 block">Complemento</Label>
                  <Input
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Galpão 5, Sala 201"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Bairro</Label>
                  <Input
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Distrito Industrial"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Cidade</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-white mb-2 block">Estado</Label>
                  <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">Acre</SelectItem>
                      <SelectItem value="AL">Alagoas</SelectItem>
                      <SelectItem value="AP">Amapá</SelectItem>
                      <SelectItem value="AM">Amazonas</SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="DF">Distrito Federal</SelectItem>
                      <SelectItem value="ES">Espírito Santo</SelectItem>
                      <SelectItem value="GO">Goiás</SelectItem>
                      <SelectItem value="MA">Maranhão</SelectItem>
                      <SelectItem value="MT">Mato Grosso</SelectItem>
                      <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                      <SelectItem value="MG">Minas Gerais</SelectItem>
                      <SelectItem value="PA">Pará</SelectItem>
                      <SelectItem value="PB">Paraíba</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="PI">Piauí</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                      <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                      <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                      <SelectItem value="RO">Rondônia</SelectItem>
                      <SelectItem value="RR">Roraima</SelectItem>
                      <SelectItem value="SC">Santa Catarina</SelectItem>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="SE">Sergipe</SelectItem>
                      <SelectItem value="TO">Tocantins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setDialogOpen(false)}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                disabled={saving}
              >
                {saving ? 'Salvando...' : editingSupplier ? 'Atualizar' : 'Cadastrar'}
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
              Tem certeza que deseja excluir permanentemente o fornecedor <strong>{supplierToDelete?.name}</strong>?
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