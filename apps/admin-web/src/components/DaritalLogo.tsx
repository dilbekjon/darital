import React from 'react';

interface DaritalLogoProps {
  className?: string;
  size?: number;
}

export default function DaritalLogo({ className = '', size = 32 }: DaritalLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Yellow rounded square background */}
      <rect
        x="8"
        y="8"
        width="48"
        height="48"
        rx="8"
        ry="8"
        fill="#FBBF24"
        className="drop-shadow-sm"
      />
      
      {/* Blue four-petal shape (clover) */}
      <g fill="#1E40AF">
        {/* Top petal */}
        <ellipse cx="32" cy="20" rx="8" ry="12" />
        {/* Bottom petal */}
        <ellipse cx="32" cy="44" rx="8" ry="12" />
        {/* Left petal */}
        <ellipse cx="20" cy="32" rx="12" ry="8" />
        {/* Right petal */}
        <ellipse cx="44" cy="32" rx="12" ry="8" />
      </g>
      
      {/* Yellow center diamond/star */}
      <polygon
        points="32,26 36,32 32,38 28,32"
        fill="#FBBF24"
      />
      
      {/* Additional highlight for depth */}
      <ellipse
        cx="32"
        cy="28"
        rx="3"
        ry="3"
        fill="#FCD34D"
        opacity="0.6"
      />
    </svg>
  );
}
