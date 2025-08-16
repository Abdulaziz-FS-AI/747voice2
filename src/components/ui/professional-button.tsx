/**
 * Professional Button Component - Non-AI Looking Design
 * Subtle animations and professional styling
 */

import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base professional styling
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vm-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-vm-primary text-vm-primary-foreground shadow-sm hover:bg-vm-primary-dark hover:shadow-md active:scale-95",
        destructive: "bg-vm-error text-vm-error-foreground shadow-sm hover:bg-vm-error/90 hover:shadow-md",
        outline: "border border-vm-border bg-transparent text-vm-text-primary shadow-sm hover:bg-vm-surface-elevated hover:border-vm-primary/50",
        secondary: "bg-vm-surface-elevated text-vm-text-primary shadow-sm hover:bg-vm-surface hover:shadow-md",
        ghost: "text-vm-text-secondary hover:bg-vm-surface-elevated hover:text-vm-text-primary",
        link: "text-vm-primary underline-offset-4 hover:underline p-0 h-auto",
        glass: "vm-glass backdrop-blur-lg text-vm-text-primary hover:bg-vm-surface-elevated/80",
        gradient: "bg-gradient-to-r from-vm-primary to-vm-primary-dark text-vm-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-md",
        sm: "h-8 px-3 py-1.5 text-xs rounded-sm",
        lg: "h-10 px-6 py-2.5 rounded-lg",
        xl: "h-12 px-8 py-3 text-base rounded-lg",
        icon: "h-9 w-9 rounded-md",
      },
      loading: {
        true: "cursor-wait",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
    },
  }
);

export interface ProfessionalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const ProfessionalButton = React.forwardRef<HTMLButtonElement, ProfessionalButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, loading, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Subtle shine effect for professional look */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700 ease-out" />
        
        {/* Content wrapper */}
        <div className="relative flex items-center gap-2">
          {loading ? (
            <svg 
              className="animate-spin h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="2"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : leftIcon}
          
          {children}
          
          {!loading && rightIcon}
        </div>
      </Comp>
    );
  }
);

ProfessionalButton.displayName = "ProfessionalButton";

export { ProfessionalButton, buttonVariants };