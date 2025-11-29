import React, { useState, useEffect } from 'react';

export const Header: React.FC = () => {
  // Caminhos das imagens
  // Usando link direto do Imgur para garantir persistência independente do GitHub
  const PNG_LOGO = 'https://i.imgur.com/F7AFrLG.png';
  const SVG_LOGO = '/images/logo.svg';

  return (
    <header className="w-full py-6 flex justify-center items-center z-10">
      <div className="w-28 md:w-36 hover:scale-105 transition-transform duration-300 flex justify-center items-center">
        <img 
          src={PNG_LOGO}
          alt="JURO Logo" 
          className="w-full h-auto drop-shadow-sm object-contain"
          onError={(e) => {
            // Se o Imgur falhar, carrega o SVG local (que é código e nunca some)
            const target = e.target as HTMLImageElement;
            if (target.src !== window.location.origin + SVG_LOGO) {
              target.src = SVG_LOGO;
            } else {
              target.style.display = 'none';
              document.getElementById('text-fallback')?.classList.remove('hidden');
            }
          }}
        />
        {/* Fallback de Texto caso ambas as imagens falhem (oculto por padrão) */}
        <h1 id="text-fallback" className="hidden font-serif text-3xl font-bold text-juro-primary tracking-widest border-2 border-juro-primary/20 px-4 py-1 rounded-xl bg-white/50">
           JURO
        </h1>
      </div>
    </header>
  );
};