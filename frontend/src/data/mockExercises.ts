import type { Exercise } from '../types'

export const muscleGroups = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
] as const

export const mockExercises: Exercise[] = [
  { id: '1', name: 'Push-ups', muscle: 'Chest', sets: 3, reps: '12-15', pro: false },
  { id: '2', name: 'Bench Press', muscle: 'Chest', sets: 4, reps: '8-10', pro: true },
  { id: '3', name: 'Incline Dumbbell Press', muscle: 'Chest', sets: 4, reps: '8-12', pro: true },
  { id: '4', name: 'Pull-ups', muscle: 'Back', sets: 3, reps: '8-12', pro: true },
  { id: '5', name: 'Barbell Row', muscle: 'Back', sets: 4, reps: '8-10', pro: true },
  { id: '6', name: 'Lat Pulldown', muscle: 'Back', sets: 3, reps: '10-12', pro: false },
  { id: '7', name: 'Barbell Squat', muscle: 'Legs', sets: 4, reps: '6-8', pro: true },
  { id: '8', name: 'Romanian Deadlift', muscle: 'Legs', sets: 4, reps: '8-10', pro: true },
  { id: '9', name: 'Walking Lunges', muscle: 'Legs', sets: 3, reps: '12 each', pro: false },
  { id: '10', name: 'Overhead Press', muscle: 'Shoulders', sets: 4, reps: '8-10', pro: true },
  { id: '11', name: 'Lateral Raises', muscle: 'Shoulders', sets: 3, reps: '12-15', pro: false },
  { id: '12', name: 'Barbell Curl', muscle: 'Arms', sets: 3, reps: '10-12', pro: true },
  { id: '13', name: 'Tricep Dips', muscle: 'Arms', sets: 3, reps: '10-15', pro: false },
  { id: '14', name: 'Plank', muscle: 'Core', sets: 3, reps: '45-60s', pro: false },
  { id: '15', name: 'Cable Crunch', muscle: 'Core', sets: 3, reps: '15-20', pro: true },
  { id: '16', name: 'Deadlift', muscle: 'Back', sets: 4, reps: '5-6', pro: true },
]
