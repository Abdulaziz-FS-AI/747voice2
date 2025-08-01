'use client'

import { motion, AnimatePresence } from 'framer-motion';
import { useUsageWarnings } from '@/contexts/subscription-context';
import { AlertTriangle, X, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function UsageWarningBanner() {
  const router = useRouter();
  const warnings = useUsageWarnings();
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([]);

  // Get the most critical warning
  const currentWarning = warnings
    .filter(w => !dismissedWarnings.includes(`${w.type}-${w.level}`))
    .sort((a, b) => {
      // Prioritize critical over warning
      if (a.level === 'critical' && b.level === 'warning') return -1;
      if (a.level === 'warning' && b.level === 'critical') return 1;
      // Then prioritize minutes over assistants
      if (a.type === 'minutes' && b.type === 'assistants') return -1;
      if (a.type === 'assistants' && b.type === 'minutes') return 1;
      return 0;
    })[0];

  // Clear dismissed warnings when warnings change
  useEffect(() => {
    setDismissedWarnings([]);
  }, [warnings.length]);

  const dismissWarning = () => {
    if (currentWarning) {
      setDismissedWarnings(prev => [...prev, `${currentWarning.type}-${currentWarning.level}`]);
    }
  };

  const getWarningStyles = () => {
    if (!currentWarning) return {};

    if (currentWarning.level === 'critical') {
      return {
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        iconColor: 'var(--vm-error-red)',
        textColor: 'var(--vm-error-red)'
      };
    }

    return {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      iconColor: 'var(--vm-warning-amber)',
      textColor: 'var(--vm-warning-amber)'
    };
  };

  const styles = getWarningStyles();

  return (
    <AnimatePresence mode="wait">
      {currentWarning && (
        <motion.div
          key={`${currentWarning.type}-${currentWarning.level}`}
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden"
        >
          <div 
            className="px-6 py-4 border-b"
            style={{ 
              background: styles.background,
              borderColor: styles.borderColor
            }}
          >
            {/* Animated background pulse */}
            <motion.div
              className="absolute inset-0 opacity-30"
              style={{ background: styles.background }}
              animate={{
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            <div className="relative flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                {/* Animated warning icon */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <AlertTriangle className="h-5 w-5" style={{ color: styles.iconColor }} />
                </motion.div>

                <div className="flex items-center gap-2">
                  {currentWarning.type === 'minutes' && (
                    <Zap className="h-4 w-4" style={{ color: styles.iconColor }} />
                  )}
                  {currentWarning.type === 'assistants' && (
                    <Brain className="h-4 w-4" style={{ color: styles.iconColor }} />
                  )}
                  <span className="font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                    {currentWarning.message}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {currentWarning.level === 'critical' && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => router.push('/dashboard/settings/billing')}
                    style={{
                      background: 'var(--vm-gradient-primary)',
                      color: '#FFFFFF'
                    }}
                  >
                    <Zap className="mr-2 h-3 w-3" />
                    Upgrade Now
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismissWarning}
                  className="hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Progress indicator */}
            {currentWarning.percentage !== undefined && (
              <div 
                className="absolute bottom-0 left-0 h-1"
                style={{ 
                  width: `${currentWarning.percentage}%`,
                  background: styles.iconColor,
                  boxShadow: `0 0 10px ${styles.iconColor}`
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}