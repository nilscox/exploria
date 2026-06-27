import { cva, type VariantProps } from 'class-variance-authority';
import { Link } from 'react-router';

import { Spinner } from './spinner';

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <button type="button" className={buttonVariants({ variant, size, className })} {...props}>
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link className={buttonVariants({ variant, size, className })} {...props} />;
}

export const buttonVariants = cva(
  'font-medium border rounded-md transition-colors text-sm row gap-2 items-center justify-center whitespace-nowrap focus-visible:outline-offset-2',
  {
    variants: {
      variant: {
        solid: 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent',
        secondary: 'bg-accent text-accent-foreground hover:bg-accent/90 border-transparent',
        outlined: 'border-border hover:bg-accent/25',
        ghost: 'border-transparent hover:bg-accent',
      },
      size: {
        medium: 'h-9 px-4',
        small: 'h-8 rounded-md gap-1.5 px-3',
        large: 'h-10 rounded-md px-6',
        icon: 'size-9 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'solid',
      size: 'medium',
    },
  },
);
