import { Switch as S } from '@base-ui/react/switch';
import { cva } from 'class-variance-authority';

import { fieldProps } from './field';

export function Switch({
  size = 'medium',
  ...props
}: { size?: 'small' | 'medium' } & React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root {...fieldProps()} className={rootVariants({ size })} {...props}>
      <S.Thumb className={thumbVariants({ size })} />
    </S.Root>
  );
}

const rootVariants = cva(
  [
    'bg-foreground/20 data-checked:bg-primary relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        small: 'h-4 w-7',
        medium: 'h-5 w-9',
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  },
);

const thumbVariants = cva('block translate-x-0 rounded-full bg-white shadow-sm transition-transform', {
  variants: {
    size: {
      small: 'size-3 data-checked:translate-x-3',
      medium: 'size-4 data-checked:translate-x-4',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});
