import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Exercise, WorkoutSession, UserStats, MuscleGroup } from "../types";

const getClient = (apiKey: string) => new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION_COACH = `
Sei il Tenente Colonnello "Falco", istruttore Aeronautica Militare. 
Obiettivo: Body Recomposition (Definizione).
Stile: Tecnico, Autorevole, Motivante.
Vincoli: NO BILANCIERI. Usa Manubri, Cavi, Macchine.
`;

const exerciseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    muscleGroup: { type: Type.STRING, enum: Object.values(MuscleGroup) },
    sets: { type: Type.INTEGER },
    reps: { type: Type.STRING },
    restSeconds: { type: Type.INTEGER },
    description: { type: Type.STRING },
    tips: { type: Type.STRING },
    isCardioWarmup: { type: Type.BOOLEAN },
    targetWeight: { type: Type.STRING },
  },
  required: ["name", "muscleGroup", "sets", "reps", "description", "tips"]
};

const workoutPlanSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      exercises: {
        type: Type.ARRAY,
        items: exerciseSchema
      }
    },
    required: ["title", "exercises"]
  }
};

const singleSessionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    exercises: {
        type: Type.ARRAY,
        items: exerciseSchema
    }
  },
  required: ["title", "exercises"]
};

// Safe ID generator that works in non-secure contexts
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Generates the SVG content for an exercise
export const generateExerciseIllustration = async (apiKey: string, exerciseName: string): Promise<string> => {
    const ai = getClient(apiKey);
    const prompt = `
      Generate a very simple, minimalist stick-figure pictogram (SVG) on a transparent background representing: "${exerciseName}".
      Style: Thick white lines (stroke-width: 4px), rounded caps. Like a public signage icon or olympic sport pictogram.
      NO TEXT. NO COMPLEX DETAILS. NO SHADING.
      The SVG must be strictly XML. 
      Output ONLY the <svg>...</svg> code.
      ViewBox="0 0 100 100".
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "text/plain" }
        });
        
        let svg = response.text || "";
        // Aggressive cleanup to extract just the SVG
        const svgMatch = svg.match(/<svg[\s\S]*?<\/svg>/i);
        if (svgMatch) {
            svg = svgMatch[0];
        } else {
             // Fallback cleanup if regex fails but content is there
            svg = svg.replace(/```svg/g, '').replace(/```xml/g, '').replace(/```/g, '').trim();
        }

        if (!svg.startsWith('<svg')) return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" stroke="white" stroke-width="2" fill="none"/><text x="50" y="55" fill="white" font-size="10" text-anchor="middle">NO IMG</text></svg>`;
        return svg;
    } catch (e) {
        return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="none" stroke="#444"/><text x="50" y="50" text-anchor="middle" fill="#666" font-size="10">ERROR</text></svg>`;
    }
};

export const generateWeeklyPlan = async (
  apiKey: string, 
  stats: UserStats, 
  durationMinutes: number,
  historySummary: string
): Promise<WorkoutSession[]> => {
  const ai = getClient(apiKey);
  
  const prompt = `
    Crea una scheda settimanale di ${stats.sessionsPerWeek} sessioni.
    Utente: ${stats.height}cm, ${stats.weight}kg.
    Target: Definizione / Military Fitness.
    Durata sessione: ${durationMinutes} min.
    Storico recente: ${historySummary}
    
    CRITERI FONDAMENTALI:
    1. Primo esercizio SEMPRE Cardio (es. Vogatore, Tapis Roulant) come Warmup.
    2. Usa manubri, cavi, macchine. NIENTE BILANCIERI.
    3. Ogni sessione deve avere un titolo militare (es. "Protocollo Alpha", "Operazione Gambe").
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_COACH,
        responseMimeType: "application/json",
        responseSchema: workoutPlanSchema,
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    return rawData.map((session: any) => ({
      ...session,
      id: generateId(),
      dateCreated: new Date().toISOString(),
      durationMinutes,
      completed: false,
      exercises: session.exercises.map((ex: any) => ({
        ...ex,
        id: generateId(),
      }))
    }));

  } catch (error) {
    console.error("Error generating plan:", error);
    throw error;
  }
};

export const generateQuickSession = async (
    apiKey: string,
    durationMinutes: number,
    muscleFocus: string,
    historySummary: string
): Promise<WorkoutSession> => {
    const ai = getClient(apiKey);
    const prompt = `
        Genera UNA SESSIONE COMPLETA di allenamento "Rapida".
        Durata target: ${durationMinutes} minuti.
        Focus muscolare: ${muscleFocus}.
        Storico: ${historySummary}.
        
        IMPORTANTE: Genera almeno 5-7 esercizi per coprire la durata di ${durationMinutes} minuti.
        Struttura:
        1. Riscaldamento (Cardio)
        2. Esercizi Core / Focus (Manubri, Cavi, Macchine)
        3. Defaticamento
        
        Regole: No bilancieri. Stile military.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_COACH,
            responseMimeType: "application/json",
            responseSchema: singleSessionSchema,
        }
    });

    const data = JSON.parse(response.text || "{}");
    return {
        ...data,
        id: generateId(),
        dateCreated: new Date().toISOString(),
        durationMinutes,
        completed: false,
        isQuickSession: true,
        exercises: data.exercises?.map((ex: any) => ({
            ...ex,
            id: generateId()
        })) || []
    };
};

export const swapExercise = async (
  apiKey: string,
  currentExercise: Exercise,
  reason: string
): Promise<Exercise> => {
  const ai = getClient(apiKey);
  
  const prompt = `
    Sostituisci l'esercizio: "${currentExercise.name}" (${currentExercise.muscleGroup}).
    Motivo: ${reason}.
    Trova un'alternativa valida usando cavi o manubri o macchine diverse.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_COACH,
      responseMimeType: "application/json",
      responseSchema: exerciseSchema
    }
  });

  const newExercise = JSON.parse(response.text || "{}");
  
  // CRITICAL FIX: Reuse the existing ID so React knows which component to update
  return {
    ...newExercise,
    id: currentExercise.id, 
    // Reset specific fields for the new exercise
    svgContent: undefined,
    performedSets: undefined, 
    isCompleted: false,
    // Preserve history
    previousVersions: currentExercise.previousVersions 
        ? [...currentExercise.previousVersions, currentExercise] 
        : [currentExercise]
  };
};

export const addSingleExercise = async (
    apiKey: string,
    context: string
): Promise<Exercise> => {
    const ai = getClient(apiKey);
    const prompt = `Aggiungi un esercizio efficace per completare questa sessione. Contesto: ${context}.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_COACH,
            responseMimeType: "application/json",
            responseSchema: exerciseSchema
        }
    });
    
    const ex = JSON.parse(response.text || "{}");
    return { ...ex, id: generateId() };
};

export const chatWithCoach = async (
  apiKey: string,
  history: { role: 'user' | 'model', parts: [{ text: string }] }[],
  message: string,
  contextData: string
) => {
  const ai = getClient(apiKey);
  
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history,
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION_COACH}\n\nCONTESTO ATTUALE:\n${contextData}`,
    }
  });

  const result = await chat.sendMessage({ message });
  return result.text;
};