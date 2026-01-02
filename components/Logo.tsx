
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = "md" }) => {
  const sizeClasses = {
    sm: 'w-24',
    md: 'w-32 md:w-40',
    lg: 'w-48'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} transition-transform duration-300 hover:scale-105 flex items-center justify-center`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" className="w-full h-auto drop-shadow-sm">
        <defs>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
          </style>
        </defs>
        {/* Texto JURO em SVG puro - Independente de arquivos externos */}
        <text 
          x="50%" 
          y="55%" 
          dominantBaseline="middle" 
          textAnchor="middle" 
          fontFamily="'Playfair Display', serif" 
          fontWeight="bold" 
          fontSize="56" 
          fill="#E9568D" 
          letterSpacing="4"
        >
          JURO
        </text>
        
        {/* Elementos decorativos que dão o charme da marca */}
        <circle cx="175" cy="15" r="3" fill="#FBCFE8" opacity="0.8" />
        <circle cx="25" cy="45" r="2" fill="#FBCFE8" opacity="0.6" />
        <path d="M185 10 L190 15 L185 20" stroke="#FBCFE8" strokeWidth="1" fill="none" opacity="0.5" />
      </svg>
    </div>
  );
};
