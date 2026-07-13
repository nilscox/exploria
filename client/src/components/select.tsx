import { Select as S } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';

import { fieldProps } from './field';

export function Select<Value = string>({
  ref,
  placeholder,
  renderValue,
  children,
  ...props
}: {
  ref?: React.Ref<HTMLButtonElement>;
  container?: HTMLElement | null;
  placeholder?: React.ReactNode;
  renderValue?: (value: Value) => React.ReactNode;
  children: React.ReactNode;
} & S.Root.Props<Value>) {
  return (
    <S.Root {...props}>
      <S.Trigger
        ref={ref}
        className="bg-neutral row h-10 w-full items-center justify-between gap-2 overflow-hidden rounded-md border px-4 text-start"
        {...fieldProps()}
      >
        <span className="truncate">
          <S.Value placeholder={placeholder}>{renderValue}</S.Value>
        </span>
        <S.Icon className="data-popup-open:-scale-y-100">
          <ChevronDownIcon className="size-4" />
        </S.Icon>
      </S.Trigger>

      <S.Portal container={document.getElementById('root')}>
        <S.Positioner alignItemWithTrigger={false} sideOffset={8} className="w-(--anchor-width)">
          <S.Popup className="bg-neutral ring-border max-h-(--available-height) overflow-hidden rounded-md border shadow-xl outline-none">
            <S.List className="max-h-(--available-height) scrollbar-thin overflow-y-auto">{children}</S.List>
          </S.Popup>
        </S.Positioner>
      </S.Portal>
    </S.Root>
  );
}

export function SelectItem({
  ref,
  children,
  ...props
}: { ref?: React.Ref<HTMLDivElement>; children: React.ReactNode } & S.Item.Props) {
  return (
    <S.Item
      ref={ref}
      className="row data-highlighted:bg-accent cursor-pointer items-center justify-between px-3 py-2 text-sm outline-none"
      {...props}
    >
      <S.ItemText>{children}</S.ItemText>
      <S.ItemIndicator>
        <CheckIcon className="size-4" />
      </S.ItemIndicator>
    </S.Item>
  );
}

export function SelectItems({ items }: { items: Record<string, React.ReactNode> }) {
  return Object.entries(items).map(([key, value]) => (
    <SelectItem key={key} value={key}>
      {value}
    </SelectItem>
  ));
}
