import clsx from 'clsx';

export function SidebarSection({
  variant = 'ghost',
  title,
  titleEnd,
  children,
}: {
  variant?: 'solid' | 'ghost';
  title?: React.ReactNode;
  titleEnd?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx(variant === 'solid' && 'bg-neutral rounded-md border p-4')}>
      {title && (
        <header className="row items-center justify-between gap-2">
          <h2 className={clsx('text-dim-50 text-xs font-medium uppercase', variant === 'ghost' && 'mb-2')}>{title}</h2>
          {titleEnd}
        </header>
      )}
      {children}
    </section>
  );
}
