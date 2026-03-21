import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users as UsersIcon, Plus, Edit, Trash2, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { User as UserType, UserRole } from '@/types';
import { getAllUsers, updateUser, deleteUser } from '@/services/userService';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, secondaryAuth, db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

export default function Users() {
  const { userData } = useAuthContext();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'vendedor' as UserRole,
  });

  useEffect(() => {
    // Verificar se é admin
    if (userData?.role !== 'admin') {
      toast.error('Acesso negado! Apenas administradores podem acessar esta página.');
      window.location.href = '/';
      return;
    }
    loadUsers();
  }, [userData]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: UserType) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        name: user.name,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'vendedor',
      });
    }
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('E-mail é obrigatório');
      return false;
    }
    if (!editingUser && !formData.password) {
      toast.error('Senha é obrigatória para novos usuários');
      return false;
    }
    if (!editingUser && formData.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingUser) {
        // Atualizar usuário existente
        await updateUser(editingUser.id, {
          name: formData.name.trim(),
          role: formData.role,
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Usar instância secundária do Auth para não deslogar o admin
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          formData.email.trim(),
          formData.password
        );

        // Criar documento no Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: formData.email.trim(),
          name: formData.name.trim(),
          role: formData.role,
          active: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: userData?.uid,
        });

        // Fazer logout apenas da instância secundária
        await secondaryAuth.signOut();
        
        toast.success('Usuário criado com sucesso!');
      }

      setDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está em uso');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Senha muito fraca');
      } else {
        toast.error(error?.message || 'Erro ao salvar usuário');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserType) => {
    if (user.uid === userData?.uid) {
      toast.error('Você não pode excluir sua própria conta');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      toast.success(`Usuário ${user.name} excluído com sucesso`);
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    }
  };



  const getRoleLabel = (role: UserRole) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'deposito') return 'Depósito';
    return 'Vendedor';
  };

  const getRoleColor = (role: UserRole) => {
    if (role === 'admin') return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (role === 'deposito') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Usuários</h1>
            <p className="text-white/70">Gerenciar usuários do sistema</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        </div>

        {/* Lista de Usuários */}
        {loading ? (
          <div className="text-center py-12 text-white/70">
            Carregando usuários...
          </div>
        ) : users.length === 0 ? (
          <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-12 text-center">
            <UsersIcon className="w-16 h-16 mx-auto mb-4 text-white/30" />
            <p className="text-white/70 text-lg">Nenhum usuário cadastrado</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {users.map((user) => (
              <Card
                key={user.id}
                className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-5 hover:border-white/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      user.role === 'admin' ? 'bg-blue-500/20' : 'bg-blue-500/20'
                    }`}>
                      {user.role === 'admin' ? (
                        <Shield className="w-6 h-6 text-blue-300" />
                      ) : (
                        <User className="w-6 h-6 text-blue-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-bold text-lg">{user.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>

                      </div>
                      <p className="text-white/70 text-sm">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleOpenDialog(user)}
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                      title="Editar usuário"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      onClick={() => handleDeleteUser(user)}
                      variant="outline"
                      size="sm"
                      className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                      disabled={user.uid === userData?.uid}
                      title={user.uid === userData?.uid ? 'Você não pode excluir sua própria conta' : 'Excluir usuário'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="backdrop-blur-2xl bg-gradient-to-br from-blue-900/95 to-cyan-900/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-white mb-2 block">Nome Completo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Digite o nome completo"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">E-mail *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@exemplo.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  disabled={!!editingUser}
                />
                {editingUser && (
                  <p className="text-white/50 text-xs mt-1">O e-mail não pode ser alterado</p>
                )}
              </div>

              {!editingUser && (
                <div>
                  <Label className="text-white mb-2 block">Senha *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              )}

              <div>
                <Label className="text-white mb-2 block">Perfil de Acesso *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                    <SelectItem value="vendedor">Vendedor (PDV, Vendas, Clientes)</SelectItem>
                    <SelectItem value="deposito">Depósito (Controle de Retiradas)</SelectItem>
                  </SelectContent>
                </Select>
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
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : editingUser ? 'Atualizar' : 'Criar Usuário'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


      </div>
    </Layout>
  );
}
