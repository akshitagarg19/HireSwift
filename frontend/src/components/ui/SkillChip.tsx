import React from 'react'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

export interface SkillChipProps {
  name: string
  status?: 'matched' | 'missing' | 'neutral' | 'required' | 'preferred'
  size?: 'sm' | 'md'
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

export const SkillChip: React.FC<SkillChipProps> = ({
  name,
  status = 'neutral',
  size = 'md',
  onRemove,
  onClick,
  className,
}) => {
  const statusStyles = {
    neutral: 'bg-gray-100 text-gray-800 border-gray-200',
    matched: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    missing: 'bg-rose-50 text-rose-800 border-rose-200',
    required: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    preferred: 'bg-amber-50 text-amber-800 border-amber-200',
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium border transition-colors',
        statusStyles[status],
        sizeStyles[size],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
    >
      {status === 'matched' && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
      {status === 'missing' && <X className="w-3 h-3 text-rose-600 shrink-0" />}
      <span>{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 text-gray-400 hover:text-gray-600 rounded p-0.5 focus:outline-none"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
