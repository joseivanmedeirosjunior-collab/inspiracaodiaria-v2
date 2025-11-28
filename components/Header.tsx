import React, { useState, useEffect } from 'react';

export const Header: React.FC = () => {
  const [imgError, setImgError] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string>("");

  useEffect(() => {
    // Adicionada a barra '/' no início: /images/logo.png
    setLogoSrc(`/images/logo.png?v=${new Date().getTime()}`);
  }, []);

  return (
    <header className="w-full py-6 flex justify-center items-center z-10">
      <div className="w-28 md:w-36 hover:scale-105 transition-transform duration-300 flex justify-center items-center">
        {!imgError && logoSrc ? (
         <blockquote class="imgur-embed-pub" lang="en" data-id="a/zFr0mj2" data-context="false" ><a href="//imgur.com/a/zFr0mj2"></a></blockquote><script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>
        ) : (
          <div className="flex flex-col items-center select-none cursor-default animate-fade-in">
             <h1 className="font-serif text-3xl font-bold text-juro-primary tracking-widest border-2 border-juro-primary/20 px-4 py-1 rounded-xl bg-white/50">
               JURO
             </h1>
          </div>
        )}
      </div>
    </header>
  );
};
