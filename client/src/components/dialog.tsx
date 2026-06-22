import clsx from 'clsx';

export function Dialog({
  classes,
  children,
  ...props
}: { classes: Partial<Record<'root' | 'content', string>> } & React.ComponentProps<'dialog'>) {
  return (
    <dialog
      id="settings-dialog"
      className={clsx(classes.root, 'backdrop:bg-inverted/10 backdrop:grayscale-100 backdrop:backdrop-blur-xs')}
      {...props}
    >
      <div
        className={clsx(
          classes.content,
          'bg-background fixed top-1/3 left-1/2 mx-auto w-full -translate-x-1/2 -translate-y-1/2 rounded-md p-4 shadow-md',
        )}
      >
        {children}
      </div>
    </dialog>
  );
}
