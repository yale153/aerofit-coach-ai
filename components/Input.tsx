import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs uppercase tracking-wider text-military-300 font-semibold">{label}</label>}
      <input 
        className={`bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent transition-all ${className}`}
        {...props}
      />
    </div>
  );
};