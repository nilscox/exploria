import clsx from 'clsx';

import { fieldProps } from './field';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={clsx(className, 'bg-neutral w-full min-w-0 rounded-md border px-2 py-1')}
      {...fieldProps()}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={clsx(className, 'bg-neutral w-full min-w-0 rounded-md border px-2 py-1')}
      {...fieldProps()}
      {...props}
    />
  );
}
