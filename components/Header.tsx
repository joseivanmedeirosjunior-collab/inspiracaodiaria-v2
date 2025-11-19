import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 flex justify-center items-center z-10">
      <div className="w-28 md:w-36 text-juro-primary hover:scale-105 transition-transform duration-300">
        {/* 
          ViewBox ajustado para -10 -10 260 105. 
          Original: 0 0 240 85. 
          Isso adiciona margem/padding interno para evitar cortes na renderização.
        */}
        <svg viewBox="-10 -10 260 105" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
           {/* J */}
           <path d="M0 0H45V50C45 66.5685 31.5685 80 15 80H0V45H15C20 45 22 43 22 40V22H0V0Z" />
           
           {/* U */}
           <path d="M50 0H70V50C70 58.2843 76.7157 65 85 65C93.2843 65 100 58.2843 100 50V0H120V50C120 69.33 104.33 85 85 85C65.67 85 50 69.33 50 50V0Z" />
           
           {/* R */}
           <path d="M125 0H155C168.807 0 180 11.1929 180 25C180 35.5 173.5 44.5 164 48L175 80H152L142 50H145V80H125V0ZM145 20V30H155C157.761 30 160 27.7614 160 25C160 22.2386 157.761 20 155 20H145Z" />
           
           {/* O */}
           <path d="M185 25C185 11.1929 196.193 0 210 0H215C228.807 0 240 11.1929 240 25V55C240 68.8071 228.807 80 215 80H210C196.193 80 185 68.8071 185 55V25ZM205 25V55C205 60.5228 209.477 65 215 65C220.523 65 225 60.5228 225 55V25C225 19.4772 220.523 15 215 15C209.477 15 205 19.4772 205 25Z" />
        </svg>
      </div>
    </header>
  );
};