'use client'

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface UsageBarProps {
  current: number;
  limit: number;
  type: 'minutes' | 'assistants';
  showLabels?: boolean;
  className?: string;
  compact?: boolean;
}

export function UsageBar({ 
  current, 
  limit, 
  type, 
  showLabels = true,
  className = '',
  compact = false
}: UsageBarProps) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isOverLimit = current > limit;
  
  // Determine color based on usage
  const getBarColor = () => {
    if (isOverLimit) return 'var(--vm-error-red)';
    if (percentage >= 90) return 'var(--vm-error-red)';
    if (percentage >= 80) return 'var(--vm-warning-amber)';
    if (percentage >= 60) return 'var(--vm-accent-blue)';
    return 'var(--vm-success-green)';
  };

  const getGlowEffect = () => {
    if (isOverLimit || percentage >= 90) return 'var(--vm-glow-error)';
    if (percentage >= 80) return '0 0 0 3px rgba(245, 158, 11, 0.2)';
    return 'none';
  };

  const formatValue = (value: number) => {
    if (type === 'minutes') {
      return `${value} min${value !== 1 ? 's' : ''}`;
    }
    return `${value} assistant${value !== 1 ? 's' : ''}`;
  };

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--vm-text-muted)' }}>
            {formatValue(current)} / {formatValue(limit)}
          </span>
          <span style={{ color: getBarColor() }} className="font-medium">
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div 
          className="relative h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--vm-neutral-800)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              backgroundColor: getBarColor(),
              boxShadow: percentage > 50 ? `inset 0 0 10px rgba(0,0,0,0.2)` : 'none'
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {showLabels && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
              {type === 'minutes' ? 'Minutes Used' : 'AI Assistants'}
            </span>
            {isOverLimit && (
              <span 
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--vm-error-red)'
                }}
              >
                LIMIT EXCEEDED
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span 
              className="text-lg font-bold"
              style={{ color: getBarColor() }}
            >
              {current}
            </span>
            <span className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
              / {limit}
            </span>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Background track */}
        <div 
          className="h-3 rounded-full overflow-hidden relative"
          style={{ 
            backgroundColor: 'var(--vm-neutral-800)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Animated fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${getBarColor()} 0%, ${getBarColor()}dd 100%)`,
              boxShadow: getGlowEffect()
            }}
          >
            {/* Animated shimmer effect */}
            <motion.div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                backgroundSize: '200% 100%'
              }}
              animate={{
                backgroundPosition: ['0% 0%', '200% 0%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>

          {/* Warning threshold markers */}
          {!isOverLimit && (
            <>
              <div 
                className="absolute top-0 bottom-0 w-px"
                style={{ 
                  left: '80%',
                  backgroundColor: 'var(--vm-warning-amber)',
                  opacity: 0.3
                }}
              />
              <div 
                className="absolute top-0 bottom-0 w-px"
                style={{ 
                  left: '90%',
                  backgroundColor: 'var(--vm-error-red)',
                  opacity: 0.3
                }}
              />
            </>
          )}
        </div>

        {/* Percentage label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-6 right-0 text-xs font-medium"
          style={{ color: getBarColor() }}
        >
          {percentage.toFixed(0)}%
        </motion.div>
      </div>

      {/* Additional info */}
      {!compact && percentage >= 80 && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-xs"
          style={{ color: getBarColor() }}
        >
          {percentage >= 90 
            ? '⚠️ Critical: Consider upgrading to Pro'
            : '⚡ Approaching limit'}
        </motion.p>
      )}
    </div>
  );
}