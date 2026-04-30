import { GEMINI_API_KEY } from '@env';

export interface PlantCareSuggestion {
  wateringFrequencyDays: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tip: string;
}

export async function getPlantCareSuggestion(
  plantName: string,
  plantType: string,
): Promise<PlantCareSuggestion> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'undefined') {
    throw new Error('API key not loaded. Restart Metro with: npx expo start --clear');
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const subject = plantName || plantType;
  const desc    = plantName
    ? `${plantType} plant called "${plantName}"`
    : `${plantType} plant`;

  const prompt =
    `You are a plant care expert. The user has a ${desc}. ` +
    `Reply ONLY with a JSON object (no markdown, no extra text):\n` +
    `{"wateringFrequencyDays": <number>, "difficulty": "easy"|"medium"|"hard", ` +
    `"tip": "<max 20 words, specific to ${subject}, mention its name, give one concrete actionable care tip>"}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('[Gemini] HTTP error', res.status, errBody);
    throw new Error(`Gemini error ${res.status}`);
  }

  const data = await res.json();
  const raw: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!raw) {
    console.error('[Gemini] Unexpected response shape:', JSON.stringify(data));
    throw new Error('Unexpected response from Gemini');
  }

  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned) as PlantCareSuggestion;
  } catch {
    console.error('[Gemini] JSON parse failed. Raw text was:', raw);
    throw new Error('Could not parse Gemini response as JSON');
  }
}
