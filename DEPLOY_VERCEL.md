# Deploy ERP Metal Trevo na Vercel

## 📋 Pré-requisitos

1. Conta na Vercel (https://vercel.com)
2. Projeto Firebase configurado
3. Variáveis de ambiente do Firebase

---

## 🔧 Configuração de Variáveis de Ambiente

Na Vercel, adicione as seguintes variáveis de ambiente em **Settings → Environment Variables**:

### Firebase Configuration
```
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

### Outras Variáveis (se aplicável)
```
NODE_ENV=production
DATABASE_URL=sua_connection_string (se usar MySQL/TiDB)
JWT_SECRET=seu_jwt_secret
```

---

## 📦 Passos para Deploy

### Opção 1: Deploy via CLI

1. **Instalar Vercel CLI:**
```bash
npm i -g vercel
```

2. **Fazer login:**
```bash
vercel login
```

3. **Deploy:**
```bash
cd erp_metal_trevo
vercel
```

4. **Deploy em produção:**
```bash
vercel --prod
```

### Opção 2: Deploy via GitHub

1. **Conectar repositório ao GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/erp-metal-trevo.git
git push -u origin main
```

2. **Importar no Vercel:**
   - Acesse https://vercel.com/new
   - Selecione seu repositório
   - Configure as variáveis de ambiente
   - Clique em "Deploy"

### Opção 3: Deploy via ZIP Upload

1. Acesse https://vercel.com/new
2. Clique em "Upload"
3. Faça upload do arquivo `erp_metal_trevo_deploy.zip`
4. Configure as variáveis de ambiente
5. Clique em "Deploy"

---

## 🔥 Configuração do Firebase

### 1. Firestore Rules

Certifique-se de que as regras do Firestore estão configuradas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura/escrita autenticada
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 2. Storage Rules

Configure as regras do Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Índices do Firestore

Crie os índices necessários conforme o arquivo `FIRESTORE_INDEX_INSTRUCTIONS.md`.

---

## ⚙️ Configurações Importantes

### Build Settings na Vercel

- **Framework Preset:** Vite
- **Build Command:** `pnpm build`
- **Output Directory:** `client/dist`
- **Install Command:** `pnpm install`
- **Node Version:** 20.x

### Domínio Customizado

1. Vá em **Settings → Domains**
2. Adicione seu domínio personalizado
3. Configure os registros DNS conforme instruções da Vercel

---

## 🐛 Troubleshooting

### Erro: "Module not found"
- Verifique se todas as dependências estão no `package.json`
- Execute `pnpm install` localmente para validar

### Erro: Firebase não inicializado
- Verifique se todas as variáveis `VITE_FIREBASE_*` estão configuradas
- Confirme que os valores estão corretos no console do Firebase

### Erro: Build timeout
- Aumente o timeout em `vercel.json` → `functions.maxDuration`
- Considere otimizar o bundle (code splitting)

### Erro: Serverless function crashed
- Verifique logs na Vercel Dashboard
- Confirme que as variáveis de ambiente estão corretas
- Teste localmente com `vercel dev`

---

## 📊 Monitoramento

Após o deploy:
1. Acesse o dashboard da Vercel
2. Monitore logs em tempo real
3. Configure alertas para erros
4. Verifique métricas de performance

---

## 🔒 Segurança

- ✅ Nunca commite arquivos `.env` no Git
- ✅ Use variáveis de ambiente da Vercel
- ✅ Configure CORS adequadamente
- ✅ Revise regras do Firebase regularmente
- ✅ Use HTTPS (automático na Vercel)

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique logs da Vercel
2. Consulte documentação: https://vercel.com/docs
3. Firebase docs: https://firebase.google.com/docs

---

**Última atualização:** Janeiro 2026
