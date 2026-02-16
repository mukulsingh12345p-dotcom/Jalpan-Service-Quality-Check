
import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DailyReport, Status } from '../types';
import { MessageCircle, FileDown, Loader2, FileX, Star, CheckCircle, XCircle } from 'lucide-react';
import { INITIAL_INSPECTOR } from '../constants';

interface ReportSheetProps {
  report: DailyReport;
}

const ReportSheet: React.FC<ReportSheetProps> = ({ report }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);

  const inspectorName = report.inspectorName || report.items[0]?.inspectorName || INITIAL_INSPECTOR;
  
  // Format date from YYYY-MM-DD to DD-MM-YYYY
  const formattedDate = report.date.split('-').reverse().join('-');

  // Summary stats for section 2
  const perfectCount = report.items.filter(i => i.status === Status.PERFECT).length;
  const goodCount = report.items.filter(i => i.status === Status.GOOD).length;
  const notGoodCount = report.items.filter(i => i.status === Status.NOT_GOOD).length;

  // Calculate zoom to fit mobile screen
  useEffect(() => {
    const handleResize = () => {
        // 800px is the target width of the sheet. 
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
        windowWidth: 800, 
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('report-capture-area');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            // @ts-ignore
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

  const renderStatusSymbol = (status: Status) => {
    switch(status) {
        case Status.PERFECT: return <span className="text-amber-500 font-bold whitespace-nowrap">PERFECT 🌟</span>;
        case Status.GOOD: return <span className="text-blue-600 font-bold whitespace-nowrap">GOOD ✅</span>;
        case Status.NOT_GOOD: return <span className="text-red-600 font-bold whitespace-nowrap">NOT GOOD ❌</span>;
        default: return <span className="text-slate-300 font-bold whitespace-nowrap">PENDING</span>;
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 pb-32 view-enter">

      {/* Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 flex flex-col gap-3 z-50">
        <button
          onClick={generatePDF}
          disabled={isDownloading}
          className="bg-[#2D3E7B] text-white px-6 py-4 rounded-2xl font-bold shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 w-full"
        >
          {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
          <span>Download PDF Report</span>
        </button>

        <button
          onClick={shareToWhatsApp}
          className="bg-[#22C55E] text-white px-6 py-4 rounded-2xl font-bold shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 w-full"
        >
          <MessageCircle size={20} />
          <span>Send to WhatsApp</span>
        </button>
      </div>

      <div className="w-full flex justify-center mt-4">
        <div style={{ zoom: zoom }} className="origin-top">
          <div
            ref={sheetRef}
            id="report-capture-area"
            className="bg-white p-12 shadow-sm border border-slate-100 mx-auto text-slate-900 overflow-hidden text-[13px]"
            style={{ width: '800px', minWidth: '800px' }}
          >
            {/* Header Section */}
            <div className="mb-8 border-b-2 border-slate-100 pb-4">
              <p className="text-[10px] italic text-slate-500 mb-6 leading-none">
                With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, Jalpan Services Quality Group, presents the quality report for {formattedDate}
              </p>
              <h1 className="text-3xl font-bold text-[#2D3E7B] mb-1">Jalpan Services Quality report</h1>
              <p className="text-lg text-slate-500 font-medium tracking-tight">Quality Report Summary</p>
            </div>

            {/* 1. Duty Overview */}
            <div className="mb-8">
              <h2 className="text-[14px] font-bold mb-3">1. Inspection Overview</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#2D3E7B] text-white">
                    <th className="py-2.5 px-4 text-left border border-slate-200 font-bold w-1/3">Metric</th>
                    <th className="py-2.5 px-4 text-left border border-slate-200 font-bold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 px-4 border border-slate-200 font-medium bg-slate-50/50">Reporting Quality Group</td>
                    <td className="py-2.5 px-4 border border-slate-200 font-semibold uppercase">Jalpan Services</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 border border-slate-200 font-medium bg-slate-50/50">Sewadar on Duty</td>
                    <td className="py-2.5 px-4 border border-slate-200 font-bold uppercase">{inspectorName}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 border border-slate-200 font-medium bg-slate-50/50">Location Covered</td>
                    <td className="py-2.5 px-4 border border-slate-200">Canteen, Kirpal Bagh</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 border border-slate-200 font-medium bg-slate-50/50">Inspection Timing</td>
                    <td className="py-2.5 px-4 border border-slate-200 font-semibold uppercase">{report.completionTime || '--:--'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Rating Distribution */}
            <div className="mb-8">
              <h2 className="text-[14px] font-bold mb-3">2. Rating Distribution</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#4155B1] text-white">
                    <th className="py-2.5 px-4 text-left border border-slate-200 font-bold">Rating Level</th>
                    <th className="py-2.5 px-4 text-left border border-slate-200 font-bold">Description</th>
                    <th className="py-2.5 px-4 text-left border border-slate-200 font-bold">Item Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 px-4 border border-slate-200 font-bold text-amber-600">Perfect 🌟</td>
                    <td className="py-2.5 px-4 border border-slate-200 italic">Exceptional quality and hygiene</td>
                    <td className="py-2.5 px-4 border border-slate-200 font-bold">{perfectCount}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 border border-slate-200 font-bold text-blue-600">Good ✅</td>
                    <td className="py-2.5 px-4 border border-slate-200 italic">Standard parameters satisfied</td>
                    <td className="py-2.5 px-4 border border-slate-200 font-bold">{goodCount}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 border border-slate-200 font-bold text-red-600">Not Good ❌</td>
                    <td className="py-2.5 px-4 border border-slate-200 italic">Requires immediate corrective action</td>
                    <td className="py-2.5 px-4 border border-slate-200 font-bold text-red-600">{notGoodCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Detailed Quality Assessment */}
            <div className="mb-8">
              <h2 className="text-[14px] font-bold mb-3">3. Detailed Quality Assessment</h2>
              <table className="w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="bg-[#24A171] text-white">
                    <th className="py-2.5 px-2 text-left border border-slate-200 font-bold">Category</th>
                    <th className="py-2.5 px-2 text-left border border-slate-200 font-bold">Specific Item</th>
                    <th className="py-2.5 px-2 text-left border border-slate-200 font-bold">Incharge</th>
                    <th className="py-2.5 px-2 text-left border border-slate-200 font-bold">Rating</th>
                    <th className="py-2.5 px-2 text-left border border-slate-200 font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-2 border border-slate-200 font-bold uppercase tracking-tight w-[180px]">{item.category}</td>
                      <td className="py-2.5 px-2 border border-slate-200 font-medium uppercase text-blue-800">{item.subItem || 'N/A'}</td>
                      <td className="py-2.5 px-2 border border-slate-200 uppercase">{item.counterIncharge || '—'}</td>
                      <td className="py-2.5 px-2 border border-slate-200">{renderStatusSymbol(item.status)}</td>
                      <td className="py-2.5 px-2 border border-slate-200 italic text-slate-500">{item.remark || 'Satisfactory'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Corrective Actions */}
            <div className="mb-10">
              <h2 className="text-[14px] font-bold mb-3">4. Reported Issues & Corrective Actions</h2>
              <div className="border border-slate-200 p-6 bg-slate-50/80 min-h-[120px] whitespace-pre-wrap leading-relaxed text-slate-600 italic">
                {report.actionsTaken || "No major incidents or corrective actions reported during this session. Standard procedures followed."}
              </div>
            </div>

            {/* Footer Signatories */}
            <div className="mt-16 flex justify-end">
              <div className="w-64 text-center border-t border-slate-200 pt-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">AUTHORIZED SIGNATORY</p>
                <p className="signature-font text-3xl text-[#2D3E7B]">{inspectorName}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportSheet;
