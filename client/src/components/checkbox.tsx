import { Checkbox as C } from '@base-ui/react/checkbox';
import { CheckIcon } from 'lucide-react';

import { fieldProps } from './field';

export function Checkbox(props: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className="bg-neutral data-checked:bg-accent data-checked:text-accent-foreground inline-flex size-5 items-center justify-center rounded-sm border"
      {...fieldProps()}
      {...props}
    >
      <C.Indicator>
        <CheckIcon className="size-4 stroke-2" />
      </C.Indicator>
    </C.Root>
  );
}
