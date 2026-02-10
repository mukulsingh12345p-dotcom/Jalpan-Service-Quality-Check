import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Status, DailyReport } from '../types';
import { getAllReportsArray, hasReportForDate } from '../services/storageService';
import { Calendar, FileText, CheckCircle, AlertCircle, ChevronRight, Search, BarChart3, Download, FileDown, Loader2, X, Star } from 'lucide-react';
import { FOOD_CATEGORIES } from '../constants';

interface DashboardProps {
    onViewReport?: (date: string) => void;
}

interface CategoryStat {
    category: string;
    perfectCount: number;
    goodCount: number;
    notGoodCount: number;
    totalChecked: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewReport }) => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchDate, setSearchDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Range Analysis State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const data = await getAllReportsArray();
            setReports(data);
        } catch (e) {
            console.error("Failed to load reports", e);
        } finally {
            setIsLoading(false);
        }
    };
    fetchReports();
  }, []);

  const handleSearch = async () => {
      if (!searchDate) {
          setError("Please select a date first.");
          return;
      }
      
      const exists = await hasReportForDate(searchDate);
      if (exists) {
          setError(null);
          onViewReport?.(searchDate);
      } else {
          setError(`No report found for ${searchDate.split('-').reverse().join('-')}.`);
      }
  };

  const calculateRangeStats = () => {
      if (!startDate || !endDate) return [];
      
      const filteredReports = reports.filter(r => r.date >= startDate && r.date <= endDate);
      
      const stats: Record<string, CategoryStat> = {};
      FOOD_CATEGORIES.forEach(cat => {
          stats[cat] = { category: cat, perfectCount: 0, goodCount: 0, notGoodCount: 0, totalChecked: 0 };
      });

      filteredReports.forEach(report => {
          report.items.forEach(item => {
              if (stats[item.category]) {
                  if (item.status === Status.PERFECT) {
                      stats[item.category].perfectCount++;
                      stats[item.category].totalChecked++;
                  } else if (item.status === Status.GOOD) {
                      stats[item.category].goodCount++;
                      stats[item.category].totalChecked++;
                  } else if (item.status === Status.NOT_GOOD) {
                      stats[item.category].notGoodCount++;
                      stats[item.category].totalChecked++;
                  }
              }
          });
      });

      return Object.values(stats);
  };

  const exportSummaryPDF = async () => {
    if (!summaryRef.current) return;
    setIsExporting(true);
    try {
        // Wait for potential rendering
        await new Promise(resolve => setTimeout(resolve, 300));

        const element = summaryRef.current;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 800, // Lock capture width
            onclone: (clonedDoc) => {
              const clonedElement = clonedDoc.getElementById('dashboard-summary-area');
              if (clonedElement) {
                clonedElement.style.width = '800px';
                clonedElement.style.height = 'auto';
                clonedElement.style.padding = '40px';
                clonedElement.style.overflow = 'visible';
              }
            }
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`Jalpan_Summary_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
        console.error("PDF Export Error:", err);
        alert("Failed to export PDF. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  const rangeStats = calculateRangeStats();
  const formatRangeDate = (d: string) => d.split('-').reverse().join('-');

  if (isLoading) {
      return (
          <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-32">
      
      {/* Search and Summary Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Single Date Search */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
                <Search size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Quick Search</h3>
            </div>
            <div className="space-y-3">
                <input 
                    type="date" 
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full bg-white text-slate-900 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors"
                />
                <button 
                    onClick={handleSearch}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                >
                    View Report
                </button>
            </div>
            {error && <p className="text-red-500 text-[10px] mt-2 font-bold uppercase tracking-wider">{error}</p>}
        </div>

        {/* Range Analysis Button */}
        <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-100 text-white">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} />
                <h3 className="font-bold">Range Analytics</h3>
            </div>
            <p className="text-xs text-blue-100 mb-4 font-medium leading-relaxed">Analyze quality trends for a specific period of time.</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-[10px] outline-none text-white" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-[10px] outline-none text-white" />
            </div>
            <button 
                disabled={!startDate || !endDate}
                onClick={() => setShowSummary(true)}
                className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition disabled:opacity-50"
            >
                Generate Summary
            </button>
        </div>
      </div>

      {/* History List */}
      <div className="view-enter">
        <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Recent Inspections</h3>
            <span className="text-[10px] font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">{reports.length} Reports Total</span>
        </div>
        
        {reports.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <FileText className="mx-auto text-slate-200 mb-4" size={60} />
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No history recorded yet</p>
            </div>
        ) : (
            <div className="space-y-4">
                {reports.slice(0, 15).map((report) => {
                    const issuesCount = report.items.filter(i => i.status === Status.NOT_GOOD).length;
                    const perfectCount = report.items.filter(i => i.status === Status.PERFECT).length;
                    
                    return (
                        <div 
                            key={report.date}
                            onClick={() => onViewReport?.(report.date)}
                            className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${issuesCount === 0 ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'}`}>
                                    {issuesCount === 0 ? <CheckCircle size={28} strokeWidth={2.5} /> : <AlertCircle size={28} strokeWidth={2.5} />}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-lg tracking-tight">
                                        {report.date.split('-').reverse().join('-')}
                                    </h4>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${issuesCount === 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {issuesCount === 0 ? (perfectCount > 0 ? `${perfectCount} Perfect Ratings` : 'All Good') : `${issuesCount} Anomalies`}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* Range Summary Modal */}
      {showSummary && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
                  <button 
                    onClick={() => setShowSummary(false)}
                    className="absolute top-4 right-4 bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"
                  >
                      <X size={20} />
                  </button>

                  <div className="p-8 pb-32">
                      <div ref={summaryRef} id="dashboard-summary-area" className="bg-white">
                        <h2 className="text-2xl font-black text-blue-900 uppercase leading-tight mb-2">Quality Analytics</h2>
                        <p className="text-sm font-bold text-slate-500 mb-8 uppercase tracking-widest">
                            {formatRangeDate(startDate)} <span className="text-blue-300 mx-2">•</span> {formatRangeDate(endDate)}
                        </p>

                        <div className="space-y-4">
                            {rangeStats.map((stat) => (
                                <div key={stat.category} className="border-b border-slate-100 pb-4 last:border-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm uppercase">{stat.category}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {stat.totalChecked} Checks
                                        </span>
                                    </div>
                                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                                        <div style={{ width: `${(stat.perfectCount / stat.totalChecked) * 100}%` }} className="bg-amber-400" />
                                        <div style={{ width: `${(stat.goodCount / stat.totalChecked) * 100}%` }} className="bg-blue-500" />
                                        <div style={{ width: `${(stat.notGoodCount / stat.totalChecked) * 100}%` }} className="bg-red-500" />
                                    </div>
                                    <div className="flex justify-between mt-2 text-[10px] font-bold uppercase text-slate-500">
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Perfect ({stat.perfectCount})</div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Good ({stat.goodCount})</div>
                                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Issues ({stat.notGoodCount})</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-8 pt-8 border-t-2 border-slate-100">
                             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                 <h4 className="text-blue-900 font-bold uppercase text-xs mb-1">Manager Sign-off</h4>
                                 <div className="h-10 border-b border-blue-200" />
                             </div>
                        </div>
                      </div>
                  </div>
                  
                  {/* Floating Action Bar */}
                  <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-md p-6 border-t border-slate-100 flex justify-center">
                        <button
                          onClick={exportSummaryPDF}
                          disabled={isExporting}
                          className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-xl flex items-center gap-3 active:scale-95 transition-all"
                        >
                            {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
                            Download Report PDF
                        </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;