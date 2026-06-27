import { Trans, useLingui } from '@lingui/react/macro';
import { SendIcon } from 'lucide-react';
import { useCallback, useRef } from 'react';

import { Button } from 'src/components/button';

export function MessageForm({ loading, postMessage }: { loading?: boolean; postMessage: (message: string) => void }) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useLingui();

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const message = data.get('message') as string;

      postMessage(message);
      event.currentTarget.reset();
      resizeTextArea();
    },
    [postMessage],
  );

  const handleKeyDown = useCallback<React.KeyboardEventHandler<HTMLTextAreaElement>>((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }, []);

  const resizeTextArea = () => {
    const ref = textAreaRef.current;

    if (ref) {
      ref.style.height = 'auto';
      ref.style.height = ref.scrollHeight + 1 + 'px';
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl p-4">
      <form onSubmit={handleSubmit} className="row items-end gap-4">
        <textarea
          ref={textAreaRef}
          rows={1}
          name="message"
          readOnly={loading}
          onKeyDown={handleKeyDown}
          aria-label={t`Message`}
          placeholder={t`Type a message...`}
          onInput={resizeTextArea}
          className="read-only:text-dim bg-neutral block w-full resize-none rounded-md border p-2"
        />
        <Button type="submit" size="icon" className="size-auto p-2">
          <SendIcon className="size-6" />
        </Button>
      </form>

      <span className="text-dim text-xs">
        <Trans>Enter to send &bull; Shift+Enter for new line</Trans>
      </span>
    </section>
  );
}
