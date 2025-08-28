
import React from 'react';
import { Icon } from './Icon';

interface HeaderProps {
  isQuoting: boolean;
  onSave?: () => void;
  onReturnToHome?: () => void;
}

const SiemensLogo = () => (
    <svg width="40" height="40" viewBox="0 0 100 100" className="mr-3">
        <rect width="100" height="100" rx="10" fill="#00334d"/>
        <path d="M20 30 C 40 10, 60 10, 80 30 S 60 50, 40 50 S 20 70, 20 70" stroke="white" strokeWidth="8" fill="none"/>
        <path d="M20 70 C 40 90, 60 90, 80 70 S 60 50, 40 50 S 20 30, 20 30" stroke="white" strokeWidth="8" fill="none"/>
    </svg>
);

export const Header: React.FC<HeaderProps> = ({ isQuoting, onSave, onReturnToHome }) => {
  return (
    <header className="bg-[#00334d] text-white shadow-md print:hidden">
      <div className="container mx-auto px-8 py-3 flex justify-between items-center">
        <div className="flex items-center">
            <SiemensLogo />
            <h1 className="text-xl font-semibold tracking-wide">SIEMENS Home Appliances Smart Quote Assistant</h1>
        </div>
        <div className="flex items-center space-x-4">
          {isQuoting && (
            <>
              <button onClick={onSave} className="flex items-center space-x-2 px-4 py-2 border border-gray-500 rounded-md hover:bg-gray-700 transition-colors">
                <Icon name="save" className="w-5 h-5" />
                <span>保存草稿</span>
              </button>
              <button onClick={onReturnToHome} className="flex items-center space-x-2 px-4 py-2 border border-gray-500 rounded-md hover:bg-gray-700 transition-colors">
                <Icon name="return" className="w-5 h-5" />
                <span>返回主页</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
