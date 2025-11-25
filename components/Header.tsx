import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 flex justify-center items-center z-10">
      <div className="w-28 md:w-36 hover:scale-105 transition-transform duration-300">
        <img 
          src="/logo.png" 
          alt="JURO Logo" 
          className="w-full h-auto drop-shadow-sm"
        />
      </div>
    </header>
  );
};