import { Indicator, Root } from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';

import { fieldProps, labelProps } from './field';

export function Checkbox({ label, ...props }: { label?: React.ReactNode } & React.ComponentProps<typeof Root>) {
  return (
    <div className="row items-center gap-2">
      <Root
        className="bg-neutral data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground inline-block size-5 rounded-sm border"
        {...fieldProps()}
        {...props}
      >
        <Indicator className="inline-block">
          <CheckIcon className="size-4" />
        </Indicator>
      </Root>

      {label && <label {...labelProps()}>{label}</label>}
    </div>
  );
}
