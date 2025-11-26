import React from 'react';

export const Header: React.FC = () => {
  // Como o arquivo logo.png está na raiz do projeto, referenciamos diretamente como asset estático.
  // Isso evita erros de "Module resolution" em ambientes onde o Vite não intercepta o import da imagem.
  const logoImg = "/logo.png";

  return (
    <header className="w-full py-6 flex justify-center items-center z-10">
      <div className="w-28 md:w-36 hover:scale-105 transition-transform duration-300">
        <img 
          src={logoImg} 
          alt="JURO Logo" 
          className="w-full h-auto drop-shadow-sm"
        />
      </div>
    </header>
  );
};