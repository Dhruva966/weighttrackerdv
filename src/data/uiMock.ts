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
  askExamples: [
    'How am I doing on protein?',
    'Did I keep a steady weigh-in?',
    'What’s going well this week?',
  ],
  askDemo: {
    question: 'How am I doing on protein?',
    answer:
      'About 62 g so far — mostly from moong dal and paneer at lunch. That’s solid for afternoon. A little more at dinner and you’ll land right where you hoped.',
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
      summary: '1 katori moong dal · 2 roti · bhindi · curd',
      calories: 520,
      proteinG: 28,
      carbsG: 62,
      fatG: 16,
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
    source: 'Described aloud',
    raw: '1 plate lemon rice with peanut chutney and cucumber salad',
    items: [
      { name: 'Lemon rice', portion: '1 plate', calories: 380, proteinG: 8, carbsG: 68, fatG: 9 },
      { name: 'Peanut chutney', portion: '2 tbsp', calories: 90, proteinG: 4, carbsG: 4, fatG: 7 },
      { name: 'Cucumber salad', portion: '1 katori', calories: 35, proteinG: 1, carbsG: 6, fatG: 0 },
    ],
  },
  goals: [
    { id: 'g1', name: 'Morning weigh-in', done: true },
    { id: 'g2', name: 'Home-cooked dinner', done: false },
    { id: 'g3', name: 'Walk 20 minutes', done: false },
  ],
  historyDays: [
    {
      dateLabel: 'Today',
      items: [
        { kind: 'weight' as const, label: '142.4 lb', detail: 'Morning weigh-in' },
        { kind: 'meal' as const, label: 'Lunch', detail: 'Dal · roti · bhindi' },
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
