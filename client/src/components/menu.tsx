import { Menu as M } from '@base-ui/react/menu';
import clsx from 'clsx';
import { CheckIcon } from 'lucide-react';

export function Menu({
  trigger,
  className,
  children,
}: {
  trigger: React.ReactElement;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <M.Root>
      <M.Trigger render={trigger} />
      <M.Portal container={document.getElementById('root')}>
        <M.Positioner sideOffset={8} align="end">
          <M.Popup
            className={clsx(
              className,
              'bg-neutral z-50 min-w-40 overflow-hidden rounded-md border shadow-xl transition-opacity outline-none data-ending-style:opacity-0 data-starting-style:opacity-0',
            )}
          >
            {children}
          </M.Popup>
        </M.Positioner>
      </M.Portal>
    </M.Root>
  );
}

export function MenuItem({
  icon: Icon,
  onClick,
  className,
  children,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <M.Item
      onClick={onClick}
      className={clsx(
        className,
        'row data-highlighted:bg-accent cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none',
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {children}
    </M.Item>
  );
}

export function CheckboxMenuItem({
  icon: Icon,
  closeOnClick,
  className,
  children,
  ...props
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  closeOnClick?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <M.CheckboxItem
      closeOnClick={closeOnClick}
      className={clsx(
        className,
        'row data-highlighted:bg-accent cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none ',
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" />}

      {children}

      <M.CheckboxItemIndicator className="ms-auto">
        <CheckIcon className="size-4" />
      </M.CheckboxItemIndicator>
    </M.CheckboxItem>
  );
}

export function MenuSeparator() {
  return <M.Separator className="border-t" />;
}
