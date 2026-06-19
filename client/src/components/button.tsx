import { cva, type VariantProps } from 'class-variance-authority';

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof variants>) {
  return <button type="button" className={variants({ variant, size, className })} {...props} />;
}

const variants = cva('font-medium border rounded-md transition-colors row gap-2 items-center justify-center', {
  variants: {
    variant: {
      solid: 'bg-accent border-transparent',
      outlined: 'border-border',
      ghost: 'border-transparent hover:bg-accent',
    },
    size: {
      large: 'px-4 py-2',
      medium: 'px-3 py-1 text-sm',
      small: 'px-2 py-0.5 text-xs',
    },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'medium',
  },
});
