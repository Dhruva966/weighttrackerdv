export const uiMock = {
  brand: 'Lift',
  weightLb: 142.4,
  weightDelta: -0.6,
  todayMacros: {
    calories: 1180,
    proteinG: 62,
    carbsG: 148,
    fatG: 38,
    calorieTarget: 1800,
  },
  motivation: {
    title: 'A little energy for Aloo',
    body: 'Hungry and tired is a real combination — stress can make the night feel long. You don’t have to fix everything. One soft next step is enough: note the plate, or just breathe and drink water.',
    nudge: 'You’re allowed to start imperfect. Execution gets easier when the first tap is tiny.',
  },
  askExamples: [
    'I need a little motivation',
    'How am I doing on protein?',
    'I ate when I was tired — is that okay?',
  ],
  askAnswers: {
    motivation:
      'You’re not lazy — you’re tired and thinking a lot. Pick one small thing: jot the meal in a sentence, or say it out loud privately on this device. Doing one tiny thing counts as execution.',
    protein:
      'About 62 g so far — mostly from dal and the rice plate. That’s solid. Dinner can be gentle; you don’t need to “catch up” perfectly.',
    tiredEating:
      'Eating a lot when you’re exhausted is human, not a failure. Notice it kindly. Hydrate, rest when you can, and log the plate without scolding yourself — stress was in the story too.',
  },
  askDemo: {
    question: 'I need a little motivation',
    answer:
      'You’re not lazy — you’re tired and thinking a lot. Pick one small thing: jot the meal in a sentence, or say it out loud privately on this device. Doing one tiny thing counts as execution.',
  },
  meals: [
    {
      id: 'meal-1',
      time: '8:10 AM',
      title: 'Breakfast',
      summary: '2 idli · sambar · coconut chutney',
      calories: 340,
      proteinG: 12,
      carbsG: 58,
      fatG: 6,
    },
    {
      id: 'meal-2',
      time: '1:20 PM',
      title: 'Lunch',
      summary: 'Bhagara rice · sarakha kura',
      calories: 520,
      proteinG: 18,
      carbsG: 72,
      fatG: 14,
    },
    {
      id: 'meal-3',
      time: '5:45 PM',
      title: 'Tea',
      summary: 'Cutting chai · 2 Marie biscuits',
      calories: 160,
      proteinG: 3,
      carbsG: 24,
      fatG: 6,
    },
  ],
  mealDraft: {
    source: 'Private voice on this device',
    raw: 'I had nice bhagara rice with sarakha kura — I was so hungry and tired',
    items: [
      { name: 'Bhagara rice', portion: '1 plate', calories: 420, proteinG: 9, carbsG: 74, fatG: 10 },
      { name: 'Sarakha kura', portion: '1 katori', calories: 110, proteinG: 4, carbsG: 12, fatG: 5 },
    ],
  },
  goals: [
    { id: 'g1', name: 'Morning weigh-in', done: true },
    { id: 'g2', name: 'Home-cooked dinner', done: false },
    { id: 'g3', name: 'One tiny kind action', done: false },
  ],
  historyDays: [
    {
      dateLabel: 'Today',
      items: [
        { kind: 'weight' as const, label: '142.4 lb', detail: 'Morning weigh-in' },
        { kind: 'meal' as const, label: 'Lunch', detail: 'Bhagara rice · sarakha kura' },
      ],
    },
    {
      dateLabel: 'Yesterday',
      items: [
        { kind: 'meal' as const, label: 'Dinner', detail: 'Khichdi · kadhi · salad' },
        { kind: 'workout' as const, label: 'Workout', detail: 'Lat pulldown · shoulder press' },
        { kind: 'weight' as const, label: '143.0 lb', detail: 'Morning weigh-in' },
      ],
    },
  ],
};
