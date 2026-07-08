import { Trans, useLingui } from '@lingui/react/macro';
import clsx from 'clsx';
import { Maximize2Icon, Minimize2Icon, SendIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from 'src/components/button';
import { useMediaQuery } from 'src/hooks/use-media-query';

export function MessageForm({ loading, postMessage }: { loading?: boolean; postMessage: (message: string) => void }) {
  const isMobile = useMediaQuery('(width < 40rem)');
  const [expanded, setExpanded] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useLingui();

  const resizeTextArea = useCallback(() => {
    const ref = textAreaRef.current;

    if (ref) {
      ref.style.height = 'auto';

      if (!expanded) {
        ref.style.height = ref.scrollHeight + 1 + 'px';
      }
    }
  }, [expanded]);

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const message = data.get('message') as string;

      postMessage(message);
      event.currentTarget.reset();
      resizeTextArea();
    },
    [postMessage, resizeTextArea],
  );

  const handleKeyDown = useCallback<React.KeyboardEventHandler<HTMLTextAreaElement>>(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !isMobile) {
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }
    },
    [isMobile],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        'bg-neutral col overflow-hidden rounded-xl border shadow-xl has-focus-within:outline',
        !expanded && 'max-h-[30dvh]',
        expanded && 'h-[calc(100dvh-8rem)]',
      )}
    >
      <textarea
        ref={textAreaRef}
        rows={1}
        name="message"
        readOnly={loading}
        onInput={resizeTextArea}
        onKeyDown={handleKeyDown}
        aria-label={t`Message`}
        placeholder={t`Type a message...`}
        className="block w-full grow resize-none scrollbar-thin overflow-y-auto px-4 pt-4 outline-none"
      />

      <div className="row items-end px-4 py-2">
        <div className="text-dim-40 text-xs max-sm:hidden">
          <Trans>Enter to send &bull; Shift+Enter for new line</Trans>
        </div>

        <div className="row pointer-events-auto ms-auto items-center gap-2">
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
  );
}
