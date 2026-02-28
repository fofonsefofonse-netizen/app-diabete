import { GoogleGenerativeAI } from '@google/generative-ai';

export type GlycemicIndex = 'Élevé' | 'Moyen' | 'Bas';

export interface GeminiResult {
    totalCarbs: number;
    details: string;
    glycemicIndex: GlycemicIndex;
}

const getModel = (apiKey: string) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

const SYSTEM_PROMPT = `Tu es un nutritionniste expert spécialisé dans le diabète. Analyse le repas fourni et estime les glucides totaux ainsi que l'Index Glycémique global.

FORMAT DE RÉPONSE OBLIGATOIRE (JSON pur, sans balises markdown) :
{
  "totalCarbs": 45,
  "details": "Riz blanc (30g de glucides), Pomme (15g de glucides)",
  "glycemicIndex": "Élevé"
}

Règles strictes :
- totalCarbs : entier en grammes, représentant la somme de tous les glucides
- details : liste des aliments identifiés avec leur contribution en glucides entre parenthèses
- glycemicIndex : EXACTEMENT l'une de ces trois valeurs : "Élevé", "Moyen", "Bas"
  * Bas : IG < 55 (légumes, légumineuses, certains fruits, yaourt nature)
  * Moyen : IG 55-70 (pain complet, riz basmati, banane, pâtes al dente)
  * Élevé : IG > 70 (pain blanc, riz blanc, pommes de terre, sucreries, sodas)`;

const parseResponse = (text: string): GeminiResult => {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validation stricte des champs
    const carbs = Number(parsed.totalCarbs);
    if (!isFinite(carbs) || carbs < 0 || carbs > 2000) {
        throw new Error('Valeur de glucides invalide reçue de l\'IA.');
    }
    parsed.totalCarbs = Math.round(carbs);

    const validGI: GlycemicIndex[] = ['Élevé', 'Moyen', 'Bas'];
    if (!validGI.includes(parsed.glycemicIndex)) parsed.glycemicIndex = 'Moyen';

    if (typeof parsed.details !== 'string' || parsed.details.trim().length === 0) {
        parsed.details = 'Détails non disponibles';
    }
    // Tronquer pour éviter des réponses anormalement longues
    parsed.details = parsed.details.substring(0, 600);

    return parsed as GeminiResult;
};

export const analyzeTextWithGemini = async (text: string, apiKey: string): Promise<GeminiResult> => {
    try {
        const model = getModel(apiKey);
        const result = await model.generateContent([SYSTEM_PROMPT, `Repas : ${text}`]);
        return parseResponse(result.response.text());
    } catch (error) {
        console.error('Gemini Error:', error);
        throw new Error("Impossible d'analyser le texte avec l'IA.");
    }
};

export const analyzeImageWithGemini = async (base64Image: string, mimeType: string, apiKey: string): Promise<GeminiResult> => {
    try {
        const model = getModel(apiKey);
        const result = await model.generateContent([
            SYSTEM_PROMPT,
            { inlineData: { data: base64Image.split(',')[1], mimeType } },
            'Analyse ce repas.',
        ]);
        return parseResponse(result.response.text());
    } catch (error) {
        console.error('Gemini Error:', error);
        throw new Error("Impossible d'analyser l'image avec l'IA.");
    }
};
