import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'border-signal/50 bg-signal/15 text-signal hover:bg-signal/25',
  secondary: 'border-line-strong bg-ink-800 text-fg hover:bg-ink-700',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-ink-800 hover:text-fg',
  danger: 'border-sev-critical/50 bg-sev-critical/10 text-sev-critical hover:bg-sev-critical/20',
};

const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
