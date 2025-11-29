import React, { useState, useEffect } from 'react';
import { Exercise } from '../types';
import { RefreshCw, CheckCircle, Info, Trash2, Undo2, CheckSquare, Square } from 'lucide-react';
import { swapExercise, generateExerciseIllustration } from '../services/gemini';

interface ExerciseCardProps {
  exercise: Exercise;
  onUpdate: (updatedExercise: Exercise) => void;
  onDelete: (exerciseId: string) => void;
  apiKey: string;
  isReadOnly?: boolean;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onUpdate, onDelete, apiKey, isReadOnly }) => {
  const [isSwapping, setIsSwapping] = useState(false);
  const [setsPerformed, setSetsPerformed] = useState<{weight: string, reps: string}[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [svgImage, setSvgImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Sync internal state when exercise prop changes (e.g., after swap or load)
  useEffect(() => {
    setSetsPerformed(
        exercise.performedSets 
          ? exercise.performedSets.map(s => ({ weight: s.weight.toString(), reps: s.reps.toString() }))
          : Array(exercise.sets).fill({ weight: '', reps: '' })
    );
    setSvgImage(exercise.svgContent || null);
  }, [exercise]);

  // Load Image on mount or change if missing
  useEffect(() => {
    if (!exercise.svgContent && apiKey && !isReadOnly && exercise.name) {
        setLoadingImage(true);
        generateExerciseIllustration(apiKey, exercise.name)
            .then(svg => {
                setSvgImage(svg);
                // Update parent silently to save the generated SVG
                onUpdate({ ...exercise, svgContent: svg });
            })
            .catch(() => setSvgImage(null))
            .finally(() => setLoadingImage(false));
    }
  }, [exercise.name, exercise.id]); 

  const handleSwap = async () => {
    if (!apiKey) return alert("Inserisci API Key prima.");
    setIsSwapping(true);
    // Optimistic UI: clear image immediately to show change is incoming
    setSvgImage(null); 
    
    try {
      const newEx = await swapExercise(apiKey, exercise, "Utente preferisce altro / macchinario occupato.");
      // newEx has SAME ID as exercise, so it replaces it in the list
      onUpdate(newEx);
    } catch (e) {
      alert("Errore durante la sostituzione.");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleUndo = () => {
    if (exercise.previousVersions && exercise.previousVersions.length > 0) {
        const previous = exercise.previousVersions[exercise.previousVersions.length - 1];
        const remainingHistory = exercise.previousVersions.slice(0, -1);
        onUpdate({
            ...previous,
            previousVersions: remainingHistory
        });
    }
  };

  const handleSetChange = (index: number, field: 'weight' | 'reps', value: string) => {
    const newSets = [...setsPerformed];
    newSets[index] = { ...newSets[index], [field]: value };
    setSetsPerformed(newSets);

    const performedData = newSets.map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseFloat(s.reps) || 0
    }));

    onUpdate({
        ...exercise,
        performedSets: performedData
    });
  };

  const toggleComplete = () => {
    onUpdate({ ...exercise, isCompleted: !exercise.isCompleted });
  };

  return (
    <div className={`border rounded-xl p-4 shadow-lg mb-4 transition-all duration-300 relative ${exercise.isCompleted ? 'bg-green-900/20 border-green-600/50' : 'bg-stone-800 border-stone-700 hover:border-military-500/50'}`}>
      
      {/* Header Actions Row */}
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={toggleComplete} className={`transition-colors ${exercise.isCompleted ? 'text-green-500' : 'text-stone-500 hover:text-white'}`}>
                {exercise.isCompleted ? <CheckSquare size={24} /> : <Square size={24} />}
            </button>
            <h3 className={`text-lg md:text-xl font-bold ${exercise.isCompleted ? 'text-green-100 line-through decoration-green-500/50' : 'text-military-100'}`}>
                {exercise.name}
            </h3>
            {exercise.isCardioWarmup && (
                <span className="bg-yellow-600/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded border border-yellow-600/50 uppercase font-bold tracking-wider">WARMUP</span>
            )}
          </div>
          <p className="text-military-400 text-xs font-medium uppercase tracking-widest mt-1 ml-8">{exercise.muscleGroup}</p>
        </div>

        {!isReadOnly && (
            <div className="flex gap-1 shrink-0">
                {exercise.previousVersions && exercise.previousVersions.length > 0 && (
                    <button onClick={handleUndo} className="p-2 text-stone-400 hover:text-white hover:bg-stone-700 rounded-lg" title="Annulla Modifica">
                        <Undo2 size={18} />
                    </button>
                )}
                <button 
                    onClick={handleSwap} 
                    disabled={isSwapping}
                    className="p-2 text-stone-400 hover:text-military-300 hover:bg-stone-700 rounded-lg"
                    title="Sostituisci Esercizio"
                >
                    <RefreshCw size={18} className={isSwapping ? "animate-spin" : ""} />
                </button>
                <button 
                    onClick={() => onDelete(exercise.id)}
                    className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg"
                    title="Rimuovi Esercizio"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Visual - AI Generated SVG */}
        <div className="col-span-1 md:col-span-4 lg:col-span-3">
            <div 
                className="relative rounded-lg overflow-hidden border border-stone-600 bg-stone-900 aspect-video flex items-center justify-center p-4 cursor-pointer hover:border-military-500 transition-colors"
                onClick={() => setShowDetails(!showDetails)}
            >
                {loadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-military-500"></div>
                        <span className="text-[10px] text-military-500">GENERAZIONE...</span>
                    </div>
                ) : svgImage ? (
                    <div className="w-full h-full text-white opacity-90 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svgImage }} />
                ) : (
                    <div className="text-stone-600 text-xs flex flex-col items-center">
                        <span>NO IMAGE</span>
                        <span className="text-[9px] mt-1 text-stone-700">Controlla API Key</span>
                    </div>
                )}
                
                <div className="absolute bottom-2 right-2 bg-stone-900/50 p-1 rounded-full">
                    <Info size={16} className="text-stone-400" />
                </div>
            </div>
            
            {showDetails && (
                <div className="text-xs text-stone-300 bg-stone-900/95 p-3 rounded mt-2 border border-stone-700 animate-fadeIn absolute md:static z-20 w-full shadow-xl">
                    <p className="mb-2"><strong className="text-military-400">Esecuzione:</strong> {exercise.description}</p>
                    <p><strong className="text-military-400">Tips:</strong> {exercise.tips}</p>
                </div>
            )}

            <div className="flex justify-between text-xs text-stone-400 mt-2 px-1 font-mono">
                <span>Set/Reps: <span className="text-white font-bold">{exercise.sets} x {exercise.reps}</span></span>
                <span>Rest: <span className="text-white font-bold">{exercise.restSeconds}s</span></span>
            </div>
             {exercise.targetWeight && (
                <div className="text-[10px] text-military-500 mt-1 px-1 text-right italic">Consiglio AI: {exercise.targetWeight}</div>
            )}
        </div>

        {/* Tracking Inputs */}
        <div className="col-span-1 md:col-span-8 lg:col-span-9 flex flex-col gap-2">
            {!isReadOnly ? (
                Array.from({ length: exercise.sets }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-stone-900/40 p-2 rounded border border-stone-700/50 hover:bg-stone-900/80 transition-colors">
                        <span className="text-stone-500 font-mono text-xs w-6 text-center">{idx + 1}</span>
                        
                        <div className="flex-1 relative">
                            <input
                                type="number"
                                placeholder="0"
                                value={setsPerformed[idx]?.weight || ''}
                                onChange={(e) => handleSetChange(idx, 'weight', e.target.value)}
                                className="w-full bg-stone-800 text-center text-white border-b border-stone-600 focus:border-military-500 focus:outline-none text-base py-1 rounded-t"
                            />
                            <span className="absolute right-1 top-2 text-[9px] text-stone-600 pointer-events-none">KG</span>
                        </div>

                        <div className="flex-1 relative">
                             <input
                                type="number"
                                placeholder="0"
                                value={setsPerformed[idx]?.reps || ''}
                                onChange={(e) => handleSetChange(idx, 'reps', e.target.value)}
                                className="w-full bg-stone-800 text-center text-white border-b border-stone-600 focus:border-military-500 focus:outline-none text-base py-1 rounded-t"
                            />
                             <span className="absolute right-1 top-2 text-[9px] text-stone-600 pointer-events-none">REPS</span>
                        </div>

                        <div className={`w-8 flex justify-center ${setsPerformed[idx]?.reps ? 'text-green-500' : 'text-stone-700'}`}>
                            <CheckCircle size={20} className={setsPerformed[idx]?.reps ? "fill-green-900/30" : ""} />
                        </div>
                    </div>
                ))
            ) : (
                <div className="h-full flex flex-col justify-center items-center text-stone-500 border border-dashed border-stone-700 rounded-lg p-4 bg-stone-900/30">
                    <p className="text-sm">Esercizio completato</p>
                    {exercise.performedSets && (
                         <div className="mt-2 text-sm text-stone-300 font-mono">
                            Max Load: {Math.max(...exercise.performedSets.map(s => s.weight || 0))}kg 
                         </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};