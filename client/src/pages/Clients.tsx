import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Users, CheckCircle, Phone, Mail, MapPin, DollarSign, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Client } from '@/types';
import { 
  getAllClients, 
  createClient, 
  updateClient, 
  deactivateClient,
  reactivateClient,
  getClientByCpfCnpj,
  deleteClient
} from '@/services/clientService';
import { 
  validateCpfCnpj, 
  formatCpfCnpj, 
  formatCEP, 
  formatPhone 
} from '@/lib/validators';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { formatDate as formatFirestoreDate } from '@/lib/firestoreUtils';
import { getClientPendingBalance, getClientPendingInstallments, markInstallmentAsPaid } from '@/services/accountsReceivableService';

export default function Clients() {
  const permissions = usePermissions();
  const { userData } = useAuthContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [pendingBalances, setPendingBalances] = useState<Record<string, { total: number; overdue: number }>>({});
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [selectedPendingClient, setSelectedPendingClient] = useState<Client | null>(null);
  const [pendingInstallments, setPendingInstallments] = useState<Array<{
    accountId: string;
    saleId: string;
    saleNumber: string;
    clientName?: string;
    installment: any;
  }>>([]);
  const [loadingPendingInstallments, setLoadingPendingInstallments] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cpfCnpj: '',
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
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const clientsData = await getAllClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        cpfCnpj: client.cpfCnpj,
        email: client.email || '',
        phone: client.phone || '',
        street: client.address?.street || '',
        number: client.address?.number || '',
        complement: client.address?.complement || '',
        neighborhood: client.address?.neighborhood || '',
        city: client.address?.city || '',
        state: client.address?.state || '',
        zipCode: client.address?.zipCode || '',
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        cpfCnpj: '',
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

  const handleCpfCnpjChange = (value: string) => {
    const formatted = formatCpfCnpj(value);
    setFormData({ ...formData, cpfCnpj: formatted });
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
      toast.error('Nome é obrigatório');
      return false;
    }
    if (!formData.cpfCnpj.trim()) {
      toast.error('CPF/CNPJ é obrigatório');
      return false;
    }
    if (!validateCpfCnpj(formData.cpfCnpj)) {
      toast.error('CPF/CNPJ inválido');
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
      // Verificar se CPF/CNPJ já existe (apenas para novo cadastro)
      if (!editingClient) {
        const existingClient = await getClientByCpfCnpj(formData.cpfCnpj);
        if (existingClient) {
          toast.error('CPF/CNPJ já cadastrado');
          setSaving(false);
          return;
        }
      }

      // Preparar dados do cliente, removendo campos undefined
      const clientData: any = {
        name: formData.name.trim(),
        cpfCnpj: formData.cpfCnpj.replace(/[^\d]/g, ''),
        active: true,
      };

      // Adicionar email apenas se preenchido
      if (formData.email.trim()) {
        clientData.email = formData.email.trim();
      }

      // Adicionar telefone apenas se preenchido
      if (formData.phone.replace(/[^\d]/g, '')) {
        clientData.phone = formData.phone.replace(/[^\d]/g, '');
      }

      // Adicionar endereço apenas se rua estiver preenchida
      if (formData.street.trim()) {
        clientData.address = {
          street: formData.street.trim(),
          number: formData.number.trim(),
          neighborhood: formData.neighborhood.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zipCode: formData.zipCode.replace(/[^\d]/g, ''),
        };
        // Adicionar complemento apenas se preenchido
        if (formData.complement.trim()) {
          clientData.address.complement = formData.complement.trim();
        }
      }

      if (editingClient) {
        await updateClient(editingClient.id, clientData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await createClient(clientData);
        toast.success('Cliente cadastrado com sucesso!');
      }

      setDialogOpen(false);
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (client: Client) => {
    try {
      if (client.active) {
        await deactivateClient(client.id);
        toast.success('Cliente desativado');
      } else {
        await reactivateClient(client.id);
        toast.success('Cliente reativado');
      }
      loadClients();
    } catch (error) {
      console.error('Error toggling client status:', error);
      toast.error('Erro ao alterar status do cliente');
    }
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    
    try {
      await deleteClient(clientToDelete.id);
      toast.success('Cliente excluído permanentemente');
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch =
        client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.cpfCnpj?.includes(searchTerm.replace(/[^\d]/g, '')) ||
        (client?.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client?.phone && client.phone.includes(searchTerm.replace(/[^\d]/g, '')));

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && client.active) ||
        (filterStatus === 'inactive' && !client.active);

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, filterStatus]);

  const visibleClients = useMemo(() => {
    return filteredClients.slice(0, searchTerm.trim() ? 20 : 12);
  }, [filteredClients, searchTerm]);

  const visibleClientIdsKey = useMemo(() => {
    return visibleClients.map(client => client.id).join('|');
  }, [visibleClients]);

  useEffect(() => {
    let cancelled = false;

    const loadPendingBalances = async () => {
      if (!searchTerm.trim() || visibleClients.length === 0) {
        if (!cancelled) {
          setPendingBalances(prev => (Object.keys(prev).length ? {} : prev));
        }
        return;
      }

      try {
        const results = await Promise.all(
          visibleClients.map(async (client) => ({
            clientId: client.id,
            balance: await getClientPendingBalance(client.id),
          }))
        );

        if (cancelled) return;

        const nextBalances: Record<string, { total: number; overdue: number }> = {};
        results.forEach(({ clientId, balance }) => {
          nextBalances[clientId] = {
            total: Number(balance?.total || 0),
            overdue: Number(balance?.overdue || 0),
          };
        });

        setPendingBalances(prev => {
          const prevKeys = Object.keys(prev);
          const nextKeys = Object.keys(nextBalances);
          if (prevKeys.length === nextKeys.length) {
            let changed = false;
            for (const key of nextKeys) {
              if (!prev[key] || prev[key].total !== nextBalances[key].total || prev[key].overdue !== nextBalances[key].overdue) {
                changed = true;
                break;
              }
            }
            if (!changed) return prev;
          }
          return nextBalances;
        });
      } catch (error) {
        console.error('Error loading pending balances:', error);
      }
    };

    loadPendingBalances();

    return () => {
      cancelled = true;
    };
  }, [searchTerm, visibleClientIdsKey]);

  const openPendingDialog = async (client: Client) => {
    setSelectedPendingClient(client);
    setPendingDialogOpen(true);
    setLoadingPendingInstallments(true);
    try {
      const data = await getClientPendingInstallments(client.id);
      setPendingInstallments(data);
    } catch (error) {
      console.error('Error loading pending installments:', error);
      toast.error('Erro ao carregar pendências do cliente');
    } finally {
      setLoadingPendingInstallments(false);
    }
  };

  const handleMarkPendingAsPaid = async (accountId: string, installmentNumber: number) => {
    if (!userData) {
      toast.error('Usuário não identificado');
      return;
    }

    const paymentKey = `${accountId}-${installmentNumber}`;
    setProcessingPaymentId(paymentKey);
    try {
      await markInstallmentAsPaid(accountId, installmentNumber, userData.uid, userData.name);
      toast.success('Parcela marcada como paga');

      if (selectedPendingClient) {
        const [updatedPending, updatedBalance] = await Promise.all([
          getClientPendingInstallments(selectedPendingClient.id),
          getClientPendingBalance(selectedPendingClient.id),
        ]);
        setPendingInstallments(updatedPending);
        setPendingBalances(prev => ({ ...prev, [selectedPendingClient.id]: updatedBalance }));
      }
    } catch (error) {
      console.error('Error marking installment as paid:', error);
      toast.error('Erro ao dar baixa na parcela');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Clientes</h1>
          <p className="text-white/70 mt-1">Cadastre e gerencie seus clientes</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Cliente
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
                placeholder="Nome, CPF/CNPJ, e-mail ou telefone..."
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

      {/* Lista de Clientes */}
      {loading ? (
        <div className="text-center py-12 text-white/70">
          Carregando clientes...
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70 text-lg">Nenhum cliente encontrado</p>
          <p className="text-white/50 text-sm mt-2">Cadastre seu primeiro cliente para começar</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleClients.map((client) => {
            const pendingInfo = pendingBalances[client.id];
            const hasPending = (pendingInfo?.total || 0) > 0;
            return (
            <Card
              key={client.id}
              className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5 hover:border-white/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">{client.name}</h3>
                  <p className="text-white/50 text-sm">
                    {formatCpfCnpj(client.cpfCnpj)}
                  </p>
                </div>
                {!client.active && (
                  <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-300 text-xs">
                    Inativo
                  </span>
                )}
              </div>

              {searchTerm.trim() && hasPending && (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                  pendingInfo.overdue > 0
                    ? 'border-red-500/30 bg-red-500/10 text-red-200'
                    : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 font-semibold">
                    {pendingInfo.overdue > 0 ? <AlertTriangle className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    {pendingInfo.overdue > 0 ? 'Pagamentos pendentes vencidos' : 'Pagamentos pendentes'}
                  </div>
                  <div className="mt-1">
                    Total em aberto: <span className="font-bold">R$ {formatCurrency(pendingInfo.total)}</span>
                    {pendingInfo.overdue > 0 && (
                      <span className="ml-2 text-red-300">Vencido: R$ {formatCurrency(pendingInfo.overdue)}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {client.email && (
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Phone className="w-4 h-4" />
                    <span>{formatPhone(client.phone)}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-2 text-white/70 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">
                      {client.address.city}, {client.address.state}
                    </span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="space-y-2">
                {hasPending && (
                  <Button
                    onClick={() => openPendingDialog(client)}
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Ver pendências / Dar baixa
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleOpenDialog(client)}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleToggleStatus(client)}
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${
                      client.active 
                        ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                        : 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20'
                    }`}
                  >
                    {client.active ? (
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
                      onClick={() => handleDeleteClick(client)}
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
          );
          })}
        </div>
      )}

      {/* Dialog de Pendências do Cliente */}
      <Dialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
        <DialogContent className="max-w-3xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Pendências de {selectedPendingClient?.name}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Visualize os pagamentos pendentes do cliente e dê baixa nas parcelas em aberto.
            </DialogDescription>
          </DialogHeader>

          {loadingPendingInstallments ? (
            <div className="py-10 text-center text-white/70">Carregando pendências...</div>
          ) : pendingInstallments.length === 0 ? (
            <div className="py-10 text-center text-white/70">Este cliente não possui pendências em aberto.</div>
          ) : (
            <div className="space-y-3">
              {pendingInstallments.map((item) => {
                const paymentKey = `${item.accountId}-${item.installment.installmentNumber}`;
                const isProcessing = processingPaymentId === paymentKey;
                return (
                  <div key={paymentKey} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-white font-semibold">
                          Venda #{item.saleNumber} • Parcela {item.installment.installmentNumber}
                        </p>
                        <p className="text-white/70 text-sm">
                          Vencimento: {formatFirestoreDate(item.installment.dueDate)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-emerald-300 font-bold">
                            R$ {formatCurrency(item.installment.amount)}
                          </span>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            item.installment.status === 'vencida'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {item.installment.status === 'vencida' ? 'Vencida' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleMarkPendingAsPaid(item.accountId, item.installment.installmentNumber)}
                        disabled={isProcessing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isProcessing ? 'Processando...' : 'Dar baixa'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Dialog de Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {editingClient
                ? 'Atualize os dados do cliente selecionado.'
                : 'Preencha os campos para cadastrar um novo cliente.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Dados Básicos */}
            <div>
              <h3 className="text-white font-semibold mb-3">Dados Básicos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-white mb-2 block">Nome Completo *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">CPF/CNPJ *</Label>
                  <Input
                    value={formData.cpfCnpj}
                    onChange={(e) => handleCpfCnpjChange(e.target.value)}
                    placeholder="000.000.000-00"
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
                    placeholder="email@exemplo.com"
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
                    placeholder="Apto 101, Bloco A"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Bairro</Label>
                  <Input
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Centro"
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
                {saving ? 'Salvando...' : editingClient ? 'Atualizar' : 'Cadastrar'}
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
              Tem certeza que deseja excluir permanentemente o cliente <strong>{clientToDelete?.name}</strong>?
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
