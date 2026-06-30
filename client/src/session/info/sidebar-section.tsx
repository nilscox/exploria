import clsx from 'clsx';

export function SidebarSection({
  variant = 'ghost',
  Icon,
  title,
  titleEnd,
  children,
}: {
  variant?: 'solid' | 'ghost';
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title?: React.ReactNode;
  titleEnd?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx(variant === 'solid' && 'bg-neutral rounded-md border p-4')}>
      {title && (
        <header className="row items-center justify-between gap-2">
          <h2
            className={clsx(
              'row gap-1 items-center leading-none text-dim-50 text-xs font-medium uppercase',
              variant === 'ghost' && 'mb-2',
            )}
          >
            <Icon className="size-3.5" />
            {title}
          </h2>
          {titleEnd}
        </header>
      )}
      {children}
    </section>
  );
}
