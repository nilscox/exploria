import z from 'zod';

import { createTool } from './create-tool';

export const setDiscussionPaths = createTool({
  description:
    "Propose à l'utilisateur plusieurs chemins possibles pour la suite de la discussion (approfondir, changer d'angle, passer à la suite, etc.)",
  param: z.object({
    paths: z
      .array(
        z.object({
          label: z.string().min(1).max(64).describe('Intitulé court du chemin'),
          description: z.string().max(128).optional().describe('Description optionnelle en une phrase'),
        }),
      )
      .min(2)
      .max(4),
  }),
  execute(session, { paths }) {
    session.setDiscussionPath(paths);

    return 'Chemins de discussion proposés.';
  },
});
