export interface Plant {
  id: string;
  name: string;
  type: string;
  wateringFrequencyDays: number;
  lastWatered: string; // ISO date string
  notes?: string;
  emoji?: string;
  createdAt: string;
}

export type RootTabParamList = {
  Home: undefined;
  AddPlant: undefined;
  PlantDetail: { plantId: string };
  Reminders: undefined;
};
