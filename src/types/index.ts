export interface Plant {
  id: string;
  name: string;
  type: string;
  wateringFrequencyDays: number;
  lastWatered: string; // ISO date string
  notes?: string;
  emoji?: string;
  photoUri?: string;
  createdAt: string;
}

export type RootTabParamList = {
  Home: undefined;
  Stats: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  AddPlant: undefined;
  PlantDetail: { plantId: string };
  Reminders: undefined;
};
