import { Keyboard } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function KeyboardShortcutsHelp() {
  const shortcuts = [
    { key: 'F2', description: 'Busca rápida de produtos' },
    { key: 'F4', description: 'Abrir PDV' },
    { key: 'ESC', description: 'Fechar busca/modal' },
  ];

  return (
    <Card className="backdrop-blur-2xl bg-white/10 border-white/20 shadow-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="w-5 h-5 text-purple-400" />
        <h3 className="text-white font-semibold">Atalhos de Teclado</h3>
      </div>
      <div className="space-y-2">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center justify-between text-sm">
            <span className="text-white/70">{shortcut.description}</span>
            <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white font-mono text-xs">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </Card>
  );
}
