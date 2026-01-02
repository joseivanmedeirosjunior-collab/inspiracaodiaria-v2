
import React from 'react';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 flex justify-center items-center z-10">
      <Logo />
    </header>
  );
};
