import { cva } from 'class-variance-authority';

export function ResizeHandle({
  axis,
  resizing,
  className,
  ...props
}: {
  axis: 'horizontal' | 'vertical';
  resizing: boolean;
} & React.ComponentProps<'div'>) {
  return <div {...props} className={variants({ axis, resizing, className })} />;
}

const variants = cva('rounded-lg bg-border hover:bg-primary/60 transition-colors ', {
  variants: {
    axis: {
      horizontal: 'h-10 w-2 cursor-col-resize',
      vertical: 'h-2 w-10 cursor-row-resize',
    },
    resizing: {
      true: 'bg-primary/60',
      false: '',
    },
  },
});
