import { Dialog as D } from '@base-ui/react/dialog';
import clsx from 'clsx';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  container,
  className,
  children,
}: {
  container?: HTMLElement | null;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <D.Portal container={container ?? document.getElementById('root')}>
      <D.Backdrop className="fixed inset-0 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <D.Viewport className="fixed inset-0 grid scrollbar-thin place-items-center overflow-y-auto p-4">
        <D.Popup
          className={clsx(
            className,
            'col w-full rounded-lg bg-neutral p-6 shadow-lg transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0',
          )}
        >
          {children}
        </D.Popup>
      </D.Viewport>
    </D.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return <header className={clsx(className, 'text-lg font-semibold')} {...props} />;
}

export function DialogActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={clsx(className, 'row justify-end gap-2')} {...props} />;
}
