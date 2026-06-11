import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  fullWidth?: boolean
}

const variants = {
  primary: 'bg-accent hover:bg-accent-light text-white border border-accent/50 shadow-[0_0_20px_rgba(200,16,46,0.3)]',
  ghost: 'bg-transparent hover:bg-white/5 text-white/70 hover:text-white border border-white/10 hover:border-white/20',
  danger: 'bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800/40',
  gold: 'bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 hover:border-gold/50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled,
  className = '',
  type = 'button',
  fullWidth,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-colors duration-150 select-none cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
}
