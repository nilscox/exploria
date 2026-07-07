import { Trans, useLingui } from '@lingui/react/macro';
import clsx from 'clsx';
import { ArrowDownIcon, Maximize2Icon, Minimize2Icon, SendIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from 'src/components/button';

export function MessageForm({
  loading,
  postMessage,
  scrollToEnd,
}: {
  loading?: boolean;
  postMessage: (message: string) => void;
  scrollToEnd?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
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
    <section
      className={clsx(
        expanded && 'fixed inset-0 m-2',
        !expanded && 'sticky bottom-0 mx-auto max-h-4/5 w-full max-w-4xl px-2 pb-2 sm:px-4 sm:pb-8',
      )}
    >
      <div className={clsx('transition-opacity row relative -top-12 h-0 justify-end', !scrollToEnd && 'opacity-0')}>
        <Button variant="outlined" size="icon" className="bg-neutral rounded-full!" onClick={scrollToEnd}>
          <ArrowDownIcon className="size-5" />
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="col bg-neutral h-full items-stretch rounded-lg border shadow-xl has-focus-visible:outline"
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
          className="grow resize-none scrollbar-thin overflow-y-auto p-4 outline-none"
        />

        <div className="row items-end px-4 pb-2">
          <div className="text-dim-40 text-xs max-sm:hidden">
            <Trans>Enter to send &bull; Shift+Enter for new line</Trans>
          </div>

          <div className="row ms-auto items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} className="h-8!">
              {expanded ? <Minimize2Icon className="size-4" /> : <Maximize2Icon className="size-4" />}
            </Button>

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
