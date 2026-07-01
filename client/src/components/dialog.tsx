import { Dialog as D } from '@base-ui/react/dialog';
import clsx from 'clsx';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <D.Portal container={document.getElementById('root')}>
      <D.Backdrop className="fixed inset-0 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <D.Viewport className="fixed inset-0 grid scrollbar-thin place-items-center overflow-y-auto p-4">
        <D.Popup
          className={clsx(
            className,
            'col w-full rounded-lg bg-neutral shadow-lg max-h-full overflow-y-auto transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0',
          )}
        >
          {children}
        </D.Popup>
      </D.Viewport>
    </D.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return <header className={clsx(className, 'text-lg p-4 font-semibold border-b')} {...props} />;
}

export function DialogActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={clsx(className, 'row justify-end gap-2 border-t p-4 flex-wrap')} {...props} />;
}
