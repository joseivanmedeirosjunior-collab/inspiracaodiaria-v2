
import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = "md" }) => {
  const [imgError, setImgError] = useState(false);
  
  const PNG_URL = 'https://i.imgur.com/F7AFrLG.png';

  const sizeClasses = {
    sm: 'w-20',
    md: 'w-28 md:w-36',
    lg: 'w-48'
  };

  // O SVG inline garante que a marca nunca desapareça, mesmo sem internet ou com CDN bloqueado
  const InlineSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" className="w-full h-auto">
      <text 
        x="50%" 
        y="55%" 
        dominantBaseline="middle" 
        textAnchor="middle" 
        fontFamily="'Playfair Display', serif" 
        fontWeight="bold" 
        fontSize="54" 
        fill="#E9568D" 
        letterSpacing="4"
      >
        JURO
      </text>
      <circle cx="175" cy="15" r="3" fill="#FBCFE8" opacity="0.8" />
      <circle cx="25" cy="45" r="2" fill="#FBCFE8" opacity="0.6" />
    </svg>
  );

  return (
    <div className={`${sizeClasses[size]} ${className} transition-transform duration-300 hover:scale-105 flex items-center justify-center`}>
      {!imgError ? (
        <img 
          src={PNG_URL} 
          alt="JURO Logo" 
          referrerPolicy="no-referrer"
          className="w-full h-auto drop-shadow-sm object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <InlineSvg />
      )}
    </div>
  );
};
