import React, { useState, useEffect } from 'react';
import { AppState, WorkoutSession, UserStats, Exercise } from './types';
import { generateWeeklyPlan, generateQuickSession, addSingleExercise } from './services/gemini';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { ExerciseCard } from './components/ExerciseCard';
import { ChatBot } from './components/ChatBot';
import { ProgressChart } from './components/ProgressChart';
import { Dumbbell, Save, Download, Upload, Settings, User, Calendar, Clock, ChevronLeft, Zap, Plus, ArrowLeft } from 'lucide-react';
import { Dumbbell, Save, Download, Upload, Settings, User, Calendar, Clock, ChevronLeft, Zap, Plus, ArrowLeft, X } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [view, setView] = useState<'onboarding' | 'dashboard' | 'workout' | 'quick-setup'>('onboarding');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [appState, setAppState] = useState<AppState>({
    apiKey: '',
    userStats: {
      height: 188,
      weight: 95,
      goal: 'Definizione Military',
      sessionsPerWeek: 3
    },
    currentPlan: [],
    history: []
  });

  const [sessionDurationInput, setSessionDurationInput] = useState(75);
  const [quickSessionFocus, setQuickSessionFocus] = useState("Full Body");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const savedData = localStorage.getItem('aerofit_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setAppState(parsed);
      setApiKey(parsed.apiKey || '');
      if (parsed.currentPlan?.length > 0) {
        setView('dashboard');
      }
    }
  }, []);

  // Auto-save on state change
  useEffect(() => {
    if (appState.userStats.weight > 0) { 
        localStorage.setItem('aerofit_data', JSON.stringify({ ...appState, apiKey }));
    }
  }, [appState, apiKey]);

  // --- Handlers ---

  const handleManualSave = () => {
     localStorage.setItem('aerofit_data', JSON.stringify({ ...appState, apiKey }));
@@ -212,84 +213,116 @@ const App: React.FC = () => {
        try {
            const text = event.target?.result as string;
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : text;
            const parsed = JSON.parse(jsonStr);
            setAppState(parsed);
            if(parsed.apiKey) setApiKey(parsed.apiKey);
            alert("Database aggiornato.");
            setView(parsed.currentPlan?.length > 0 ? 'dashboard' : 'onboarding');
        } catch (err) { alert("File corrotto."); }
    };
    reader.readAsText(file);
  };

  // --- Render Functions ---

  const renderHeader = () => (
    <header className="bg-stone-900 border-b border-stone-800 p-3 md:p-4 sticky top-0 z-40 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => appState.currentPlan.length > 0 && setView('dashboard')}>
            <div className="bg-military-600 p-2 rounded-lg text-white shadow-lg shadow-military-900/50">
            <Dumbbell size={24} />
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-military-100 hidden sm:block">AEROFIT<span className="text-military-500">COACH</span></h1>
        </div>
        <div className="flex gap-2 md:hidden">
             <button onClick={handleManualSave} className="bg-military-700 p-2 rounded text-white">
                <Save size={20} />
             </button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
        <div className="w-full md:w-64">
             <Input 
                type="password" 
                placeholder="Google Gemini API Key" 
                value={apiKey} 
                onChange={handleApiKeyChange}
                className="text-sm py-1"
             />
        </div>
        
        <div className="flex gap-1 w-full md:w-auto justify-end">
            <button onClick={handleManualSave} className="hidden md:flex bg-stone-800 p-2 rounded-lg hover:bg-stone-700 text-stone-300 hover:text-white items-center gap-2" title="Salva su Browser">
                <Save size={18} /> <span className="text-xs font-bold">SALVA</span>
            </button>
            <label className="cursor-pointer bg-stone-800 p-2 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-white" title="Importa">
                <Upload size={18} />
                <input type="file" accept=".md,.json" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={handleExport} className="bg-stone-800 p-2 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-white" title="Esporta">
                <Download size={18} />
            </button>
        </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        <Button
            variant="secondary"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 text-sm"
        >
            <Settings size={18} />
            <span>Impostazioni</span>
        </Button>
      </div>
    </header>
  );

  const renderSettingsPanel = () => (
    isSettingsOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-800/50">
                    <div className="flex items-center gap-2 text-white">
                        <Settings size={18} />
                        <span className="font-bold tracking-tight">Pannello Operativo</span>
                    </div>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-white">
                        <X />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-stone-400 font-semibold">Google Gemini API Key</label>
                        <Input
                            type="password"
                            placeholder="Inserisci la tua API Key"
                            value={apiKey}
                            onChange={handleApiKeyChange}
                            className="text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button onClick={handleManualSave} className="w-full flex items-center gap-2 justify-center">
                            <Save size={16} />
                            <span>Salva Browser</span>
                        </Button>
                        <label className="w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg cursor-pointer border border-stone-700 px-3 py-2 text-sm font-bold">
                            <Upload size={16} />
                            <span>Importa</span>
                            <input type="file" accept=".md,.json" className="hidden" onChange={handleImport} />
                        </label>
                        <Button onClick={handleExport} variant="secondary" className="w-full flex items-center gap-2 justify-center">
                            <Download size={16} />
                            <span>Esporta</span>
                        </Button>
                    </div>

                    <p className="text-xs text-stone-500 leading-relaxed">
                        Le credenziali restano salvate solo nel browser. Usa Importa/Esporta per eseguire backup o spostare i dati su un altro dispositivo.
                    </p>
                </div>
            </div>
        </div>
    )
  );

  const renderOnboarding = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-2xl w-full bg-stone-800/80 backdrop-blur p-6 md:p-8 rounded-2xl border border-stone-700 shadow-2xl">
        {appState.currentPlan.length > 0 && (
             <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-stone-400 hover:text-white mb-4">
                <ArrowLeft size={20} /> Torna alla Dashboard
             </button>
        )}
        
        <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-military-700 rounded-full flex items-center justify-center border-2 border-military-500">
                <User size={28} className="text-white"/>
            </div>
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Setup Operativo</h2>
                <p className="text-stone-400 text-sm">Parametri missione settimanale.</p>
            </div>
        </div>

        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-300">Sedute settimanali</label>
                <div className="flex gap-2">
                    {[2, 3, 4, 5, 6].map(num => (
                        <button 
@@ -532,46 +565,47 @@ const App: React.FC = () => {
                {/* Add Exercise Button */}
                <div className="flex justify-center py-4">
                    <button 
                        onClick={addExercise}
                        disabled={loading}
                        className="flex items-center gap-2 text-stone-400 hover:text-white px-6 py-3 rounded-xl border border-stone-700 border-dashed hover:border-military-500 hover:bg-stone-800 transition-all"
                    >
                        {loading ? <span className="animate-spin">⌛</span> : <Plus />} Aggiungi Esercizio (AI)
                    </button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-stone-900 border-t border-stone-800 md:hidden flex justify-between items-center z-50">
                <span className="text-xs text-stone-400">{progress}% Completato</span>
                <Button onClick={() => finishWorkout(false)} className="bg-green-700 text-sm">
                    Termina Sessione
                </Button>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-stone-950 text-stone-100 overflow-hidden">
      {renderHeader()}
      
      {renderSettingsPanel()}

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {loading && (
            <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-military-500 mb-4"></div>
                <p className="text-military-200 font-bold tracking-wider animate-pulse">{loadingText || "Caricamento..."}</p>
            </div>
        )}
        
        {view === 'onboarding' && renderOnboarding()}
        {view === 'quick-setup' && renderQuickSetup()}
        {view === 'dashboard' && renderDashboard()}
        {view === 'workout' && renderWorkoutView()}
      </main>

      <ChatBot apiKey={apiKey} appState={appState} />
    </div>
  );
};

export default App;
services/gemini.ts
+1
-1

@@ -252,28 +252,28 @@ export const addSingleExercise = async (
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
  const result = await chat.sendMessage(message);
  return result.text;
};
