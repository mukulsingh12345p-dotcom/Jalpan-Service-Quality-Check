import React, { useState, useEffect } from 'react';
import { DailyReport, InspectionItem, Status } from '../types';
import { saveReport } from '../services/storageService';
import { CheckCircle, XCircle, ClipboardCheck, Info, User, CalendarDays, AlertTriangle, UserCircle, X, Star, Plus, CheckSquare, Square, Loader2 } from 'lucide-react';
import { INITIAL_INSPECTOR, CORRECTIVE_ACTIONS_LIST } from '../constants';

interface EntryFormProps {
  report: DailyReport;
  onSave: () => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onReset?: () => void;
}

const EntryForm: React.FC<EntryFormProps> = ({ report, onSave, selectedDate }) => {
  const [items, setItems] = useState<InspectionItem[]>(report.items);
  const [inspectorName, setInspectorName] = useState(report.inspectorName || report.items[0]?.inspectorName || INITIAL_INSPECTOR);
  
  // Split actionsTaken into checkboxes and custom text
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [customAction, setCustomAction] = useState('');
  
  const [showError, setShowError] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setItems(report.items);
    setInspectorName(report.inspectorName || report.items[0]?.inspectorName || INITIAL_INSPECTOR);
    
    // Parse existing actions string to populate form state
    const fullText = report.actionsTaken || '';
    const foundActions: string[] = [];
    let remainingText = fullText;

    CORRECTIVE_ACTIONS_LIST.forEach(action => {
        if (remainingText.includes(action)) {
            foundActions.push(action);
            // Remove the action to isolate custom text
            remainingText = remainingText.replace(action, '');
        }
    });

    // Clean up commas, newlines and whitespace from the remaining custom text
    remainingText = remainingText
        .replace(/[\n,]+/g, ' ') // Replace newlines and commas with space for cleanup
        .trim();

    setSelectedActions(foundActions);
    setCustomAction(remainingText);
    
    setShowError(false);
    setValidationMsg(null);
  }, [report]);

  const updateItem = (index: number, field: keyof InspectionItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const isSubItemRequired = (category: string) => {
    // Bread Pakoda/Snacks is explicitly excluded here to make it optional
    return category.includes("Dessert") || 
           category.includes("Special Counter") || 
           category.includes("Roti/Dal, Subzi");
  };

  // Check if any item is marked as Not Good
  const hasIssues = items.some(item => item.status === Status.NOT_GOOD);

  const getCombinedActions = () => {
      const parts = [...selectedActions];
      if (customAction.trim()) {
          parts.push(customAction.trim());
      }
      // Join with newline for clear separation in report
      return parts.join('\n');
  };

  const validate = () => {
    if (!inspectorName.trim()) return "Sewadar Name (at the top) is required.";
    
    for (const item of items) {
      if (item.status === Status.PENDING) return `Please rate quality for "${item.category}".`;
      if (!item.counterIncharge?.trim()) return `Counter Incharge name is required for "${item.category}".`;
      
      // Check mandatory food names for specific categories
      if (isSubItemRequired(item.category)) {
          const isDal = item.category.includes("Roti/Dal, Subzi") && item.subItem === 'Dal';
          if (!isDal && !item.subItem?.trim()) {
            return `Please mention the specific food name for "${item.category}".`;
          }
      }
    }

    // Mandatory Corrective Actions if any issue exists
    if (hasIssues) {
        const currentActions = getCombinedActions();
        if (!currentActions.trim()) {
             return "Corrective actions are mandatory since 'Not Good' issues were reported.";
        }
    }

    return null;
  };

  const handleSave = async () => {
    const errorMsg = validate();
    if (errorMsg) {
      setShowError(true);
      setValidationMsg(errorMsg);
      // Scroll to top to show the error message if needed
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    const now = new Date();
    const completionTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const updatedItems = items.map(item => ({ ...item, inspectorName }));
    const finalActionsTaken = getCombinedActions();
    
    try {
        await saveReport({ 
        ...report, 
        items: updatedItems, 
        finalized: true, 
        inspectorName, 
        actionsTaken: finalActionsTaken,
        completionTime 
        });
        onSave();
    } catch (e) {
        setValidationMsg("Failed to save to database. Please check connection.");
    } finally {
        setIsSaving(false);
    }
  };

  const setStatus = (index: number, status: Status) => {
    const currentItem = items[index];
    const newStatus = currentItem.status === status ? Status.PENDING : status;
    const newRemark = newStatus === Status.NOT_GOOD ? currentItem.remark : '';
    
    const newItems = [...items];
    newItems[index] = { 
      ...currentItem, 
      status: newStatus, 
      remark: newRemark 
    };
    setItems(newItems);
  };

  const toggleAction = (action: string) => {
      setSelectedActions(prev => {
          if (prev.includes(action)) {
              return prev.filter(a => a !== action);
          } else {
              return [...prev, action];
          }
      });
  };

  const renderSpecificInputs = (item: InspectionItem, index: number) => {
    const category = item.category;
    // only show red error border if it's one of the mandatory ones and it's missing
    const isError = showError && isSubItemRequired(category) && !item.subItem?.trim() && item.subItem !== 'Dal' && item.subItem !== undefined;
    
    const btnClass = (isSelected: boolean) => `px-4 py-2 text-sm rounded-xl border-2 transition-all active:scale-95 ${
        isSelected 
        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
    }`;

    if (category.includes("Roti/Dal, Subzi")) {
        return (
            <div className="mt-3 space-y-3">
                <div className="flex gap-2">
                    <button onClick={() => updateItem(index, 'subItem', item.subItem === 'Dal' ? undefined : 'Dal')} className={btnClass(item.subItem === 'Dal')}>Dal</button>
                    <button onClick={() => updateItem(index, 'subItem', (item.subItem && item.subItem !== 'Dal') ? undefined : '')} className={btnClass(item.subItem !== undefined && item.subItem !== 'Dal')}>Subzi</button>
                </div>
                {item.subItem !== undefined && item.subItem !== 'Dal' && (
                    <div className="space-y-1">
                      <input 
                          type="text"
                          placeholder="What specific Subzi is prepared? *"
                          value={item.subItem || ''}
                          onChange={(e) => updateItem(index, 'subItem', e.target.value)}
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors ${isError ? 'border-red-400 bg-red-50 placeholder:text-red-300' : 'border-slate-100 bg-slate-50'}`}
                      />
                      {isError && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">Subzi name is mandatory</p>}
                    </div>
                )}
            </div>
        );
    }

    if (category.includes("Kadhi/Rajma Chawal")) {
        return (
            <div className="mt-3 flex flex-wrap gap-2">
                {['Kadhi Chawal', 'Rajma Chawal', 'Biryani'].map((opt) => (
                    <button key={opt} onClick={() => updateItem(index, 'subItem', item.subItem === opt ? undefined : opt)} className={btnClass(item.subItem === opt)}>{opt}</button>
                ))}
            </div>
        );
    }

    if (category.includes("Dessert") || category.includes("Special Counter") || category.includes("Bread Pakoda/Snacks")) {
        const isSpecial = category.includes("Special Counter");
        const isSnack = category.includes("Bread Pakoda/Snacks");
        // Snack is explicitly optional in placeholder
        const placeholderText = isSpecial ? "What is the Special Dish today? *" : isSnack ? "Food name (Optional)" : `What is the name of ${category.split('/')[0]}? *`;
        
        return (
            <div className="mt-3 space-y-1">
                <input 
                    type="text"
                    placeholder={placeholderText}
                    value={item.subItem || ''}
                    onChange={(e) => updateItem(index, 'subItem', e.target.value)}
                    className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors ${isError ? 'border-red-400 bg-red-50 placeholder:text-red-300' : 'border-slate-100 bg-slate-50'}`}
                />
                {isError && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">Food name is mandatory</p>}
            </div>
        );
    }
    return null;
  };

  return (
    <div className="max-w-2xl mx-auto pb-12 view-enter">
      {/* Validation Message Banner */}
      {validationMsg && (
        <div className="fixed top-24 left-0 right-0 mx-auto w-[90%] max-w-md z-[100] animate-bounce">
            <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle size={20} />
                    <p className="text-sm font-bold">{validationMsg}</p>
                </div>
                <button onClick={() => setValidationMsg(null)} className="hover:bg-white/20 p-1 rounded-lg">
                    <X size={18} />
                </button>
            </div>
        </div>
      )}

      {/* Header Card */}
      <div className={`bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 mb-6 shadow-xl text-white transition-all ${showError && !inspectorName.trim() ? 'ring-4 ring-red-500 animate-pulse' : ''}`}>
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Quality Inspection</h2>
                <div className="flex items-center gap-2 text-blue-100 mt-1">
                    <CalendarDays size={16} />
                    <span className="text-sm font-medium">{new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
            </div>
        </div>

        <div className={`relative group transition-all duration-300`}>
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-100 transition-colors ${showError && !inspectorName.trim() ? 'text-red-300' : 'text-blue-300'}`}>
                <User size={18} />
            </div>
            <input 
                type="text"
                value={inspectorName}
                onChange={(e) => {
                  setInspectorName(e.target.value);
                  if(e.target.value.trim()) setValidationMsg(null);
                }}
                className={`w-full bg-white/10 border rounded-2xl pl-11 pr-4 py-4 text-sm font-semibold placeholder:text-blue-200 outline-none focus:bg-white/20 focus:border-white/40 transition-all ${showError && !inspectorName.trim() ? 'border-red-400 bg-red-500/20 placeholder:text-red-200' : 'border-white/20'}`}
                placeholder="Required: Enter Sewadar Name..."
            />
            <label className={`absolute -top-2 left-4 px-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${showError && !inspectorName.trim() ? 'bg-red-500 text-white' : 'bg-blue-700 text-blue-100'}`}>
                Sewadar on Duty *
            </label>
        </div>
        {showError && !inspectorName.trim() && (
          <p className="text-red-100 text-[10px] mt-2 font-bold flex items-center gap-1">
            <AlertTriangle size={12} /> Sewadar name is mandatory to finalize the report.
          </p>
        )}
      </div>

      {/* Inspection Items List */}
      <div className="space-y-6">
        {items.map((item, index) => {
          const isPending = item.status === Status.PENDING;
          const missingIncharge = showError && !item.counterIncharge?.trim();
          const missingStatus = showError && isPending;
          
          return (
            <div key={item.id} className={`bg-white rounded-3xl p-5 shadow-sm border transition-all relative overflow-hidden ${missingStatus || missingIncharge ? 'border-red-200 bg-red-50/30' : 'border-slate-100 hover:shadow-md'}`}>
              {isPending && (
                <div className={`absolute top-0 right-0 w-1.5 h-full ${showError ? 'bg-red-400' : 'bg-slate-200'}`} />
              )}
              
              <div className="flex flex-col gap-4 mb-4">
                  <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${missingStatus ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                          <Info size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 leading-tight uppercase tracking-tight">{item.category}</h3>
                        {missingStatus && <p className="text-[9px] text-red-500 font-bold uppercase">Rating Required</p>}
                      </div>
                  </div>
                  
                  {/* 3-Option Rating System */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                      <button
                          onClick={() => setStatus(index, Status.NOT_GOOD)}
                          className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                              item.status === Status.NOT_GOOD 
                              ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200' 
                              : 'bg-white border-slate-100 text-slate-400 hover:border-red-200 hover:text-red-400'
                          }`}
                      >
                          <XCircle size={20} />
                          <span className="text-[10px] font-black uppercase tracking-wider">Not Good</span>
                      </button>

                      <button
                          onClick={() => setStatus(index, Status.GOOD)}
                          className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                              item.status === Status.GOOD 
                              ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200' 
                              : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-500'
                          }`}
                      >
                          <CheckCircle size={20} />
                          <span className="text-[10px] font-black uppercase tracking-wider">Good</span>
                      </button>

                      <button
                          onClick={() => setStatus(index, Status.PERFECT)}
                          className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                              item.status === Status.PERFECT
                              ? 'bg-amber-400 border-amber-400 text-white shadow-lg shadow-amber-200' 
                              : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200 hover:text-amber-400'
                          }`}
                      >
                          <Star size={20} fill={item.status === Status.PERFECT ? "currentColor" : "none"} />
                          <span className="text-[10px] font-black uppercase tracking-wider">Perfect</span>
                      </button>
                  </div>
              </div>

              {/* Counter Incharge Input */}
              <div className="mb-4 group">
                  <div className="flex items-center gap-2 mb-1 px-1">
                      <UserCircle size={14} className={missingIncharge ? 'text-red-500' : 'text-slate-400'} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${missingIncharge ? 'text-red-500' : 'text-slate-400'}`}>Counter Incharge *</span>
                  </div>
                  <input 
                      type="text"
                      placeholder="Enter Incharge Name..."
                      value={item.counterIncharge || ''}
                      onChange={(e) => updateItem(index, 'counterIncharge', e.target.value)}
                      className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all ${missingIncharge ? 'border-red-400 bg-red-50 placeholder:text-red-300' : 'border-slate-50 bg-slate-50 focus:bg-white'}`}
                  />
                  {missingIncharge && <p className="text-[9px] text-red-500 font-bold uppercase mt-1 px-1">Incharge name is required</p>}
              </div>

              {renderSpecificInputs(item, index)}

              {item.status === Status.NOT_GOOD && (
                  <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2 mb-2 px-1">
                          <AlertTriangle size={14} className="text-red-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Issue Details (Required)</span>
                      </div>
                      <input
                          type="text"
                          placeholder="What exactly is not good? (e.g. Too salty, Cold, Spilled)"
                          value={item.remark}
                          onChange={(e) => updateItem(index, 'remark', e.target.value)}
                          className="w-full bg-red-50 border-2 border-red-100 rounded-xl px-4 py-3 text-sm text-red-900 outline-none focus:border-red-500 placeholder:text-red-300"
                          autoFocus
                      />
                  </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Corrective Actions Section */}
      <div className={`mt-10 rounded-[2.5rem] p-8 border transition-all duration-300 ${hasIssues ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-100' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${hasIssues ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                    <ClipboardCheck size={24} />
                  </div>
                  <div>
                    <h3 className={`font-black uppercase text-sm tracking-widest ${hasIssues ? 'text-amber-900' : 'text-slate-600'}`}>
                        Corrective Actions / Issues {hasIssues && <span className="text-red-500">*</span>}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Select all applicable issues or actions</p>
                  </div>
              </div>
          </div>

          {/* Predefined Action Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {CORRECTIVE_ACTIONS_LIST.map((action) => {
                  const isSelected = selectedActions.includes(action);
                  return (
                      <button
                          key={action}
                          onClick={() => toggleAction(action)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                              isSelected 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                              : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                          }`}
                      >
                          {isSelected ? <CheckSquare size={20} className="shrink-0" /> : <Square size={20} className="shrink-0 text-slate-300" />}
                          <span className="font-bold text-sm leading-tight">{action}</span>
                      </button>
                  );
              })}
          </div>

          {/* Custom Action Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
               <Plus size={14} className="text-slate-400" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Other Corrective Actions / Notes</span>
            </div>
            <textarea 
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                placeholder={hasIssues ? "Record any other specific actions taken..." : "Optional: Record any other observations..."}
                className={`w-full h-32 rounded-3xl p-5 text-sm outline-none transition-all shadow-inner border-2 ${showError && hasIssues && !getCombinedActions().trim() ? 'border-red-400 bg-red-50 placeholder:text-red-300' : 'border-transparent bg-white focus:border-amber-400'}`}
            />
          </div>
          
          {showError && hasIssues && !getCombinedActions().trim() && (
            <p className="text-[10px] text-red-600 font-bold uppercase mt-2 ml-2 flex items-center gap-1">
                <AlertTriangle size={12} /> At least one action or issue must be recorded
            </p>
          )}
      </div>

      {/* Submit Button */}
      <div className="mt-12 px-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full font-black py-7 rounded-[2.5rem] shadow-2xl transition-all text-xl flex items-center justify-center gap-4 bg-blue-900 hover:bg-blue-800 text-white active:scale-[0.98] shadow-blue-200 disabled:opacity-70 disabled:pointer-events-none`}
        >
          {isSaving ? (
            <>Saving Report... <Loader2 className="animate-spin" size={28} /></>
          ) : (
            <>Finalize Quality Sheet <CheckCircle size={28} /></>
          )}
        </button>
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
            Ensure all categories are rated before clicking finalize
        </p>
      </div>
    </div>
  );
};

export default EntryForm;