import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton() {
  const handleWhatsAppClick = () => {
    const phoneNumber = '5533999675619';
    const message = encodeURIComponent('Olá! Preciso de suporte com o sistema ERP Metal Trevo.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-white/30 shadow-2xl transition-all duration-300 hover:scale-105 group"
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
      title="Suporte via WhatsApp"
    >
      {/* Ícone do WhatsApp */}
      <MessageCircle className="w-5 h-5 text-white" />
      
      {/* Texto "Suporte" */}
      <span className="text-white font-medium text-sm">Suporte</span>
    </button>
  );
}
