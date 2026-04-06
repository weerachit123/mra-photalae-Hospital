import React from 'react';

export default function PhothaleLogo({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Teal Drop Shape */}
      <path 
        d="M 100 10 C 100 10, 20 100, 20 140 C 20 180, 180 180, 180 140 C 180 100, 100 10, 100 10 Z" 
        fill="#14a0b5" 
      />
      <path 
        d="M 100 30 C 100 30, 40 105, 40 140 C 40 170, 160 170, 160 140 C 160 105, 100 30, 100 30 Z" 
        fill="#ffffff" 
      />
      
      {/* Green Cross Outline */}
      <path 
        d="M 85 65 L 115 65 L 115 85 L 135 85 L 135 115 L 115 115 L 115 135 L 85 135 L 85 115 L 65 115 L 65 85 L 85 85 Z" 
        fill="none" 
        stroke="#81c784" 
        strokeWidth="4" 
      />
      
      {/* Green Leaves */}
      <path 
        d="M 100 115 C 80 115, 70 100, 70 100 C 70 100, 85 90, 100 100 C 115 90, 130 100, 130 100 C 130 100, 120 115, 100 115 Z" 
        fill="#4caf50" 
      />
      <path 
        d="M 100 100 C 95 85, 100 75, 100 75 C 100 75, 110 85, 100 100 Z" 
        fill="#4caf50" 
      />
    </svg>
  );
}
