import { sub } from 'date-fns';
import assert, { AssertionError } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../adapters/clock.ts';
import { StubGenerator } from '../adapters/generator.ts';
import { Session, type Question, type SessionEvent } from './session.ts';

void describe('Session', () => {
  let generator: StubGenerator;
  let clock: StubClock;
  let session: Session;

  beforeEach(() => {
    generator = new StubGenerator();
    clock = new StubClock();
    session = new Session(generator, clock);
  });

  const expectEvent = <Type extends SessionEvent['type']>(
    type: Type,
    expected: Omit<Extract<SessionEvent, { type: Type }>, 'occurredAt' | 'aggregateType' | 'aggregateId' | 'type'>,
  ) => {
    const events = session.peekDomainEvents();

    const result = events.some((event) => {
      try {
        assert.strictEqual(event.type, type);
        assert.partialDeepStrictEqual(event, expected);
        return true;
      } catch {
        return false;
      }
    });

    assert(
      result,
      new AssertionError({
        message: 'Event not found',
        actual: events,
        expected,
      }),
    );
  };

  void it('changes the subject', () => {
    session.setSubject('Subject');

    assert.strictEqual(session.subject, 'Subject');

    expectEvent('SubjectChanged', { subject: 'Subject' });
  });

  void it('adds a top-level node', () => {
    session.addTopic({ label: 'Node' });

    const { id: topicId } = session.topics[0]!;

    assert.deepStrictEqual(session.topics, [{ id: topicId, parentId: null, label: 'Node', status: 'pending' }]);

    expectEvent('TopicAdded', { topic: { id: topicId, parentId: null, label: 'Node', status: 'pending' } });
  });

  void it('adds multiple nodes at once', () => {
    session.addTopics(['Node A', 'Node B']);

    const [nodeA, nodeB] = session.topics;

    assert.deepStrictEqual(session.topics, [
      { id: nodeA!.id, parentId: null, label: 'Node A', status: 'pending' },
      { id: nodeB!.id, parentId: null, label: 'Node B', status: 'pending' },
    ]);
  });

  void it('adds a nested node without a status', () => {
    const parentId = session.addTopic({ label: 'Parent' });
    const childId = session.addTopic({ label: 'Child', parentId });

    assert.deepStrictEqual(session.topics[1], { id: childId, parentId, label: 'Child' });

    expectEvent('TopicAdded', { topic: { id: childId, parentId, label: 'Child' } });
  });

  void it('fails to add a node under a missing parent', () => {
    assert.throws(() => session.addTopic({ label: 'Child', parentId: 'missing' }));
  });

  void it('derives the top-level nodes as the mind map topics', () => {
    const topicId = session.addTopic({ label: 'Topic' });
    session.addTopic({ label: 'Sub', parentId: topicId });

    assert.deepStrictEqual(
      session.mindmap.children(null).map((node) => node.id),
      [topicId],
    );
  });

  void it('removes a node', () => {
    const topicId = session.addTopic({ label: 'Node' });

    session.removeTopic(topicId);

    assert.deepStrictEqual(session.topics, []);

    expectEvent('TopicRemoved', { topicId });
  });

  void it('removes a node with its descendants and their notes', () => {
    const parentId = session.addTopic({ label: 'Parent' });
    const childId = session.addTopic({ label: 'Child', parentId });

    session.addNote({ title: 'note', content: 'note', parentId: childId });

    session.removeTopic(parentId);

    assert.deepStrictEqual(session.topics, []);
    assert.deepStrictEqual(session.notes, []);
  });

  void it("changes a node's label", () => {
    const topicId = session.addTopic({ label: 'Initial' });

    session.updateTopic(topicId, { label: 'Changed' });

    assert.strictEqual(session.topics[0]!.label, 'Changed');

    expectEvent('TopicLabelChanged', { topicId, label: 'Changed' });
  });

  void it("changes a node's status", () => {
    const topicId = session.addTopic({ label: 'Node' });

    session.updateTopic(topicId, { status: 'in_progress' });

    assert.strictEqual(session.topics[0]!.status, 'in_progress');

    expectEvent('TopicStatusChanged', { topicId, status: 'in_progress' });
  });

  void it('moves a node under another parent', () => {
    const topicId = session.addTopic({ label: 'Node' });
    const parentId = session.addTopic({ label: 'Parent' });

    session.moveTopic(topicId, parentId);

    assert.strictEqual(session.topics[0]!.parentId, parentId);

    expectEvent('TopicMoved', { topicId, parentId });
  });

  void it('fails to move a node into its own subtree', () => {
    const parentId = session.addTopic({ label: 'Parent' });
    const childId = session.addTopic({ label: 'Child', parentId });

    assert.throws(() => session.moveTopic(parentId, childId));
    assert.throws(() => session.moveTopic(parentId, parentId));
  });

  void it('fails to set a status on a nested node', () => {
    const parentId = session.addTopic({ label: 'Parent' });
    const childId = session.addTopic({ label: 'Child', parentId });

    assert.throws(() => session.updateTopic(childId, { status: 'in_progress' }));
  });

  void it('clears the status when a top-level node is nested', () => {
    const topicId = session.addTopic({ label: 'Node' });
    const parentId = session.addTopic({ label: 'Parent' });

    session.updateTopic(topicId, { status: 'in_progress' });
    session.moveTopic(topicId, parentId);

    assert.strictEqual(session.topics[0]!.status, undefined);
  });

  void it('restores a status when a nested node is promoted to top level', () => {
    const parentId = session.addTopic({ label: 'Parent' });
    const childId = session.addTopic({ label: 'Child', parentId });

    session.moveTopic(childId, null);

    assert.strictEqual(session.topics[1]!.status, 'pending');
  });

  void it("sets a topic's summary", () => {
    const topicId = session.addTopic({ label: 'Node' });

    session.updateTopic(topicId, { summary: 'A recap of the discussion.' });

    assert.strictEqual(session.topics[0]!.summary, 'A recap of the discussion.');

    expectEvent('TopicSummaryChanged', { topicId, summary: 'A recap of the discussion.' });
  });

  void it('adds a note attached to a node', () => {
    const topicId = session.addTopic({ label: 'Node' });

    session.addNote({ title: 'Title', content: 'content', parentId: topicId });

    const { id: noteId } = session.notes[0]!;

    assert.deepStrictEqual(session.notes, [{ id: noteId, parentId: topicId, title: 'Title', content: 'content' }]);

    expectEvent('NoteAdded', { note: { id: noteId, parentId: topicId, title: 'Title', content: 'content' } });
  });

  void it('adds a note attached to the root by default', () => {
    session.addNote({ title: 'Title', content: 'content' });

    assert.strictEqual(session.notes[0]!.parentId, null);
  });

  void it('removes a note', () => {
    session.addNote({ title: 'Title', content: 'content' });

    const { id: noteId } = session.notes[0]!;

    session.removeNote(noteId);

    assert.deepStrictEqual(session.notes, []);

    expectEvent('NoteRemoved', { noteId });
  });

  void it("changes a note's title and content", () => {
    session.addNote({ title: 'initial title', content: 'initial' });

    const { id: noteId } = session.notes[0]!;

    session.updateNote(noteId, { title: 'updated title', content: 'updated' });

    assert.strictEqual(session.notes[0]!.title, 'updated title');
    assert.strictEqual(session.notes[0]!.content, 'updated');

    expectEvent('NoteTitleChanged', { noteId, title: 'updated title' });
    expectEvent('NoteContentChanged', { noteId, content: 'updated' });
  });

  void it('moves a note to another node', () => {
    const topicId = session.addTopic({ label: 'Node' });

    session.addNote({ title: 'Title', content: 'content' });

    const { id: noteId } = session.notes[0]!;

    session.moveNote(noteId, topicId);

    assert.strictEqual(session.notes[0]!.parentId, topicId);

    expectEvent('NoteMoved', { noteId, parentId: topicId });
  });

  void it('starts and clears the timer', () => {
    session.startTimer(60);

    assert(session.timer);
    assert.strictEqual(session.timer.duration, 60);
    assert.deepStrictEqual(session.timer.startedAt, clock.date);

    expectEvent('TimerStarted', { duration: 60 });

    session.clearTimer();
    assert(session.timer === null);

    expectEvent('TimerCleared', {});
  });

  void it('fails to start the timer when there is one already', () => {
    let error: unknown;

    session.startTimer(60);

    try {
      session.startTimer(60);
    } catch (err) {
      error = err;
    }

    assert(error instanceof Error);
    assert.strictEqual(error.message, 'Un minuteur est déjà lancé');
  });

  void it('pauses and resumes the timer', () => {
    session.startTimer(60);

    clock.advance({ minutes: 5 });
    session.pauseTimer();

    assert(session.timer);
    assert.deepStrictEqual(session.timer.pausedAt, clock.date);

    expectEvent('TimerPaused', {});

    clock.advance({ minutes: 5 });
    session.resumeTimer();

    assert(session.timer);
    assert.deepEqual(session.timer.startedAt, sub(clock.date, { minutes: 5 }));
    assert.strictEqual(session.timer.pausedAt, undefined);

    expectEvent('TimerResumed', {});
  });

  void it('changes the model', () => {
    session.setModel('gpt-4o');

    assert.strictEqual(session.model, 'gpt-4o');

    expectEvent('ModelChanged', { model: 'gpt-4o' });
  });

  void it('asks questions', () => {
    session.askQuestions([{ content: 'Which one?', options: [{ label: 'Option A', description: 'A description' }] }]);

    const question = session.questions[0]!;
    const option = question.options[0]!;

    const expected: Question = {
      id: question.id,
      content: 'Which one?',
      options: [{ id: option.id, label: 'Option A', description: 'A description' }],
    };

    assert.deepStrictEqual(session.questions, [expected]);

    expectEvent('QuestionsAsked', { questions: [expected] });
  });

  void it('selects an answer', () => {
    session.askQuestions([{ content: 'Which one?', options: [{ label: 'Option A', description: 'A description' }] }]);

    const question = session.questions[0]!;
    const option = question.options[0]!;

    session.selectAnswer(question.id, option.id);

    assert.deepStrictEqual(session.questions, []);

    expectEvent('AnswerSelected', {
      questionId: question.id,
      optionId: option.id,
      content: 'Which one?',
      label: 'Option A',
    });
  });

  void it('defaults to automatic mode and the socratic posture', () => {
    assert.strictEqual(session.postureMode, 'auto');
    assert.strictEqual(session.posture, 'socratic');
  });

  void it('changes the posture from the assistant without leaving automatic mode', () => {
    session.setPosture('mirror', 'You seem overwhelmed', false);

    assert.strictEqual(session.posture, 'mirror');
    assert.strictEqual(session.postureMode, 'auto');

    expectEvent('PostureChanged', { posture: 'mirror', reason: 'You seem overwhelmed', forced: false });
  });

  void it('forces a posture from the user', () => {
    session.setPosture('examiner', '', true);

    assert.strictEqual(session.posture, 'examiner');
    assert.strictEqual(session.postureMode, 'forced');

    expectEvent('PostureChanged', { posture: 'examiner', reason: '', forced: true });
  });

  void it('returns to automatic mode while keeping the active posture', () => {
    session.setPosture('examiner', '', true);
    session.setPosture('auto', '', true);

    assert.strictEqual(session.postureMode, 'auto');
    assert.strictEqual(session.posture, 'examiner');
  });

  void it('adds a message', () => {
    session.addMessage('user', 'content');

    expectEvent('MessageAdded', {
      message: { date: clock.date.toISOString(), role: 'user', content: 'content' },
    });
  });

  void it('adds an assistant message', () => {
    session.addMessage('assistant', 'content', { model: 'model', toolCalls: [] });

    expectEvent('MessageAdded', {
      message: { date: clock.date.toISOString(), role: 'assistant', content: 'content', model: 'model' },
    });
  });

  void it('fails to add a message when the session has ended', () => {
    session.end();
    assert.throws(() => session.addMessage('user', ''));
  });

  void it('fails to add an assistant message without params', () => {
    assert.throws(() => {
      // @ts-expect-error
      session.addMessage('assistant', '');
    });
  });

  void it('adds a summary', () => {
    const summary = {
      summary: 'A good session.',
      keyPoints: ['Key idea'],
      biases: [],
      blindSpots: [],
      tensions: [],
      openQuestions: [],
      conclusion: null,
    };

    session.addSummary(summary);

    expectEvent('SummaryGenerated', { summary });
  });

  void it('ends an reopens a session', () => {
    session.end();

    assert.strictEqual(session.ended, true);
    expectEvent('SessionEnded', {});
    assert.throws(() => session.end());

    session.reopen();

    assert.strictEqual(session.ended, false);
    expectEvent('SessionReopened', {});
    assert.throws(() => session.reopen());
  });

  void describe('replay', () => {
    void it('reconstructs model and subject from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.setModel('gpt-4o');
      source.setSubject('My subject');

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.id, source.id);
      assert.strictEqual(replayed.model, 'gpt-4o');
      assert.strictEqual(replayed.subject, 'My subject');
    });

    void it('reconstructs mind map nodes from events', () => {
      const source = new Session(new StubGenerator(), clock);
      const topicAId = source.addTopic({ label: 'Node A' });
      const topicBId = source.addTopic({ label: 'Node B' });
      const childId = source.addTopic({ label: 'Child', parentId: topicAId });

      source.updateTopic(topicAId, { status: 'in_progress' });
      source.updateTopic(topicBId, { label: 'Node B updated' });
      source.moveTopic(childId, topicBId);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.topics, source.topics);
    });

    void it('reconstructs notes from events', () => {
      const source = new Session(new StubGenerator(), clock);
      const topicId = source.addTopic({ label: 'Node' });
      source.addNote({ title: 'Note A', content: 'Note A body', parentId: topicId });
      source.addNote({ title: 'Note B', content: 'Note B body' });

      const noteAId = source.notes[0]!.id;
      const noteBId = source.notes[1]!.id;

      source.updateNote(noteAId, { title: 'Note A renamed', content: 'Note A updated' });
      source.moveNote(noteAId, null);
      source.removeNote(noteBId);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.notes, source.notes);
    });

    void it('reconstructs timer from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.startTimer(60);
      clock.advance({ minutes: 5 });
      source.pauseTimer();
      clock.advance({ minutes: 2 });
      source.resumeTimer();

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.timer, source.timer);
    });

    void it('reconstructs timer cleared', () => {
      const source = new Session(new StubGenerator(), clock);
      source.startTimer(60);
      source.clearTimer();

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.timer, null);
    });

    void it('reconstructs questions from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.askQuestions([
        {
          content: 'Which one?',
          options: [
            { label: 'Option A', description: 'a' },
            { label: 'Option B', description: 'b' },
          ],
        },
      ]);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.questions, source.questions);
    });

    void it('clears questions after an answer is selected', () => {
      const source = new Session(new StubGenerator(), clock);
      source.askQuestions([{ content: 'Which one?', options: [{ label: 'Option A', description: 'a' }] }]);

      const question = source.questions[0]!;
      const option = question.options[0]!;

      source.selectAnswer(question.id, option.id);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.questions, []);
    });

    void it('reconstructs posture and mode from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.setPosture('devils_advocate', 'reason', false);
      source.setPosture('mirror', '', true);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.posture, source.posture);
      assert.strictEqual(replayed.postureMode, source.postureMode);
    });

    void it('populates session.events with replayed events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.addMessage('user', 'hello');
      source.addMessage('assistant', 'world', { model: 'gpt-4o', toolCalls: [] });

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.events.length, 2);
      assert.strictEqual(replayed.events[0]?.type, 'MessageAdded');
      assert.strictEqual(replayed.events[1]?.type, 'MessageAdded');
    });
  });
});
