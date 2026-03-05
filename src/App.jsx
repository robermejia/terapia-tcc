import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './components/ui';
import { 
  Heart, BookOpen, Calendar, Settings, ChevronRight, 
  MessageSquare, User, LogOut, CheckCircle2, History, 
  ArrowLeft, Cross, ShieldCheck, BarChart3, Sliders,
  Cloud, Sun, Wind, Loader
} from 'lucide-react';
import { DAILY_QUOTES, CALM_PRAYERS, MOOD_REFLECTIONS } from './data/catholic';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, setDoc, getDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';

// --- Mock Data ---
const MOTIVATIONAL_PHRASES = {
  psychological: "Tus pensamientos no son hechos. Tú tienes el poder de cuestionarlos.",
  spiritual: "En la quietud encontrarás la fuerza. Dios camina a tu lado en cada paso."
};

const EMOTIONS = [
  { emoji: '😔', label: 'Triste' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '🙂', label: 'Bien' },
  { emoji: '😊', label: 'Feliz' },
  { emoji: '🤩', label: 'Radiante' },
  // Extended emotions
  { emoji: '😡', label: 'Enojado' },
  { emoji: '😰', label: 'Ansioso' },
  { emoji: '😴', label: 'Cansado' },
  { emoji: '😔', label: 'Culpable' },
  { emoji: '🙏', label: 'Agradecido' },
  { emoji: '😤', label: 'Frustrado' },
  { emoji: '💪', label: 'Motivado' },
  { emoji: '🫠', label: 'Abrumado' },
  { emoji: '🌟', label: 'Esperanzado' },
];

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('login');
  const [catholicEnabled, setCatholicEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mood, setMood] = useState(null);
  const [tccStep, setTccStep] = useState(0);
  const [tccAnswers, setTccAnswers] = useState(['', '', '5', '', '']);
  const [logs, setLogs] = useState([]);
  const [localLogs, setLocalLogs] = useState(() => {
    const saved = localStorage.getItem('tcc_local_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [habits, setHabits] = useState([]);

  // ─── Firebase Auth listener ───────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({ name: firebaseUser.displayName, email: firebaseUser.email, uid: firebaseUser.uid, photo: firebaseUser.photoURL });
        setView('dashboard');
        // Load user settings from Firestore
        const settingsRef = doc(db, 'users', firebaseUser.uid, 'settings', 'prefs');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const prefs = snap.data();
          if (prefs.catholicEnabled) setCatholicEnabled(true);
          if (prefs.darkMode) {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
          }
        }
        // Also respect local theme preference
        const savedTheme = localStorage.getItem('tcc_theme');
        if (savedTheme === 'dark') {
          setDarkMode(true);
          document.documentElement.classList.add('dark');
        }
      } else {
        setUser(null);
        setView('login');
        setLogs([]);
        setHabits([]);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Firestore: real-time listeners for logs and habits ───────────────────
  useEffect(() => {
    if (!user?.uid) return;
    // Logs listener
    const logsQuery = query(collection(db, 'users', user.uid, 'logs'), orderBy('date', 'desc'));
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // Habits listener
    const habitsQuery = query(collection(db, 'users', user.uid, 'habits'), orderBy('createdAt', 'asc'));
    const unsubHabits = onSnapshot(habitsQuery, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubLogs(); unsubHabits(); };
  }, [user?.uid]);

  // ─── Helper: save user settings ───────────────────────────────────────────
  const saveSettings = async (patch) => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid, 'settings', 'prefs');
    await setDoc(ref, patch, { merge: true });
  };

  // ─── Habits CRUD ──────────────────────────────────────────────────────────
  const persistHabits = async (habitId, updatedFields) => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid, 'habits', habitId);
    await updateDoc(ref, updatedFields);
  };

  const addHabitToFirestore = async (label) => {
    if (!user?.uid) return;
    await addDoc(collection(db, 'users', user.uid, 'habits'), {
      label,
      completedDates: [],
      createdAt: serverTimestamp()
    });
  };

  const deleteHabitFromFirestore = async (id) => {
    if (!user?.uid) return;
    await deleteDoc(doc(db, 'users', user.uid, 'habits', id));
  };

  // ─── Logs CRUD ────────────────────────────────────────────────────────────
  const saveLog = async (type, content, data = {}) => {
    const timestamp = new Date().toISOString();
    const id = `local_${Date.now()}`;
    
    if (type === 'tcc_record') {
      const newLog = { id, date: timestamp, type, content, data };
      const updatedLocal = [newLog, ...localLogs];
      setLocalLogs(updatedLocal);
      localStorage.setItem('tcc_local_logs', JSON.stringify(updatedLocal));
      return;
    }

    if (!user?.uid) return;
    await addDoc(collection(db, 'users', user.uid, 'logs'), {
      date: timestamp,
      type,
      content,
      data
    });
  };

  const deleteLog = async (id) => {
    // Check if it's a local log
    if (id.toString().startsWith('local_')) {
      const updatedLocal = localLogs.filter(l => l.id !== id);
      setLocalLogs(updatedLocal);
      localStorage.setItem('tcc_local_logs', JSON.stringify(updatedLocal));
      return;
    }

    if (!user?.uid) return;
    await deleteDoc(doc(db, 'users', user.uid, 'logs', id));
  };

  const updateLog = async (id, patch) => {
    // Check if it's a local log
    if (id.toString().startsWith('local_')) {
      const updatedLocal = localLogs.map(l => l.id === id ? { ...l, ...patch } : l);
      setLocalLogs(updatedLocal);
      localStorage.setItem('tcc_local_logs', JSON.stringify(updatedLocal));
      return;
    }

    if (!user?.uid) return;
    await updateDoc(doc(db, 'users', user.uid, 'logs', id), patch);
  };

  // ─── Auth actions ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const toggleCatholic = () => {
    const newState = !catholicEnabled;
    setCatholicEnabled(newState);
    saveSettings({ catholicEnabled: newState });
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tcc_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tcc_theme', 'light');
    }
    saveSettings({ darkMode: newMode });
  };


  // --- Data Management ---

  const exportJSON = () => {
    const data = { user, catholicEnabled, darkMode, logs, localLogs, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tcc_data_${new Date().getTime()}.json`;
    link.click();
  };

  const exportCSV = () => {
    const allLogs = [...logs, ...localLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (allLogs.length === 0) {
      alert("No hay datos para exportar");
      return;
    }
    const headers = ["Fecha", "Tipo", "Contenido"];
    const rows = allLogs.map(l => [l.date, l.type, `"${l.content.replace(/"/g, '""')}"`]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tcc_data_${new Date().getTime()}.csv`;
    link.click();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.localLogs) {
          setLocalLogs(data.localLogs);
          localStorage.setItem('tcc_local_logs', JSON.stringify(data.localLogs));
        }
        
        // If we want to import other things to Firestore, we'd need a loop.
        // For now, let's at least restore local state if present.
        if (data.catholicEnabled !== undefined) {
          setCatholicEnabled(data.catholicEnabled);
          saveSettings({ catholicEnabled: data.catholicEnabled });
        }
        
        alert("Datos locales importados con éxito. Los registros TCC han sido restaurados.");
      } catch (err) {
        alert("Error al importar el archivo JSON");
      }
    };
    reader.readAsText(file);
  };

  // --- Views ---

  const LoginView = () => (
    <div className="flex-1 flex flex-col justify-center items-center p-8 space-y-12 animate-fade-in text-center dark:bg-slate-900">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-[hsl(var(--brand))] rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-[hsl(var(--brand)/0.2)]">
          <Heart className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">Terapia TCC</h1>
        <p className="text-subtle max-w-[280px]">Tu compañero para el bienestar emocional y espiritual.</p>
      </div>

      <div className="w-full space-y-6">
        <Button variant="google" onClick={handleLogin} className="py-4">
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Continuar con Google
        </Button>
        <div className="flex items-center gap-2 justify-center py-2">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span className="text-xs text-subtle">Privacidad y seguridad garantizada</span>
        </div>
      </div>

      <footer className="text-xs text-subtle opacity-70">
        Al continuar, aceptas que esta es una herramienta de acompañamiento, no un sustituto de terapia profesional.
      </footer>
    </div>
  );

  const DashboardView = () => {
    const [showAllEmotions, setShowAllEmotions] = useState(false);
    const visibleEmotions = showAllEmotions ? EMOTIONS : EMOTIONS.slice(0, 5);

    return (
    <div className="flex-1 pb-24 animate-fade-in w-full">
      {/* Header Profile */}
      <div className="p-6 flex justify-between items-center bg-gradient-to-b from-[hsl(var(--brand)/0.05)] to-transparent max-w-7xl mx-auto w-full">
        <div>
          <h2 className="text-xl font-bold dark:text-white text-slate-800">Hola, {user?.name.split(' ')[0]}</h2>
          <p className="text-subtle">¿Cómo va tu día?</p>
        </div>
        <button onClick={() => setView('settings')} className="w-12 h-12 rounded-2xl bg-[hsl(var(--secondary))] flex items-center justify-center text-[hsl(var(--secondary-foreground))] shadow-sm overflow-hidden border-2 border-white dark:border-slate-800">
          <User className="w-6 h-6" />
        </button>
      </div>

      <div className="px-6 space-y-8 max-w-7xl mx-auto w-full">
        {/* Top Grid: Mood + Phrase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand)/0.8)] text-white border-none shadow-xl shadow-[hsl(var(--brand)/0.2)]">
            <h3 className="text-lg font-semibold mb-1">Resumen Emocional</h3>
            <p className="text-white/80 mb-4 text-sm">¿Cómo estás ahora?</p>
            <div className={`grid gap-2 transition-all ${showAllEmotions ? 'grid-cols-5' : 'grid-cols-5'}`}>
              {visibleEmotions.map((e, i) => (
                <button 
                  key={i} 
                  title={e.label}
                  onClick={() => {
                    setMood(i);
                    saveLog('mood', `Estado de ánimo: ${e.label}`, { emoji: e.emoji, level: i });
                  }}
                  className={`text-2xl p-2 rounded-2xl transition-all duration-300 ${mood === i ? 'bg-white text-black scale-105 shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {e.emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAllEmotions(!showAllEmotions)}
              className="mt-3 text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors w-full text-center"
            >
              {showAllEmotions ? '▲ Menos emociones' : '▼ Más emociones'}
            </button>
          </Card>
          
          <div className="lg:col-span-2 bg-[hsl(var(--accent))] dark:bg-slate-800 dark:border-slate-700 border border-orange-100 rounded-3xl p-6 relative overflow-hidden flex items-center shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/10 rounded-full -mr-12 -mt-12" />
            <p className="text-lg italic text-[hsl(var(--accent-foreground))] dark:text-blue-200 leading-relaxed relative z-10 w-full pl-4 border-l-4 border-[hsl(var(--brand))]">
              "{catholicEnabled ? MOTIVATIONAL_PHRASES.spiritual : MOTIVATIONAL_PHRASES.psychological}"
            </p>
          </div>
        </div>

        {/* Desktop Optimization: Split content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Actions (Center/Left) */}
          <div className="lg:col-span-8 space-y-8">
            <section>
              <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-white"><Sliders className="w-5 h-5 text-[hsl(var(--brand))]" /> Módulos de Terapia</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuickAction 
                  icon={<BookOpen className="text-blue-500" />} 
                  title="Registro TCC" 
                  desc="Analizar pensamientos"
                  onClick={() => setView('register-tcc')}
                />
                <QuickAction 
                  icon={<Wind className="text-teal-500" />} 
                  title="Regulación" 
                  desc="Pausa y calma"
                  onClick={() => setView('emotions')}
                />
                {catholicEnabled && (
                  <QuickAction 
                    icon={<Cross className="text-purple-500" />} 
                    title="Espiritual" 
                    desc="Reflexión diaria"
                    onClick={() => setView('catholic')}
                  />
                )}
                <QuickAction 
                  icon={<History className="text-slate-500" />} 
                  title="Diario" 
                  desc="Escritura libre"
                  onClick={() => setView('journal')}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold dark:text-white">Metas de hoy</h3>
                <button onClick={() => setView('habits')} className="text-xs text-[hsl(var(--brand))] font-medium">Gestionar hábitos →</button>
              </div>
              {(() => {
                const today = new Date().toDateString();
                const toggleFromDash = (id) => {
                  const habit = habits.find(h => h.id === id);
                  if (!habit) return;
                  const doneToday = habit.completedDates.includes(today);
                  persistHabits(id, {
                    completedDates: doneToday
                      ? habit.completedDates.filter(d => d !== today)
                      : [...habit.completedDates, today]
                  });
                };
                if (habits.length === 0) {
                  return (
                    <div onClick={() => setView('habits')} className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl cursor-pointer hover:border-[hsl(var(--brand)/0.5)] transition-colors text-subtle">
                      <span className="text-2xl">🌱</span>
                      <span className="text-sm font-medium">Aún no tienes hábitos. ¡Crea uno!</span>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {habits.slice(0, 4).map(habit => {
                      const doneToday = habit.completedDates.includes(today);
                      return (
                        <div key={habit.id} onClick={() => toggleFromDash(habit.id)} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-3xl hover:border-[hsl(var(--brand)/0.3)] transition-all cursor-pointer group shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${doneToday ? 'bg-green-500 border-green-500 shadow-md shadow-green-100' : 'border-slate-200 group-hover:border-[hsl(var(--brand))]'}`}>
                              {doneToday && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                            <span className={`text-sm ${doneToday ? 'line-through text-subtle opacity-50' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>{habit.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          </div>

          {/* Sidebar (Desktop only right) */}
          <div className="lg:col-span-4 space-y-6">
             <Card className="dark:bg-slate-800 dark:border-slate-700 bg-white border-slate-100 p-6">
                <h3 className="font-bold flex items-center gap-2 dark:text-white mb-4"><BarChart3 className="w-5 h-5 text-indigo-500" /> Vista Rápida</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs dark:text-slate-400">
                    <span>Estado promedio</span>
                    <span className="font-bold text-green-500">Bien</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
                <Button onClick={() => setView('stats')} variant="outline" className="mt-6 py-2 text-xs">Ver estadísticas detalladas</Button>
             </Card>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const HabitsView = () => {
    const [newHabit, setNewHabit] = useState('');
    const today = new Date().toDateString();

    const addHabit = () => {
      if (!newHabit.trim()) return;
      addHabitToFirestore(newHabit.trim());
      setNewHabit('');
    };

    const toggleHabit = (id) => {
      const habit = habits.find(h => h.id === id);
      if (!habit) return;
      const doneToday = habit.completedDates.includes(today);
      const newDates = doneToday
        ? habit.completedDates.filter(d => d !== today)
        : [...habit.completedDates, today];
      persistHabits(id, { completedDates: newDates });
    };

    const deleteHabit = (id) => deleteHabitFromFirestore(id);

    const getStreakCount = (habit) => {
      let streak = 0;
      let d = new Date();
      while (habit.completedDates.includes(d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
      return streak;
    };

    return (
      <div className="flex-1 p-6 flex flex-col animate-fade-in pb-24 max-w-3xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Gestión de Hábitos</h2>
        </header>

        {/* Add new habit */}
        <div className="flex gap-3 mb-8">
          <input
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            placeholder="Nuevo hábito (ej. 15 min de caminata)..."
            className="flex-1 px-5 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-[hsl(var(--brand))] transition-colors dark:text-white text-sm"
          />
          <Button onClick={addHabit} className="px-6 py-3 rounded-2xl">Agregar</Button>
        </div>

        {/* Habits list */}
        <div className="space-y-4 flex-1">
          {habits.length === 0 && (
            <div className="text-center py-16 text-subtle">
              <div className="text-5xl mb-4">🌱</div>
              <p className="font-bold">No tienes hábitos aún</p>
              <p className="text-sm mt-1">Agrega uno arriba para empezar tu racha</p>
            </div>
          )}
          {habits.map(habit => {
            const doneToday = habit.completedDates.includes(today);
            const streak = getStreakCount(habit);
            return (
              <div key={habit.id} className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl hover:border-[hsl(var(--brand)/0.3)] transition-all shadow-sm group">
                <button
                  onClick={() => toggleHabit(habit.id)}
                  className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${ doneToday ? 'bg-green-500 border-green-500 shadow-md shadow-green-100' : 'border-slate-200 dark:border-slate-600 group-hover:border-[hsl(var(--brand))]' }`}
                >
                  {doneToday && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${ doneToday ? 'line-through text-subtle opacity-50' : 'dark:text-white text-slate-800' }`}>{habit.label}</p>
                  {streak > 0 && <p className="text-xs text-orange-500 font-bold mt-0.5">🔥 Racha: {streak} días</p>}
                </div>
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 text-lg p-1 font-bold"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TccRegistrationView = () => {
    const steps = [
      { field: 'Situación', desc: '¿Qué pasó? Describe el evento brevemente.' },
      { field: 'Pensamiento Automático', desc: '¿Qué cruzó por tu mente en ese instante?' },
      { field: 'Emoción', desc: '¿Cómo te sentiste? (0 a 10)', isScale: true },
      { field: 'Conducta', desc: '¿Qué hiciste en respuesta?' },
      { field: 'Pensamiento Alternativo', desc: '¿Hay otra forma de ver esto?' }
    ];
    
    const current = steps[tccStep];

    return (
      <div className="flex-1 p-6 flex flex-col animate-fade-in max-w-4xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Nuevo Registro TCC</h2>
        </header>

        <div className="flex-1 space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-50 dark:border-slate-700">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] font-bold text-sm">{tccStep + 1}</span>
               <span className="text-xs font-bold text-subtle uppercase tracking-widest">Paso {tccStep + 1} de 5</span>
            </div>
            <h3 className="text-3xl font-bold dark:text-white">{current.field}</h3>
            <p className="text-subtle text-lg">{current.desc}</p>
          </div>

          <div className="pt-6">
            {current.isScale ? (
              <div className="space-y-8">
                <input 
                  type="range" min="0" max="10" 
                  value={tccAnswers[tccStep]}
                  onChange={(e) => {
                    const newAnswers = [...tccAnswers];
                    newAnswers[tccStep] = e.target.value;
                    setTccAnswers(newAnswers);
                  }}
                  className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[hsl(var(--brand))]" 
                />
                <div className="flex justify-between px-2">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                    <span key={v} className="text-xs font-bold text-slate-400">{v}</span>
                  ))}
                </div>
              </div>
            ) : (
              <textarea 
                value={tccAnswers[tccStep]}
                onChange={(e) => {
                  const newAnswers = [...tccAnswers];
                  newAnswers[tccStep] = e.target.value;
                  setTccAnswers(newAnswers);
                }}
                placeholder="Comienza a escribir aquí..." 
                className="w-full h-64 p-6 rounded-3xl border-2 border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-[hsl(var(--brand)/0.1)] focus:border-[hsl(var(--brand))] transition-all resize-none shadow-inner dark:text-white text-lg"
              />
            )}
          </div>
        </div>

        <div className="flex gap-6 mt-8 max-w-2xl mx-auto w-full">
          {tccStep > 0 && (
            <Button variant="outline" onClick={() => setTccStep(tccStep - 1)} className="flex-1 py-4">Volver</Button>
          )}
          <Button 
            onClick={() => {
              if (tccStep < 4) {
                setTccStep(tccStep + 1);
              } else {
                saveLog('tcc_record', 'Registro TCC Completo', { answers: tccAnswers });
                setTccStep(0);
                setTccAnswers(['', '', '5', '', '']);
                setView('dashboard');
              }
            }} 
            className="flex-1 py-4 shadow-xl shadow-[hsl(var(--brand)/0.2)]"
          >
            {tccStep < 4 ? 'Continuar' : 'Guardar Registro'}
          </Button>
        </div>
      </div>
    );
  };

  const EmotionalRegulationView = () => {
    const [activeTech, setActiveTech] = useState(null); // '4-7-8', 'grounding'
    const [isActive, setIsActive] = useState(false);
    
    // Timer state for 4-7-8
    const [phase, setPhase] = useState('inhale'); // 'inhale' (4s), 'hold' (7s), 'exhale' (8s)
    const [timeLeft, setTimeLeft] = useState(4);

    // Grounding state
    const [groundingStep, setGroundingStep] = useState(0);
    const groundingItems = [
      { count: 5, action: 'Cosas que puedes VER', example: 'Una ventana, un lápiz, el cielo...' },
      { count: 4, action: 'Cosas que puedes TOCAR', example: 'La textura de tu ropa, la silla, tus manos...' },
      { count: 3, action: 'Cosas que puedes OÍR', example: 'El viento, un reloj, coches a lo lejos...' },
      { count: 2, action: 'Cosas que puedes OLER', example: 'Café, perfume, aire fresco...' },
      { count: 1, action: 'Cosa que puedes SABOREAR', example: 'Un caramelo, agua, el sabor en tu boca...' }
    ];

    useEffect(() => {
      let interval = null;
      if (isActive && activeTech === '4-7-8') {
        interval = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev > 1) return prev - 1;
            // Phase transitions
            if (phase === 'inhale') {
              setPhase('hold');
              return 7;
            } else if (phase === 'hold') {
              setPhase('exhale');
              return 8;
            } else {
              setPhase('inhale');
              return 4;
            }
          });
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [isActive, activeTech, phase]);

    const handleSelectTech = (tech) => {
      setActiveTech(tech);
      setIsActive(false);
      if (tech === '4-7-8') {
        setPhase('inhale');
        setTimeLeft(4);
      } else if (tech === 'grounding') {
        setGroundingStep(0);
      }
    };

    const toggleTimer = () => setIsActive(!isActive);

    // Dynamic styles for the breathing circle
    let circleScale = 1;
    let circleDuration = '1s';
    let phaseLabel = 'Pausa Consciente';
    let instruction = 'Tómate un minuto para conectar con tu respiración.';

    if (activeTech === '4-7-8') {
      instruction = 'Toca el círculo para empezar el ciclo 4-7-8.';
      if (isActive) {
        if (phase === 'inhale') {
          circleScale = 1.3;
          circleDuration = '4s';
          phaseLabel = 'Inhala...';
        } else if (phase === 'hold') {
          circleScale = 1.3;
          circleDuration = '0.5s'; // subtle pulse can be done via class, keeping static here
          phaseLabel = 'Sostén...';
        } else if (phase === 'exhale') {
          circleScale = 0.8;
          circleDuration = '8s';
          phaseLabel = 'Exhala...';
        }
      } else {
        phaseLabel = 'Iniciar';
      }
    } else if (activeTech === 'grounding') {
      phaseLabel = groundingItems[groundingStep].count.toString();
      instruction = groundingItems[groundingStep].action;
    }

    return (
      <div className="flex-1 p-6 flex flex-col animate-fade-in pb-24 max-w-2xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Regulación Emocional</h2>
        </header>

        <div className="space-y-12">
          {/* Visualizer Area */}
          <section className="text-center space-y-6">
            <div 
              onClick={() => {
                if (activeTech === '4-7-8') toggleTimer();
                if (activeTech === 'grounding' && groundingStep < 4) setGroundingStep(s => s + 1);
                if (activeTech === 'grounding' && groundingStep === 4) handleSelectTech(null); // Finish grounding
              }}
              className={`mx-auto w-48 h-48 rounded-full border-8 flex items-center justify-center relative group cursor-pointer transition-all ease-in-out select-none
                ${activeTech === '4-7-8' && isActive && phase === 'hold' ? 'animate-pulse border-teal-300' : 'border-[hsl(var(--brand)/0.1)] hover:border-[hsl(var(--brand)/0.3)]'}
              `}
              style={{ 
                transform: `scale(${circleScale})`, 
                transitionDuration: circleDuration,
                backgroundColor: activeTech === '4-7-8' && isActive ? (phase === 'inhale' ? 'rgba(45, 212, 191, 0.1)' : phase === 'hold' ? 'rgba(45, 212, 191, 0.2)' : 'rgba(56, 189, 248, 0.1)') : 'transparent'
              }}
            >
              <div className="text-center z-10 transition-transform duration-300" style={{ transform: `scale(${1 / circleScale})` }}>
                {activeTech === '4-7-8' && isActive ? (
                  <>
                    <div className="text-5xl font-black text-[hsl(var(--brand))] mb-1">{timeLeft}</div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{phaseLabel}</span>
                  </>
                ) : activeTech === 'grounding' ? (
                   <>
                    <div className="text-5xl font-black text-green-500 mb-1">{phaseLabel}</div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sentidos</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-10 h-10 text-[hsl(var(--brand))] mx-auto mb-2 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Respirar</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="h-16">
               <h3 className="text-xl font-bold text-slate-800 dark:text-white transition-all">{instruction}</h3>
               {activeTech === 'grounding' && (
                 <p className="text-sm text-subtle mt-2 animate-fade-in">{groundingItems[groundingStep].example}</p>
               )}
            </div>
            
            {activeTech && (
              <button 
                onClick={() => handleSelectTech(null)} 
                className="text-xs font-bold text-subtle hover:text-slate-800 dark:hover:text-white uppercase tracking-widest mt-4"
              >
                Parar Actividad
              </button>
            )}
          </section>

          {/* Recommended Techniques List (Hide when active to focus) */}
          {!activeTech && (
            <section className="space-y-4 animate-fade-in">
              <h3 className="font-bold dark:text-white">Técnicas recomendadas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card 
                  onClick={() => handleSelectTech('4-7-8')}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:border-blue-300 transition-colors dark:bg-slate-800 dark:border-slate-700"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center"><Wind className="text-blue-500" /></div>
                  <div><h4 className="font-bold text-sm dark:text-white">Respiración 4-7-8</h4><p className="text-xs text-subtle">Para reducir la ansiedad</p></div>
                </Card>
                <Card 
                  onClick={() => handleSelectTech('grounding')}
                  className="flex items-center gap-4 p-4 cursor-pointer hover:border-green-300 transition-colors dark:bg-slate-800 dark:border-slate-700"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center"><CheckCircle2 className="text-green-500" /></div>
                  <div><h4 className="font-bold text-sm dark:text-white">Grounding (5-4-3-2-1)</h4><p className="text-xs text-subtle">Para momentos de activación</p></div>
                </Card>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  };

  const CatholicView = () => {
    const [subView, setSubView] = useState('main'); // 'main', 'examen', 'oraciones'
    
    // Examen state
    const [examenStep, setExamenStep] = useState(0);
    const [examenAnswers, setExamenAnswers] = useState(['', '', '']);
    const EXAMEN_QUESTIONS = [
      { title: "Agradecimiento", desc: "¿Por qué tres cosas, por muy pequeñas que sean, le das gracias a Dios hoy?" },
      { title: "Fallas y Misericordia", desc: "¿En qué momento de hoy no amaste como debías? Pide perdón con confianza." },
      { title: "Propósito de enmienda", desc: "¿Qué propósito concreto te haces para mañana con la ayuda de la gracia?" }
    ];

    // Calculamos el día del año para rotar la frase diaria
    const getDayOfYear = () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now - start;
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay);
    };
    
    const dayOfYear = getDayOfYear();
    // Use modulo so we don't go out of bounds of our quotes array
    const dailyQuoteIndex = dayOfYear % DAILY_QUOTES.length;
    const todayQuote = DAILY_QUOTES[dailyQuoteIndex];

    // Combine logs for reflections
    const allLogs = [...logs, ...localLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const moodLogs = allLogs.filter(log => log.type === 'mood');
    const latestMoodRecord = moodLogs.length > 0 ? moodLogs[0].data.level : null;
    
    // Default to 'Neutral' if no mood has been set
    const reflectionData = MOOD_REFLECTIONS[latestMoodRecord !== null ? latestMoodRecord : 1];

    if (subView === 'examen') {
      const currentQ = EXAMEN_QUESTIONS[examenStep];
      return (
        <div className="flex-1 p-6 flex flex-col animate-fade-in max-w-4xl mx-auto w-full">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={() => setSubView('main')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold dark:text-white">Examen de Conciencia</h2>
          </header>

          <div className="flex-1 space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-50 dark:border-slate-700">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] font-bold text-sm">{examenStep + 1}</span>
                 <span className="text-xs font-bold text-subtle uppercase tracking-widest">Paso {examenStep + 1} de 3</span>
              </div>
              <h3 className="text-3xl font-bold dark:text-white">{currentQ.title}</h3>
              <p className="text-subtle text-lg">{currentQ.desc}</p>
            </div>
            <div className="pt-6">
               <textarea 
                  value={examenAnswers[examenStep]}
                  onChange={(e) => {
                    const newAnswers = [...examenAnswers];
                    newAnswers[examenStep] = e.target.value;
                    setExamenAnswers(newAnswers);
                  }}
                  placeholder="Señor, hoy agradezco por..." 
                  className="w-full h-64 p-6 rounded-3xl border-2 border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-[hsl(var(--brand)/0.1)] focus:border-[hsl(var(--brand))] transition-all resize-none shadow-inner dark:text-white text-lg"
                />
            </div>
          </div>

          <div className="flex gap-6 mt-8 max-w-2xl mx-auto w-full">
            {examenStep > 0 && (
              <Button variant="outline" onClick={() => setExamenStep(examenStep - 1)} className="flex-1 py-4">Volver</Button>
            )}
            <Button 
              onClick={() => {
                if (examenStep < 2) {
                  setExamenStep(examenStep + 1);
                } else {
                  saveLog('journal', 'Examen de Conciencia Nocturno', { text: `1. Agradecimiento:\n${examenAnswers[0]}\n\n2. Fallas:\n${examenAnswers[1]}\n\n3. Propósito:\n${examenAnswers[2]}` });
                  setExamenStep(0);
                  setExamenAnswers(['', '', '']);
                  setSubView('main');
                  setView('dashboard');
                }
              }} 
              className="flex-1 py-4 shadow-xl shadow-[hsl(var(--brand)/0.2)]"
            >
              {examenStep < 2 ? 'Continuar' : 'Terminar y Guardar'}
            </Button>
          </div>
        </div>
      );
    }

    if (subView === 'oraciones') {
      return (
        <div className="flex-1 p-6 flex flex-col animate-fade-in pb-24 max-w-3xl mx-auto w-full">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={() => setSubView('main')} className="p-2 hover:bg-[hsl(var(--accent))] rounded-xl transition-colors dark:text-white dark:hover:bg-slate-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold dark:text-white">Oraciones de Calma</h2>
          </header>
          <div className="space-y-6">
            <p className="text-subtle mb-4">Encuentra paz en estas palabras inspiradas cuando sientas ansiedad o temor.</p>
            {CALM_PRAYERS.map((prayer, i) => (
              <Card key={i} className="p-8 dark:bg-slate-800 dark:border-slate-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-3 dark:text-white"><Heart className="w-5 h-5 text-indigo-400" /> {prayer.title}</h3>
                <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed italic">{prayer.text}</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-6 flex flex-col animate-fade-in pb-24 max-w-2xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] rounded-xl transition-colors dark:text-white dark:hover:bg-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Psicología Católica</h2>
        </header>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-none p-6 shadow-xl shadow-purple-200 dark:shadow-none">
            <Cross className="w-8 h-8 opacity-40 mb-2" />
            <h3 className="text-lg font-bold">Reflexión del día</h3>
            <p className="text-white/90 mt-2 text-sm leading-relaxed">
              "{todayQuote.split(' - ')[0]}" 
              <br/><span className="text-xs opacity-70 mt-2 block">- {todayQuote.split(' - ')[1]}</span>
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div onClick={() => setSubView('examen')} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-3xl p-6 flex flex-col items-center text-center space-y-3 hover:shadow-md transition-shadow cursor-pointer">
              <History className="w-8 h-8 text-purple-400" />
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Examen de Conciencia</h4>
            </div>
            <div onClick={() => setSubView('oraciones')} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-3xl p-6 flex flex-col items-center text-center space-y-3 hover:shadow-md transition-shadow cursor-pointer">
              <Heart className="w-8 h-8 text-indigo-400" />
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Oraciones de Calma</h4>
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white">Emociones y Fe</h3>
            <Card className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40 space-y-2">
              <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-300">{reflectionData.title}</h4>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-200/70 italic leading-relaxed">{reflectionData.text}</p>
            </Card>
          </section>
        </div>
      </div>
    );
  };

  const SettingsView = () => (
    <div className="flex-1 p-6 animate-fade-in pb-24 max-w-3xl mx-auto w-full">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold dark:text-white">Configuración</h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Card */}
        <section className="flex flex-col items-center space-y-4 md:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[hsl(var(--brand))] to-teal-300 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden text-white">
              <User className="w-14 h-14" />
            </div>
            <div className="absolute bottom-1 right-1 p-2 bg-green-500 border-4 border-white dark:border-slate-800 rounded-full shadow-lg" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold dark:text-white">{user?.name}</h3>
            <p className="text-subtle">{user?.email}</p>
          </div>
        </section>

        {/* Theme & Extras */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-subtle uppercase tracking-widest pl-4">Preferencias</h3>
          <Card className="p-4 space-y-2 dark:bg-slate-800 dark:border-slate-700 shadow-sm">
             {/* Catholic Toggle */}
            <div className="flex justify-between items-center py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-2xl cursor-pointer" onClick={toggleCatholic}>
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl text-purple-600"><Cross className="w-6 h-6" /></div>
                <span className="font-semibold dark:text-slate-200">Módulo Espiritual</span>
              </div>
              <Toggle active={catholicEnabled} />
            </div>
            
            {/* Dark Mode Toggle */}
            <div className="flex justify-between items-center py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-2xl cursor-pointer" onClick={toggleDarkMode}>
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600"><Sun className="w-6 h-6" /></div>
                <span className="font-semibold dark:text-slate-200">Modo Oscuro</span>
              </div>
              <Toggle active={darkMode} />
            </div>
          </Card>
        </div>

        {/* Portability */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-subtle uppercase tracking-widest pl-4">Portabilidad de Datos</h3>
          <Card className="p-6 space-y-6 dark:bg-slate-800 dark:border-slate-700 shadow-sm">
            <div className="space-y-3">
              <Button onClick={exportJSON} variant="outline" className="justify-start gap-4 h-14 w-full">
                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg"><LogOut className="w-4 h-4 rotate-180" /></div>
                Exportar JSON
              </Button>
              <Button onClick={exportCSV} variant="outline" className="justify-start gap-4 h-14 w-full">
                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg"><BarChart3 className="w-4 h-4" /></div>
                Exportar CSV
              </Button>
            </div>
            <div className="pt-2 border-t dark:border-slate-700">
               <label className="block text-xs font-bold text-subtle mb-3 uppercase pl-1">Importar datos</label>
               <div className="relative">
                 <input type="file" accept=".json" onChange={importData} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                 <Button variant="outline" className="h-12 w-full border-dashed border-2 pointer-events-none">Subir archivo JSON</Button>
               </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 pt-4">
           <Button variant="outline" onClick={handleLogout} className="text-destructive border-red-100 hover:bg-red-50 dark:hover:bg-red-950/30 dark:border-red-900/40 py-4 text-lg">
            <LogOut className="w-5 h-5" />
            Cerrar Sesión Activa
          </Button>
        </div>
      </div>
    </div>
  );

  const JournalView = () => {
    const [text, setText] = useState('');

    return (
      <div className="flex-1 p-6 flex flex-col animate-fade-in max-w-4xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Diario de Escritura Libre</h2>
        </header>

        <div className="flex-1 space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-50 dark:border-slate-700">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold dark:text-white">Escribe sin filtros</h3>
            <p className="text-subtle">Este es tu espacio seguro para vaciar tu mente.</p>
          </div>
          <div className="pt-2">
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hoy me siento..." 
              className="w-full h-80 p-6 rounded-3xl border-2 border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-[hsl(var(--brand)/0.1)] focus:border-[hsl(var(--brand))] transition-all resize-none shadow-inner dark:text-white text-lg"
            />
          </div>
        </div>

        <div className="flex gap-6 mt-8 max-w-2xl mx-auto w-full">
          <Button 
            onClick={() => {
              if (text.trim()) {
                saveLog('journal', 'Entrada de Diario', { text });
                setText('');
                setView('dashboard');
              }
            }} 
            className="flex-1 py-4 shadow-xl shadow-[hsl(var(--brand)/0.2)]"
          >
            Guardar Entrada
          </Button>
        </div>
      </div>
    );
  };

  const StatsView = () => {
    // Merge remote and local logs
    const allLogs = [...logs, ...localLogs].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Process Mood Logs (mostly remote)
    const moodLogs = allLogs.filter(log => log.type === 'mood');
    
    // Last 7 days chart
    const recentMoods = moodLogs.slice(0, 7).reverse();
    const chartHeights = recentMoods.length > 0 
      ? recentMoods.map(m => (parseInt(m.data.level) + 1) * 20) // map 0-4 to 20-100%
      : [40, 60, 45, 90, 70, 85, 95]; // fallback mock

    while (chartHeights.length < 7) chartHeights.unshift(10); // pad array to 7 items

    // Emotion frequencies
    const emotionCounts = moodLogs.reduce((acc, log) => {
      acc[log.data.level] = (acc[log.data.level] || 0) + 1;
      return acc;
    }, {});
    const totalMoods = moodLogs.length || 1; // prevent divide by zero

    return (
      <div className="flex-1 p-6 animate-fade-in pb-24 max-w-4xl mx-auto w-full">
         <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Progreso y Registros</h2>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="space-y-6 p-6">
            <h3 className="font-bold flex items-center gap-2 dark:text-white"><BarChart3 className="w-5 h-5 text-blue-500" /> Ánimo reciente</h3>
            <div className="h-48 flex items-end justify-between gap-3 px-2">
              {chartHeights.slice(-7).map((h, i) => (
                <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-2xl relative group h-full">
                  <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-[hsl(var(--brand))] rounded-2xl transition-all duration-700 group-hover:bg-teal-400 group-hover:shadow-lg group-hover:shadow-teal-100" />
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-subtle mt-4">Últimos {recentMoods.length || 7} registros</p>
          </Card>

          <Card className="space-y-6 p-6">
            <h3 className="font-bold flex items-center gap-2 dark:text-white"><History className="w-5 h-5 text-teal-500" /> Emociones frecuentes</h3>
            <div className="space-y-5 flex-col flex justify-center h-full pb-8">
              <StatBar label="🤩 Radiante" value={Math.round(((emotionCounts[4] || 0) / totalMoods) * 100)} color="bg-yellow-400" />
              <StatBar label="😊 Feliz/Bien" value={Math.round((((emotionCounts[3] || 0) + (emotionCounts[2] || 0)) / totalMoods) * 100)} color="bg-green-400" />
              <StatBar label="😐 Neutral" value={Math.round(((emotionCounts[1] || 0) / totalMoods) * 100)} color="bg-blue-400" />
              <StatBar label="😔 Triste" value={Math.round(((emotionCounts[0] || 0) / totalMoods) * 100)} color="bg-slate-300" />
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-[hsl(var(--brand))]" /> Historial de Registros</h3>
          <div className="space-y-4">
            {allLogs.length === 0 ? (
              <Card className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
                <p className="text-subtle text-sm">No hay registros aún. Completa el Registro TCC o guarda tu estado de ánimo en el inicio.</p>
              </Card>
            ) : (
              allLogs.map((log) => <LogCard key={log.id} log={log} onDelete={deleteLog} onUpdate={updateLog} />)
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] dark:bg-slate-950 transition-colors duration-500">
      {authLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-[hsl(var(--brand))] rounded-3xl flex items-center justify-center shadow-xl animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-subtle text-sm">Conectando con Firebase...</p>
        </div>
      ) : view === 'login' ? <LoginView /> : (
        <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] mx-auto w-full">
            {/* Nav Lateral para Tablets/Desktop */}
            <aside className="hidden md:flex flex-col w-80 bg-white dark:bg-slate-900 border-r dark:border-slate-800 p-8 space-y-12 shadow-sm z-20 sticky top-0 h-screen">
              <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setView('dashboard')}>
                <div className="w-12 h-12 bg-gradient-to-tr from-[hsl(var(--brand))] to-teal-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[hsl(var(--brand)/0.3)] group-hover:scale-110 transition-transform">
                  <Heart className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-black tracking-tight dark:text-white">Terapia TCC</h1>
              </div>
              <nav className="flex-1 space-y-3">
                <NavButton active={view === 'dashboard'} icon={<Heart />} label="Inicio" onClick={() => setView('dashboard')} />
                <NavButton active={view === 'register-tcc'} icon={<BookOpen />} label="Registro TCC" onClick={() => setView('register-tcc')} />
                <NavButton active={view === 'stats'} icon={<BarChart3 />} label="Estadísticas" onClick={() => setView('stats')} />
                <NavButton active={view === 'settings'} icon={<Settings />} label="Configuración" onClick={() => setView('settings')} />
              </nav>
              
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] space-y-4">
                <p className="text-[11px] font-bold text-subtle uppercase tracking-widest pl-2">Sesión Actual</p>
                <div className="flex items-center gap-3 pl-2">
                   <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate dark:text-white">{user?.name}</p>
                      <p className="text-[10px] text-subtle truncate">{user?.email}</p>
                   </div>
                </div>
              </div>
            </aside>

            {/* Contenido Principal */}
            <main className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950 relative">
               {view === 'dashboard' && <DashboardView />}
               {view === 'register-tcc' && <TccRegistrationView />}
               {view === 'emotions' && <EmotionalRegulationView />}
               {view === 'catholic' && <CatholicView />}
               {view === 'settings' && <SettingsView />}
               {view === 'stats' && <StatsView />}
               {view === 'journal' && <JournalView />}
               {view === 'habits' && <HabitsView />}
            </main>

            {/* Navegación Inferior Móvil */}
            <nav className="md:hidden p-4 border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex justify-around items-center sticky bottom-0 z-50">
              <MobileNavButton active={view === 'dashboard'} icon={<Heart />} label="Inicio" onClick={() => setView('dashboard')} />
              <MobileNavButton active={view === 'register-tcc'} icon={<BookOpen />} label="Registro" onClick={() => setView('register-tcc')} />
              <div 
                onClick={() => setView('stats')}
                className={`p-4 rounded-3xl -mt-14 shadow-2xl transition-all duration-300 transform active:scale-90 ${view === 'stats' ? 'bg-[hsl(var(--brand))] text-white scale-110 rotate-6' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}
              >
                <BarChart3 className="w-6 h-6" />
              </div>
              <MobileNavButton active={view === 'emotions'} icon={<Cloud />} label="Calma" onClick={() => setView('emotions')} />
              <MobileNavButton active={view === 'settings'} icon={<Settings />} label="Ajustes" onClick={() => setView('settings')} />
            </nav>
        </div>
      )}
    </div>
  );
}

// --- Helper Components ---

const StatBar = ({ label, value, color }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
      <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const LogCard = ({ log, onDelete, onUpdate }) => {
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Local edit state
  const [editText, setEditText] = React.useState(
    log.type === 'journal' ? (log.data?.text || '') : ''
  );
  const [editAnswers, setEditAnswers] = React.useState(
    log.type === 'tcc_record' ? (log.data?.answers || ['','','5','','']) : ['','','5','','']
  );

  const TCC_LABELS = ['Situación', 'Pensamiento Automático', 'Emoción (0-10)', 'Conducta', 'Pensamiento Alternativo'];

  const typeBadge = log.type === 'mood'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    : log.type === 'journal'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';

  const handleSave = () => {
    if (log.type === 'journal') {
      onUpdate(log.id, { data: { ...log.data, text: editText } });
    } else if (log.type === 'tcc_record') {
      onUpdate(log.id, { data: { ...log.data, answers: editAnswers } });
    }
    setEditing(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 space-y-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-subtle">{new Date(log.date).toLocaleString()}</span>
          <span className={`text-[10px] px-2 py-1 rounded-lg uppercase tracking-wider font-bold ${typeBadge}`}>
            {log.type === 'mood' ? 'Estado' : log.type === 'journal' ? 'Diario' : 'TCC'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit button — not for mood logs */}
          {log.type !== 'mood' && (
            <button
              onClick={() => { setEditing(!editing); setConfirmDelete(false); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${editing ? 'bg-[hsl(var(--brand))] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
            >
              {editing ? 'Cancelar' : '✏️ Editar'}
            </button>
          )}
          {/* Delete button */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
            >
              🗑️ Eliminar
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">¿Seguro?</span>
              <button onClick={() => onDelete(log.id)} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">Sí</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold px-2 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">No</button>
            </div>
          )}
        </div>
      </div>

      {/* Content title */}
      <p className="font-bold dark:text-white text-lg">{log.content}</p>

      {/* VIEW MODE */}
      {!editing && (
        <>
          {log.type === 'journal' && log.data?.text && (
            <div className="text-sm border-t dark:border-slate-700 pt-3">
              <p className="dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl whitespace-pre-wrap">{log.data.text}</p>
            </div>
          )}
          {log.type === 'tcc_record' && log.data?.answers && (
            <div className="text-sm border-t dark:border-slate-700 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {TCC_LABELS.map((label, i) => (
                <div key={i} className={i === 4 ? 'md:col-span-2' : ''}>
                  <p className="text-xs text-subtle font-bold uppercase mb-1">{label}</p>
                  <p className="dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">{log.data.answers[i] || '-'}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* EDIT MODE */}
      {editing && (
        <div className="border-t dark:border-slate-700 pt-4 space-y-4">
          {log.type === 'journal' && (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full h-48 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-[hsl(var(--brand))] resize-none dark:text-white text-sm transition-colors"
            />
          )}
          {log.type === 'tcc_record' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TCC_LABELS.map((label, i) => (
                <div key={i} className={i === 4 ? 'md:col-span-2' : ''}>
                  <p className="text-xs text-subtle font-bold uppercase mb-1">{label}</p>
                  <textarea
                    value={editAnswers[i]}
                    onChange={(e) => {
                      const updated = [...editAnswers];
                      updated[i] = e.target.value;
                      setEditAnswers(updated);
                    }}
                    rows={2}
                    className="w-full p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-[hsl(var(--brand))] resize-none dark:text-white text-sm transition-colors"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setEditing(false)} className="text-sm font-bold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">Cancelar</button>
            <button onClick={handleSave} className="text-sm font-bold px-4 py-2 rounded-xl bg-[hsl(var(--brand))] text-white hover:bg-[hsl(var(--brand)/0.85)] transition-colors shadow-lg shadow-[hsl(var(--brand)/0.2)]">Guardar cambios</button>
          </div>
        </div>
      )}
    </div>
  );
};



const Toggle = ({ active }) => (
  <div className={`w-12 h-6 rounded-full transition-colors relative ${active ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${active ? 'right-1' : 'left-1'}`} />
  </div>
);

const QuickAction = ({ icon, title, desc, onClick }) => (
  <Card onClick={onClick} className="flex flex-col items-center text-center p-6 hover:border-[hsl(var(--brand))] hover:translate-y-[-6px] transition-all cursor-pointer group bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm border-slate-100">
    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-3xl flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--brand)/0.1)] transition-colors">
      {React.cloneElement(icon, { className: 'w-8 h-8 group-hover:scale-110 transition-transform' })}
    </div>
    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h4>
    <p className="text-[10px] text-subtle leading-snug mt-1 opacity-80">{desc}</p>
  </Card>
);

const HabitItem = ({ label, completed }) => (
  <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 rounded-3xl hover:border-[hsl(var(--brand)/0.3)] transition-all cursor-pointer group shadow-sm">
    <div className="flex items-center gap-4">
      <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${completed ? 'bg-green-500 border-green-500 shadow-md shadow-green-100' : 'border-slate-200 group-hover:border-[hsl(var(--brand))]'}`}>
        {completed && <CheckCircle2 className="w-4 h-4 text-white" />}
      </div>
      <span className={`text-sm ${completed ? 'strike-through text-subtle opacity-50' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300" />
  </div>
);

const NavButton = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all duration-300 font-bold ${active ? 'bg-[hsl(var(--brand))] text-white shadow-xl shadow-[hsl(var(--brand)/0.2)]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6' })}
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const MobileNavButton = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-[hsl(var(--brand))] scale-110' : 'text-slate-400'}`}
  >
    <div className={`p-1 rounded-xl transition-colors ${active ? 'bg-[hsl(var(--brand)/0.1)]' : ''}`}>
      {React.cloneElement(icon, { className: `w-6 h-6 ${active ? 'fill-current' : ''}` })}
    </div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;
