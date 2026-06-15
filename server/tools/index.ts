import { addTopic } from './add-topic';
import { getRemainingTime } from './get-remaining-time';
import { getSavedNotes } from './get-saved-notes';
import { initPlan } from './init-plan';
import { pauseTimer } from './pause-timer';
import { resumeTimer } from './resume-timer';
import { saveNote } from './save-note';
import { startTimer } from './start-timer';
import { updateTopic } from './update-topic';

export const tools = {
  initPlan,
  addTopic,
  updateTopic,
  saveNote,
  getSavedNotes,
  startTimer,
  pauseTimer,
  resumeTimer,
  getRemainingTime,
};
