export type Locale = 'pt-BR' | 'en-US'

export type TranslationKeys = {
  meta: { title: string }
  common: {
    back: string
    continue: string
    backBtn: string
    month: string
    kcal: string
    kcalPerDay: string
    pro: string
    free: string
    sets: string
    reps: string
    estimated: string
  }
  nav: {
    dashboard: string
    workout: string
    pro: string
  }
  landing: {
    tagline1: string
    tagline2: string
    tagline3: string
    subtitle: string
    startFree: string
    viewPricing: string
    featuresTitle: string
    feature1Title: string
    feature1Desc: string
    feature2Title: string
    feature2Desc: string
    feature3Title: string
    feature3Desc: string
    proLabel: string
    proDesc: string
    footer: string
  }
  auth: {
    createAccount: string
    welcomeBack: string
    login: string
    signup: string
    email: string
    password: string
    confirmPassword: string
    emailPlaceholder: string
    createAccountBtn: string
    signInBtn: string
    backHome: string
    errorFillFields: string
    errorPasswordLength: string
    errorPasswordMatch: string
  }
  onboarding: {
    step: string
    ageTitle: string
    ageDesc: string
    ageLabel: string
    weightTitle: string
    weightDesc: string
    weightLabel: string
    heightTitle: string
    heightDesc: string
    heightLabel: string
    sexTitle: string
    sexDesc: string
    male: string
    female: string
    activityTitle: string
    activityDesc: string
    goalTitle: string
    goalDesc: string
    targetTitle: string
    targetDesc: string
    startTracking: string
    activity: Record<string, string>
    goal: Record<string, string>
  }
  dashboard: {
    title: string
    today: string
    remaining: string
    macros: string
    protein: string
    carbs: string
    fat: string
    logFood: string
    foodPlaceholder: string
    analyze: string
    analyzing: string
    freePlanNote: string
    analyzeError: string
    limitReached: string
    foodLog: string
    foodLogEmpty: string
  }
  workout: {
    title: string
    unlockTitle: string
    unlockDesc: string
    upgrade: string
    upgradeUnlock: string
    viewPlans: string
    muscle: Record<string, string>
    exercises: Record<string, string>
  }
  pricing: {
    title: string
    subtitle: string
    currentPlan: string
    active: string
    subscribed: string
    redirecting: string
    subscribe: string
    mockNote: string
    comparison: string
    featureCol: string
    freeCol: string
    proCol: string
    freeFeatures: string[]
    proFeatures: string[]
    compareRows: { feature: string; free: string; pro: string }[]
  }
}
