/**
 * Professional Card Component - Non-AI Looking Design
 * Uses Voice Matrix theme system for glassmorphism effects
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  // Base classes for professional look
  "vm-card relative overflow-hidden transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "bg-vm-surface border-vm-border",
        glass: "vm-glass backdrop-blur-lg",
        elevated: "bg-vm-surface-elevated shadow-lg hover:shadow-xl",
        minimal: "bg-transparent border-vm-border/50",
      },
      size: {
        sm: "p-4",
        md: "p-6", 
        lg: "p-8",
        xl: "p-10",
      },
      hover: {
        none: "",
        lift: "hover:vm-hover-lift hover:shadow-md",
        glow: "hover:shadow-vm-primary/20 hover:border-vm-primary/30",
        scale: "hover:scale-[1.02] active:scale-[0.98]",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      }
    },
    defaultVariants: {
      variant: "glass",
      size: "md",
      hover: "lift",
      rounded: "lg",
    },
  }
);

export interface ProfessionalCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode;
  asChild?: boolean;
}

const ProfessionalCard = React.forwardRef<HTMLDivElement, ProfessionalCardProps>(
  ({ className, variant, size, hover, rounded, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, hover, rounded }), className)}
        {...props}
      >
        {/* Subtle highlight line for professional touch */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {children}
      </div>
    );
  }
);

ProfessionalCard.displayName = "ProfessionalCard";

/**
 * Professional Card Header
 */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 mb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

/**
 * Professional Card Title
 */
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  gradient?: boolean;
}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, children, gradient = false, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-semibold leading-none tracking-tight text-vm-text-bright",
        gradient && "vm-text-gradient",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = "CardTitle";

/**
 * Professional Card Description
 */
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-vm-text-secondary leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = "CardDescription";

/**
 * Professional Card Content
 */
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-vm-text-primary", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

/**
 * Professional Card Footer
 */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-4 mt-4 border-t border-vm-border/30", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = "CardFooter";

export {
  ProfessionalCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};