export type PlanId = 'free' | 'pro'
export type AuthProviderId = 'password' | 'phone' | 'google'
export type FeatureId = 'dailyView' | 'weeklyView' | 'monthlyView' | 'goals' | 'cloudSync'

/**
 * One row per feature.
 * `released` — it is built and switched on.
 * `plans`    — who gets it once subscriptions exist. Everything is free today.
 */
export const FEATURES: Record<FeatureId, { released: boolean; plans: PlanId[] }> = {
  dailyView: { released: true, plans: ['free', 'pro'] },
  goals: { released: true, plans: ['free', 'pro'] },
  weeklyView: { released: false, plans: ['free', 'pro'] },
  monthlyView: { released: false, plans: ['free', 'pro'] },
  cloudSync: { released: false, plans: ['pro'] },
}

/** The only question the UI asks before showing a feature. */
export const can = (feature: FeatureId, plan: PlanId = 'free') =>
  FEATURES[feature].released && FEATURES[feature].plans.includes(plan)

/** Running inside the desktop app (which serves its pages as app://kotsu) rather than in a browser. */
export const DESKTOP = location.protocol === 'app:'
