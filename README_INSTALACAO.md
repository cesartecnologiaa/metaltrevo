# Sistema ERP + PDV Metal Trevo

Sistema completo de gestão comercial com PDV integrado, desenvolvido com React, Firebase e design Liquid Glass premium.

## 🚀 Funcionalidades Implementadas

### ✅ Autenticação e Controle de Acesso
- Login obrigatório com Firebase Auth
- Primeiro usuário automaticamente Admin
- Controle de permissões por roles (Admin/Vendedor/Caixa)
- Proteção de rotas por perfil

### ✅ Dashboard (Exclusivo Admin)
- 6 tipos de gráficos avançados (vendas, faturamento, categorias, etc.)
- Cards com métricas em tempo real
- Alertas de estoque baixo com badge animado
- Design Liquid Glass premium

### ✅ PDV (Ponto de Venda)
- Busca de produtos em tempo real do Firebase
- Validação de estoque antes de adicionar ao carrinho
- Carrinho interativo com ajuste de quantidades
- 4 formas de pagamento (Dinheiro, PIX, Débito, Crédito)
- Impressão automática de comprovante A5 horizontal
- Salvamento automático de vendas no Firestore
- Atualização automática de estoque

### ✅ Gestão de Estoque
- Registro de movimentações com auditoria
- Alertas de estoque baixo
- Bloqueio de venda quando estoque insuficiente
- Sincronização offline com Firestore persistence

### ✅ Sistema de Vendas
- Números sequenciais automáticos
- Cancelamento com auditoria (motivo, responsável, data)
- Edição com histórico de mudanças
- Comprovante A5 horizontal para impressão

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta Firebase configurada
- pnpm instalado (`npm install -g pnpm`)

## 🔧 Instalação

### 1. Extrair o projeto
```bash
unzip erp_metal_trevo_completo.zip
cd erp_metal_trevo
```

### 2. Instalar dependências
```bash
pnpm install
```

### 3. Configurar Firebase

As credenciais do Firebase já estão configuradas no arquivo:
`client/src/lib/firebase.ts`

**Importante:** Você precisa configurar as regras de segurança no Firebase Console:

#### Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita autenticada
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Firebase Authentication:
1. Acesse Firebase Console > Authentication
2. Ative o método "E-mail/Senha"
3. Crie o primeiro usuário (será automaticamente Admin)

### 4. Criar produtos de exemplo (Opcional)

Acesse Firebase Console > Firestore Database e crie a coleção `products` com documentos de exemplo:

```json
{
  "name": "Cimento CP II 50kg",
  "code": "7891234567890",
  "price": 30.00,
  "costPrice": 25.00,
  "stock": 100,
  "minStock": 20,
  "active": true,
  "description": "Cimento Portland CP II",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 🚀 Executar o Projeto

### Modo Desenvolvimento
```bash
pnpm dev
```

Acesse: http://localhost:3000

### Build para Produção
```bash
pnpm build
pnpm start
```

## 📱 Primeiro Acesso

1. Acesse a URL do projeto
2. Clique em "Criar conta"
3. Cadastre-se com e-mail e senha
4. **O primeiro usuário será automaticamente Admin**
5. Usuários seguintes serão "Vendedor" por padrão

## 👥 Perfis de Usuário

### Admin
- Acesso total ao sistema
- Dashboard com gráficos
- Criar usuários
- Relatórios gerenciais
- Exportar dados

### Vendedor
- PDV (Ponto de Venda)
- Realizar vendas
- Editar vendas
- Cancelar vendas
- Consultar estoque
- Consultar clientes

### Caixa
- PDV (Ponto de Venda)
- Realizar vendas
- Consultar estoque

## 🎨 Design

O sistema utiliza o conceito **Liquid Glass iOS 26** com:
- Efeito de vidro fosco (backdrop-blur)
- Gradientes suaves
- Sombras profundas
- Animações fluidas
- Tema roxo/rosa premium

## 📄 Impressão de Comprovantes

- Formato: **A5 Horizontal** (148mm x 210mm)
- Impressão automática após finalizar venda
- Layout profissional com logo e dados da empresa
- Suporte a vendas canceladas

## 🔒 Segurança

- Autenticação obrigatória
- Proteção de rotas por role
- Validações de estoque
- Auditoria completa de ações
- Sincronização segura com Firebase

## 📊 Estrutura do Banco de Dados (Firestore)

### Coleções Principais:
- `products` - Produtos
- `sales` - Vendas
- `stock_movements` - Movimentações de estoque
- `clients` - Clientes
- `suppliers` - Fornecedores
- `categories` - Categorias

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19 + TypeScript
- **Estilização:** Tailwind CSS 4
- **Banco de Dados:** Firebase Firestore
- **Autenticação:** Firebase Auth
- **Gráficos:** Recharts
- **Ícones:** Lucide React
- **Formulários:** React Hook Form + Zod
- **UI Components:** shadcn/ui

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique as regras do Firebase
2. Confirme que o primeiro usuário foi criado
3. Verifique o console do navegador para erros

## 🎯 Próximos Passos Sugeridos

1. **Criar produtos reais** no Firestore para testar o PDV
2. **Implementar gestão de produtos** - CRUD completo com upload de imagens
3. **Criar módulo de clientes** - Cadastro com histórico de compras
4. **Desenvolver relatórios** - Exportação para PDF/Excel

---

**Desenvolvido com ❤️ para Metal Trevo**

Boa noite e bom descanso! 😴
