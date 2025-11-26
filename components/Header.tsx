import React, { useState } from 'react';

export const Header: React.FC = () => {
  const [imgError, setImgError] = useState(false);

  return (
    <header className="w-full py-6 flex justify-center items-center z-10">
      <div className="w-28 md:w-36 hover:scale-105 transition-transform duration-300 flex justify-center items-center">
        {/* 
          Usa caminho absoluto para a imagem na pasta pública/raiz.
          Removemos a importação ('import logo from...') para evitar erros de build 'Module Resolution'
          caso o arquivo não seja processado corretamente ou use alias (@) não configurado.
        */}
        {!imgError ? (
          <img 
            src="/logo.png" 
            alt="JURO Logo" 
            className="w-full h-auto drop-shadow-sm"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center select-none cursor-default">
             <h1 className="font-serif text-3xl font-bold text-juro-primary tracking-widest border-2 border-juro-primary/20 px-4 py-1 rounded-xl bg-white/50">
               JURO
             </h1>
          </div>
        )}
      </div>
    </header>
  );
};