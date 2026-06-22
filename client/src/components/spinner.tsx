import clsx from 'clsx';
import { Loader2Icon } from 'lucide-react';

export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return <Loader2Icon className={clsx(className, 'animate-spin')} {...props} />;
}
