import { type Language, type Translate, createTranslate, languages } from '../i18n';
import { addTopics } from './add-topics';
import { clearTimer } from './clear-tmer';
import { getRemainingTime } from './get-remaining-time';
import { getSavedNotes } from './get-saved-notes';
import { pauseTimer } from './pause-timer';
import { resumeTimer } from './resume-timer';
import { saveNote } from './save-note';
import { setDiscussionPaths } from './set-discussion-paths';
import { setPosture } from './set-posture';
import { setSubject } from './set-subject';
import { startTimer } from './start-timer';
import { updateTopic } from './update-topic';

import type { Entries } from '../../utils';
import type { Tool } from './create-tool';

const builders = {
  setSubject,
  addTopics,
  updateTopic,
  saveNote,
  getSavedNotes,
  startTimer,
  clearTimer,
  pauseTimer,
  resumeTimer,
  getRemainingTime,
  setDiscussionPaths,
  setPosture,
};

type Tools = { [Entry in Entries<typeof builders> as Entry[0]]: Tool<ToolParam<Entry[1]>> };
type ToolParam<T extends (t: Translate) => Tool<any>> = ReturnType<T> extends Tool<infer P> ? P : never;

export const tools = Object.fromEntries(
  languages.map((lang) => [
    lang,
    Object.entries(builders).reduce(
      (acc, [name, builder]) => ({ ...acc, [name]: builder(createTranslate(lang)) }),
      {} as Tools,
    ),
  ]),
) as Record<Language, Tools>;
