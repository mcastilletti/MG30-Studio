"use client"

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface RotaryKnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  className?: string;
  size?: number;
  color?: string; // Hex, HSL or CSS variable
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange,
  className,
  size = 64,
  color = 'hsl(var(--primary))'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = startY.current - e.clientY;
    const sensitivity = (max - min) / 200; // Pixels to value
    let newValue = startValue.current + deltaY * sensitivity;

    if (e.shiftKey) newValue = startValue.current + (deltaY * sensitivity) / 5;

    newValue = Math.max(min, Math.min(max, newValue));
    onChange(Math.round(newValue / step) * step);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const rotation = ((value - min) / (max - min)) * 270 - 135;
  
  // Calculate stroke dasharray for the active arc
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const arcPercentage = 270 / 360;
  const totalArcLength = circumference * arcPercentage;
  const activePercentage = (value - min) / (max - min);
  const activeLength = totalArcLength * activePercentage;

  return (
    <div className={cn("flex flex-col items-center gap-1 knob-container", className)}>
      <span className="text-[10px] font-medium uppercase text-muted-foreground select-none">{label}</span>
      <div 
        className="relative cursor-ns-resize group"
        onMouseDown={handleMouseDown}
        onDoubleClick={() => onChange((max + min) / 2)}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full transform">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="currentColor" className="text-secondary" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
          
          {/* Passive arc path */}
          <path 
            d="M 25 80 A 40 40 0 1 1 75 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/20"
            strokeLinecap="round"
          />

          {/* Active arc path */}
          <path 
            d="M 25 80 A 40 40 0 1 1 75 80"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${activeLength} ${circumference}`}
            className="transition-[stroke-dasharray] duration-75"
          />

          {/* Value pointer */}
          <g transform={`rotate(${rotation} 50 50)`}>
            <circle cx="50" cy="50" r="38" fill="currentColor" className="text-card" />
            <rect x="47" y="15" width="6" height="15" rx="3" fill={color} className="transition-all" />
          </g>
        </svg>
        
        {/* Value overlay on hover/drag */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity",
          isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
           <span 
             className="text-[10px] font-mono bg-background/90 px-1.5 py-0.5 rounded border shadow-lg"
             style={{ borderColor: color }}
           >
            {value.toFixed(step < 1 ? 1 : 0)}{unit}
          </span>
        </div>
      </div>
      <span className="text-[11px] font-mono mt-1 select-none font-bold" style={{ color: color }}>
        {value.toFixed(step < 1 ? 1 : 0)}
      </span>
    </div>
  );
};
