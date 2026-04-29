/**
 * Activity Templates — Barrel
 *
 * Single import surface for the personality-gated activity catalog.
 * Re-exports each category's template array and provides ALL_TEMPLATES,
 * the aggregated catalog that will replace the inline ACTIVITY_TEMPLATES
 * constant in lib/companion/activity-generator.ts when Section B lands.
 *
 * Part of the Activity Depth v1 feature.
 * See: SPEC-activity-depth-v1.md
 */

import type { ActivityTemplate } from '@/types/life-simulation';

import { CREATIVE_TEMPLATES } from './creative';
import { ENTERTAINMENT_TEMPLATES } from './entertainment';
import { HOBBY_TEMPLATES } from './hobby';
import { LEARNING_TEMPLATES } from './learning';
import { REFLECTION_TEMPLATES } from './reflection';
import { SOCIAL_TEMPLATES } from './social';

export {
  CREATIVE_TEMPLATES,
  ENTERTAINMENT_TEMPLATES,
  HOBBY_TEMPLATES,
  LEARNING_TEMPLATES,
  REFLECTION_TEMPLATES,
  SOCIAL_TEMPLATES,
};

/**
 * Flat aggregation of every activity template in the catalog.
 *
 * Order is alphabetical by category to keep the array stable for
 * deterministic selection-logic and easier grep-by-id scanning.
 */
export const ALL_TEMPLATES: readonly ActivityTemplate[] = [
  ...CREATIVE_TEMPLATES,
  ...ENTERTAINMENT_TEMPLATES,
  ...HOBBY_TEMPLATES,
  ...LEARNING_TEMPLATES,
  ...REFLECTION_TEMPLATES,
  ...SOCIAL_TEMPLATES,
];
