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
    <section className="sticky bottom-0 mx-auto w-full max-w-4xl px-2 pb-2 sm:px-4 sm:pb-8">
      <form
        onSubmit={handleSubmit}
        className="col bg-neutral items-stretch rounded-lg border shadow-xl has-focus-visible:outline"
      >
        <textarea
          ref={textAreaRef}
          rows={1}
          name="message"
          readOnly={loading}
          onKeyDown={handleKeyDown}
          aria-label={t`Message`}
          placeholder={t`Type a message...`}
          onInput={resizeTextArea}
          className="h-full resize-none p-4 outline-none"
        />

        <div className="row items-end px-4 pb-2">
          <div className="text-dim-40 text-xs max-sm:hidden">
            <Trans>Enter to send &bull; Shift+Enter for new line</Trans>
          </div>

          <div className="ml-auto self-end">
            <Button type="submit" size="small">
              <SendIcon className="size-4" />
              <Trans>Send</Trans>
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
