import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface KeyboardShortcutsConfig {
  onF2?: () => void;
  onF4?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar se estiver digitando em um input/textarea
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;

      // F2 - Busca Rápida (funciona mesmo em inputs)
      if (event.key === 'F2') {
        event.preventDefault();
        config.onF2?.();
        return;
      }

      // F4 - Abrir PDV (apenas quando não estiver em input)
      if (event.key === 'F4' && !isInputField) {
        event.preventDefault();
        config.onF4?.();
        return;
      }

      // ESC - Fechar modal/busca
      if (event.key === 'Escape') {
        config.onEscape?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [config, setLocation]);
}
