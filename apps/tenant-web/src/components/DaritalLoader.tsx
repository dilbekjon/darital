'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface DaritalLoaderProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  darkMode?: boolean;
}

// Pre-computed particle positions to avoid hydration mismatch
const particleData = [
  { w: 8, h: 8, l: 10, t: 15, o: 0.3, d: 7, delay: 1 },
  { w: 12, h: 12, l: 25, t: 30, o: 0.4, d: 8, delay: 2 },
  { w: 6, h: 6, l: 45, t: 10, o: 0.25, d: 6, delay: 0 },
  { w: 10, h: 10, l: 70, t: 25, o: 0.35, d: 9, delay: 3 },
  { w: 7, h: 7, l: 85, t: 40, o: 0.3, d: 7, delay: 1.5 },
  { w: 9, h: 9, l: 15, t: 60, o: 0.4, d: 8, delay: 2.5 },
  { w: 11, h: 11, l: 35, t: 75, o: 0.3, d: 6, delay: 0.5 },
  { w: 8, h: 8, l: 55, t: 85, o: 0.35, d: 9, delay: 4 },
  { w: 6, h: 6, l: 80, t: 70, o: 0.25, d: 7, delay: 1 },
  { w: 10, h: 10, l: 95, t: 55, o: 0.4, d: 8, delay: 3.5 },
  { w: 7, h: 7, l: 5, t: 90, o: 0.3, d: 6, delay: 2 },
  { w: 9, h: 9, l: 60, t: 5, o: 0.35, d: 9, delay: 0 },
];

const DaritalLoader: React.FC<DaritalLoaderProps> = ({
  fullScreen = true,
  size = 'lg',
  darkMode = true,
}) => {
  const [mounted, setMounted] = useState(false);

  // Only show particles after mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const containerClasses = fullScreen
    ? `fixed inset-0 z-50 flex items-center justify-center ${
        darkMode
          ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      }`
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClasses}>
      {/* Background particles - only render after mount */}
      {fullScreen && mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particleData.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20"
              style={{
                width: p.w + 'px',
                height: p.h + 'px',
                left: p.l + '%',
                top: p.t + '%',
                background: darkMode
                  ? `rgba(59, 130, 246, ${p.o})`
                  : `rgba(37, 99, 235, ${p.o * 0.7})`,
                animation: `float ${p.d}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo container with animations */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div
            className={`absolute -inset-4 rounded-full border-4 border-dashed ${
              darkMode ? 'border-blue-500/30' : 'border-blue-400/40'
            }`}
            style={{
              animation: 'spin 8s linear infinite',
            }}
          />

          {/* Inner rotating ring (opposite direction) */}
          <div
            className={`absolute -inset-2 rounded-full border-2 ${
              darkMode ? 'border-yellow-400/40' : 'border-yellow-500/50'
            }`}
            style={{
              animation: 'spin 4s linear infinite reverse',
            }}
          />

          {/* Pulsing glow effect */}
          <div
            className={`absolute -inset-6 rounded-full ${
              darkMode ? 'bg-blue-500/20' : 'bg-blue-400/20'
            }`}
            style={{
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}
          />

          {/* Second pulsing glow (delayed) */}
          <div
            className={`absolute -inset-8 rounded-full ${
              darkMode ? 'bg-yellow-400/10' : 'bg-yellow-500/15'
            }`}
            style={{
              animation: 'pulse-glow 2s ease-in-out infinite 1s',
            }}
          />

          {/* Logo with bounce animation */}
          <div
            className={`relative ${sizeClasses[size]} rounded-2xl overflow-hidden shadow-2xl`}
            style={{
              animation: 'bounce-gentle 2s ease-in-out infinite',
            }}
          >
            <Image
              src="/logo.png"
              alt="Darital"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Sparkle effects */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2"
              style={{
                top: ['0%', '50%', '100%', '50%'][i],
                left: ['50%', '100%', '50%', '0%'][i],
                transform: 'translate(-50%, -50%)',
                animation: `sparkle 1.5s ease-in-out infinite ${i * 0.4}s`,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className={darkMode ? 'text-yellow-400' : 'text-yellow-500'}
              >
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        @keyframes bounce-gentle {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.02);
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default DaritalLoader;
