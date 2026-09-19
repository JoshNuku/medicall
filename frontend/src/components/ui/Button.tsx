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
      'bg-gray-900 text-white hover:bg-gray-800 shadow-sm border border-gray-900',
    secondary:
      'bg-white text-gray-800 hover:bg-gray-50/80 border border-gray-200/90 shadow-xs hover:border-gray-300',
    ghost:
      'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/60',
    danger:
      'bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200/80',
    subtle:
      'bg-[#F5F4F0] text-gray-800 hover:bg-[#EBE9E3] border border-[#E8E6E0]',
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
