import React from 'react'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'

export interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isBlind?: boolean
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  isBlind = false,
  className,
}) => {
  const displayName = isBlind ? 'Candidate' : name
  const initials = isBlind ? '••' : getInitials(displayName)
  const colorClass = isBlind ? 'bg-gray-400 text-white' : getAvatarColor(name || 'Unknown')

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-medium',
    lg: 'w-12 h-12 text-base font-semibold',
    xl: 'w-16 h-16 text-xl font-bold',
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 select-none shadow-sm',
        sizeClasses[size],
        colorClass,
        className
      )}
      title={isBlind ? 'Blind Screening Active' : name}
    >
      {initials}
    </div>
  )
}
