import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { api } from './api';

export function Home() {
  const navigate = useNavigate();

  const createSessionMutation = useMutation({
    mutationFn: (_message: string) => api.sessions.create(),
    async onSuccess(sessionId, message) {
      await navigate(`/session/${sessionId}`, { state: { message } });
    },
  });

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>((event) => {
    event.preventDefault();

    const data = new FormData(event.target);
    const message = data.get('message') as string;

    createSessionMutation.mutate(message);
  }, []);

  const handleKeyDown = useCallback<React.KeyboardEventHandler<HTMLTextAreaElement>>((event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.currentTarget.form?.requestSubmit();
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 col h-full py-4 justify-center gap-16">
      <header className="text-center">
        <h1 className="my-4 text-4xl font-medium">Exploria</h1>
        <div className="text-dim">L'IA au service de la réflexion.</div>
      </header>

      <form onSubmit={handleSubmit}>
        <textarea
          name="message"
          rows={6}
          placeholder="Quel sujet souhaitez-vous aborder ?"
          readOnly={createSessionMutation.isPending}
          onKeyDown={handleKeyDown}
          aria-label="Message"
          className="border rounded-md block w-full p-2 bg-zinc-800 read-only:text-dim"
        />
      </form>
    </div>
  );
}
