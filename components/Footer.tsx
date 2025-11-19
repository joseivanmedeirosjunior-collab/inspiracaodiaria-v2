import React from 'react';
import { Heart, LockKeyhole } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-6 mt-auto flex flex-col items-center gap-4">
      <div className="text-center text-sm text-gray-500 flex justify-center items-center gap-1.5">
        <span>Feito com</span>
        <Heart size={16} className="text-juro-secondary fill-juro-secondary animate-pulse" />
        <span>por <strong>JURO</strong></span>
      </div>
      
      {/* Botão discreto para Admin */}
      <button 
        onClick={() => window.location.hash = '#admin'}
        className="opacity-20 hover:opacity-100 transition-opacity text-xs text-gray-400 flex items-center gap-1"
        title="Área Administrativa"
      >
        <LockKeyhole size={12} />
        <span>Admin</span>
      </button>
    </footer>
  );
};
