import { cva, type VariantProps } from 'class-variance-authority';
import { Link } from 'react-router';

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof variants>) {
  return <button type="button" className={variants({ variant, size, className })} {...props} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof variants>) {
  return <Link className={variants({ variant, size, className })} {...props} />;
}

const variants = cva(
  'font-medium border rounded-md transition-colors text-sm row gap-2 items-center justify-center whitespace-nowrap',
  {
    variants: {
      variant: {
        solid: 'bg-accent text-accent-foreground hover:bg-accent/75 border-transparent',
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
