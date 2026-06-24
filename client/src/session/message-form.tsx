import { Trans, useLingui } from '@lingui/react/macro';
import { SendIcon } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from 'src/components/button';

export function MessageForm({
  textAreaRef,
  loading,
  postMessage,
}: {
  textAreaRef: React.Ref<HTMLTextAreaElement>;
  loading?: boolean;
  postMessage: (message: string) => void;
}) {
  const { t } = useLingui();

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const message = data.get('message') as string;

      postMessage(message);
      event.currentTarget.reset();
    },
    [postMessage],
  );

  const handleKeyDown = useCallback<React.KeyboardEventHandler<HTMLTextAreaElement>>((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }, []);

  return (
    <section className="mx-auto w-full max-w-4xl p-4">
      <form onSubmit={handleSubmit} className="row items-stretch gap-4">
        <textarea
          ref={textAreaRef}
          rows={1}
          name="message"
          readOnly={loading}
          onKeyDown={handleKeyDown}
          aria-label={t`Message`}
          placeholder={t`Type a message...`}
          onInput={({ currentTarget: ref }) => {
            ref.style.height = 'auto';
            ref.style.height = ref.scrollHeight + 1 + 'px';
          }}
          className="read-only:text-dim bg-neutral block w-full rounded-md border p-2"
        />
        <Button type="submit">
          <SendIcon className="size-4" />
        </Button>
      </form>

      <span className="text-dim text-xs">
        <Trans>Enter to send &bull; Shift+Enter for new line</Trans>
      </span>
    </section>
  );
}
