import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plant } from '../types';

const PLANTS_KEY = '@flora_ai_plants';

export const getPlants = async (): Promise<Plant[]> => {
  try {
    const json = await AsyncStorage.getItem(PLANTS_KEY);
    if (!json) return [];
    return JSON.parse(json) as Plant[];
  } catch (e) {
    console.error('[FloraAI] getPlants failed:', e);
    return [];
  }
};

export const savePlants = async (plants: Plant[]): Promise<void> => {
  await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(plants));
};

export const addPlant = async (plant: Plant): Promise<void> => {
  const plants = await getPlants();
  plants.push(plant);
  await savePlants(plants);
};

export const updatePlant = async (updated: Plant): Promise<void> => {
  const plants = await getPlants();
  const idx = plants.findIndex((p) => p.id === updated.id);
  if (idx !== -1) {
    plants[idx] = updated;
  } else {
    // Plant missing from storage — upsert so the write always succeeds
    plants.push(updated);
  }
  await savePlants(plants);
};

export const updateLastWatered = async (plantId: string): Promise<Plant> => {
  const plants = await getPlants();
  const idx = plants.findIndex((p) => p.id === plantId);
  if (idx === -1) throw new Error('Plant not found: ' + plantId);
  plants[idx] = { ...plants[idx], lastWatered: new Date().toISOString() };
  await savePlants(plants);
  return plants[idx];
};

export const deletePlant = async (id: string): Promise<void> => {
  const plants = await getPlants();
  await savePlants(plants.filter((p) => p.id !== id));
};

export const getPlantById = async (id: string): Promise<Plant | null> => {
  const plants = await getPlants();
  return plants.find((p) => p.id === id) ?? null;
};

export const getNextWateringDate = (plant: Plant): Date => {
  const last = new Date(plant.lastWatered);
  last.setDate(last.getDate() + plant.wateringFrequencyDays);
  return last;
};

export const getDaysUntilWatering = (plant: Plant): number => {
  const next = getNextWateringDate(plant);
  const now = new Date();
  const diff = next.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const generateId = (): string =>
  `plant_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const PLANT_EMOJIS: Record<string, string> = {
  Succulent: '🌵',
  Cactus: '🌵',
  Fern: '🌿',
  Orchid: '🌸',
  Rose: '🌹',
  Tulip: '🌷',
  Sunflower: '🌻',
  Lily: '🌺',
  Herb: '🌱',
  Vegetable: '🥦',
  Fruit: '🍓',
  Tropical: '🌴',
  Tree: '🌳',
  Grass: '🌾',
  Flower: '💐',
  Other: '🪴',
};

export const getPlantEmoji = (type: string): string =>
  PLANT_EMOJIS[type] ?? '🪴';
