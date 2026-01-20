
export interface Ingredient {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  avatar: string;
  initialMessage: string;
  systemInstruction: string;
}

export interface PotionState {
  ingredients: Ingredient[];
  isStirring: boolean;
  isComplete: boolean;
  resultTitle?: string;
  resultDescription?: string;
  resultColor?: string;
}
