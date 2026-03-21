import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Upload, Save } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

interface CompanySettings {
  name: string;
  subtitle?: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  logo?: string;
}

export default function Settings() {
  const { userData } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>({
    name: '',
    subtitle: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data() as CompanySettings);
        if (docSnap.data().logo) {
          setLogoPreview(docSnap.data().logo);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | undefined> => {
    if (!logoFile) return settings.logo;

    setUploading(true);
    try {
      return await uploadFileToCloudinary(logoFile, 'erp-metal-trevo/company');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao fazer upload da logo');
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Saving company settings...');
      let logoUrl = settings.logo;
      
      if (logoFile) {
        console.log('Uploading logo...');
        logoUrl = await uploadLogo();
        console.log('Logo uploaded:', logoUrl);
      }

      const dataToSave = {
        ...settings,
        logo: logoUrl,
        updatedAt: Timestamp.now(),
        updatedBy: userData?.uid,
      };

      console.log('Saving to Firestore:', dataToSave);
      await setDoc(doc(db, 'settings', 'company'), dataToSave);
      console.log('Settings saved successfully');
      
      toast.success('Configurações salvas com sucesso!');
      setLogoFile(null);
      // Não recarregar para evitar loop - dados já estão no state
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Erro ao salvar configurações: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            Configurações da Empresa
          </h1>
          <p className="text-gray-600 mt-2">
            Configure os dados da sua empresa que aparecerão nos comprovantes de venda
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Preencha os dados da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div>
                <Label>Logo da Empresa</Label>
                <div className="mt-2 flex items-center gap-4">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-24 h-24 object-contain border rounded-lg"
                    />
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="max-w-xs"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Recomendado: 200x200px, PNG ou JPG
                    </p>
                  </div>
                </div>
              </div>

              {/* Nome e CNPJ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={settings.cnpj}
                    onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>
              </div>

              {/* Subtítulo */}
              <div>
                <Label htmlFor="subtitle">Subtítulo (opcional)</Label>
                <Input
                  id="subtitle"
                  value={settings.subtitle || ''}
                  onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                  placeholder="Ex: Materiais para construção"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Aparecerá abaixo do nome da empresa nos comprovantes
                </p>
              </div>

              {/* Endereço */}
              <div>
                <Label htmlFor="address">Endereço *</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  required
                />
              </div>

              {/* Cidade, Estado e CEP */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={settings.city}
                    onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={settings.state}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">CEP *</Label>
                  <Input
                    id="zipCode"
                    value={settings.zipCode}
                    onChange={(e) => setSettings({ ...settings, zipCode: e.target.value })}
                    placeholder="00000-000"
                    required
                  />
                </div>
              </div>

              {/* Telefone e Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="(00) 0000-0000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={loading || uploading}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {loading || uploading ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
