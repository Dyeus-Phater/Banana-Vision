
import React from 'react';

const BartyBanana: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="100"
    height="100"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Banana Body */}
    <path
      d="M 50,10 C 30,10 20,40 20,60 C 20,80 30,95 50,95 C 70,95 80,80 80,60 C 80,40 70,10 50,10 Z"
      fill="#FFDD67" // Banana yellow
      stroke="#EAA220" // Darker yellow for outline
      strokeWidth="3"
    />
    {/* Top stem part */}
    <path
      d="M 48,10 C 45,5 55,5 52,10"
      fill="#A47449" // Brownish stem
      stroke="#7A5230"
      strokeWidth="2"
    />
    {/* Smile */}
    <path
      d="M 35,65 Q 50,75 65,65"
      fill="none"
      stroke="#422006" // Dark brown
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Eyes */}
    <circle cx="40" cy="50" r="4" fill="#422006" />
    <circle cx="60" cy="50" r="4" fill="#422006" />
    {/* Eye Sparkle */}
    <circle cx="42" cy="48" r="1.5" fill="white" />
    <circle cx="62" cy="48" r="1.5" fill="white" />
     {/* Subtle shading */}
    <path 
      d="M 50,10 C 60,10 70,30 70,55 C 70,70 60,85 50,85"
      fill="#FFF9C4"
      opacity="0.2"
    />
  </svg>
);

export default BartyBanana;
