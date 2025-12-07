
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10", showText = false, textSize = 'lg' }) => {
  return (
    <div className="flex items-center gap-3 select-none">
        <div className={`relative ${className}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3B82F6" /> {/* Blue-500 */}
                        <stop offset="1" stopColor="#A855F7" /> {/* Purple-500 */}
                    </linearGradient>
                    <linearGradient id="metalGrad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#e2e8f0" />
                        <stop offset="0.5" stopColor="#f8fafc" />
                        <stop offset="1" stopColor="#e2e8f0" />
                    </linearGradient>
                </defs>
                
                {/* Shield / Grille Outline */}
                <path d="M50 5 L90 20 V60 C90 85 50 95 50 95 C50 95 10 85 10 60 V20 L50 5 Z" fill="#1e293b" stroke="url(#logoGrad)" strokeWidth="4" />
                
                {/* Central Tech Core */}
                <path d="M50 25 L70 35 V65 L50 75 L30 65 V35 L50 25 Z" fill="url(#logoGrad)" opacity="0.9" />
                
                {/* Connection Nodes */}
                <circle cx="50" cy="50" r="8" fill="white" className="animate-pulse" />
                <path d="M50 50 L30 35" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
                <path d="M50 50 L70 35" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
                <path d="M50 50 L50 75" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            </svg>
        </div>
        
        {showText && (
            <div className="flex flex-col leading-none">
                <span className={`font-bold tracking-tight text-white ${
                    textSize === 'sm' ? 'text-lg' : 
                    textSize === 'md' ? 'text-xl' : 
                    textSize === 'lg' ? 'text-2xl' : 'text-4xl'
                }`}>
                    AutoLead <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">SA</span>
                </span>
                <span className={`font-medium text-slate-400 tracking-[0.2em] uppercase ${
                    textSize === 'sm' || textSize === 'md' ? 'text-[0.5rem]' : 
                    textSize === 'lg' ? 'text-[0.65rem]' : 'text-sm'
                }`}>
                    NAAMSA Intelligence
                </span>
            </div>
        )}
    </div>
  );
};
