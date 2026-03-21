# Instruções para Criar Índice do Firestore

## Problema

A página de **Relatórios** está apresentando o seguinte erro:

```
Error generating report: The query requires an index.
```

## Causa

A query de relatório de fluxo de caixa (`generateCashflowReport`) no arquivo `client/src/pages/Reports.tsx` (linhas 134-139) está fazendo uma consulta composta no Firestore:

```typescript
const cashQuery = query(
  collection(db, 'cashRegisters'),
  where('closedAt', '>=', Timestamp.fromDate(start)),
  where('closedAt', '<=', Timestamp.fromDate(end)),
  where('status', '==', 'closed')
);
```

O Firestore requer um **índice composto** para queries que:
1. Filtram por múltiplos campos
2. Usam operadores de comparação (`>=`, `<=`) em campos diferentes

## Solução

### Passo 1: Acessar o Firebase Console

Clique no link fornecido no erro (ou use o link abaixo):

**Link direto para criar o índice:**
```
https://console.firebase.google.com/v1/r/project/erp-metal-trevo/firestore/indexes?create_composite=ClVwcm9qZWN0cy9lcnAtbWV0YWwtdHJldm8vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Nhc2hSZWdpc3RlcnMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDAoIY2xvc2VkQXQQARoMCghfX25hbWVfXhAB
```

### Passo 2: Confirmar Criação do Índice

1. O Firebase Console abrirá com os parâmetros do índice já preenchidos:
   - **Coleção:** `cashRegisters`
   - **Campos:**
     - `status` (Ascending)
     - `closedAt` (Ascending)
     - `__name__` (Ascending)

2. Clique no botão **"Create Index"** (Criar Índice)

3. Aguarde a criação do índice (pode levar de **2 a 10 minutos**)

### Passo 3: Verificar Status do Índice

1. No Firebase Console, vá para:
   ```
   Firestore Database → Indexes
   ```

2. Verifique se o índice aparece com status **"Building"** (Construindo)

3. Quando o status mudar para **"Enabled"** (Ativado), o índice está pronto

### Passo 4: Testar a Página de Relatórios

1. Volte para o sistema ERP Metal Trevo
2. Acesse a página **Relatórios**
3. Selecione o tipo de relatório **"Fluxo de Caixa"**
4. Escolha um período e clique em **"Gerar Relatório"**
5. O relatório deve ser gerado sem erros

## Índices Necessários

### Índice 1: Relatório de Fluxo de Caixa
- **Coleção:** `cashRegisters`
- **Campos:**
  - `status` (ASC)
  - `closedAt` (ASC)
  - `__name__` (ASC)
- **Status:** ⏳ Pendente de criação manual

## Observações

- **Não é possível criar índices programaticamente** via código do aplicativo por questões de segurança
- Índices devem ser criados manualmente no Firebase Console
- Após criar o índice, ele ficará disponível permanentemente
- Se houver mudanças nas queries no futuro, novos índices podem ser necessários

## Prevenção Futura

Para evitar esse tipo de erro no futuro:

1. **Teste queries complexas** em ambiente de desenvolvimento antes de deploy
2. **Documente índices necessários** em um arquivo `firestore.indexes.json`
3. **Use Firebase CLI** para exportar/importar índices entre projetos:
   ```bash
   firebase firestore:indexes > firestore.indexes.json
   ```

## Suporte

Se encontrar problemas ao criar o índice:

1. Verifique se você tem permissões de **Editor** ou **Proprietário** no projeto Firebase
2. Tente fazer logout e login novamente no Firebase Console
3. Limpe o cache do navegador e tente novamente
4. Entre em contato com o administrador do projeto Firebase

---

**Última atualização:** 18/01/2026
**Responsável:** Sistema ERP Metal Trevo
