import type { Shared } from '@exploria/server/shared';
import clsx from 'clsx';

import { Markdown } from 'src/components/markdown';
import { debug } from 'src/debug-context';
import { Details } from 'src/details';

type SessionEvent = Shared.SessionEvent;
type GetSessionEvent<Type extends SessionEvent['type']> = Extract<SessionEvent, { type: Type }>;

export function Events({ events }: { events: SessionEvent[] }) {
  return events.map((event, index) => {
    const Component = eventMap[event.type] as React.ComponentType<{ event: SessionEvent }>;
    return <Component key={index} event={event} />;
  });
}

const eventMap: { [Event in SessionEvent as Event['type']]: React.ComponentType<{ event: Event }> } = {
  ModelChanged: () => null,
  PlanInitialized: () => null,
  SubjectChanged: () => null,
  TopicAdded: TopicAddedEvent,
  TopicRemoved: () => null,
  TopicLabelChanged: () => null,
  TopicStatusChanged: () => null,
  NoteAdded: () => null,
  NoteRemoved: () => null,
  NoteContentChanged: () => null,
  TimerStarted: TimerStartedEvent,
  TimerCleared: TimerClearedEvent,
  TimerPaused: TimerPausedEvent,
  TimerResumed: TimerResumedEvent,
  MessageAdded: MessageAddedEvent,
  ToolCallResultAdded: () => null,
  DiscussionPathsSet: () => null, // handled before eventMap in Events
  DiscussionPathSelected: () => null,
};

function TopicAddedEvent({ event }: { event: GetSessionEvent<'TopicAdded'> }) {
  return <div className="text-dim text-sm">Sujet ajouté : {event.topic.label}</div>;
}

function TimerStartedEvent({ event }: { event: GetSessionEvent<'TimerStarted'> }) {
  return <div className="text-dim text-sm">Chronomètre démarré : {event.duration} minutes</div>;
}

function TimerClearedEvent() {
  return <div className="text-dim text-sm">Chronomètre annulé</div>;
}

function TimerPausedEvent() {
  return <div className="text-dim text-sm">Chronomètre mis en pause</div>;
}

function TimerResumedEvent() {
  return <div className="text-dim text-sm">Chronomètre redémarré</div>;
}

function MessageAddedEvent({ event }: { event: GetSessionEvent<'MessageAdded'> }) {
  const { message } = event;

  if (message.role === 'system') {
    if (!debug()) {
      return null;
    }

    return (
      <Details className="text-dim text-sm" summary="System prompt">
        <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </Details>
    );
  }

  return (
    <>
      {event.message.content !== '' && (
        <Markdown
          markdown={event.message.content}
          className={clsx(message.role === 'user' && 'bg-accent px-4 py-2 rounded-md')}
        />
      )}

      {message.role === 'assistant' && debug() && <ToolCalls toolCalls={message.toolCalls} />}
    </>
  );
}

function ToolCalls({ toolCalls }: { toolCalls?: Shared.ToolCall[] }) {
  return toolCalls?.map((toolCall) => (
    <Details key={toolCall.id} className="text-dim text-sm" summary={`Tool call ${toolCall.name} (${toolCall.id})`}>
      <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
        {JSON.stringify(toolCall.arguments, null, 2)}
      </div>

      {/* {Boolean(toolCall.result) && (
        <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
          {JSON.stringify(toolCall.result, null, 2)}
        </div>
      )}

      {Boolean(toolCall.error) && (
        <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
          {JSON.stringify(toolCall.error, null, 2)}
        </div>
      )} */}
    </Details>
  ));
}
