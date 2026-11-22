import React from 'react'
import { cn, getScoreColor } from '@/lib/utils'

export interface ScoreRingProps {
  score?: number | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  className?: string
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const isMissing = score === null || score === undefined || isNaN(score)
  const normalizedScore = isMissing ? 0 : Math.max(0, Math.min(100, Math.round(score)))
  const colors = isMissing
    ? { ring: 'transparent', text: 'text-muted font-bold' }
    : getScoreColor(normalizedScore)

  const sizeMap = {
    sm: { diameter: 32, strokeWidth: 3, text: 'text-[11px] font-bold' },
    md: { diameter: 44, strokeWidth: 4, text: 'text-xs font-bold' },
    lg: { diameter: 60, strokeWidth: 5, text: 'text-base font-bold' },
    xl: { diameter: 80, strokeWidth: 6, text: 'text-xl font-bold' },
  }

  const { diameter, strokeWidth, text } = sizeMap[size]
  const radius = (diameter - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = isMissing
    ? circumference
    : circumference - (normalizedScore / 100) * circumference

  return (
    <div
      data-testid="score-ring"
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
    >
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring - only if score is provided */}
        {!isMissing && (
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
      {showLabel && (
        <span className={cn('absolute inset-0 flex items-center justify-center', text, colors.text)}>
          {isMissing ? '-' : normalizedScore}
        </span>
      )}
    </div>
  )
}
