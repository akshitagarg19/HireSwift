import React from 'react'
import { cn, getStageColor } from '@/lib/utils'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  stage: string
  showDot?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  stage,
  showDot = true,
  className,
  ...props
}) => {
  const { bg, text, border, dot } = getStageColor(stage)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        bg,
        text,
        border,
        className
      )}
      {...props}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />}
      <span className="capitalize">{stage}</span>
    </span>
  )
}
