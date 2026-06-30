import { Trans, useLingui } from '@lingui/react/macro';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowDownIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { options } from 'src/api';

export function SessionsList() {
  const { i18n } = useLingui();
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.locale), [i18n.locale]);

  const { data, isSuccess, hasNextPage, fetchNextPage } = useInfiniteQuery(options.sessions.list());

  if (!isSuccess || data.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-dim my-4 text-sm font-medium uppercase">
        <Trans>Previous sessions</Trans>
      </h2>

      <ul className="col gap-2">
        {data.map((session) => (
          <li key={session.id}>
            <Link
              to={`/session/${session.id}`}
              className="hover:bg-accent/50 col block gap-1 rounded-md border p-2 transition-colors"
            >
              <div>{session.subject || <Trans>Sujet à définir</Trans>}</div>
              <div className="text-dim text-xs">{dateFormatter.format(new Date(session.date))}</div>
            </Link>
          </li>
        ))}
      </ul>

      {hasNextPage && (
        <button type="button" className="text-dim row mt-1 items-center gap-1 text-xs" onClick={() => fetchNextPage()}>
          <Trans>More</Trans>
          <ArrowDownIcon className="size-3 shrink-0" />
        </button>
      )}
    </section>
  );
}
