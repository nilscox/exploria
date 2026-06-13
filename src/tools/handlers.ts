import { Plan, Topic } from '../types';

export function handleToolCall(name: string, args: unknown, plan: Plan): { result: string; plan: Plan } {
  switch (name) {
    case 'init_plan': {
      const { topics } = args as { topics: Topic[] };
      const newPlan = { topics };
      return { result: 'Plan initialisé', plan: newPlan };
    }

    case 'update_topic': {
      const { id, status } = args as { id: string; status: Topic['status'] };
      const newPlan = {
        topics: plan.topics.map((t) => (t.id === id ? { ...t, status } : t)),
      };
      return { result: `Topic ${id} → ${status}`, plan: newPlan };
    }

    default:
      return { result: 'Tool inconnu', plan };
  }
}
