import React, { useState, useEffect } from 'react';
import { AppState, WorkoutSession, UserStats, Exercise } from './types';
import { generateWeeklyPlan, generateQuickSession, addSingleExercise } from './services/gemini';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { ExerciseCard } from './components/ExerciseCard';
import { ChatBot } from './components/ChatBot';
import { ProgressChart } from './components/ProgressChart';
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
     alert("Dati salvati nel browser!");
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  const generatePlan = async () => {
    if (!apiKey) return alert("Inserisci API Key per procedere.");
    setLoading(true);
    setLoadingText("Elaborazione Piano Settimanale...");
    try {
      const historySummary = appState.history
        .slice(-3)
        .map(h => `${h.dateCreated}: ${h.title}`)
        .join("; ");

      const plan = await generateWeeklyPlan(apiKey, appState.userStats, sessionDurationInput, historySummary);

      setAppState(prev => ({
        ...prev,
        currentPlan: plan
      }));
      setView('dashboard');
    } catch (e) {
      alert("Errore AI: Controlla API Key o Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSession = async () => {
    if (!apiKey) return alert("API Key mancante.");
    setLoading(true);
    setLoadingText("Creazione Sessione Rapida...");
    try {
        const historySummary = appState.history.slice(-3).map(h => h.title).join(", ");
        const session = await generateQuickSession(apiKey, sessionDurationInput, quickSessionFocus, historySummary);

        // Critical: Update state and navigate based on the new session ID
        setAppState(prev => ({
            ...prev,
            currentPlan: [...prev.currentPlan, session]
        }));
        setActiveSessionId(session.id);
        setView('workout');
    } catch (e) {
        alert("Errore generazione sessione rapida.");
    } finally {
        setLoading(false);
    }
  };

  const startWorkout = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setView('workout');
  };

  const updateActiveWorkoutExercise = (updatedEx: Exercise) => {
    if (!activeSessionId) return;

    setAppState(prev => {
        const newPlan = prev.currentPlan.map(session => {
            if (session.id === activeSessionId) {
                return {
                    ...session,
                    exercises: session.exercises.map(ex => ex.id === updatedEx.id ? updatedEx : ex)
                };
            }
            return session;
        });
        return { ...prev, currentPlan: newPlan };
    });
  };

  const deleteExercise = (exId: string) => {
    if (!activeSessionId) return;
    if (!window.confirm("Rimuovere esercizio?")) return;

    setAppState(prev => ({
        ...prev,
        currentPlan: prev.currentPlan.map(s => {
            if (s.id === activeSessionId) {
                return { ...s, exercises: s.exercises.filter(ex => ex.id !== exId) };
            }
            return s;
        })
    }));
  };

  const addExercise = async () => {
      if (!activeSessionId || !apiKey) return;
      setLoading(true);
      setLoadingText("Aggiunta esercizio...");
      try {
          const session = appState.currentPlan.find(s => s.id === activeSessionId);
          const newEx = await addSingleExercise(apiKey, session?.title || "Generico");

          setAppState(prev => ({
            ...prev,
            currentPlan: prev.currentPlan.map(s => {
                if (s.id === activeSessionId) {
                    return { ...s, exercises: [...s.exercises, newEx] };
                }
                return s;
            })
          }));
      } catch (e) {
          alert("Errore aggiunta esercizio");
      } finally {
          setLoading(false);
      }
  };

  const finishWorkout = (forceFinish: boolean = false) => {
    if (!activeSessionId) return;

    const session = appState.currentPlan.find(s => s.id === activeSessionId);
    if (!session) return;

    if (!forceFinish && !window.confirm("Terminare e salvare la sessione?")) return;

    const completedSession: WorkoutSession = {
        ...session,
        completed: true,
        completedDate: new Date().toISOString()
    };

    setAppState(prev => ({
        ...prev,
        history: [...prev.history, completedSession],
        currentPlan: prev.currentPlan.filter(s => s.id !== activeSessionId)
    }));

    setActiveSessionId(null);
    setView('dashboard');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(appState, null, 2);
    const mdContent = `# AeroFit Data Export\n\`\`\`json\n${dataStr}\n\`\`\``;
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aerofit_data_${new Date().toISOString().slice(0,10)}.md`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
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
    <header className="hidden md:flex bg-stone-900 border-b border-stone-800 p-4 z-40 flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => appState.currentPlan.length > 0 && setView('dashboard')}>
            <div className="bg-military-600 p-2 rounded-lg text-white shadow-lg shadow-military-900/50">
            <Dumbbell size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-military-100 hidden sm:block">AEROFIT<span className="text-military-500">COACH</span></h1>
        </div>
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

  const renderMobileSettingsFab = () => (
    <button
        onClick={() => setIsSettingsOpen(true)}
        className="md:hidden fixed top-4 right-4 bg-stone-900/90 border border-stone-700 p-3 rounded-xl shadow-lg shadow-stone-900/80 text-white flex items-center gap-2"
        aria-label="Apri impostazioni"
    >
        <Settings size={18} />
        <span className="text-sm font-semibold">Impostazioni</span>
    </button>
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
                            key={num}
                            onClick={() => setAppState(s => ({...s, userStats: {...s.userStats, sessionsPerWeek: num}}))}
                            className={`flex-1 py-3 rounded-lg border font-bold transition-all ${appState.userStats.sessionsPerWeek === num ? 'bg-military-600 border-military-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-500 hover:bg-stone-700'}`}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-semibold text-stone-300">Durata Standard (min)</label>
                 <input
                    type="range"
                    min="30" max="120" step="15"
                    value={sessionDurationInput}
                    onChange={(e) => setSessionDurationInput(parseInt(e.target.value))}
                    className="w-full accent-military-500 h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer"
                 />
                 <div className="flex justify-between text-xs text-stone-500 font-mono">
                    <span>30</span>
                    <span className="text-military-400 font-bold text-lg">{sessionDurationInput}m</span>
                    <span>120</span>
                 </div>
            </div>

            <Button onClick={generatePlan} isLoading={loading} className="w-full py-4 text-lg mt-4">
                GENERA PIANO SETTIMANALE
            </Button>
        </div>
      </div>
    </div>
  );

  const renderQuickSetup = () => (
      <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fadeIn">
        <div className="max-w-md w-full bg-stone-800 p-8 rounded-xl border border-stone-700 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Zap className="text-yellow-500" /> Sessione Rapida
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-stone-400 mb-2">Focus Muscolare</label>
                    <div className="grid grid-cols-2 gap-2">
                        {["Full Body", "Upper Body", "Lower Body", "Cardio & Abs"].map(f => (
                            <button
                                key={f}
                                onClick={() => setQuickSessionFocus(f)}
                                className={`p-2 rounded border text-sm ${quickSessionFocus === f ? 'bg-military-600 border-military-400 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-stone-400 mb-2">Tempo a disposizione</label>
                    <input
                        type="range" min="20" max="90" step="10"
                        value={sessionDurationInput}
                        onChange={(e) => setSessionDurationInput(parseInt(e.target.value))}
                        className="w-full accent-yellow-500 h-2 bg-stone-700 rounded appearance-none"
                    />
                    <div className="text-center font-mono text-xl text-yellow-500 font-bold mt-1">
                        {sessionDurationInput} min
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" onClick={() => setView('dashboard')} className="flex-1">Annulla</Button>
                    <Button onClick={handleQuickSession} isLoading={loading} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white border-none">
                        Avvia
                    </Button>
                </div>
            </div>
        </div>
      </div>
  );

  const renderDashboard = () => (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
             <div>
                <h2 className="text-3xl font-bold text-white mb-1">Centro Comando</h2>
                <p className="text-stone-400 text-sm">Benvenuto, Tenente.</p>
             </div>
             <div className="flex gap-2 w-full md:w-auto">
                <Button variant="secondary" onClick={() => setView('onboarding')} className="text-sm flex-1 md:flex-none">
                    <Settings size={16} /> Parametri
                </Button>
             </div>
        </div>

        {/* Stats & Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <ProgressChart history={appState.history} />
            </div>

            <div className="space-y-4">
                 {/* Quick Session Tile */}
                <div
                    onClick={() => setView('quick-setup')}
                    className="bg-gradient-to-br from-yellow-900/40 to-stone-900 p-6 rounded-xl border border-yellow-700/30 cursor-pointer hover:border-yellow-500 transition-all group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <Zap className="text-yellow-500 group-hover:scale-110 transition-transform" size={28} />
                        <span className="text-xs font-bold bg-yellow-900/50 text-yellow-200 px-2 py-1 rounded">ONE-OFF</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Sessione Rapida</h3>
                    <p className="text-stone-400 text-xs mt-1">Crea un allenamento singolo basato sul tempo attuale.</p>
                </div>

                <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                    <h3 className="text-military-200 font-bold mb-4 uppercase tracking-wider text-sm">Stato Servizio</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-stone-400">
                            <span>Piano</span>
                            <span className="text-white">{appState.userStats.sessionsPerWeek} / week</span>
                        </div>
                        <div className="flex justify-between text-stone-400">
                            <span>Completati</span>
                            <span className="text-green-400 font-bold">{appState.history.length}</span>
                        </div>
                        {appState.currentPlan.length === 0 && (
                            <Button onClick={() => setView('onboarding')} className="w-full mt-2 py-2 text-xs">
                                Genera Nuova Scheda
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Workout Grid */}
        <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-military-500"/>
                Scheda Attiva
            </h3>
            {appState.currentPlan.length === 0 ? (
                <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-stone-800 border-dashed">
                    <p className="text-stone-500">Nessuna missione programmata.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appState.currentPlan.map((session, idx) => (
                        <div
                            key={session.id}
                            onClick={() => startWorkout(session.id)}
                            className={`bg-stone-800 rounded-xl overflow-hidden border transition-all group cursor-pointer hover:shadow-2xl hover:-translate-y-1 ${session.isQuickSession ? 'border-yellow-700/50 hover:border-yellow-500' : 'border-stone-700 hover:border-military-500'}`}
                        >
                            <div className={`p-4 border-b flex justify-between items-center ${session.isQuickSession ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-stone-900 border-stone-800'}`}>
                                <span className="font-bold text-lg text-white truncate">{session.title}</span>
                                <span className="text-xs font-mono text-stone-500 flex items-center gap-1 shrink-0">
                                    <Clock size={12} /> {session.durationMinutes}m
                                </span>
                            </div>
                            <div className="p-4 flex flex-col h-full">
                                <ul className="space-y-1 mb-6 flex-1">
                                    {session.exercises.slice(0, 3).map(ex => (
                                        <li key={ex.id} className="text-sm text-stone-400 truncate flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${ex.isCompleted ? 'bg-green-500' : 'bg-stone-600'}`}></span>
                                            {ex.name}
                                        </li>
                                    ))}
                                    {session.exercises.length > 3 && <li className="text-xs text-stone-500 italic">+ altri {session.exercises.length - 3}</li>}
                                </ul>
                                <Button className={`w-full ${session.isQuickSession ? 'bg-yellow-700 hover:bg-yellow-600' : ''}`}>
                                    INIZIA
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );

  const renderWorkoutView = () => {
    const session = appState.currentPlan.find(s => s.id === activeSessionId);
    if (!session) {
        // Fallback if session disappeared
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <p className="text-stone-400 mb-4">Sessione non trovata o completata.</p>
                <Button onClick={() => setView('dashboard')}>Torna alla Base</Button>
            </div>
        );
    }

    const completedCount = session.exercises.filter(e => e.isCompleted).length;
    const progress = Math.round((completedCount / session.exercises.length) * 100);

    return (
        <div className="max-w-4xl mx-auto p-4 pb-32 animate-fadeIn">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 sticky top-0 bg-stone-950/95 backdrop-blur z-30 py-4 border-b border-stone-800">
                <button onClick={() => setView('dashboard')} className="p-2 hover:bg-stone-800 rounded-full text-stone-400">
                    <ChevronLeft />
                </button>
                <div className="flex-1 w-full overflow-hidden">
                    <h2 className="text-xl md:text-2xl font-bold text-white truncate">{session.title}</h2>
                    <div className="w-full bg-stone-800 h-2 rounded-full mt-2 overflow-hidden">
                        <div className="bg-military-500 h-full transition-all duration-500" style={{width: `${progress}%`}}></div>
                    </div>
                </div>
                 <div className="hidden md:block shrink-0">
                     <Button onClick={() => finishWorkout(false)} variant="primary" className="bg-green-700 hover:bg-green-600">
                        Termina
                    </Button>
                </div>
            </div>

            <div className="space-y-8">
                {session.exercises.map((ex, idx) => (
                    <div key={ex.id} className="relative pl-0 md:pl-8">
                        {/* Desktop Index Marker */}
                        <div className="absolute left-0 top-6 -translate-x-1/2 hidden md:flex flex-col items-center h-full">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-colors ${ex.isCompleted ? 'bg-green-900 border-green-600 text-green-400' : 'bg-stone-800 border-stone-600 text-stone-300'}`}>
                                {idx + 1}
                            </div>
                            <div className="w-0.5 flex-1 bg-stone-800 my-2"></div>
                        </div>

                        <ExerciseCard
                            exercise={ex}
                            apiKey={apiKey}
                            onUpdate={updateActiveWorkoutExercise}
                            onDelete={deleteExercise}
                        />
                    </div>
                ))}

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
      {renderMobileSettingsFab()}
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
