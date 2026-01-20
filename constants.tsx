
import { Ingredient, Character } from './types';

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: '1', name: 'Dragon Scale', color: '#ff4d4d', icon: '🔥', description: 'Adds heat and powerful energy.' },
  { id: '2', name: 'Moonstone Powder', color: '#a5f3fc', icon: '🌙', description: 'Gives the potion clarity and light.' },
  { id: '3', name: 'Root of Mandrake', color: '#78350f', icon: '🌱', description: 'Brings strong, earthy magic.' },
  { id: '4', name: 'Phoenix Feather', color: '#fbbf24', icon: '🦅', description: 'Helps things feel new and hopeful.' },
];

export const UNLOCKABLE_INGREDIENTS: Ingredient[] = [
  { id: '5', name: 'Dried Pixie Dust', color: '#d8b4fe', icon: '✨', description: 'Adds a bit of fun and floating magic.' },
  { id: '6', name: 'Swamp Water', color: '#365314', icon: '🧪', description: 'A mysterious, dark base for the brew.' },
  { id: '7', name: 'Hourglass Sand', color: '#eab308', icon: '⏳', description: 'Gives the potion a touch of time magic.' },
  { id: '8', name: 'Thunderbird Tail', color: '#60a5fa', icon: '⚡', description: 'Infuses the potion with storm energy.' },
  { id: '9', name: 'Unicorn Hair', color: '#ffffff', icon: '🦄', description: 'Pure, healing magical core.' },
  { id: '10', name: 'Void Essence', color: '#1e1b4b', icon: '🌀', description: 'Concentrated mystery of the cosmos.' },
  { id: '11', name: 'Golden Snitch Wing', color: '#fcd34d', icon: '🏒', description: 'Adds speed and unpredictable flight.' },
  { id: '12', name: 'Kraken Ink', color: '#0f172a', icon: '🐙', description: 'Deep sea shadows and ancient depth.' }
];

export const CHARACTERS: Character[] = [
  {
    id: 'hogwarts_lab',
    name: 'Hogwarts Potion Laboratory',
    role: 'Your Magic Workshop',
    avatar: 'https://images.unsplash.com/photo-1549608276-5786d751849d?q=80&w=400&h=400&auto=format&fit=crop',
    initialMessage: '*The room glows with a soft light.* Welcome back to the Laboratory! Earn 200 points to unlock new rare ingredients. Pick your components and let the magic begin!',
    systemInstruction: 'You are the friendly spirit of the Hogwarts Potion Laboratory. You speak clearly for teenagers. Be supportive. If they earn points, congratulate them. If they lose points for rudeness, remind them that discipline is part of magic. Mention that 200 points unlocks new ingredients!'
  }
];
