import { addTopic } from './add-topic';
import { clearTimer } from './clear-tmer';
import { getRemainingTime } from './get-remaining-time';
import { getSavedNotes } from './get-saved-notes';
import { initPlan } from './init-plan';
import { pauseTimer } from './pause-timer';
import { resumeTimer } from './resume-timer';
import { saveNote } from './save-note';
import { setDiscussionPaths } from './set-discussion-paths';
import { setSubject } from './set-subject';
import { startTimer } from './start-timer';
import { updateTopic } from './update-topic';

export const tools = {
  initPlan,
  setSubject,
  addTopic,
  updateTopic,
  saveNote,
  getSavedNotes,
  startTimer,
  clearTimer,
  pauseTimer,
  resumeTimer,
  getRemainingTime,
  setDiscussionPaths,
};
