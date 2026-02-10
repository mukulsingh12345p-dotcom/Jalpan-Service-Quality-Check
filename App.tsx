import React, { useState, useEffect } from 'react';
import { ViewState, DailyReport } from './types';
import EntryForm from './components/EntryForm';
import ReportSheet from './components/ReportSheet';
import Dashboard from './components/Dashboard';
import { getReportForDate } from './services/storageService';
import { ClipboardList, BarChart3, PlusCircle, Settings, X, ArrowRight, ChefHat, Sparkles, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [hasEntered, setHasEntered] = useState(false);
  const [view, setView] = useState<ViewState>('form');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Async State
  const [currentReport, setCurrentReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
     const storedKey = localStorage.getItem('gemini_api_key');
     if (storedKey) setApiKey(storedKey);
  }, []);

  // Fetch report when date or refresh trigger changes
  useEffect(() => {
    if (!hasEntered) return;
    
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const report = await getReportForDate(selectedDate);
            setCurrentReport(report);
        } catch (e) {
            console.error("Failed to load report", e);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [selectedDate, refreshTrigger, hasEntered]);

  const saveApiKey = (key: string) => {
      setApiKey(key);
      localStorage.setItem('gemini_api_key', key);
      setShowSettings(false);
  };

  const handleEnterApp = () => {
      setHasEntered(true);
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setView('form');
  };

  const handleSave = () => {
    setRefreshTrigger(p => p + 1);
    setView('report');
  };

  if (!hasEntered) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Modern Background Accents */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-60" />

        <div className="z-10 flex flex-col items-center text-center max-w-sm w-full">
          <div className="mb-10 relative">
              <div className="bg-blue-600 p-8 rounded-[40px] shadow-2xl shadow-blue-200 rotate-6 transform transition-all hover:rotate-0 duration-500">
                 <ChefHat className="text-white w-20 h-20" />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-amber-400 p-4 rounded-full shadow-lg border-4 border-white animate-bounce">
                 <Sparkles className="text-white w-6 h-6" />
              </div>
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tight">
            Jalpan <span className="text-blue-600">Services</span>
          </h1>
          <p className="text-slate-500 text-lg mb-12 font-medium">
            Next-gen food quality <br/>& hygiene tracking.
          </p>

          <button 
            onClick={handleEnterApp}
            className="w-full py-5 bg-slate-900 text-white font-black text-xl rounded-3xl shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all transform active:scale-95 flex items-center justify-center gap-4"
          >
            Get Started
            <ArrowRight className="w-6 h-6" />
          </button>
          
          <p className="mt-12 text-slate-300 font-bold text-[10px] uppercase tracking-[0.3em]">
            Precision Standards • v2.0
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Refined Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="bg-slate-900 p-2.5 rounded-2xl group-hover:bg-blue-600 transition-colors">
              <ClipboardList className="text-white h-5 w-5" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase text-slate-900">Jalpan</span>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="flex items-center bg-slate-100 rounded-2xl px-4 h-11 transition-all focus-within:ring-2 focus-within:ring-blue-100">
               <input 
                 type="date" 
                 value={selectedDate}
                 onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                 className="bg-transparent border-none text-slate-800 text-sm font-bold focus:ring-0 p-0 outline-none w-28 sm:w-auto"
                 style={{ colorScheme: 'light' }}
               />
           </div>

           <button onClick={() => setShowSettings(true)} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-900 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all">
               <Settings size={18} />
           </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="max-w-4xl mx-auto px-4 pt-8">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <Loader2 className="animate-spin w-10 h-10 mb-4 text-blue-600" />
                <p className="text-xs font-bold uppercase tracking-widest">Loading Data...</p>
            </div>
        ) : (
            <>
                {view === 'form' && currentReport && (
                <EntryForm 
                    key={`${selectedDate}-${refreshTrigger}`}
                    report={currentReport} 
                    onSave={handleSave} 
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                />
                )}
                
                {view === 'report' && currentReport && (
                <ReportSheet 
                    key={`${selectedDate}-${refreshTrigger}`}
                    report={currentReport} 
                    apiKey={apiKey}
                />
                )}

                {view === 'dashboard' && (
                    <Dashboard 
                        key={refreshTrigger} 
                        onViewReport={(date) => { setSelectedDate(date); setView('report'); }}
                    />
                )}
            </>
        )}
      </main>

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-full px-4 py-3 z-40 flex gap-2">
          {[
              { id: 'form', icon: PlusCircle, label: 'Inspect' },
              { id: 'report', icon: ClipboardList, label: 'Reports' },
              { id: 'dashboard', icon: BarChart3, label: 'History' }
          ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${
                    view === item.id 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon size={18} />
                <span className={view === item.id ? 'block' : 'hidden sm:block'}>{item.label}</span>
              </button>
          ))}
      </nav>

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full p-8 relative animate-scale-in">
                  <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900"><X /></button>
                  <h3 className="text-2xl font-black mb-6 uppercase tracking-tight">App Configuration</h3>
                  <div className="mb-8">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gemini API Key</label>
                      <input 
                        type="password" 
                        value={apiKey} 
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste Key here..."
                        className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-3xl font-mono text-sm outline-none focus:border-blue-500 transition-all"
                      />
                      <p className="text-[10px] text-slate-400 mt-3 font-medium">This key is used only for AI-powered quality trend summaries.</p>
                  </div>
                  <button onClick={() => saveApiKey(apiKey)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-95">Update Settings</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;