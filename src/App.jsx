import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './components/ui';
import { 
  Heart, BookOpen, Calendar, Settings, ChevronRight, 
  MessageSquare, User, LogOut, CheckCircle2, History, 
  ArrowLeft, Cross, ShieldCheck, BarChart3, Sliders,
  Cloud, Sun, Wind, Loader, Pencil, Trash2
} from 'lucide-react';
import { DAILY_QUOTES, CALM_PRAYERS, MOOD_REFLECTIONS } from './data/catholic';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, setDoc, getDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// --- Mock Data ---
const MOTIVATIONAL_PHRASES = {
  psychological: "Tus pensamientos no son hechos. Tú tienes el poder de cuestionarlos.",
  spiritual: "En la quietud encontrarás la fuerza. Dios camina a tu lado en cada paso."
};

const COGNITIVE_DISTORTIONS = [
  { id: 'polarized', emoji: '🌓', label: 'Pensamiento Todo o Nada', desc: 'Ves las cosas en categorías de blanco o negro.' },
  { id: 'overgeneralization', emoji: '🌐', label: 'Generalización Excesiva', desc: 'Ves un solo evento negativo como un patrón sin fin.' },
  { id: 'filtering', emoji: '🔍', label: 'Filtro Mental', desc: 'Te obsesionas con un detalle negativo y nublas todo lo demás.' },
  { id: 'disqualifying', emoji: '➖', label: 'Descalificar lo Positivo', desc: 'Rechazas experiencias positivas insistiendo que no cuentan.' },
  { id: 'jumping_conclusions', emoji: '⚡', label: 'Conclusiones Apresuradas', desc: 'Interpretas las cosas negativamente sin hechos que lo apoyen.' },
  { id: 'magnification', emoji: '🔎', label: 'Magnificación / Minimización', desc: 'Exageras tus errores o reduces la importancia de tus logros.' },
  { id: 'emotional_reasoning', emoji: '💓', label: 'Razonamiento Emocional', desc: 'Asumes que tus emociones negativas reflejan la realidad.' },
  { id: 'should_statements', emoji: '❗', label: 'Los "Debería"', desc: 'Te motivas con "debería" o "tengo que", generando culpa.' },
  { id: 'labeling', emoji: '🏷️', label: 'Etiquetado', desc: 'Te pones etiquetas negativas a ti mismo en vez de describir el error.' },
  { id: 'personalization', emoji: '👤', label: 'Personalización', desc: 'Te culpas por eventos de los que no eres totalmente responsable.' },
  { id: 'catastrophizing', emoji: '⛈️', label: 'Catastrofismo', desc: 'Imaginas y esperas el peor de los escenarios posibles.' },
  { id: 'blaming', emoji: '🛡️', label: 'Culpabilización', desc: 'Culpas a otros de tus problemas o te culpas por lo incontrolable.' },
  { id: 'control_fallacy', emoji: '🧭', label: 'Falacia de Control', desc: 'Sientes que no tienes control sobre nada o que eres responsable de todo.' },
  { id: 'fairness_fallacy', emoji: '⚖️', label: 'Falacia de Justicia', desc: 'Sientes resentimiento porque crees que la vida debería ser justa.' },
  { id: 'social_comparison', emoji: '👥', label: 'Comparación Social', desc: 'Te comparas con otros de forma que siempre sales perdiendo.' }
];

const EMOTIONS = [
  { emoji: '😊', label: 'Alegría' },
  { emoji: '😢', label: 'Tristeza' },
  { emoji: '😰', label: 'Ansiedad' },
  { emoji: '😡', label: 'Ira / Enojo' },
  { emoji: '😨', label: 'Miedo' },
  { emoji: '😔', label: 'Culpa' },
  { emoji: '😤', label: 'Frustración' },
  { emoji: '✨', label: 'Esperanza' },
  { emoji: '👤', label: 'Soledad' },
  { emoji: '😌', label: 'Calma' },
  { emoji: '😳', label: 'Vergüenza' },
  { emoji: '🙏', label: 'Gratitud' },
  { emoji: '🤯', label: 'Agobio' },
  { emoji: '🤩', label: 'Entusiasmo' },
  { emoji: '😟', label: 'Inseguridad' },
  { emoji: '🤔', label: 'Curiosidad' },
  { emoji: '✅', label: 'Aceptación' },
  { emoji: '😒', label: 'Envidia' },
  { emoji: '🥱', label: 'Aburrimiento' },
  { emoji: '😎', label: 'Orgullo' }
];

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('login');
  const [catholicEnabled, setCatholicEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mood, setMood] = useState(null);
  const [logs, setLogs] = useState([]);
  const [habits, setHabits] = useState([]);
  const [editingLog, setEditingLog] = useState(null);

  // Helper to get user-scoped storage key
  const getScopedKey = (key) => user?.uid ? `${key}_${user.uid}` : key;

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
        // Also respect local theme preference (user-scoped)
        const savedTheme = localStorage.getItem(getScopedKey('tcc_theme'));
        if (savedTheme === 'dark') {
          setDarkMode(true);
          document.documentElement.classList.add('dark');
        }

        // Load user-scoped local logs for migration one-time
        const legacyLocalLogs = localStorage.getItem(getScopedKey('tcc_local_logs'));
        if (legacyLocalLogs) {
          const parsed = JSON.parse(legacyLocalLogs);
          if (parsed.length > 0) {
            // Process migration: push each local log to Firestore
            for (const localLog of parsed) {
              const { id, ...logContent } = localLog;
              await addDoc(collection(db, 'users', firebaseUser.uid, 'logs'), {
                ...logContent,
                migratedFromLocal: true
              });
            }
            // Clear local storage after migration
            localStorage.removeItem(getScopedKey('tcc_local_logs'));
            localStorage.removeItem('tcc_local_logs'); // Also clear the very old key if it exists
          }
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
  }, [user?.uid]);

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

    // Optimistic update
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...updatedFields } : h));

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
  const saveLog = async (type, content, data = {}, customDate) => {
    if (!user?.uid) return;
    const date = customDate || new Date().toISOString();
    
    await addDoc(collection(db, 'users', user.uid, 'logs'), {
      date,
      type,
      content,
      data
    });
  };

  const deleteLog = async (id) => {
    if (!user?.uid) return;
    await deleteDoc(doc(db, 'users', user.uid, 'logs', id));
  };

  const updateLog = async (id, patch) => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'users', user.uid, 'logs', id), patch);
  };

  const clearAllLogs = async () => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'logs'));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
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
      localStorage.setItem(getScopedKey('tcc_theme'), 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(getScopedKey('tcc_theme'), 'light');
    }
    saveSettings({ darkMode: newMode });
  };


  // --- Data Management ---

  const exportJSON = () => {
    const data = { user, catholicEnabled, darkMode, logs, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tcc_data_${new Date().getTime()}.json`;
    link.click();
  };

  const exportCSV = () => {
    const allLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
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
        if (data.localLogs && Array.isArray(data.localLogs)) {
          const count = data.localLogs.length;
          if (count === 0) {
            alert("El archivo no contiene registros para importar.");
            return;
          }

          const shouldClear = window.confirm(`Se detectaron ${count} registros en el archivo. ¿Deseas ELIMINAR los datos actuales del navegador para que SOLO queden estos ${count}?`);
          
          if (shouldClear) {
            await clearAllLogs();
          }
          
          let importedCount = 0;
          // Use for...of to ensure sequential await
          for (const l of data.localLogs) {
            try {
              await addDoc(collection(db, 'users', user.uid, 'logs'), {
                date: l.date || new Date().toISOString(),
                type: l.type || 'tcc_record',
                content: l.content || 'Registro Importado',
                data: l.data || {}
              });
              importedCount++;
            } catch (innerErr) {
              console.error("Error al importar registro individual:", innerErr);
            }
          }
          
          alert(`¡Hecho! Se procesaron ${count} registros e importaron ${importedCount} con éxito.`);
          setView('stats');
        } else {
          alert("Error: El archivo no tiene el formato esperado ({ localLogs: [...] }).");
        }
        
        if (data.catholicEnabled !== undefined) {
          setCatholicEnabled(data.catholicEnabled);
          saveSettings({ catholicEnabled: data.catholicEnabled });
        }
      } catch (err) {
        console.error("Import error:", err);
        alert("Error al procesar el archivo JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // --- Views ---



  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--background))] dark:bg-slate-950 transition-colors duration-500">
      {authLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-[hsl(var(--brand))] rounded-3xl flex items-center justify-center shadow-xl animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-subtle text-sm">Conectando con Firebase...</p>
        </div>
      ) : view === 'login' ? <LoginView handleLogin={handleLogin} /> : (
        <div className="flex-1 flex flex-col md:flex-row w-full shadow-2xl">
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
                {view === 'dashboard' && <DashboardView user={user} setView={setView} saveLog={saveLog} catholicEnabled={catholicEnabled} habits={habits} persistHabits={persistHabits} mood={mood} setMood={setMood} />}
                {view === 'register-tcc' && <TccRegistrationView setView={(v) => { setView(v); if (v !== 'register-tcc') setEditingLog(null); }} saveLog={saveLog} updateLog={updateLog} editingLog={editingLog} />}
                {view === 'emotions' && <EmotionalRegulationView setView={setView} />}
                {view === 'catholic' && <CatholicView user={user} setView={setView} saveLog={saveLog} logs={logs} />}
                {view === 'settings' && <SettingsView user={user} setView={setView} toggleCatholic={toggleCatholic} catholicEnabled={catholicEnabled} toggleDarkMode={toggleDarkMode} darkMode={darkMode} exportJSON={exportJSON} exportCSV={exportCSV} importData={importData} handleLogout={handleLogout} />}
                {view === 'stats' && <StatsView setView={setView} logs={logs} deleteLog={deleteLog} updateLog={updateLog} setEditingLog={setEditingLog} />}
                {view === 'journal' && <JournalView setView={setView} saveLog={saveLog} />}
                {view === 'habits' && <HabitsView setView={setView} habits={habits} addHabitToFirestore={addHabitToFirestore} persistHabits={persistHabits} deleteHabitFromFirestore={deleteHabitFromFirestore} />}
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
  const [editDistortions, setEditDistortions] = React.useState(
    log.type === 'tcc_record' ? (log.data?.distortions || []) : []
  );

  const toggleDistortion = (id) => {
    setEditDistortions(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

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
      onUpdate(log.id, { data: { ...log.data, answers: editAnswers, distortions: editDistortions } });
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
            <div className="text-sm border-t dark:border-slate-700 pt-3 space-y-4">
              {log.data.distortions?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {log.data.distortions.map(dId => {
                    const d = COGNITIVE_DISTORTIONS.find(item => item.id === dId);
                    return d ? (
                      <span key={dId} className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] rounded-xl text-[10px] font-bold border border-[hsl(var(--brand)/0.1)]">
                        <span>{d.emoji}</span>
                        <span>{d.label}</span>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TCC_LABELS.map((label, i) => (
                  <div key={i} className={i === 4 ? 'md:col-span-2' : ''}>
                    <p className="text-xs text-subtle font-bold uppercase mb-1">{label}</p>
                    <p className="dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">{log.data.answers[i] || '-'}</p>
                  </div>
                ))}
              </div>
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
            <div className="space-y-4">
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
              
              {/* Distortions selection in Edit Mode */}
              <div className="space-y-3">
                <p className="text-xs text-subtle font-bold uppercase">Distorsiones Cognitivas</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 h-48 overflow-y-auto p-2 border-2 border-slate-50 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                  {COGNITIVE_DISTORTIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => toggleDistortion(d.id)}
                      className={`flex flex-col items-center text-center p-2 rounded-xl border transition-all ${
                        editDistortions.includes(d.id)
                          ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] font-bold shadow-sm'
                          : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl mb-1">{d.emoji}</span>
                      <span className="text-[9px] leading-tight uppercase font-black tracking-tighter">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
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

// --- Performance-Optimized Views (Extracted to prevent re-instantiation) ---

const EmotionalRegulationView = ({ setView }) => {
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
        circleDuration = '0.5s';
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
        <section className="text-center space-y-6">
          <div 
            onClick={() => {
              if (activeTech === '4-7-8') toggleTimer();
              if (activeTech === 'grounding' && groundingStep < 4) setGroundingStep(s => s + 1);
              if (activeTech === 'grounding' && groundingStep === 4) handleSelectTech(null);
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
            <div className="text-center z-10" style={{ transform: `scale(${1 / circleScale})` }}>
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
                  <span className="text-[10px] font-black uppercase tracking-tighter text-subtle">Relax</span>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
             <h3 className="text-xl font-black dark:text-white">{instruction}</h3>
             {activeTech === 'grounding' && (
                <p className="text-sm text-[hsl(var(--brand))] font-bold animate-pulse">Ejemplo: {groundingItems[groundingStep].example}</p>
             )}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto w-full">
          <Card onClick={() => handleSelectTech('4-7-8')} className={`flex items-center gap-4 p-4 cursor-pointer hover:border-blue-300 transition-colors dark:bg-slate-800 dark:border-slate-700 ${activeTech === '4-7-8' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center"><Wind className="text-blue-500" /></div>
            <div><h4 className="font-bold text-sm dark:text-white">Respiración 4-7-8</h4><p className="text-xs text-subtle">Ansiedad</p></div>
          </Card>
          <Card onClick={() => handleSelectTech('grounding')} className={`flex items-center gap-4 p-4 cursor-pointer hover:border-green-300 transition-colors dark:bg-slate-800 dark:border-slate-700 ${activeTech === 'grounding' ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : ''}`}>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center"><CheckCircle2 className="text-green-500" /></div>
            <div><h4 className="font-bold text-sm dark:text-white">Grounding</h4><p className="text-xs text-subtle">Enfoque</p></div>
          </Card>
        </section>
      </div>
    </div>
  );
};

const CHART_COLORS = [
  '#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981',
  '#8b5cf6', '#f97316', '#ec4899', '#14b8a6', '#a855f7',
  '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9'
];

const CustomTooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  border: '1px solid rgba(100, 116, 139, 0.3)',
  borderRadius: '12px',
  padding: '10px 14px',
  color: '#e2e8f0',
  fontSize: '12px',
  fontWeight: '600',
  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
};

const StatsView = ({ setView, logs, deleteLog, updateLog, setEditingLog }) => {
  const allLogs = [...logs].sort((a, b) => {
    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return dateB - dateA;
  });

  // --- Dynamic Stats Calculations ---

  // 1. Mood logs (from mood type and tcc_record mood selections)
  const moodLogs = allLogs.filter(l => l.type === 'mood');
  const tccMoodLogs = allLogs.filter(l => l.type === 'tcc_record' && l.data?.moodIndex !== undefined);

  // 2. Mood Average (0-100 scale)
  const moodValues = [
    ...moodLogs.map(l => ((l.data?.level || 0) / (EMOTIONS.length - 1)) * 100),
    ...tccMoodLogs.flatMap(l => {
      const indices = l.data.moodIndices || (l.data.moodIndex !== undefined ? [l.data.moodIndex] : []);
      return indices.map(idx => (idx / (EMOTIONS.length - 1)) * 100);
    }),
  ].filter(v => v !== null);

  const avgMood = moodValues.length > 0
    ? Math.round(moodValues.reduce((a, b) => a + b, 0) / moodValues.length)
    : 0;

  // 3. Consistency (last 7 days)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Use local YYYY-MM-DD for comparison
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const activeDays = last7Days.filter(dayStr =>
    allLogs.some(l => {
      if (!l.date) return false;
      const logDate = l.date.toDate ? l.date.toDate() : new Date(l.date);
      if (isNaN(logDate.getTime())) return false;
      // Also use local YYYY-MM-DD for the log
      const logDayStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
      return logDayStr === dayStr;
    })
  ).length;
  const consistency = Math.round((activeDays / 7) * 100);

  // 4. Most Frequent Emotion
  const allEmotionLabels = [
    ...moodLogs.map(l => EMOTIONS[l.data?.level]?.label).filter(Boolean),
    ...tccMoodLogs.flatMap(l => {
      const indices = l.data.moodIndices || (l.data.moodIndex !== undefined ? [l.data.moodIndex] : []);
      return indices.map(idx => EMOTIONS[idx]?.label);
    }).filter(Boolean),
  ];

  const emotionCounts = allEmotionLabels.reduce((acc, label) => {
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
  const topEmotion = sortedEmotions[0];
  const topEmotionData = topEmotion ? EMOTIONS.find(e => e.label === topEmotion[0]) : null;

  // 5. Mood Distribution (for pie chart)
  const moodDistribution = sortedEmotions.map(([label, count], i) => {
    const em = EMOTIONS.find(e => e.label === label);
    return { name: `${em?.emoji || ''} ${label}`, value: count, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  // 6. Emotion Frequency (for bar chart)
  const emotionFrequency = sortedEmotions.slice(0, 10).map(([label, count], i) => {
    const em = EMOTIONS.find(e => e.label === label);
    return { name: `${em?.emoji || ''} ${label}`, count, fill: CHART_COLORS[i % CHART_COLORS.length] };
  });

  // 7. Intensity Evolution (line chart over time)
  const intensityData = (() => {
    const points = [];
    // From mood logs
    moodLogs.forEach(l => {
      points.push({
        date: new Date(l.date),
        dateStr: new Date(l.date).toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        intensity: Math.round(((l.data?.level || 0) / (EMOTIONS.length - 1)) * 10),
        type: 'mood',
      });
    });
    // From TCC records (emotional intensity 0-10)
    allLogs.filter(l => l.type === 'tcc_record' && l.data?.answers).forEach(l => {
      points.push({
        date: new Date(l.date),
        dateStr: new Date(l.date).toLocaleDateString('es', { day: '2-digit', month: 'short' }),
        intensity: parseInt(l.data.answers[2] || '5'),
        type: 'tcc',
      });
    });
    return points.sort((a, b) => a.date - b.date).slice(-30);
  })();

  const totalRecords = allLogs.length;

  return (
    <div className="flex-1 p-6 animate-fade-in pb-24 max-w-[1600px] mx-auto w-full">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold dark:text-white">Estadísticas e Historial</h2>
      </header>

      {/* ───── Summary Cards ───── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Records */}
        <Card className="p-5 dark:bg-slate-800 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full -mr-6 -mt-6" />
          <p className="text-[10px] uppercase font-black tracking-widest text-subtle mb-1">Total Registros</p>
          <p className="text-3xl font-black text-indigo-500">{totalRecords}</p>
          <p className="text-[10px] text-subtle mt-1">entradas guardadas</p>
        </Card>

        {/* Most Frequent Emotion */}
        <Card className="p-5 dark:bg-slate-800 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/10 rounded-full -mr-6 -mt-6" />
          <p className="text-[10px] uppercase font-black tracking-widest text-subtle mb-1">Emoción Frecuente</p>
          {topEmotionData ? (
            <>
              <p className="text-3xl">{topEmotionData.emoji}</p>
              <p className="text-xs font-bold dark:text-white mt-1">{topEmotionData.label} <span className="text-subtle font-normal">({topEmotion[1]}x)</span></p>
            </>
          ) : (
            <p className="text-sm text-subtle">Sin datos</p>
          )}
        </Card>

        {/* Average Mood */}
        <Card className="p-5 dark:bg-slate-800 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-6 -mt-6" />
          <p className="text-[10px] uppercase font-black tracking-widest text-subtle mb-1">Ánimo Promedio</p>
          <p className="text-3xl font-black text-green-500">{avgMood}%</p>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${avgMood}%` }} />
          </div>
        </Card>

        {/* Consistency */}
        <Card className="p-5 dark:bg-slate-800 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-6 -mt-6" />
          <p className="text-[10px] uppercase font-black tracking-widest text-subtle mb-1">Consistencia 7d</p>
          <p className="text-3xl font-black text-blue-500">{consistency}%</p>
          <p className="text-[10px] text-subtle mt-1">{activeDays}/7 días activos</p>
        </Card>
      </div>

      {/* ───── Charts Grid ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Mood Distribution — Donut */}
        <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
          <h3 className="font-bold flex items-center gap-2 mb-4 dark:text-white">
            <Heart className="w-5 h-5 text-pink-500" /> Distribución del Ánimo
          </h3>
          {moodDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={moodDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {moodDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                  formatter={(value) => <span className="dark:text-slate-300 text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-subtle text-sm">Registra tu estado de ánimo para ver la distribución</p>
            </div>
          )}
        </Card>

        {/* Emotion Frequency — Bar Chart */}
        <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
          <h3 className="font-bold flex items-center gap-2 mb-4 dark:text-white">
            <BarChart3 className="w-5 h-5 text-cyan-500" /> Frecuencia de Emociones
          </h3>
          {emotionFrequency.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={emotionFrequency} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={100} />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Bar dataKey="count" name="Veces" radius={[0, 8, 8, 0]} barSize={20}>
                  {emotionFrequency.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-subtle text-sm">Sin datos de emociones aún</p>
            </div>
          )}
        </Card>

        {/* Intensity Evolution — Line Chart */}
        <Card className="p-6 dark:bg-slate-800 dark:border-slate-700 lg:col-span-2">
          <h3 className="font-bold flex items-center gap-2 mb-4 dark:text-white">
            <History className="w-5 h-5 text-amber-500" /> Evolución de Intensidad
          </h3>
          {intensityData.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={intensityData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                <XAxis dataKey="dateStr" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={CustomTooltipStyle}
                  formatter={(value) => [`${value}/10`, 'Intensidad']}
                />
                <Line
                  type="monotone"
                  dataKey="intensity"
                  name="Intensidad"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-subtle text-sm">Necesitas al menos 2 registros para ver la evolución</p>
            </div>
          )}
        </Card>

        {/* Cognitive Distortions Patterns */}
        {(() => {
           const tccRecords = logs.filter(l => l.type === 'tcc_record' && l.data?.distortions);
           const allDistData = tccRecords.flatMap(l => l.data.distortions);
           if (allDistData.length === 0) return null;

           const counts = allDistData.reduce((acc, curr) => {
             acc[curr] = (acc[curr] || 0) + 1;
             return acc;
           }, {});
           const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

           return (
             <Card className="p-6 dark:bg-slate-800 dark:border-slate-700 lg:col-span-2">
               <h3 className="font-bold flex items-center gap-2 mb-6 dark:text-white"><Sliders className="w-5 h-5 text-orange-500" /> Patrones de Distorsiones Cognitivas</h3>
               <div className="space-y-4">
                 {sorted.map(([id, count]) => {
                   const d = COGNITIVE_DISTORTIONS.find(item => item.id === id);
                   const percentage = Math.round((count / allDistData.length) * 100);
                   return (
                     <div key={id} className="space-y-1.5">
                       <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-tighter">
                         <span className="dark:text-slate-300 flex items-center gap-1"><span>{d?.emoji}</span> {d?.label}</span>
                         <span className="text-subtle">{count} veces ({percentage}%)</span>
                       </div>
                       <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                         <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000 rounded-full" style={{ width: `${percentage}%` }} />
                       </div>
                     </div>
                   );
                 })}
               </div>
             </Card>
           );
        })()}
      </div>

      {/* ───── Detailed History Table ───── */}
      <div className="space-y-6">
        <h3 className="font-bold text-xl dark:text-white flex items-center gap-2">
          Historial Detallado
        </h3>
        
        {allLogs.length === 0 ? (
          <Card className="p-12 text-center bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
            <p className="text-subtle text-sm">No hay registros aún.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-subtle/70">
                  <th className="py-5 px-6">Fecha</th>
                  <th className="py-5 px-4">Ánimo</th>
                  <th className="py-5 px-4">Emociones / Distorsiones</th>
                  <th className="py-5 px-4">Situación</th>
                  <th className="py-5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {allLogs.map((log) => {
                  // Mood color and label logic
                  let moodColor = 'text-slate-400';
                  let moodText = 'N/A';
                  
                  if (log.type === 'mood' || log.type === 'tcc_record') {
                    const moodIndices = log.type === 'mood' 
                      ? [log.data?.level] 
                      : (log.data?.moodIndices || (log.data?.moodIndex !== undefined ? [log.data.moodIndex] : []));
                    
                    if (moodIndices.length > 0 && moodIndices[0] !== undefined && moodIndices[0] !== null) {
                      const firstIdx = moodIndices[0];
                      const emotion = EMOTIONS[firstIdx];
                      moodText = moodIndices.length > 1 ? `${emotion?.label}...` : (emotion?.label || 'Neutro');
                      
                      // Color logic (based on first emotion)
                      if ([0, 7, 9, 11, 13, 15, 16, 19].includes(firstIdx)) moodColor = 'text-green-500'; // Positive/Resilient
                      else if ([2, 3, 6, 12].includes(firstIdx)) moodColor = 'text-orange-500'; // High activation negative
                      else moodColor = 'text-slate-500'; // Low activation / other
                    }
                  } else {
                    moodText = log.type === 'journal' ? 'Diario' : 'Espiritual';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                      <td className="py-6 px-6">
                        <span className="text-sm font-bold dark:text-white">
                          {new Date(log.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="py-6 px-4">
                        <span className={`text-sm font-black uppercase tracking-tighter ${moodColor}`}>
                          {moodText}
                        </span>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex flex-wrap gap-2 max-w-[320px]">
                          {/* Emotions pills */}
                          {(log.data?.moodLabels || (log.data?.moodLabel ? [log.data.moodLabel] : [])).map((label, i) => (
                             <span key={i} className="px-3 py-1.5 rounded-xl border border-teal-500/20 bg-teal-500/5 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-tighter">
                               {label}
                             </span>
                          ))}
                          {log.data?.emotions?.map((e, i) => (
                             <span key={`extra-${i}`} className="px-3 py-1.5 rounded-xl border border-teal-500/20 bg-teal-500/5 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-tighter">
                               {e}
                             </span>
                          ))}
                          {/* Distortions pills */}
                          {log.data?.distortions?.map((dId) => {
                            const d = COGNITIVE_DISTORTIONS.find(i => i.id === dId);
                            return (
                              <span key={dId} className="px-3 py-1.5 rounded-xl border border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-tighter">
                                {d?.label ? `${d.label.slice(0, 12)}...` : dId}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <p className="text-sm text-subtle line-clamp-2 max-w-[300px] leading-relaxed">
                          {log.data?.answers?.[0] || log.data?.text || log.content}
                        </p>
                      </td>
                      <td className="py-6 px-6 text-right">
                        <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingLog(log); setView('register-tcc'); }}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-[hsl(var(--brand))] hover:shadow-lg transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteLog(log.id)}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:shadow-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const JournalView = ({ setView, saveLog }) => {
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

const SettingsView = ({ user, setView, toggleCatholic, catholicEnabled, toggleDarkMode, darkMode, exportJSON, exportCSV, importData, handleLogout }) => (
  <div className="flex-1 p-6 animate-fade-in pb-24 max-w-5xl mx-auto w-full">
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
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600"><Cross className="w-6 h-6" /></div>
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

const CatholicView = ({ user, setView, saveLog, logs }) => {
  const [subView, setSubView] = useState('menu'); // 'menu', 'examen', 'prayers'
  const [examenStep, setExamenStep] = useState(0);
  const [examenAnswers, setExamenAnswers] = useState(['', '', '', '', '']);

  const steps = [
    { label: 'Gratitud', desc: 'Da gracias a Dios por los beneficios recibidos hoy.' },
    { label: 'Petición de Luz', desc: 'Pide al Espíritu Santo que te ayude a ver tu día con verdad y amor.' },
    { label: 'Revisión', desc: 'Repasa tu día: ¿dónde estuvo Dios? ¿dónde te alejaste de Él?' },
    { label: 'Contrición', desc: 'Pide perdón por tus faltas y agradece su misericordia.' },
    { label: 'Propósito', desc: 'Mira hacia mañana con esperanza y propósito de mejora.' }
  ];

  if (subView === 'examen') {
    const current = steps[examenStep];
    return (
      <div className="flex-1 p-6 flex flex-col animate-fade-in max-w-2xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setSubView('menu')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Examen de Conciencia</h2>
        </header>
        <Card className="p-8 space-y-6 dark:bg-slate-800 dark:border-slate-700">
          <div className="space-y-2">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{current.label}</span>
            <h3 className="text-2xl font-bold dark:text-white">{current.desc}</h3>
          </div>
          <textarea
            value={examenAnswers[examenStep]}
            onChange={(e) => {
              const newAns = [...examenAnswers];
              newAns[examenStep] = e.target.value;
              setExamenAnswers(newAns);
            }}
            placeholder="Escribe tu reflexión aquí..."
            className="w-full h-48 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-blue-500 dark:text-white transition-all resize-none shadow-inner"
          />
          <div className="flex gap-4">
            {examenStep > 0 && <Button variant="outline" onClick={() => setExamenStep(s => s - 1)} className="flex-1">Anterior</Button>}
            <Button onClick={() => {
              if (examenStep < steps.length - 1) setExamenStep(s => s + 1);
              else {
                saveLog('catholic_examen', 'Examen de Conciencia', { answers: examenAnswers });
                setSubView('menu');
              }
            }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 dark:shadow-none">
              {examenStep < steps.length - 1 ? 'Siguiente' : 'Finalizar Examen'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (subView === 'prayers') {
    return (
      <div className="flex-1 p-6 flex flex-col animate-fade-in max-w-2xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setSubView('menu')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Oraciones de Calma</h2>
        </header>
        <div className="space-y-6 pb-24">
          {CALM_PRAYERS.map((p, i) => (
            <Card key={i} className="p-6 dark:bg-slate-800 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-blue-600 dark:text-blue-400">{p.title}</h3>
              <p className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed italic">{p.text}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 flex flex-col animate-fade-in max-w-[1600px] mx-auto w-full">
       <header className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold dark:text-white">Módulo Espiritual</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card onClick={() => setSubView('examen')} className="p-8 cursor-pointer hover:border-blue-300 group dark:bg-slate-800 dark:border-slate-700 hover:shadow-xl hover:shadow-blue-100 dark:hover:shadow-blue-900/20 transition-all">
             <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><History className="w-7 h-7 text-blue-600" /></div>
             <h3 className="text-xl font-bold dark:text-white">Examen de Conciencia</h3>
             <p className="text-sm text-subtle mt-2">Un momento de reflexión al final del día para repasar tus acciones y agradecer.</p>
          </Card>
          <Card onClick={() => setSubView('prayers')} className="p-8 cursor-pointer hover:border-blue-300 group dark:bg-slate-800 dark:border-slate-700 hover:shadow-xl hover:shadow-blue-100 dark:hover:shadow-blue-900/20 transition-all">
             <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Sun className="w-7 h-7 text-blue-600" /></div>
             <h3 className="text-xl font-bold dark:text-white">Oraciones de Calma</h3>
             <p className="text-sm text-subtle mt-2">Plegarias tradicionales para encontrar serenidad y fuerza en momentos de ansiedad.</p>
          </Card>
          
          <div className="md:col-span-2">
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border-blue-100 dark:border-slate-700 shadow-sm">
               {/* 
                  Calculate day of year (1-366) to match the PDF's 365+1 message structure
               */}
               {(() => {
                 const now = new Date();
                 const start = new Date(now.getFullYear(), 0, 0);
                 const diff = now - start;
                 const oneDay = 1000 * 60 * 60 * 24;
                 const dayOfYear = Math.floor(diff / oneDay);
                 const quoteIndex = (dayOfYear - 1) % DAILY_QUOTES.length;
                 
                  return (
                    <>
                      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Reflexión del Día ({dayOfYear}/366)</h3>
                      <p className="text-xl font-serif italic text-blue-900 dark:text-blue-200 leading-relaxed">
                        "{DAILY_QUOTES[quoteIndex]}"
                      </p>
                    </>
                  );
               })()}
            </Card>
          </div>
        </div>
    </div>
  );
};

const DashboardView = ({ user, setView, saveLog, catholicEnabled, habits, persistHabits, mood, setMood }) => {
  const [showAllEmotions, setShowAllEmotions] = useState(false);
  const visibleEmotions = showAllEmotions ? EMOTIONS : EMOTIONS.slice(0, 5);

  return (
  <div className="flex-1 pb-24 animate-fade-in w-full">
    {/* Header Profile */}
    <div className="p-6 flex justify-between items-center bg-gradient-to-b from-[hsl(var(--brand)/0.05)] to-transparent max-w-none mx-auto w-full px-8">
      <div>
        <h2 className="text-xl font-bold dark:text-white text-slate-800">Hola, {user?.name?.split(' ')[0]}</h2>
        <p className="text-subtle">¿Cómo va tu día?</p>
      </div>
      <button onClick={() => setView('settings')} className="w-12 h-12 rounded-2xl bg-[hsl(var(--secondary))] flex items-center justify-center text-[hsl(var(--secondary-foreground))] shadow-sm overflow-hidden border-2 border-white dark:border-slate-800">
        <User className="w-6 h-6" />
      </button>
    </div>

    <div className="px-8 space-y-8 max-w-none mx-auto w-full">
      {/* Top Grid: Mood + Phrase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                  icon={<Cross className="text-blue-500" />} 
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
              <h3 className="font-bold flex items-center gap-2 dark:text-white mb-4"><BarChart3 className="w-5 h-5 text-blue-500" /> Vista Rápida</h3>
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

const HabitsView = ({ setView, habits, addHabitToFirestore, persistHabits, deleteHabitFromFirestore }) => {
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
        <Button onClick={addHabit} className="px-6 py-3 rounded-2xl bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand)/0.9)] text-white">Agregar</Button>
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
                {streak > 0 && <p className="text-xs text-blue-500 font-bold mt-0.5">🔥 Racha: {streak} días</p>}
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

const TccRegistrationView = ({ setView, saveLog, updateLog, editingLog }) => {
  const [tccStep, setTccStep] = useState(0);
  const [tccAnswers, setTccAnswers] = useState(editingLog?.data?.answers || ['', '', '5', '', '']);
  const [selectedDistortions, setSelectedDistortions] = useState(editingLog?.data?.distortions || []);
  const [selectedMoodIndices, setSelectedMoodIndices] = useState(editingLog?.data?.moodIndices || (editingLog?.data?.moodIndex !== undefined ? [editingLog.data.moodIndex] : []));

  const toggleMood = (index) => {
    setSelectedMoodIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };
  const [selectedDate, setSelectedDate] = useState(() => {
    if (editingLog?.date) {
      return new Date(editingLog.date).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const steps = [
    { field: 'Fecha de Registro', desc: '¿Cuándo ocurrió el evento que deseas registrar?', isDate: true },
    { field: 'Situación', desc: '¿Qué pasó? Describe el evento brevemente.' },
    { field: 'Pensamiento Automático', desc: '¿Qué cruzó por tu mente en ese instante?' },
    { field: 'Distorsiones Cognitivas', desc: '¿Identificas algún patrón en tu pensamiento?', isDistortions: true },
    { field: 'Emoción', desc: '¿Cómo te sentiste? (Intensidad 0 a 10)', isScale: true },
    { field: 'Estado de Ánimo', desc: '¿Qué emoción describe mejor cómo te sientes?', isMood: true },
    { field: 'Conducta', desc: '¿Qué hiciste en respuesta?' },
    { field: 'Pensamiento Alternativo', desc: '¿Hay otra forma más equilibrada de ver esto?' }
  ];

  const current = steps[tccStep];

  const toggleDistortion = (id) => {
    setSelectedDistortions(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    const selectedEmotions = selectedMoodIndices.map(idx => EMOTIONS[idx]).filter(Boolean);
    
    const finalData = {
      answers: tccAnswers,
      distortions: selectedDistortions,
      moodIndices: selectedMoodIndices,
      moodLabels: selectedEmotions.map(e => e.label),
      moodEmojis: selectedEmotions.map(e => e.emoji),
      // Keep legacy fields for partial compatibility if needed
      moodIndex: selectedMoodIndices[0], 
      moodLabel: selectedEmotions[0]?.label,
      moodEmoji: selectedEmotions[0]?.emoji
    };

    const finalDate = new Date(selectedDate).toISOString();

    if (editingLog) {
      await updateLog(editingLog.id, { date: finalDate, data: finalData });
    } else {
      await saveLog('tcc_record', 'Registro TCC Completo', finalData, finalDate);
    }
    setView('stats');
  };

  // Compute the correct answer index for text steps (skip distortions, scale, and mood)
  const getAnswerIndex = () => {
    if (tccStep === 1) return 0; // Situación
    if (tccStep === 2) return 1; // Pensamiento Automático
    if (tccStep === 6) return 3; // Conducta
    if (tccStep === 7) return 4; // Pensamiento Alternativo
    return null;
  };

  return (
    <div className="flex-1 p-6 flex flex-col animate-fade-in max-w-4xl mx-auto w-full">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-[hsl(var(--accent))] dark:hover:bg-slate-800 rounded-xl transition-colors dark:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold dark:text-white">{editingLog ? 'Editar Registro TCC' : 'Nuevo Registro TCC'}</h2>
      </header>

      <div className="flex-1 space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-50 dark:border-slate-700 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] font-bold text-sm">{tccStep + 1}</span>
             <span className="text-xs font-bold text-subtle uppercase tracking-widest">Paso {tccStep + 1} de {steps.length}</span>
          </div>
          <h3 className="text-3xl font-bold dark:text-white">{current.field}</h3>
          <p className="text-subtle text-lg">{current.desc}</p>
        </div>

        <div className="pt-6">
          {current.isDate ? (
            <div className="flex flex-col items-center gap-6 py-10">
              <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl">
                 <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none dark:text-white text-3xl font-black text-center"
                />
              </div>
              <p className="text-subtle text-sm font-bold uppercase tracking-widest text-center">Puedes registrar eventos pasados seleccionando la fecha</p>
            </div>
          ) : current.isScale ? (
            <div className="space-y-8">
              <input
                type="range" min="0" max="10"
                value={tccAnswers[2]}
                onChange={(e) => {
                  const newAnswers = [...tccAnswers];
                  newAnswers[2] = e.target.value;
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
          ) : current.isMood ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {EMOTIONS.map((e, i) => (
                <button
                  key={i}
                  onClick={() => toggleMood(i)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    selectedMoodIndices.includes(i)
                      ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand)/0.08)] shadow-lg scale-105'
                      : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600 hover:scale-[1.02]'
                  }`}
                >
                  <span className="text-3xl">{e.emoji}</span>
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${
                    selectedMoodIndices.includes(i) ? 'text-[hsl(var(--brand))]' : 'text-subtle'
                  }`}>{e.label}</span>
                </button>
              ))}
            </div>
          ) : current.isDistortions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COGNITIVE_DISTORTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDistortion(d.id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedDistortions.includes(d.id)
                      ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand)/0.05)] shadow-md'
                      : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl mt-1">{d.emoji}</span>
                  <div>
                    <h4 className="font-bold text-sm dark:text-white">{d.label}</h4>
                    <p className="text-[10px] leading-tight text-subtle mt-1">{d.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={tccAnswers[getAnswerIndex()] || ''}
              onChange={(e) => {
                const idx = getAnswerIndex();
                if (idx === null) return;
                const newAnswers = [...tccAnswers];
                newAnswers[idx] = e.target.value;
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
            if (tccStep < steps.length - 1) {
              setTccStep(tccStep + 1);
            } else {
              handleFinish();
            }
          }}
          className="flex-1 py-4 shadow-xl shadow-[hsl(var(--brand)/0.2)] bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand)/0.9)] text-white"
        >
          {tccStep < steps.length - 1 ? 'Continuar' : 'Guardar Registro'}
        </Button>
      </div>
    </div>
  );
};

const LoginView = ({ handleLogin }) => (
  <div className="flex-1 flex flex-col justify-center items-center p-8 space-y-12 animate-fade-in text-center dark:bg-slate-900">
    <div className="space-y-4">
      <div className="w-20 h-20 bg-[hsl(var(--brand))] rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-[hsl(var(--brand)/0.2)]">
        <Heart className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">Terapia TCC</h1>
      <p className="text-subtle max-w-[280px]">Tu compañero para el bienestar emocional y espiritual.</p>
    </div>

    <div className="w-full space-y-6 flex flex-col items-center">
      <Button variant="google" onClick={handleLogin} className="py-4 px-8 w-auto min-w-[240px]">
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
