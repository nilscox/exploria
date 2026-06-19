import {
  Content,
  Icon,
  Item,
  ItemIndicator,
  ItemText,
  Portal,
  Root,
  ScrollDownButton,
  ScrollUpButton,
  Trigger,
  Value,
  Viewport,
  type SelectItemProps,
  type SelectProps,
} from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { fieldProps } from './field';

export function Select({
  ref,
  placeholder,
  renderValue,
  children,
  ...props
}: {
  ref?: React.Ref<HTMLButtonElement>;
  placeholder?: React.ReactNode;
  renderValue?: () => React.ReactNode;
  children: React.ReactNode;
} & SelectProps) {
  return (
    <Root {...props}>
      <Trigger
        ref={ref}
        className="group bg-neutral row h-10 w-full items-center justify-between gap-2 overflow-hidden rounded-md border px-4 text-start"
        {...fieldProps()}
      >
        <span className="truncate">
          <Value placeholder={placeholder}>{renderValue?.()}</Value>
        </span>
        <Icon>
          <ChevronDownIcon className="size-4 group-data-[state=open]:-scale-y-100" />
        </Icon>
      </Trigger>
      <Portal>
        <Content
          position="popper"
          sideOffset={8}
          className="bg-neutral max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) rounded-md shadow-md"
        >
          <ScrollUpButton className="row items-center justify-center py-1">
            <ChevronUpIcon className="size-4" />
          </ScrollUpButton>
          <Viewport>{children}</Viewport>
          <ScrollDownButton className="row items-center justify-center py-1">
            <ChevronDownIcon className="size-4" />
          </ScrollDownButton>
        </Content>
      </Portal>
    </Root>
  );
}

export function SelectItem({
  ref,
  children,
  ...props
}: { ref?: React.Ref<HTMLDivElement>; children: React.ReactNode } & SelectItemProps) {
  return (
    <Item
      ref={ref}
      className="row data-highlighted:bg-accent cursor-pointer items-center justify-between px-3 py-1 text-sm outline-none"
      {...props}
    >
      <ItemText>{children}</ItemText>
      <ItemIndicator>
        <CheckIcon className="size-4" />
      </ItemIndicator>
    </Item>
  );
}
