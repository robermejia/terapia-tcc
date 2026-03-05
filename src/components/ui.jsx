import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = ({ className, variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:shadow-lg hover:shadow-[hsl(var(--brand)/0.3)]',
    secondary: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/0.8)]',
    outline: 'bg-transparent border-2 border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] hover:border-[hsl(var(--brand)/0.5)]',
    ghost: 'bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]',
    google: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
  };

  return (
    <button
      className={cn(
        'px-6 py-3 rounded-[var(--radius)] flex items-center justify-center gap-2 transition-all duration-300 w-full font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export const Card = ({ className, children, ...props }) => {
  return (
    <div 
      className={cn(
        'bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 card-shadow animate-fade-in hover:shadow-md transition-shadow duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const Input = ({ className, ...props }) => {
  return (
    <input
      className={cn(
        'flex h-12 w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2 text-sm ring-offset-[hsl(var(--background))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] transition-all',
        className
      )}
      {...props}
    />
  );
};
