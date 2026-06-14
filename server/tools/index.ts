import { addTopic } from './add-topic';
import { getSavedNotes } from './get-saved-notes';
import { initPlan } from './init-plan';
import { saveNote } from './save-note';
import { updateTopic } from './update-topic';

export const tools = [initPlan, addTopic, updateTopic, saveNote, getSavedNotes];
