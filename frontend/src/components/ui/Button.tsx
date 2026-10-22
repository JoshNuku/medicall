'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2 rounded-xl gap-2',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-kaime-blue text-white hover:bg-kaime-blue-hover active:bg-kaime-blue-active shadow-xs border border-kaime-blue font-semibold focus-visible:ring-2 focus-visible:ring-kaime-blue/30',
    secondary:
      'bg-white text-gray-800 hover:bg-gray-50 border border-subtle-border shadow-2xs hover:border-gray-300 font-medium',
    ghost:
      'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/70',
    danger:
      'bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200/80 font-medium',
    subtle:
      'bg-kaime-blue-light text-kaime-blue hover:bg-kaime-blue-hover-light border border-kaime-blue-border font-medium',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
