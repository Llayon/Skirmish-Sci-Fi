import {
  TraitContext, TraitHandlers, TraitHandler
} from '../types';
import { ALL_TRAITS } from './traits';

export function fireHook<T extends TraitContext>(
  hookName: keyof TraitHandlers,
  context: T,
  traits: string[],
  priorityFilter?: { min?: number; max?: number }
) {
  // 1. Get unique trait IDs from the input
  const uniqueTraits = new Set(traits);

  // 2. Find all matching plugins for the active traits
  let activePlugins = ALL_TRAITS.filter(plugin => uniqueTraits.has(plugin.id));

  // Filter by priority if requested
  if (priorityFilter) {
    if (priorityFilter.min !== undefined) {
      activePlugins = activePlugins.filter(p => p.priority >= priorityFilter.min!);
    }
    if (priorityFilter.max !== undefined) {
      activePlugins = activePlugins.filter(p => p.priority < priorityFilter.max!);
    }
  }

  // 3. Sort plugins by priority (lower first)
  activePlugins.sort((a, b) => a.priority - b.priority);

  // 4. Execute the hook for each sorted plugin
  for (const plugin of activePlugins) {
    const handler = plugin.hooks[hookName] as TraitHandler<T> | undefined;
    if (handler) {
      try {
        handler(context);
      } catch (error) {
        console.error(`Error in trait handler '${plugin.id}' for hook '${String(hookName)}':`, error);
      }
    }
  }
}