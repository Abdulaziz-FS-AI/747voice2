/**
 * Professional Input Component - Non-AI Looking Design
 * Clean, minimal styling with subtle professional touches
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  // Base professional styling
  "flex w-full border bg-vm-surface-elevated text-vm-text-primary placeholder:text-vm-text-muted transition-all duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-vm-border focus-visible:ring-2 focus-visible:ring-vm-primary focus-visible:ring-offset-2 focus-visible:border-vm-primary",
        ghost: "border-transparent bg-transparent focus-visible:bg-vm-surface-elevated focus-visible:border-vm-border",
        filled: "bg-vm-surface border-vm-border focus-visible:bg-vm-surface-elevated focus-visible:border-vm-primary",
        glass: "vm-glass backdrop-blur-lg border-vm-glass-border focus-visible:border-vm-primary/50",
      },
      size: {
        sm: "h-8 px-3 py-1 text-xs rounded-sm",
        default: "h-9 px-3 py-2 text-sm rounded-md",
        lg: "h-10 px-4 py-2.5 text-base rounded-lg",
        xl: "h-12 px-4 py-3 text-base rounded-lg",
      },
      state: {
        default: "",
        error: "border-vm-error focus-visible:ring-vm-error",
        success: "border-vm-success focus-visible:ring-vm-success",
        warning: "border-vm-warning focus-visible:ring-vm-warning",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
);

export interface ProfessionalInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  success?: string;
  warning?: string;
}

const ProfessionalInput = React.forwardRef<HTMLInputElement, ProfessionalInputProps>(
  ({ 
    className, 
    variant, 
    size, 
    state, 
    type, 
    leftIcon, 
    rightIcon, 
    error, 
    success, 
    warning,
    ...props 
  }, ref) => {
    
    // Determine state based on props
    const currentState = error ? "error" : success ? "success" : warning ? "warning" : state;
    
    const inputElement = (
      <input
        type={type}
        className={cn(
          inputVariants({ variant, size, state: currentState }),
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          className
        )}
        ref={ref}
        {...props}
      />
    );

    // If no icons, return simple input
    if (!leftIcon && !rightIcon) {
      return inputElement;
    }

    // Wrapper for inputs with icons
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-vm-text-muted">
            {leftIcon}
          </div>
        )}
        
        {inputElement}
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-vm-text-muted">
            {rightIcon}
          </div>
        )}
        
        {/* Status message */}
        {(error || success || warning) && (
          <div className={cn(
            "mt-1 text-xs",
            error && "text-vm-error",
            success && "text-vm-success", 
            warning && "text-vm-warning"
          )}>
            {error || success || warning}
          </div>
        )}
      </div>
    );
  }
);

ProfessionalInput.displayName = "ProfessionalInput";

/**
 * Professional Textarea Component
 */
export interface ProfessionalTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<VariantProps<typeof inputVariants>, 'size'> {
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  error?: string;
  success?: string;
  warning?: string;
}

const ProfessionalTextarea = React.forwardRef<HTMLTextAreaElement, ProfessionalTextareaProps>(
  ({ 
    className, 
    variant, 
    state, 
    resize = 'vertical',
    error, 
    success, 
    warning,
    ...props 
  }, ref) => {
    
    const currentState = error ? "error" : success ? "success" : warning ? "warning" : state;
    
    return (
      <div>
        <textarea
          className={cn(
            inputVariants({ variant, state: currentState }),
            "min-h-[80px] py-2",
            resize === 'none' && 'resize-none',
            resize === 'vertical' && 'resize-y',
            resize === 'horizontal' && 'resize-x',
            resize === 'both' && 'resize',
            className
          )}
          ref={ref}
          {...props}
        />
        
        {/* Status message */}
        {(error || success || warning) && (
          <div className={cn(
            "mt-1 text-xs",
            error && "text-vm-error",
            success && "text-vm-success", 
            warning && "text-vm-warning"
          )}>
            {error || success || warning}
          </div>
        )}
      </div>
    );
  }
);

ProfessionalTextarea.displayName = "ProfessionalTextarea";

export { ProfessionalInput, ProfessionalTextarea, inputVariants };