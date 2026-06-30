export function Details({
  summary,
  children,
  className,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={className}>
      <summary className="max-w-fit cursor-pointer">{summary}</summary>
      {children}
    </details>
  );
}
