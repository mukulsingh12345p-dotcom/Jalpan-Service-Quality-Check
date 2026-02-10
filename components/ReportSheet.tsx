import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DailyReport, Status } from '../types';
import { MessageCircle, FileDown, Loader2, FileX, Star, CheckCircle, XCircle } from 'lucide-react';
import { INITIAL_INSPECTOR } from '../constants';

interface ReportSheetProps {
  report: DailyReport;
  apiKey?: string;
}

const ReportSheet: React.FC<ReportSheetProps> = ({ report }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);

  const inspectorName = report.inspectorName || report.items[0]?.inspectorName || INITIAL_INSPECTOR;
  
  // Format date from YYYY-MM-DD to DD-MM-YYYY
  const formattedDate = report.date.split('-').reverse().join('-');

  // Calculate zoom to fit mobile screen
  useEffect(() => {
    const handleResize = () => {
        // 800px is the target width of the sheet. 
        // We leave 32px padding (16px on each side).
        const availableWidth = window.innerWidth - 32;
        if (availableWidth < 800) {
            setZoom(availableWidth / 800);
        } else {
            setZoom(1);
        }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!report.finalized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center view-enter">
        <div className="bg-slate-100 p-10 rounded-full mb-6">
          <FileX className="text-slate-300 w-20 h-20" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Sheet Pending</h2>
        <p className="text-slate-500 max-w-xs mx-auto mb-8">
          The quality report for <span className="font-bold text-slate-700">{formattedDate}</span> hasn't been submitted yet.
        </p>
      </div>
    );
  }

  const generatePDF = async () => {
    if (!sheetRef.current) return;
    setIsDownloading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const element = sheetRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 800,
        windowWidth: 800, // Force render width
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('report-capture-area');
          if (clonedElement) {
            // Reset zoom/transform for the PDF capture so it looks full size
            clonedElement.style.transform = 'none';
            // @ts-ignore - zoom property exists in style but missing in standard types
            clonedElement.style.zoom = '1'; 
            clonedElement.style.width = '800px';
            clonedElement.style.margin = '0';
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
      pdf.save(`Jalpan_Quality_Report_${formattedDate}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const shareToWhatsApp = () => {
    const statusEmoji = (s: Status) => {
        switch(s) {
            case Status.PERFECT: return '🌟';
            case Status.GOOD: return '✅';
            case Status.NOT_GOOD: return '❌';
            default: return '❓';
        }
    };

    let message = `🚀 *JALPAN SERVICES QUALITY REPORT*\n`;
    message += `📅 *Date:* ${formattedDate}\n`;
    message += `🕒 *Time:* ${report.completionTime || 'Recorded'}\n`;
    message += `👨‍🍳 *Sewadar:* ${inspectorName}\n\n`;

    report.items.forEach(item => {
      message += `${statusEmoji(item.status)} *${item.category}*${item.subItem ? ` (${item.subItem})` : ''}\n`;
      message += `   👤 _Incharge: ${item.counterIncharge || 'N/A'}_\n`;
      if (item.status === Status.NOT_GOOD && item.remark) {
        message += `   ⚠️ _Issue: ${item.remark}_\n`;
      }
    });

    if (report.actionsTaken) {
      message += `\n🛠️ *ACTIONS TAKEN:*\n${report.actionsTaken}\n`;
    }

    message += `\n_Digital inspection generated via Jalpan App_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderStatusBadge = (status: Status) => {
    switch(status) {
        case Status.PERFECT:
            return (
                <div className="flex items-center justify-center min-w-[70px] py-1.5 px-2 bg-amber-400 text-white font-bold rounded-lg text-[9px] leading-none shadow-sm uppercase tracking-wide gap-1">
                    <Star size={10} fill="currentColor" /> PERFECT
                </div>
            );
        case Status.GOOD:
            return (
                <div className="flex items-center justify-center min-w-[70px] py-1.5 px-2 bg-blue-500 text-white font-bold rounded-lg text-[9px] leading-none shadow-sm uppercase tracking-wide gap-1">
                    <CheckCircle size={10} /> GOOD
                </div>
            );
        case Status.NOT_GOOD:
            return (
                <div className="flex items-center justify-center min-w-[70px] py-1.5 px-2 bg-red-500 text-white font-bold rounded-lg text-[9px] leading-none shadow-sm uppercase tracking-wide gap-1">
                    <XCircle size={10} /> NOT GOOD
                </div>
            );
        default:
            return <span className="text-slate-300 font-bold text-[10px] uppercase">PENDING</span>;
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 pb-32 view-enter">

      {/* Digital Sheet Visualizer */}
      {/* We use a scaling wrapper to fit the 800px sheet on mobile */}
      <div className="w-full flex justify-center">
        <div style={{ zoom: zoom }} className="origin-top">
            <div
            ref={sheetRef}
            id="report-capture-area"
            className="bg-white p-8 sm:p-12 shadow-2xl border border-slate-200 mx-auto text-slate-900 overflow-hidden"
            style={{ width: '800px', minWidth: '800px' }}
            >
            {/* Header Section */}
            <div className="flex flex-col mb-8">
                <h1 className="text-3xl font-black text-blue-900 leading-tight tracking-tight uppercase">
                Jalpan Services Quality Check
                </h1>
                
                <div className="flex flex-col items-end mt-4">
                <div className="bg-blue-900 text-white px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest">
                    DAILY QUALITY SHEET
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-3 tracking-widest uppercase">
                    INSPECTED AT: {report.completionTime || 'Not recorded'}
                </p>
                <p className="text-2xl font-black border-b-2 border-blue-900 pb-1 mt-1 text-blue-900">
                    {formattedDate}
                </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-200 mb-8 border-y-2 border-blue-900">
                <div className="bg-white p-5 border-l-4 border-blue-600">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Sewadar on quality check duty</p>
                <p className="text-xl font-black text-blue-900 uppercase">{inspectorName || 'Unassigned'}</p>
                </div>
                <div className="bg-white p-5 border-l-4 border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Location</p>
                <p className="text-xl font-black text-blue-900 uppercase">Canteen, Kirpal Bagh</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8 border-collapse">
                <thead className="bg-slate-50">
                <tr className="border-b-2 border-blue-900">
                    <th className="py-3 px-2 text-left font-black uppercase text-[10px] tracking-widest w-1/3 text-slate-500">CATEGORY</th>
                    <th className="py-3 px-2 text-left font-black uppercase text-[10px] tracking-widest w-1/4 text-slate-500">INCHARGE</th>
                    <th className="py-3 px-2 text-center font-black uppercase text-[10px] tracking-widest w-24 text-slate-500">RATING</th>
                    <th className="py-3 px-2 text-left font-black uppercase text-[10px] tracking-widest text-slate-500">REMARKS</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {report.items.map((item) => (
                    <tr key={item.id}>
                    <td className="py-4 px-2">
                        <p className="font-bold text-slate-900 text-sm uppercase tracking-tight leading-none">{item.category}</p>
                        {item.subItem && (
                        <p className="text-[9px] font-bold text-blue-600 mt-1 uppercase tracking-wide">Item: {item.subItem}</p>
                        )}
                    </td>
                    <td className="py-4 px-2">
                        <p className="text-[11px] font-black text-slate-600 uppercase">{item.counterIncharge || '—'}</p>
                    </td>
                    <td className="py-4 px-2">
                        <div className="flex items-center justify-center h-full">
                        {renderStatusBadge(item.status)}
                        </div>
                    </td>
                    <td className="py-4 px-2 text-slate-600 text-[10px] font-medium italic">
                        {item.remark || "Satisfactory"}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Footer Notes */}
            <div className="mt-8 space-y-6">
                <div className="bg-slate-50 p-5 border-l-4 border-amber-400">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900 mb-2 underline decoration-amber-400 underline-offset-4">ACTION LOG & ISSUES</h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium min-h-[40px] whitespace-pre-wrap">
                    {report.actionsTaken || "Standard quality check completed. All systems operational."}
                </p>
                </div>

                <div className="flex justify-end pt-8">
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">AUTHORIZED SIGNATORY</p>
                    <div className="signature-font text-3xl text-blue-900 border-b-2 border-slate-200 px-8 pb-1 inline-block min-w-[200px] text-center">
                    {inspectorName || 'Administrator'}
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 flex flex-col gap-3 z-50">
        <button
          onClick={generatePDF}
          disabled={isDownloading}
          className="group relative overflow-hidden bg-blue-900 text-white px-6 py-4 rounded-3xl font-bold shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 w-full"
        >
          {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
          <span>Save PDF Report</span>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={shareToWhatsApp}
          className="bg-[#22C55E] text-white px-6 py-4 rounded-3xl font-bold shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 w-full"
        >
          <MessageCircle size={20} />
          <span>Send to WhatsApp</span>
        </button>
      </div>

    </div>
  );
};

export default ReportSheet;