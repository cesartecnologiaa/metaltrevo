import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Configuração do Firebase (mesmas credenciais do projeto)
const firebaseConfig = {
  apiKey: "AIzaSyAVWPIRCMhK_WlNqrBBe-Np12uWsemYUwI",
  authDomain: "erp-metal-trevo.firebaseapp.com",
  projectId: "erp-metal-trevo",
  storageBucket: "erp-metal-trevo.firebasestorage.app",
  messagingSenderId: "1058221220442",
  appId: "1:1058221220442:web:a6d05699d2d9ad2bf06e63",
  measurementId: "G-8TTWCK9PLN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Categorias de materiais de construção
const categories = [
  { name: 'Cimento e Argamassa', description: 'Cimentos, argamassas e rejuntes' },
  { name: 'Tijolos e Blocos', description: 'Tijolos cerâmicos e blocos de concreto' },
  { name: 'Areia e Pedra', description: 'Agregados para construção' },
  { name: 'Ferragens', description: 'Vergalhões, arames e telas' },
  { name: 'Tintas e Vernizes', description: 'Tintas, vernizes e complementos' },
  { name: 'Hidráulica', description: 'Tubos, conexões e registros' },
  { name: 'Elétrica', description: 'Fios, cabos e materiais elétricos' },
  { name: 'Ferramentas', description: 'Ferramentas manuais e elétricas' },
];

// Fornecedores
const suppliers = [
  {
    name: 'Cimentos Fortes Ltda',
    cnpj: '12345678000190',
    email: 'contato@cimentosfortes.com.br',
    phone: '11987654321',
    address: {
      street: 'Av. Industrial',
      number: '1500',
      neighborhood: 'Distrito Industrial',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000000'
    },
    active: true
  },
  {
    name: 'Distribuidora Construmax',
    cnpj: '98765432000110',
    email: 'vendas@construmax.com.br',
    phone: '11912345678',
    address: {
      street: 'Rua das Ferragens',
      number: '850',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '02000000'
    },
    active: true
  },
  {
    name: 'Tintas Premium Brasil',
    cnpj: '11223344000155',
    email: 'sac@tintaspremium.com.br',
    phone: '11923456789',
    address: {
      street: 'Av. das Cores',
      number: '2000',
      neighborhood: 'Vila Industrial',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '03000000'
    },
    active: true
  }
];

// Produtos realistas de materiais de construção
const products = [
  // Cimento e Argamassa
  {
    name: 'Cimento CP II 50kg',
    code: '7891234567890',
    description: 'Cimento Portland CP II-E-32 para uso geral em construção civil',
    price: 35.90,
    costPrice: 28.50,
    stock: 150,
    minStock: 50,
    categoryIndex: 0,
    supplierIndex: 0,
    active: true
  },
  {
    name: 'Argamassa AC II 20kg',
    code: '7891234567891',
    description: 'Argamassa colante AC II para assentamento de cerâmica',
    price: 18.90,
    costPrice: 14.20,
    stock: 80,
    minStock: 30,
    categoryIndex: 0,
    supplierIndex: 0,
    active: true
  },
  {
    name: 'Rejunte Branco 1kg',
    code: '7891234567892',
    description: 'Rejunte acrílico branco para acabamento de pisos e azulejos',
    price: 8.50,
    costPrice: 6.00,
    stock: 120,
    minStock: 40,
    categoryIndex: 0,
    supplierIndex: 0,
    active: true
  },
  
  // Tijolos e Blocos
  {
    name: 'Tijolo Cerâmico 6 Furos',
    code: '7891234567893',
    description: 'Tijolo cerâmico 6 furos 9x14x19cm',
    price: 0.85,
    costPrice: 0.60,
    stock: 5000,
    minStock: 1000,
    categoryIndex: 1,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Bloco de Concreto 14x19x39',
    code: '7891234567894',
    description: 'Bloco estrutural de concreto',
    price: 3.50,
    costPrice: 2.80,
    stock: 2000,
    minStock: 500,
    categoryIndex: 1,
    supplierIndex: 1,
    active: true
  },
  
  // Areia e Pedra
  {
    name: 'Areia Média - m³',
    code: '7891234567895',
    description: 'Areia média lavada para construção',
    price: 85.00,
    costPrice: 65.00,
    stock: 50,
    minStock: 10,
    categoryIndex: 2,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Pedra Brita 1 - m³',
    code: '7891234567896',
    description: 'Pedra britada número 1 para concreto',
    price: 95.00,
    costPrice: 75.00,
    stock: 40,
    minStock: 10,
    categoryIndex: 2,
    supplierIndex: 1,
    active: true
  },
  
  // Ferragens
  {
    name: 'Vergalhão CA-50 8mm - 12m',
    code: '7891234567897',
    description: 'Vergalhão de aço CA-50 diâmetro 8mm',
    price: 38.50,
    costPrice: 32.00,
    stock: 200,
    minStock: 50,
    categoryIndex: 3,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Arame Recozido 18 - 1kg',
    code: '7891234567898',
    description: 'Arame recozido número 18 para amarração',
    price: 12.90,
    costPrice: 9.50,
    stock: 150,
    minStock: 40,
    categoryIndex: 3,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Tela Soldada Q92 - 2x3m',
    code: '7891234567899',
    description: 'Tela soldada nervurada Q92',
    price: 45.00,
    costPrice: 38.00,
    stock: 80,
    minStock: 20,
    categoryIndex: 3,
    supplierIndex: 1,
    active: true
  },
  
  // Tintas e Vernizes
  {
    name: 'Tinta Acrílica Branca 18L',
    code: '7891234567900',
    description: 'Tinta acrílica premium branca fosca',
    price: 185.00,
    costPrice: 145.00,
    stock: 45,
    minStock: 15,
    categoryIndex: 4,
    supplierIndex: 2,
    active: true
  },
  {
    name: 'Tinta Acrílica Palha 18L',
    code: '7891234567901',
    description: 'Tinta acrílica premium cor palha',
    price: 195.00,
    costPrice: 155.00,
    stock: 30,
    minStock: 10,
    categoryIndex: 4,
    supplierIndex: 2,
    active: true
  },
  {
    name: 'Verniz Marítimo 900ml',
    code: '7891234567902',
    description: 'Verniz marítimo brilhante para madeira',
    price: 42.90,
    costPrice: 35.00,
    stock: 60,
    minStock: 20,
    categoryIndex: 4,
    supplierIndex: 2,
    active: true
  },
  {
    name: 'Massa Corrida 25kg',
    code: '7891234567903',
    description: 'Massa corrida PVA para paredes internas',
    price: 38.50,
    costPrice: 30.00,
    stock: 70,
    minStock: 25,
    categoryIndex: 4,
    supplierIndex: 2,
    active: true
  },
  
  // Hidráulica
  {
    name: 'Tubo PVC 100mm - 6m',
    code: '7891234567904',
    description: 'Tubo PVC esgoto 100mm',
    price: 52.00,
    costPrice: 42.00,
    stock: 100,
    minStock: 30,
    categoryIndex: 5,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Joelho PVC 90° 100mm',
    code: '7891234567905',
    description: 'Joelho 90 graus PVC esgoto 100mm',
    price: 8.50,
    costPrice: 6.50,
    stock: 200,
    minStock: 50,
    categoryIndex: 5,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Registro Gaveta 3/4"',
    code: '7891234567906',
    description: 'Registro gaveta bronze 3/4 polegadas',
    price: 28.90,
    costPrice: 22.00,
    stock: 80,
    minStock: 25,
    categoryIndex: 5,
    supplierIndex: 1,
    active: true
  },
  
  // Elétrica
  {
    name: 'Fio Flexível 2,5mm - 100m',
    code: '7891234567907',
    description: 'Fio flexível 2,5mm² rolo 100 metros',
    price: 185.00,
    costPrice: 155.00,
    stock: 50,
    minStock: 15,
    categoryIndex: 6,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Disjuntor 20A Bipolar',
    code: '7891234567908',
    description: 'Disjuntor termomagnético 20A bipolar',
    price: 32.50,
    costPrice: 26.00,
    stock: 90,
    minStock: 30,
    categoryIndex: 6,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Tomada 10A 2P+T Branca',
    code: '7891234567909',
    description: 'Tomada padrão brasileiro 10A com terra',
    price: 8.90,
    costPrice: 6.50,
    stock: 150,
    minStock: 50,
    categoryIndex: 6,
    supplierIndex: 1,
    active: true
  },
  
  // Ferramentas
  {
    name: 'Colher de Pedreiro 8"',
    code: '7891234567910',
    description: 'Colher de pedreiro aço carbono 8 polegadas',
    price: 24.90,
    costPrice: 18.00,
    stock: 40,
    minStock: 15,
    categoryIndex: 7,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Nível de Alumínio 60cm',
    code: '7891234567911',
    description: 'Nível de bolha alumínio 60cm',
    price: 35.00,
    costPrice: 28.00,
    stock: 25,
    minStock: 10,
    categoryIndex: 7,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Trena 5m Stanley',
    code: '7891234567912',
    description: 'Trena metálica 5 metros Stanley',
    price: 42.00,
    costPrice: 35.00,
    stock: 35,
    minStock: 12,
    categoryIndex: 7,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Furadeira de Impacto 650W',
    code: '7891234567913',
    description: 'Furadeira de impacto 650W com maleta',
    price: 285.00,
    costPrice: 230.00,
    stock: 15,
    minStock: 5,
    categoryIndex: 7,
    supplierIndex: 1,
    active: true
  },
  {
    name: 'Martelo Unha 25mm',
    code: '7891234567914',
    description: 'Martelo unha cabo fibra 25mm',
    price: 28.50,
    costPrice: 22.00,
    stock: 45,
    minStock: 15,
    categoryIndex: 7,
    supplierIndex: 1,
    active: true
  }
];

async function seedDatabase() {
  console.log('🌱 Iniciando população do banco de dados...\n');

  try {
    // 1. Criar categorias
    console.log('📁 Criando categorias...');
    const categoryIds = [];
    for (const category of categories) {
      const docRef = await addDoc(collection(db, 'categories'), {
        ...category,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      categoryIds.push(docRef.id);
      console.log(`  ✓ ${category.name}`);
    }
    console.log(`✅ ${categoryIds.length} categorias criadas!\n`);

    // 2. Criar fornecedores
    console.log('🏭 Criando fornecedores...');
    const supplierIds = [];
    for (const supplier of suppliers) {
      const docRef = await addDoc(collection(db, 'suppliers'), {
        ...supplier,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      supplierIds.push(docRef.id);
      console.log(`  ✓ ${supplier.name}`);
    }
    console.log(`✅ ${supplierIds.length} fornecedores criados!\n`);

    // 3. Criar produtos
    console.log('📦 Criando produtos...');
    let productCount = 0;
    for (const product of products) {
      const { categoryIndex, supplierIndex, ...productData } = product;
      
      await addDoc(collection(db, 'products'), {
        ...productData,
        categoryId: categoryIds[categoryIndex],
        categoryName: categories[categoryIndex].name,
        supplierId: supplierIds[supplierIndex],
        supplierName: suppliers[supplierIndex].name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      productCount++;
      console.log(`  ✓ ${product.name}`);
    }
    console.log(`✅ ${productCount} produtos criados!\n`);

    console.log('🎉 Banco de dados populado com sucesso!');
    console.log(`\n📊 Resumo:`);
    console.log(`   - ${categoryIds.length} categorias`);
    console.log(`   - ${supplierIds.length} fornecedores`);
    console.log(`   - ${productCount} produtos`);
    console.log(`\n✨ Agora você pode testar o sistema com dados realistas!`);

  } catch (error) {
    console.error('❌ Erro ao popular banco de dados:', error);
    throw error;
  }
}

// Executar
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
