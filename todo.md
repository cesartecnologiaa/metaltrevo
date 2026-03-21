# ERP + PDV Metal Trevo - Lista de Funcionalidades

## 1. Configuração e Estrutura Base
- [x] Configurar Firebase (Auth + Firestore) com credenciais fornecidas
- [x] Implementar Design System Liquid Glass (cores, efeitos, componentes)
- [x] Criar estrutura de pastas e arquitetura do projeto
- [x] Configurar persistência offline do Firestore

## 2. Autenticação e Controle de Acesso
- [x] Sistema de login com Firebase Auth
- [x] Controle de acesso por roles (admin/vendedor/caixa)
- [x] Tela de login com design Liquid Glass
- [x] Proteção de rotas por role

## 3. Dashboard Principal
- [x] Cards com métricas em tempo real (vendas do dia)
- [x] Card de estoque baixo com alertas
- [x] Card de produtos mais vendidos
- [x] Design Liquid Glass nos cards do dashboard
- [x] Gráficos e visualizações de dados

## 4. Módulo PDV (Ponto de Venda)
- [x] Interface de busca rápida de produtos
- [x] Carrinho de compras com adicionar/remover itens
- [x] Cálculo automático de totais e subtotais
- [x] Finalização de venda com registro no Firestore
- [x] Impressão/geração de comprovante de venda
- [x] Suporte a diferentes formas de pagamento

## 5. Gestão de Produtos
- [x] Cadastro completo de produtos (nome, código, preço, estoque)
- [x] Upload de imagem do produto
- [x] Categorização de produtos
- [x] Vinculação com fornecedores
- [x] Validação de dados do formulário
- [x] Listagem e busca de produtos
- [x] Edição e exclusão de produtos

## 6. Gestão de Estoque
- [x] Controle de entrada de produtos
- [x] Controle de saída de produtos
- [x] Alertas de estoque mínimo
- [x] Histórico de movimentações
- [x] Ajuste manual de estoque
- [x] Relatório de inventário

## 7. Módulo de Vendas
- [x] Listagem completa de vendas
- [x] Filtros por data/vendedor/status
- [x] Visualização detalhada de cada venda
- [x] Impressão de comprovante
- [x] Cancelamento de vendas (com permissão)
- [x] Histórico de vendas por cliente

## 8. Cadastro de Clientes
- [x] Formulário completo (CPF/CNPJ, nome, endereço, telefone)
- [x] Validação de CPF/CNPJ
- [x] Histórico de compras do cliente
- [x] Listagem e busca de clientes
- [x] Edição e exclusão de clientes

## 9. Cadastro de Fornecedores
- [x] Formulário de fornecedores (CNPJ, razão social, contato)
- [x] Listagem e busca de fornecedores
- [x] Vinculação com produtos
- [x] Edição e exclusão de fornecedores

## 10. Categorias de Produtos
- [ ] Cadastro de categorias
- [ ] Listagem de categorias
- [ ] Edição e exclusão de categorias
- [ ] Vinculação com produtos

## 11. Relatórios Gerenciais
- [ ] Relatório de vendas por período
- [ ] Produtos mais vendidos
- [ ] Cálculo de margem de lucro
- [ ] Performance por vendedor
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Gráficos e visualizações

## 12. Funcionalidade Offline
- [ ] Configurar Firestore persistence
- [ ] Consulta de produtos offline
- [ ] Consulta de vendas offline
- [ ] Sincronização automática ao reconectar
- [ ] Indicador de status de conexão

## 13. Testes e Validação
- [ ] Testes de autenticação
- [ ] Testes de CRUD de produtos
- [ ] Testes de fluxo de vendas
- [ ] Testes de relatórios
- [ ] Validação de funcionalidade offline

## 14. Deploy e Documentação
- [ ] Preparar para deploy no Vercel
- [ ] Gerar arquivo ZIP do projeto
- [ ] Documentação de uso do sistema
- [ ] Instruções de configuração

## 15. Requisitos Adicionais
- [x] Página de login obrigatória (não permite pular)
- [x] Redirecionamento automático para login ao acessar qualquer rota
- [x] Primeiro usuário registrado é automaticamente admin
- [x] Proteção de todas as rotas do sistema

## 16. Controle de Permissões por Role
- [x] Admin: Criar usuários (vendedores/caixas)
- [x] Admin: Acesso total a relatórios e dashboards
- [x] Admin: Exportar dados financeiros
- [x] Vendedor: Realizar vendas
- [x] Vendedor: Editar vendas (com registro de autor)
- [x] Vendedor: Cancelar vendas (com registro de autor)
- [x] Vendedor: Consultar estoque
- [x] Vendedor: Consultar clientes
- [x] Vendedor: BLOQUEAR criação de usuários
- [x] Vendedor: BLOQUEAR acesso a relatórios administrativos
- [x] Vendedor: BLOQUEAR exportação de dados financeiros
- [x] Sistema de auditoria: Registrar quem editou/cancelou vendas

## 17. Sistema de Cancelamento de Vendas com Auditoria
- [x] Botão "Cancelar Venda" disponível para vendedor
- [x] Modal para informar motivo do cancelamento
- [x] Marcar venda como "Cancelada" (não apagar)
- [x] Estornar estoque automaticamente ao cancelar
- [x] Registrar auditoria completa:
  - [x] Quem cancelou (UID e nome do vendedor)
  - [x] Data e hora do cancelamento
  - [x] Motivo informado
- [x] Manter venda cancelada no histórico
- [x] Filtro para visualizar vendas canceladas
- [x] Impedir edição de vendas já canceladas

## 18. Alertas de Estoque Baixo
- [x] Notificações visuais no dashboard
- [x] Lista de produtos com estoque abaixo do mínimo
- [x] Badge de alerta na sidebar com contador
- [x] Sistema de notificações em tempo real
- [ ] Filtro de produtos por estoque baixo
- [ ] Configuração de estoque mínimo por produto

## 19. Gráficos Avançados no Dashboard
- [x] Gráfico de vendas por período (linha)
- [x] Vendas por categoria (pizza)
- [x] Performance por vendedor (barras)
- [x] Evolução de faturamento (área)
- [x] Top 10 produtos mais vendidos (barras horizontais)
- [x] Gráfico de formas de pagamento
- [x] Comparativo mensal de vendas

## 20. Restrições de Visualização
- [x] Gráficos avançados APENAS para perfil Admin
- [x] Dashboard completo APENAS para Admin
- [x] Vendedores redirecionados para PDV ao fazer login
- [x] Ocultar menu de relatórios para vendedores
- [x] Ocultar menu de dashboard para vendedores

## 21. Impressão de Comprovante de Venda
- [x] Layout de comprovante formato A5 horizontal (148mm x 210mm)
- [x] Cabeçalho com logo e dados da empresa
- [x] Informações da venda (número, data, vendedor)
- [x] Tabela de produtos vendidos
- [x] Totais e forma de pagamento
- [x] Dados do cliente (se informado)
- [x] Botão de impressão no PDV
- [x] Botão de impressão na listagem de vendas
- [x] CSS otimizado para impressão (@media print)

## 22. Integração Firebase no PDV
- [x] Buscar produtos do Firestore em tempo real
- [x] Validar estoque disponível antes de adicionar ao carrinho
- [x] Salvar venda no Firestore ao finalizar
- [x] Gerar número sequencial de venda automaticamente
- [x] Atualizar estoque dos produtos automaticamente
- [x] Registrar movimentações de estoque
- [x] Impedir venda se estoque insuficiente
- [x] Sincronização offline com Firestore persistence

## 23. Gestão Completa de Produtos
- [x] Página de listagem de produtos com busca e filtros
- [x] Formulário de cadastro com validação
- [x] Upload de imagem para Firebase Storage
- [x] Edição de produtos existentes
- [x] Exclusão lógica (desativar produto)
- [x] Gestão de categorias (CRUD)
- [x] Campos: nome, código, descrição, preço custo, preço venda, estoque, estoque mínimo
- [x] Visualização de detalhes do produto
- [x] Filtros por categoria e status (ativo/inativo)

## 24. Atalhos de Teclado
- [x] F2 - Abrir busca rápida de produtos (modal)
- [x] F4 - Navegar para PDV
- [x] ESC - Fechar busca rápida
- [x] Indicador visual de atalhos disponíveis
- [x] Busca rápida com preview de estoque

## 25. Dados de Exemplo para Testes
- [x] Script para criar categorias de exemplo
- [x] Script para criar produtos realistas de materiais de construção
- [x] Script para criar fornecedores de exemplo
- [x] Popular Firebase com dados de teste

## 26. Módulo de Fornecedores
- [x] Página de listagem de fornecedores
- [x] Formulário de cadastro (CNPJ, razão social, contato)
- [x] Validação de CNPJ
- [x] Edição e desativação de fornecedores
- [x] Vinculação de produtos aos fornecedores
- [x] Filtros e busca

## 27. Sistema de Exportação de Relatórios
- [x] Exportar relatório de vendas em PDF
- [x] Exportar relatório de vendas em Excel
- [x] Exportar relatório de produtos em PDF
- [x] Exportar relatório de estoque em Excel
- [x] Botões de exportação nos relatórios
- [x] Formatação profissional dos documentos exportados

## 28. Correções Urgentes
- [ ] Corrigir cadastro de usuários (não está salvando)
- [ ] Corrigir cadastro de categorias (não está funcionando)
- [ ] Corrigir cadastro de clientes (não está salvando)
- [ ] Corrigir relatórios (não estão gerando)
- [ ] Criar página de configurações da empresa (dados + logo)
- [ ] Adicionar forma de pagamento "Boleto" no PDV
- [ ] Usar dados da empresa no comprovante de venda

## 29. Correção Visual PDV
- [ ] Remover sombra piscando nos cards do PDV
- [ ] Suavizar animações CSS

## 30. Melhorias PDV e Comprovante
- [ ] Adicionar seleção de cliente no PDV (obrigatório) - EM ANDAMENTO
- [ ] Adicionar opção de frete (Retirada/Entrega) - EM ANDAMENTO
- [ ] Adicionar endereço de entrega (se houver frete) - EM ANDAMENTO
- [ ] Adicionar valor do frete - EM ANDAMENTO
- [ ] Adicionar dados do cliente no comprovante
- [ ] Adicionar local e horário no comprovante
- [ ] Adicionar endereço de entrega no comprovante
- [ ] Adicionar linha para assinatura do cliente no comprovante
- [ ] Adicionar forma de pagamento "Boleto" no PDV

## 31. Implementação de Cliente e Frete no PDV (PRIORIDADE ALTA)
- [x] Adicionar campo de seleção de cliente no PDV (dropdown com busca)
- [x] Adicionar opções de tipo de frete (Radio: Retirada/Entrega)
- [x] Adicionar campos de endereço de entrega (aparecem apenas se "Entrega" selecionada)
- [x] Adicionar campo de valor do frete
- [x] Validar cliente obrigatório antes de finalizar venda
- [x] Atualizar cálculo de total para incluir frete
- [x] Salvar dados de cliente e frete no Firestore
- [x] Adicionar forma de pagamento "Boleto" no PDV
- [x] Atualizar comprovante para exibir dados do cliente
- [x] Atualizar comprovante para exibir tipo de frete e endereço de entrega
- [x] Atualizar comprovante para exibir local e horário
- [x] Adicionar linha para assinatura do cliente no comprovante
- [x] Adicionar valor do frete no comprovante

## 32. BUGS CRÍTICOS REPORTADOS (PRIORIDADE MÁXIMA)
- [x] Corrigir salvamento de dados da empresa (Settings não está salvando) - Corrigido hook useAuth e adicionados logs
- [x] Corrigir edição de produtos (não está funcionando) - Adicionados logs e melhor tratamento de erro

## 33. BUG CADASTRO DE CLIENTES (URGENTE)
- [x] Corrigir campos undefined no cadastro de clientes (email causando erro no Firestore)
- [x] Remover orderBy das queries para evitar necessidade de índice composto (ordenação feita no código)

## 34. BUGS CRÍTICOS A CORRIGIR
- [x] Corrigir salvamento infinito em Settings (dados da empresa) - Timestamp.now() e removido reload
- [x] Corrigir finalização de vendas com "retirada" (não está finalizando) - Removido campo undefined
- [x] Substituir email por nome de cadastro em todo o sistema (vendedor/admin) - PDV e Sales atualizados

## 35. SISTEMA DE PERMISSÕES E USUÁRIOS
- [ ] Criar página de cadastro de usuários
- [ ] Implementar roles: admin e vendedor
- [ ] Admin: acesso total ao sistema
- [ ] Vendedor: acesso apenas a PDV, Vendas e Clientes
- [ ] Adicionar campo "nome" no cadastro de usuários
- [ ] Usar nome ao invés de email em todo o sistema

## 36. PREÇOS À VISTA E A PRAZO
- [x] Adicionar campo "preço à vista" nos produtos
- [x] Adicionar campo "preço a prazo" nos produtos
- [x] Atualizar formulário de cadastro de produtos
- [x] PDV: selecionar automaticamente preço baseado na forma de pagamento
- [x] Dinheiro, PIX, Débito = preço à vista
- [x] Crédito, Boleto = preço a prazo

## 37. SISTEMA DE PARCELAMENTO (BOLETO)
- [ ] Adicionar campo "número de parcelas" quando boleto selecionado
- [ ] Calcular automaticamente datas de vencimento
- [ ] Calcular valor de cada parcela
- [ ] Salvar parcelas no Firestore
- [ ] Criar página de "Contas a Receber" para gerenciar parcelas
- [ ] Marcar parcelas como pagas

## 38. DESCONTO EM REAIS NO PDV
- [x] Adicionar campo de desconto em R$ no PDV
- [x] Atualizar cálculo do total
- [x] Exibir desconto no resumo de totais
- [ ] Exibir desconto no comprovante

## 39. GESTÃO DE ENTREGAS
- [x] Adicionar status de entrega: "Entregue", "Pendente"
- [x] Modal para alterar status de entrega após venda
- [x] Exibir status de entrega na lista de vendas
- [x] Botão de status de entrega apenas para vendas com deliveryType='entrega'
- [ ] Modal para agendar entrega (data e horário)
- [ ] Filtrar vendas por status de entrega

## 40. MELHORIAS NO COMPROVANTE
- [x] Diminuir fonte para caber tudo em uma página
- [x] Centralizar cabeçalho com dados da empresa
- [x] Adicionar valor do frete quando houver
- [x] Implementar impressão de segunda via (botão já existe em Sales)
- [x] Usar nome do vendedor ao invés de email
- [x] Exibir desconto no comprovante

## 41. CATEGORIAS E RELATÓRIOS
- [ ] Criar página de cadastro de categorias
- [ ] Implementar CRUD completo de categorias
- [ ] Criar página de relatórios financeiros
- [ ] Relatório de vendas por período
- [ ] Relatório de lucro
- [ ] Relatório de produtos mais vendidos
- [ ] Gráficos de desempenho

## 42. CÓDIGOS DE PRODUTOS
- [x] Mudar geração de códigos para formato menor (ex: MT0001, MT0002)
- [x] Permitir edição manual do código
- [x] Botão para gerar código automaticamente
- [ ] Validar unicidade do código

## 43. IMPORTAÇÃO DE DADOS DO MDB
- [ ] Criar ferramenta de importação de produtos
- [ ] Criar ferramenta de importação de clientes
- [ ] Criar ferramenta de importação de notas a prazo
- [ ] Validar dados antes de importar
- [ ] Garantir consistência financeira
- [ ] Criar relatório de importação com erros/sucessos

## 44. SISTEMA DE PERMISSÕES (EM IMPLEMENTAÇÃO)
- [x] Criar interface User com campo role (admin/vendedor)
- [x] Criar serviço de gerenciamento de usuários (userService.ts)
- [x] Criar página de cadastro de usuários (apenas Admin)
- [x] Adicionar validação de role no AuthContext (já existia)
- [x] Restringir navegação baseada em role
- [x] Admin: acesso total
- [x] Vendedor: apenas PDV, Vendas e Clientes
- [x] Rotas protegidas com ProtectedRoute e allowedRoles
- [ ] Proteger serviços backend com validação de role (Firebase Rules)
- [ ] Testar permissões com usuário vendedor

## 45. PARCELAMENTO DE BOLETO E CONTAS A RECEBER
- [x] Criar interface Installment (parcela)
- [x] Criar interface AccountReceivable (conta a receber)
- [x] Adicionar campo installments na interface Sale
- [x] Criar serviço accountsReceivableService.ts
- [x] Adicionar campo de número de parcelas no PDV (quando boleto selecionado)
- [x] Calcular automaticamente valor e data de cada parcela
- [x] Criar página de Contas a Receber
- [x] Listar todas as parcelas pendentes e pagas
- [x] Permitir marcar parcela como paga
- [x] Exibir total a receber e total vencido
- [x] Atualizar automaticamente parcelas vencidas
- [x] Adicionar rota e menu de Contas a Receber
- [ ] Adicionar indicador de parcelas no comprovante

## 46. BUG CADASTRO DE PRODUTOS (URGENTE)
- [x] Investigar problema na página de cadastro de produtos - SelectItem com valor vazio
- [x] Corrigir bug identificado - Substituir valor vazio por 'none'
- [x] Testar cadastro e edição de produtos

## 47. CRUD DE CATEGORIAS
- [x] Criar página Categories.tsx
- [x] Listar todas as categorias
- [x] Adicionar filtro por status (ativas/inativas)
- [x] Implementar cadastro de nova categoria
- [x] Implementar edição de categoria
- [x] Implementar ativação/desativação
- [x] Adicionar contador de produtos por categoria
- [x] Adicionar rota de Categorias
- [x] Restringir acesso apenas para Admin
- [x] Adicionar função reactivateCategory no serviço

## 48. REFORMULAÇÃO DO PDV
- [x] Remover área de listagem de produtos
- [x] Ajustar layout focando no carrinho
- [x] Adicionar campo de busca no topo (Enter para adicionar)
- [x] Mudar opções de entrega para: Retirar no Balcão / Retirar no Depósito / Entrega
- [x] Adicionar status de entrega para "Retirar no Depósito"
- [x] Criar role "deposito" no sistema (types.ts, AuthContext, usePermissions)
- [x] Gerar comprovante automaticamente ao finalizar venda
- [x] Diminuir fontes do comprovante para caber tudo em uma página
- [x] Impressão automática do comprovante
- [ ] Criar página para depósito dar baixa nas retiradas

## 49. AJUSTES DE LAYOUT DO PDV
- [x] Deixar seleção de cliente fixo no topo (sempre visível)
- [x] Mover busca de produtos para baixo do cliente
- [x] Criar botões visuais para formas de pagamento (ao invés de select)
- [x] Manter layout responsivo e organizado

## 50. CÓDIGO DE CLIENTE
- [x] Adicionar campo "code" (4 dígitos) na interface Client
- [x] Gerar código automático ao cadastrar cliente (sequencial)
- [x] Remover CPF/CNPJ da seleção de cliente no PDV
- [x] Mostrar código do cliente na seleção (#0001 - Nome)

## 51. BUSCA DE CLIENTE NO PDV
- [x] Adicionar campo de busca por código ou nome
- [x] Filtrar clientes em tempo real conforme digita
- [x] Permitir selecionar cliente da lista filtrada
- [x] Mostrar cliente selecionado com botão de remover

## 52. BUG CATEGORIAS NO CADASTRO DE PRODUTOS
- [x] Investigar por que categorias não aparecem no cadastro de produtos
- [x] Corrigir carregamento de categorias - Mudado para getAllCategories
- [x] Adicionar logs para debug
- [x] Testar cadastro de produto com categoria

## 53. CORREÇÕES DO PDV
- [x] Remover "0" fixo dos campos de desconto e frete - Mudado para string vazia
- [x] Diminuir fontes do comprovante para caber em A5 horizontal - Reduzidas para 5-7pt
- [x] Implementar busca de produto em tempo real (igual busca de cliente) - Lista filtrada com código, nome, preço e estoque
- [x] Remover seleção duplicada de cliente perto do frete - Mantida apenas no topo

## 54. CORREÇÕES URGENTES REPORTADAS PELO USUÁRIO
- [x] Remover obrigatoriedade de imagem no cadastro de produtos (tornar opcional)
- [x] Corrigir erro "undefined field value" em Contas a Receber ao marcar pagamento
- [x] Implementar campo de valor recebido em parcelas (ex: parcela R$100, paga R$90, saldo vai para próxima)
- [x] Adicionar parcelamento no pagamento via Crédito (igual ao Boleto, até 12x)
- [x] Adicionar ícones sutis antes de "Cliente" e "Produtos" no PDV (estilo carrinho)
- [x] Implementar impressão de segunda via de vendas já realizadas (página Vendas)

## 55. CORREÇÃO DE IMPRESSÃO
- [x] Corrigir erro "Print ref not found" ao clicar em imprimir na página de Vendas

## 56. CORREÇÕES DE VENDAS E PAGAMENTOS
- [x] Excluir vendas canceladas do cálculo de totais (manter apenas em "Canceladas")
- [x] Corrigir erro "undefined field value" ao processar pagamento de parcelas
- [x] Criar função utilitária para limpar campos undefined (firestoreUtils.ts)
- [x] Aplicar correção de undefined em TODOS os 8 services do Firestore
- [x] Criar comprovante de pagamento ao pagar parcela (mesmo padrão do comprovante de venda)

## 57. MELHORIAS GERAIS DO SISTEMA
- [x] Preço a prazo automático: Boleto sempre a prazo, Crédito só a partir de 2x (1x mantém preço à vista)
- [x] Adicionar status de retirada no depósito visível na página de Vendas
- [x] Criar página para usuário "deposito" com permissão específica (ver apenas retiradas pendentes)
- [x] Implementar modal de agendamento de entrega (data e horário)
- [x] Corrigir data indefinida ao fazer pagamento de parcelas (data já estava correta)
- [x] Criar página de Contas a Pagar (água, telefone, fornecedores, etc.)
- [x] Redesenhar comprovante de venda: A4 vertical, logo ao lado do nome, otimizar espaços

## 58. CORREÇÕES DE PERMISSÕES E MENU
- [x] Admin pode acessar página Depósito (adicionar 'admin' às roles permitidas)
- [x] Adicionar campo de seleção de role ao cadastrar usuários (Admin, Vendedor, Depósito)
- [x] Admin pode alterar status de depósito na página Vendas
- [x] Adicionar "Contas a Pagar" no menu lateral
- [x] Adicionar "Depósito" no menu lateral

## 59. CORREÇÕES DE ENTREGA E AGENDAMENTO
- [ ] Mostrar data/horário de agendamento na página Vendas
- [ ] Mostrar data/horário de agendamento no comprovante de venda
- [ ] Corrigir erro ao marcar depósito como entregue ("não é uma entrega")
- [ ] Adicionar campos deliveredBy e deliveredAt ao marcar como entregue
- [ ] Mostrar quem fez a entrega e horário na página Vendas

## 59. CORREÇÕES DE ENTREGA, AGENDAMENTO E DATAS
- [x] Mostrar data/horário de agendamento na página Vendas
- [x] Mostrar data/horário de agendamento no comprovante de venda
- [x] Corrigir erro ao marcar depósito como entregue (permitir 'deposito' e 'entrega')
- [x] Adicionar campos deliveredBy, deliveredByName e deliveredAt ao marcar como entregue
- [x] Mostrar quem fez a entrega e horário na página Vendas
- [x] Corrigir TODOS os erros de data inválida no sistema (já estavam corretos)
- [x] Mostrar data de vencimento nos cards de Contas a Pagar

## 60. CORREÇÕES DE DATA E QUANTIDADE
- [x] Corrigir erro "Invalid Date" ao dar baixa em parcelas (Contas a Receber) - 3 funções corrigidas
- [x] Corrigir erro "Invalid Date" ao dar baixa em parcelas (Contas a Pagar)
- [x] Adicionar input para digitar quantidade no carrinho do PDV

## 61. MELHORIAS FINAIS E CORREÇÕES CRÍTICAS
- [x] Adicionar data/horário de pagamento em Contas a Pagar (mostrar quando foi pago)
- [x] Adicionar opção de excluir contas a pagar
- [ ] Ao cancelar venda a prazo (boleto/crédito parcelado), cancelar conta a receber correspondente
- [ ] Alterar código de vendas para formato numérico (sem letras)
- [ ] Corrigir salvamento infinito em Dados da Empresa
- [x] Mostrar faturas pendentes ao pesquisar cliente no PDV
- [x] Corrigir erro: vencimento de parcelas não deve mudar ao pagar antes da data (removido prepareForFirestore)

## 62. PÁGINA DE ORÇAMENTOS
- [x] Criar service de orçamentos (quotationService.ts)
- [x] Criar página de Orçamentos similar ao PDV (estrutura base)
- [x] Adicionar campo priceType no CartItem
- [x] Adicionar botão toggle vista/prazo por produto no carrinho
- [x] Substituir createSale por createQuotation (não alterar estoque)
- [x] Criar comprovante de orçamento com marca d'água
- [x] Adicionar validade do orçamento (7 dias)
- [x] Adicionar rota e item no menu lateral
- [ ] Página de consulta de orçamentos salvos


## 63. CANCELAMENTO AUTOMÁTICO DE CONTAS A RECEBER
- [x] Criar função cancelAccountReceivable no accountsReceivableService
- [x] Integrar cancelamento na função cancelSale do salesService
- [x] Atualizar status das parcelas para 'cancelada'
- [x] Atualizar tipos para incluir status 'cancelada'
- [x] Atualizar interface de Contas a Receber para exibir parcelas canceladas
- [x] Desabilitar ações em parcelas canceladas


## 64. CORREÇÃO DE INVALID DATE EM TODO O SISTEMA
- [x] Criar funções utilitárias para conversão segura de datas (safeToDate, formatDate, formatDateTime, formatDateTimeCompact)
- [x] Corrigir conversão de datas em Contas a Pagar (AccountsPayable.tsx)
- [x] Corrigir conversão de datas em Vendas (Sales.tsx)
- [x] Corrigir conversão de datas em Depósito (DepositoPage.tsx)
- [x] Corrigir conversão de datas em Contas a Receber (AccountsReceivable.tsx)


## 65. PÁGINA DE CONSULTA DE ORÇAMENTOS
- [x] Adicionar campo status ao Quotation (pendente/convertido/vencido)
- [x] Criar função convertQuotationToSale no quotationService
- [x] Criar função updateExpiredQuotations para atualizar vencidos
- [x] Criar página QuotationsList.tsx com listagem
- [x] Adicionar filtros por cliente, data e status
- [x] Implementar modal de visualização detalhada
- [x] Implementar modal de conversão para venda
- [x] Atualizar estoque ao converter orçamento (via createSale)
- [x] Gerar contas a receber se pagamento parcelado
- [x] Adicionar rota /orcamentos/consulta
- [x] Adicionar submenu em Orçamentos no Layout


## 66. CORRIGIR CAMPO DE QUANTIDADE BLOQUEADO
- [x] Identificar todos os inputs de quantidade bloqueados
- [x] Corrigir input de quantidade no PDV (permitir edição manual)
- [x] Corrigir input de quantidade em Orçamentos (permitir edição manual)
- [x] Adicionar readOnly={false} explícito
- [x] Melhorar handler onChange para aceitar valores vazios temporariamente
- [x] Adicionar onBlur para validar ao perder foco
- [x] Remover spin buttons do input number com CSS
- [x] Manter botões + e - funcionando
- [x] Validar valores mínimos e máximos


## 67. REFATORAR PÁGINA DE ORÇAMENTOS
- [x] Simplificar página de Orçamentos (remover toggle vista/prazo por item)
- [x] Manter apenas preço à vista para todos os itens
- [x] Remover complexidade de forma de pagamento e parcelas
- [x] Interface mais limpa e focada em geração de orçamento
- [x] Corrigir comprovante de orçamento (QuotationReceipt)
- [x] Alinhar campo observations entre página e comprovante
- [x] Testar geração de orçamento completo
- [x] Testar impressão do comprovante


## 68. CORRIGIR ERRO DE OBSERVATIONS UNDEFINED
- [x] Remover campo observations quando vazio em vez de enviar undefined
- [x] Adicionar condicional para incluir observations apenas se preenchido
- [x] Testar geração de orçamento sem observações


## 69. EXPORTAR ORÇAMENTO COMO PDF
- [x] Instalar biblioteca html2pdf.js
- [x] Criar função exportToPDF no hook usePrintReceipt
- [x] Adicionar botão "Baixar PDF" no modal de orçamento
- [x] Nome do arquivo personalizado: Orcamento_{codigo}_{cliente}.pdf
- [x] Botão verde destacado no modal
- [x] Configuração de qualidade e formato A4


## 70. CORRIGIR MODAL DE ORÇAMENTO E CONSULTA
- [x] Remover timeout que limpa carrinho automaticamente (impedia impressão)
- [x] Modal permanece aberto até usuário fechar manualmente
- [x] Carrinho é limpo apenas ao clicar em "Fechar"
- [x] Verificar página de consulta de orçamentos (QuotationsList) - OK
- [x] Rota /orcamentos/consulta configurada corretamente
- [x] Menu lateral com submenu: Novo Orçamento | Consultar


## 71. REFORMULAR PÁGINA DO PDV (LAYOUT COMPACTO)
- [x] Reduzir padding dos cards de p-6 para p-4
- [x] Reduzir espaçamentos gerais de space-y-6 para space-y-4
- [x] Reduzir gap entre colunas de gap-6 para gap-4
- [x] Adicionar scroll fixo no carrinho (max-h-[400px])
- [x] Compactar items do carrinho (p-2, fontes menores)
- [x] Texto do produto com truncate para não quebrar layout
- [x] Reduzir margens internas (mb-6 → mb-3, mb-4 → mb-2)
- [x] Manter todas as funcionalidades existentes
- [x] Layout mais denso e eficiente


## 72. REORGANIZAR PDV - CLIENTE E BUSCA NA MESMA LINHA
- [x] Criar grid de 2 colunas para Cliente e Busca de Produtos
- [x] Aproveitar melhor o espaço horizontal (lado a lado)
- [x] Reduzir ainda mais a altura da página
- [x] Layout responsivo (1 coluna em mobile, 2 em desktop)


## 73. BOTÃO DE ATALHO PARA CONSULTA DE ORÇAMENTOS
- [x] Adicionar botão "Consultar Orçamentos" na página /orcamentos
- [x] Posicionar no header ao lado do título
- [x] Link para /orcamentos/consulta usando useLocation
- [x] Ícone List para identificação visual


## 74. REFORMULAR COMPROVANTE DE VENDA (A4 MEIA FOLHA)
- [x] Formato A4 vertical otimizado para meia folha (210mm x 148.5mm)
- [x] Cabeçalho horizontal compacto (logo 48px à esquerda + dados empresa ao lado)
- [x] Data/hora de entrega integrada com informações de frete em grid
- [x] Layout compacto e organizado (padding 8mm)
- [x] Tamanho adequado para 2 comprovantes por folha A4
- [x] Fontes otimizadas (8-9pt para conteúdo, 12pt para total)
- [x] Grid de 2 colunas para informações da venda
- [x] Tabela de produtos compacta
- [x] Page-break-after para impressão correta


## 75. BOTÃO REIMPRIMIR COMPROVANTE NA CONSULTA DE VENDAS
- [x] Botão de impressora já existia em cada venda da lista
- [x] Adicionar modal de visualização antes da impressão
- [x] Modal com comprovante da venda selecionada (max-w-4xl)
- [x] Botões: Fechar | Imprimir
- [x] Usar componente SaleReceipt existente
- [x] Fundo branco no modal para visualização correta


## 76. CENTRALIZAR CABEÇALHO DO COMPROVANTE
- [x] Mudar layout do cabeçalho de horizontal para vertical centralizado
- [x] Logo centralizada acima das informações (48x48px)
- [x] Todas as informações da empresa centralizadas (text-align: center)
- [x] Flex-direction: column com align-items: center
- [x] Gap de 8px entre logo e informações


## 77. SIMPLIFICAR CABEÇALHO - APENAS LOGO E NOME
- [x] Remover CNPJ, telefone e endereço do cabeçalho
- [x] Manter apenas logo à esquerda (40x40px) + nome da empresa
- [x] Layout horizontal compacto (flex row, gap 10px)
- [x] Nome da empresa em 16pt bold


## 78. APLICAR LAYOUT SIMPLIFICADO AO COMPROVANTE DE ORÇAMENTO
- [x] Atualizar QuotationReceipt com mesmo cabeçalho do SaleReceipt
- [x] Logo à esquerda (40x40px) + nome da empresa (16pt bold)
- [x] Remover informações extras (CNPJ, telefone, endereço, subtítulo)
- [x] Layout horizontal com gap 10px
- [x] Consistência visual total entre comprovantes


## 79. PÁGINA DE CONFIGURAÇÕES DA EMPRESA
- [x] Página Settings.tsx já existia com formulário completo
- [x] Estrutura de dados: nome, CNPJ, telefone, endereço, logo, email
- [x] Criar hook useCompanySettings para acesso dinâmico
- [x] Upload de logo (já implementado)
- [x] Atualizar SaleReceipt para usar configurações dinâmicas
- [x] Atualizar QuotationReceipt para usar configurações dinâmicas
- [x] Suporte a logo personalizada (fallback para iniciais)
- [x] Rota /configuracoes já existia
- [x] Item no menu já existia (Settings icon)


## 80. CORRIGIR SALVAMENTO INFINITO EM CONFIGURAÇÕES
- [x] Analisar Settings.tsx - código correto
- [x] Problema estava no hook useCompanySettings (fetch infinito)
- [x] Adicionar flag hasLoaded para carregar uma única vez
- [x] Adicionar cleanup no useEffect
- [x] Corrigir dependências do useEffect


## 81. ADICIONAR OPÇÃO DE CANCELAR ORÇAMENTO
- [x] Adicionar função cancelQuotation no quotationService
- [x] Atualizar status para 'cancelada'
- [x] Adicionar campo de motivo do cancelamento
- [x] Adicionar botão de cancelamento na QuotationsList
- [x] Modal de confirmação com motivo
- [x] Apenas orçamentos pendentes podem ser cancelados
- [x] Manter histórico (não deletar)
- [x] Adicionar badge de status 'cancelada' (cinza)
- [x] Impedir ações em orçamentos cancelados

## 82. MELHORIAS DE REIMPRESSAO DE COMPROVANTES
- [x] Alterar modal de reimpressão de vendas para tela cheia
- [x] Adicionar botão "Reimprimir" em orçamentos
- [x] Criar modal de reimpressão em tela cheia para orçamentos
- [x] Melhorar visualização do comprovante de venda
- [x] Melhorar visualização do comprovante de orçamento
- [x] Botões de impressão acessíveis na barra de ferramentas

## 83. CORRIGIR PROBLEMA DE UPLOAD DE LOGO NA CONFIGURAÇÃO
- [x] Identificar erro CORS no Firebase Storage
- [x] Reverter para Firebase Storage com regras corretas
- [x] Configurar regras de CORS no Firebase Console
- [x] Configurar regras de permissões no Firestore Console
- [x] Restaurar Settings.tsx para usar Firebase Storage
- [x] Solução funciona no Manus e no Vercel
- [x] Upload de logo funciona sem erros
- [x] Site funciona com permissões corretas

## 84. CORRIGIR UPLOAD DE LOGO - SOLUÇÃO DEFINITIVA COM CLOUDINARY
- [x] Identificar que Firebase Storage precisa de plano pago
- [x] Criar conta no Cloudinary (25GB grátis)
- [x] Instalar SDK do Cloudinary
- [x] Criar arquivo de configuração cloudinary.ts
- [x] Atualizar endpoint /api/upload para usar Cloudinary
- [x] Solução funciona no Manus e no Vercel

## 85. INTEGRAR LOGO DA EMPRESA NOS COMPROVANTES
- [x] Carregar dados da empresa (incluindo logo) no SaleReceipt
- [x] Exibir logo no cabeçalho do comprovante de venda
- [x] Carregar dados da empresa no QuotationReceipt
- [x] Exibir logo no cabeçalho do comprovante de orçamento
- [x] Ajustar layout para acomodar logo
- [x] Garantir que funciona sem logo (fallback com iniciais)

## 86. VENDAS COM STATUS DE ENTREGA NO DEPÓSITO
- [ ] Adicionar filtro de vendas com status "entrega" na página Depósito
- [ ] Exibir lista de vendas pendentes de entrega
- [ ] Permitir marcar venda como entregue
- [ ] Atualizar status da venda após entrega

## 87. IMPLEMENTAR PÁGINA DE CAIXA
- [x] Criar schema de caixa no Firestore (abertura, fechamento, sangria)
- [x] Criar serviço cashService.ts
- [x] Criar página CashRegister.tsx
- [x] Implementar abertura de caixa com saldo inicial
- [x] Implementar fechamento de caixa com relatório
- [x] Implementar funcionalidade de sangria
- [x] Exibir detalhamento de vendas do dia
- [x] Calcular saldo total (inicial + vendas - sangrias)
- [x] Adicionar rota no menu lateral
- [x] Adicionar rota no App.tsx
- [x] Cards de resumo (saldo inicial, vendas, sangrias, saldo atual)
- [x] Vendas agrupadas por forma de pagamento
- [x] Lista de sangrias com data e responsável

## 88. DASHBOARD COM DADOS REAIS
- [x] Remover valores fictícios do dashboard
- [x] Buscar dados reais de vendas do banco
- [x] Calcular total de vendas do dia
- [x] Calcular total de produtos cadastrados
- [x] Calcular total de clientes
- [x] Calcular produtos com estoque baixo
- [ ] Exibir gráficos com dados reais (ainda usa dados mockados)

## 89. MELHORAR COMPROVANTES DE VENDA
- [x] Adicionar todas informações da empresa (telefone, email, endereço)
- [x] Reorganizar layout: logo à esquerda, informações centralizadas
- [x] Adicionar campo de subtítulo nas configurações da empresa
- [x] Exibir subtítulo abaixo do nome da empresa
- [x] Aplicar mesmo layout no comprovante de orçamento

## 90. LIMPAR DASHBOARD - REMOVER DADOS FICTÍCIOS
- [x] Remover gráfico de formas de pagamento
- [x] Remover gráfico de top produtos mais vendidos
- [x] Remover gráfico de vendas por categoria
- [x] Manter apenas cards com dados reais (vendas, faturamento, estoque, clientes)
- [x] Manter alerta de estoque baixo
- [x] Manter gráficos de vendas, faturamento e performance de vendedores

## 91. VALIDAR CAIXA ABERTO NO PDV
- [x] Verificar se há caixa aberto antes de permitir venda
- [x] Exibir alerta se caixa estiver fechado
- [x] Bloquear botão de finalizar venda se caixa fechado
- [x] Adicionar link para abrir caixa no alerta
- [x] Validação na função finalizeSale
- [x] Card de alerta vermelho no topo da página
- [x] Botão desabilitado quando caixa fechado

## 92. MELHORAR LAYOUT DOS COMPROVANTES
- [x] Colocar telefone, CNPJ e email na mesma linha
- [x] Aproximar logo do nome da empresa (50px com gap de 12px)
- [x] Manter centralização
- [x] Aplicar em SaleReceipt e QuotationReceipt
- [x] Logo e nome alinhados horizontalmente
- [x] Informações de contato separadas por pipe (|)

## 93. INTEGRAR VENDAS NO DEPÓSITO
- [x] Atualizar título da página para "Depósito e Entregas"
- [x] Filtrar vendas com deliveryType = 'deposito' OU 'entrega'
- [x] Filtrar vendas com deliveryStatus = 'pendente'
- [x] Exibir tipo de entrega no card (📦 Retirada ou 🚚 Entrega)
- [x] Exibir endereço de entrega quando aplicável
- [x] Botão dinâmico (Retirado/Entregue conforme tipo)
- [x] Atualizar deliveryStatus para 'entregue'
- [x] Registrar data, hora e responsável pela entrega

## 94. ADICIONAR AUDITORIA NOS CARDS DE RETIRADAS/ENTREGAS
- [x] Adicionar campos deliveredAt e deliveredByName ao tipo Sale
- [x] Exibir data e hora da retirada/entrega nos cards concluídos
- [x] Exibir nome do usuário que registrou
- [x] Formatar data/hora de forma legível
- [x] Adicionar seção de auditoria com borda separadora
- [x] Ícone de check verde (✓) na auditoria
- [x] Exibir tipo de entrega nos cards concluídos

- [x] Reorganizar menu lateral: PDV, Caixa, Vendas no topo; cadastros abaixo
- [x] Corrigir erro de índice composto em cashWithdrawals (página Caixa)
- [x] Corrigir erro de índice composto em getTodaySales (query de vendas do dia)
- [x] Corrigir valores zerados das vendas no caixa
- [x] Mover Dashboard para primeiro no menu lateral
- [x] Criar script para limpar vendas antigas do Firestore
- [x] Implementar geração de PDF do relatório de fechamento de caixa
- [x] Corrigir capitalização das formas de pagamento na página de caixa
- [x] Criar página de histórico de caixas fechados com filtros e reimpressão de PDF
- [x] Corrigir inconsistências no Dashboard (vendedores e porcentagens)
- [x] Implementar página de Relatórios funcional com filtros
- [x] Adicionar exportação de relatórios em PDF/Excel
- [x] Alterar tema de cores de roxo para azul gradiente
- [x] Permitir apagar quantidade no carrinho sem remover produto
- [x] Trocar emoji do caminhão por ícone de check no PDV

- [x] Gerar parcelas apenas para boleto (não para cartão de crédito)
- [x] Excluir parcelas canceladas do cálculo do total
- [x] Corrigir filtros da página de Relatórios
- [x] Corrigir geração de PDF na página de Relatórios

- [x] Otimizar visualização mobile sem alterar desktop

- [x] Criar botão para gerar lista de entregas em PDF no Depósito

- [x] Revisar cards do Dashboard e implementar alerta de estoque baixo funcional

- [x] Corrigir lógica estoque baixo: mostrar quando currentStock <= minStock

- [x] Mostrar data/hora pagamento no card de Contas a Pagar
- [x] Adicionar categoria "Internet" em Contas a Pagar
- [x] Criar botão exportação contas pagas por período
- [x] Adicionar exportação de contas pagas em Relatórios
- [x] CRÍTICO: Corrigir exibição de data/hora pagamento em contas pagas (não está aparecendo)
- [x] Corrigir exportação de contas: mostrar TODAS do período (pagas E pendentes)

## 107. LEMBRETES AUTOMÁTICOS DE VENCIMENTO
- [x] Criar função getUpcomingDueDates no accountsPayableService (contas que vencem em até 3 dias)
- [x] Implementar badge animado no menu "Contas a Pagar" com contador
- [x] Adicionar card de alerta no Dashboard listando contas próximas ao vencimento
- [x] Cores: amarelo (vence em 2-3 dias), vermelho (vence hoje ou amanhã)
- [x] Link direto do Dashboard para Contas a Pagar

## 108. CRÍTICO - DATA PAGAMENTO NÃO APARECE (URGENTE)
- [x] Investigar por que data/hora de pagamento não aparece nos cards de contas pagas
- [x] Verificar se paidAt está sendo salvo corretamente no Firestore
- [x] Corrigir renderização da data no componente
- [x] Testar com conta real e confirmar que data aparece

## 109. CORRIGIR LÓGICA ESTOQUE BAIXO NO DASHBOARD
- [x] Mudar lógica de <= para < na comparação de estoque
- [x] Produtos devem aparecer apenas quando estoque atual < estoque mínimo
- [x] Testar com produto que tem estoque >= mínimo (não deve aparecer)

## 110. CRÍTICO - LOWSTOCKALERT AINDA MOSTRA PRODUTOS ERRADOS
- [ ] Verificar lógica do componente LowStockAlert.tsx
- [ ] Corrigir qualquer comparação <= para <
- [ ] Garantir que apenas produtos com estoque < mínimo aparecem
- [ ] Testar com Argamassa AC II (76 unidades, mínimo 1) - NÃO deve aparecer

## 111. FERRAMENTA DE VERIFICAÇÃO E CORREÇÃO DE ESTOQUE
- [x] Criar página StockVerification.tsx
- [x] Listar todos os produtos com estoque atual vs esperado
- [x] Destacar produtos com estoque = 0 ou inconsistente
- [x] Botão para recalcular estoque baseado em movimentações (não implementado - correção manual é suficiente)
- [x] Botão para correção manual de estoque
- [x] Adicionar rota /verificar-estoque (apenas Admin)

## Pesquisa em Contas a Receber
- [x] Adicionar campo de pesquisa para filtrar por nome/CPF/código do cliente

## PDV - Seleção Automática de Quantidade
- [x] Adicionar autoFocus e seleção automática no campo de quantidade do modal

## Melhorias nos Relatórios
- [x] Expandir relatório de vendas com tabela detalhada de produtos vendidos
- [x] Adicionar relatório de vendedores com nomes e valores totais
- [x] Melhorar relatório de produtos com ranking e quantidades

## Melhorias em PDFs
- [x] Atualizar exportação de PDF dos relatórios com tabelas detalhadas
- [x] Criar função de cabeçalho padrão para PDFs usando dados da empresa
- [x] Aplicar cabeçalho padronizado em todos os PDFs (relatórios, comprovantes, listas)

## Correções Urgentes - Lote 10

- [x] Corrigir card de Clientes no Dashboard (mostra 26 produtos em vez de número de clientes)
- [x] Corrigir badge de estoque baixo no menu Dashboard (contagem incorreta)
- [x] Ajustar badge Contas a Pagar para mostrar apenas 1 dia antes + dia vencimento (não 3 dias)
- [x] Padronizar formatação de valores monetários com separador de milhar (10.000,00) em todo sistema
- [x] Reordenar menu lateral: mover Relatórios para depois de Contas a Pagar
- [x] Remover "Ferramentas Admin" do menu lateral (manter apenas na busca)
- [x] Corrigir upload de imagem de produtos (usar mesmo sistema da logo da empresa)
- [x] Padronizar formato de datas para DD/MM/AAAA em comprovantes e todo sistema
- [x] Melhorar página de reimpressão de orçamento (usar padrão de comprovante com dados da empresa)
- [x] Corrigir exibição de permissão "Deposito" no layout (mostra "Vendedor" incorretamente)

## Correção Adicional - Ordenação
- [x] Corrigir ordenação da lista de entregas para ordem crescente por número de venda

## Correção Urgente - Data de Vencimento
- [x] Corrigir cálculo de alerta de vencimento para usar data de vencimento da parcela, não data de cadastro

## Função de Exclusão Permanente
- [ ] Adicionar botão e função de exclusão permanente em Produtos
- [ ] Adicionar botão e função de exclusão permanente em Categorias
- [ ] Adicionar botão e função de exclusão permanente em Fornecedores
- [ ] Adicionar botão e função de exclusão permanente em Clientes

## BUGS CRÍTICOS - CONTAS A PAGAR (URGENTE)
- [ ] Corrigir cálculo de "Vence HOJE" - contas com vencimento futuro aparecem como vencendo hoje
- [ ] Corrigir formato de valores para padrão brasileiro (R$ 10.000,00 em vez de R$ 10000.00)
- [ ] Corrigir badge de Contas a Pagar na barra lateral - mostra contas que não estão próximas ao vencimento

## BUG CRÍTICO - LOGOUT AUTOMÁTICO
- [ ] Corrigir logout automático ao criar novo usuário - admin não deve ser deslogado

## MELHORIAS - PÁGINA DEPÓSITO E REDIRECIONAMENTO
- [x] Adicionar campo de data de entrega no PDV para vendas com entrega
- [x] Salvar data de entrega no Firestore junto com os dados da venda
- [x] Exibir data de entrega na página Depósito (além do endereço)
- [x] Implementar redirecionamento automático por perfil após login:
  - [x] Admin → Dashboard (Home)
  - [x] Vendedor → PDV
  - [x] Depósito → Página de Depósito

## MELHORIAS - FORMATAÇÃO E PADRONIZAÇÃO
- [x] Criar função helper para formatar formas de pagamento (pix → Pix, cartao_credito → Cartão de Crédito, etc.)
- [x] Padronizar cabeçalhos de exportação PDF usando layout do comprovante de vendas
- [x] Aplicar formatação profissional em todas as páginas de relatórios
- [x] Corrigir erro de renderização de Timestamp em Sales.tsx

## GRÁFICO DE VENDAS POR VENDEDOR
- [x] Implementar gráfico visual impressionante de vendas por vendedor no Dashboard
- [x] Usar design moderno com gradientes e animações
- [x] Exibir total de vendas e faturamento por vendedor

## MELHORIAS DE UI - GRÁFICO E SIDEBAR
- [x] Substituir emojis por ícones minimalistas Lucide no gráfico de vendedores
- [x] Adicionar logo e nome da empresa (Metal Trevo) na sidebar no lugar do nome do usuário

## CORREÇÃO - PERFIL DEPÓSITO
- [x] Criar diferenciação visual por cor para perfil Depósito (azul claro/ciano)
- [x] Aplicar cores diferenciadas na página de usuários (Admin: verde, Vendedor: azul, Depósito: ciano)

## AJUSTE - ÍCONES DO RANKING DE VENDEDORES
- [x] Remover cores diferenciadas dos ícones (ouro/prata/bronze)
- [x] Usar ícones brancos simples no padrão minimalista da sidebar

## SISTEMA DE BACKUP AUTOMÁTICO
- [ ] Criar função de backup do Firestore exportando todas as coleções
- [ ] Salvar backups no Firebase Storage com timestamp
- [ ] Implementar agendamento com node-cron:
  - [ ] Segunda a Sexta: 12:00 e 17:30
  - [ ] Sábado: 12:30
  - [ ] Domingo: Sem backup
- [ ] Criar interface de gerenciamento de backups (listar, baixar, restaurar)
- [ ] Adicionar notificação ao admin após cada backup bem-sucedido

## Restauração de Backup
- [x] Implementar função restoreBackup() no backupService.ts
- [x] Adicionar validação de estrutura do arquivo JSON
- [x] Criar interface de upload de arquivo na página Backups.tsx
- [x] Implementar modal de confirmação com avisos de segurança
- [x] Adicionar feedback visual de progresso da restauração
- [x] Testar restauração completa de dados

## Correção de Relatórios PDF
- [x] Corrigir função formatCurrency aparecendo como texto literal nos PDFs
- [x] Ajustar margens e layout A4 em todos os relatórios
- [x] Corrigir relatório de Vendas
- [x] Corrigir relatório de Produtos
- [x] Corrigir relatório de Contas a Pagar
- [x] Corrigir relatório de Contas a Receber
- [x] Testar exportação de todos os relatórios

## Correção de Erros Críticos no PDV
- [x] Corrigir erro "Print ref not found" no PDV
- [x] Corrigir erro de Timestamp sendo renderizado como React child
- [x] Testar impressão de comprovante no PDV

## Melhoria do Comprovante de Orçamento
- [x] Identificar arquivo que gera comprovante de orçamento
- [x] Aplicar mesmo layout profissional do comprovante de venda
- [x] Usar formato A5 horizontal
- [x] Adicionar cabeçalho com logo e dados da empresa
- [x] Melhorar formatação da tabela de produtos
- [x] Adicionar totais destacados
- [x] Testar impressão do orçamento

## Otimização do PDF da Lista de Entregas
- [x] Identificar arquivo que gera PDF da Lista de Entregas
- [x] Reduzir espaçamentos entre pedidos
- [x] Otimizar margens do documento
- [x] Remover quebras de linha desnecessárias
- [x] Ajustar tamanhos de fonte para compactar conteúdo
- [x] Testar geração com múltiplos pedidos

## Correção de Erro de Loop Infinito no Login
- [x] Identificar causa do erro "Maximum update depth exceeded" no Redirect
- [x] Corrigir lógica de redirecionamento
- [x] Testar fluxo de login

## Padronização do PDF de Reimpressão de Orçamentos
- [x] Identificar arquivo que gera PDF na reimpressão
- [x] Aplicar mesmo layout do QuotationReceipt (A5 horizontal)
- [x] Garantir formatação idêntica ao comprovante original
- [x] Testar reimpressão de orçamentos

## Padronização Total do Comprovante de Orçamento
- [x] Comparar SaleReceipt e QuotationReceipt
- [x] Identificar todas as diferenças de layout e tamanho
- [x] Aplicar exatamente o mesmo CSS do SaleReceipt
- [x] Garantir tamanhos de fonte idênticos
- [x] Garantir espaçamentos idênticos
- [x] Testar impressão lado a lado

## Correção de Índice do Firestore na Página de Relatórios
- [x] Identificar query que requer índice composto
- [ ] MANUAL: Criar índice no Firebase Console clicando no link do erro
- [x] Documentar índices necessários
- [ ] Testar página de relatórios após criação do índice

**Índice necessário:**
Coleção: cashRegisters
Campos: status (ASC), closedAt (ASC), __name__ (ASC)
Link: https://console.firebase.google.com/v1/r/project/erp-metal-trevo/firestore/indexes?create_composite=ClVwcm9qZWN0cy9lcnAtbWV0YWwtdHJldm8vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Nhc2hSZWdpc3RlcnMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDAoIY2xvc2VkQXQQARoMCghfX25hbWVfXxAB

## 🚨 PROBLEMA CRÍTICO: Estoque Não Desconta nas Vendas
- [x] Investigar registerStockMovements no salesService.ts
- [x] Identificar campo incorreto: `stock` deveria ser `currentStock`
- [x] Corrigir linha 228 do salesService.ts
- [x] Testar desconto de estoque em venda real

## Correção de Erro de Data Inválida
- [x] SaleReceipt: Adicionar validação isValid() no formatDate
- [x] QuotationReceipt: Adicionar validação isValid() no formatDate
- [x] Reports.tsx: Criar função helper formatDate com validação
- [x] Substituir 13 ocorrências de format() por formatDate()
- [x] Testar página de relatórios com datas inválidas

## Correção de Relatórios

### Fluxo de Caixa - Valores Zerados
- [x] Identificar campos corretos de receita e sangrias no cashRegister
- [x] Corrigir nomes de campos na tabela (openingBalance → initialBalance, closingBalance → finalBalance)
- [x] Verificar estrutura de dados do cashRegister no Firestore
- [x] Testar relatório com dados reais

### Vendedores - Nome Não Aparece
- [x] Identificar como o nome do vendedor é buscado
- [x] Corrigir campo de createdByName para sellerName
- [x] Testar relatório de vendedores

## Correção de Margens no Comprovante de Venda
- [x] Investigar CSS do SaleReceipt.tsx
- [x] Adicionar margens de 10mm no @page
- [x] Aplicar mesma correção no QuotationReceipt
- [x] Testar impressão sem corte de dados

## Padronização de Cabeçalhos em Todos os PDFs
- [x] Analisar cabeçalho do SaleReceipt (referência)
- [x] Reescrever addPDFHeader() com layout centralizado
- [x] Remover fundo azul e alinhar logo+nome ao centro
- [x] Verificar Reports.tsx (usa addPDFHeader - corrigido automaticamente)
- [x] Verificar Lista de Entregas (usa addPDFHeader - corrigido automaticamente)
- [x] Verificar QuotationReceipt (já estava centralizado)
- [x] Testar todos os PDFs gerados

## Correção de Erro de Timeout ao Listar Backups
- [x] Investigar backupService.ts função listBackups
- [x] Identificar problema: loop síncrono com await em cada item
- [x] Implementar Promise.all para buscar URLs e metadados em paralelo
- [x] Otimizar performance com processamento concorrente
- [x] Testar listagem de backups

## Correção de Filtro de Data nos Relatórios
- [x] Investigar lógica de filtro de data no Reports.tsx
- [x] Identificar problema: new Date("YYYY-MM-DD") interpreta como UTC, não local
- [x] Solução: Adicionar 'T00:00:00' para forçar interpretação local
- [x] Ajustar filtro para incluir dia completo no timezone correto
- [x] Testar filtro com data do dia atual

## Comprovante Automático de Fechamento de Caixa
- [x] Criar componente CashClosureReceipt.tsx
- [x] Adicionar hook usePrintReceipt no CashRegister
- [x] Integrar impressão automática ao fechar caixa
- [x] Testar impressão de comprovante de fechamento

## Correção de Valores Zerados no PDF de Fluxo de Caixa
- [x] Investigar geração de PDF no Reports.tsx
- [x] Corrigir campos openingBalance → initialBalance e closingBalance → finalBalance
- [x] Testar exportação PDF do Fluxo de Caixa

## Sistema de Limpeza Automática de Backups
- [x] Criar função cleanupOldBackups() no backupService.ts
- [x] Implementar lógica para manter apenas os 30 backups mais recentes
- [x] Integrar limpeza automática após criação de novo backup
- [x] Adicionar botão de limpeza manual na página Backups.tsx
- [x] Adicionar feedback visual (toast) ao executar limpeza
- [x] Testar limpeza com diferentes quantidades de backups

## Melhorias Visuais e UX
- [x] Remover botão de Backups da sidebar (acessível apenas por navegação direta)
- [x] Criar componente Footer com design Liquid Glass translúcido
- [x] Adicionar copyright: "Desenvolvido por César Soluções em Tecnologia - 2026 - Todos os Direitos Reservados ®"
- [x] Criar botão flutuante de WhatsApp no canto inferior direito
- [x] Configurar link WhatsApp: https://wa.me/5533999675619
- [x] Adicionar mensagem padrão pré-preenchida no WhatsApp
- [x] Integrar Footer em todas as páginas do sistema
- [x] Integrar botão WhatsApp em todas as páginas do sistema

## Atalhos de Data nos Relatórios
- [x] Criar funções utilitárias para calcular intervalos de data (hoje, esta semana, este mês)
- [x] Adicionar botões de atalho "Hoje", "Esta Semana", "Este Mês" na página Reports.tsx
- [x] Implementar lógica para preencher campos de data automaticamente ao clicar nos atalhos
- [x] Adicionar feedback visual (botão ativo) para indicar atalho selecionado
- [x] Testar atalhos com diferentes períodos

## Atualização de Login e Usuários
- [x] Remover opção "Criar conta" da página de Login
- [x] Adicionar função "Alterar Senha" na página de Usuários
- [x] Adicionar função "Excluir Usuário" na página de Usuários
- [x] Remover opção "Desativar" da página de Usuários

## Otimização de Performance - Contas a Pagar
- [x] Analisar código do Dashboard e modal de contas a vencer
- [x] Identificar gargalos de performance na página Contas a Pagar
- [x] Implementar lazy loading e otimizações
- [x] Adicionar loading states adequados
- [x] Testar navegação do Dashboard para Contas a Pagar

## Filtros Rápidos - Contas a Receber
- [x] Adicionar botão "Vencidas" para filtrar contas com vencimento passado
- [x] Adicionar botão "Vencendo Hoje" para filtrar contas que vencem hoje
- [x] Adicionar botão "Próximos 7 dias" para filtrar contas que vencem na próxima semana
- [x] Implementar lógica de filtro por data de vencimento
- [x] Adicionar feedback visual (botão ativo) para indicar filtro selecionado
- [x] Permitir limpar filtro para ver todas as contas

## Controle de Visibilidade por Cargo - Depósito
- [x] Ocultar valor total do pedido para usuários com cargo "Depósito"
- [x] Ocultar valores unitários dos produtos para cargo "Depósito"
- [x] Manter visíveis apenas: produtos, quantidades, status de separação
- [x] Testar com usuário de cargo "Depósito"

## Ocultar Valores no PDF de Lista de Entregas
- [x] Adicionar parâmetro userRole na função generateDeliveryListPDF
- [x] Implementar condicional para ocultar valores quando userRole === 'deposito'
- [x] Atualizar chamada da função em DepositoPage passando userData.role
- [x] Testar geração de PDF com usuário de cargo "deposito"

## Melhorias em Contas a Pagar
- [x] Adicionar indicador visual de atraso nos cards de parcelas vencidas
- [x] Implementar filtros rápidos: "Todas", "Vencidas", "Vencendo Hoje", "Próximos 7 dias"
- [x] Adicionar feedback visual (cores) nos botões de filtro
- [x] Testar filtros e indicadores de atraso

## Redesign Botão de Suporte
- [x] Corrigir erros TypeScript em AccountsPayable (Timestamp vs Date)
- [x] Redesenhar WhatsAppButton com estilo Liquid Glass iOS 26
- [x] Adicionar texto "Suporte" ao lado do ícone
- [x] Aplicar efeito blur translúcido azul
- [x] Testar visual e funcionalidade

## Ajuste Botão de Suporte
- [x] Remover animação pulse contínua do botão WhatsApp
- [x] Manter apenas efeito hover discreto
