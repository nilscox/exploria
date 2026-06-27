import clsx from 'clsx';

export function SidebarSection({
  variant = 'ghost',
  title,
  children,
}: {
  variant?: 'solid' | 'ghost';
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx(variant === 'solid' && 'bg-neutral rounded-md border p-4')}>
      {title && (
        <h2 className={clsx('text-dim-50 text-xs font-medium uppercase', variant === 'ghost' && 'mb-2')}>{title}</h2>
      )}
      {children}
    </section>
  );
}
