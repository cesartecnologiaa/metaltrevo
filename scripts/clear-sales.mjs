import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Configuração do Firebase (mesma do projeto)
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

async function clearSales() {
  console.log('🔥 Iniciando limpeza de vendas...\n');

  try {
    // Buscar todas as vendas
    const salesSnapshot = await getDocs(collection(db, 'sales'));
    console.log(`📊 Total de vendas encontradas: ${salesSnapshot.size}`);

    if (salesSnapshot.empty) {
      console.log('✅ Nenhuma venda para deletar.');
      return;
    }

    // Deletar cada venda
    let deleted = 0;
    for (const saleDoc of salesSnapshot.docs) {
      await deleteDoc(doc(db, 'sales', saleDoc.id));
      deleted++;
      if (deleted % 10 === 0) {
        console.log(`   Deletadas ${deleted}/${salesSnapshot.size} vendas...`);
      }
    }

    console.log(`\n✅ Limpeza concluída! ${deleted} vendas deletadas com sucesso.`);
  } catch (error) {
    console.error('❌ Erro ao limpar vendas:', error);
  }
}

// Executar
clearSales().then(() => {
  console.log('\n🎉 Script finalizado!');
  process.exit(0);
});
