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
        case Status.PERFECT: return <span className="text-amber-600 font-semibold whitespace-nowrap">Perfect 🌟</span>;
        case Status.GOOD: return <span className="text-blue-700 font-semibold whitespace-nowrap">Good ✅</span>;
        case Status.NOT_GOOD: return <span className="text-red-700 font-semibold whitespace-nowrap">Not Good ❌</span>;
        default: return <span className="text-slate-300 font-semibold whitespace-nowrap">Pending</span>;
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
            className="bg-white p-16 shadow-sm border border-slate-100 mx-auto text-slate-800 overflow-hidden text-[15px] report-font leading-relaxed"
            style={{ width: '800px', minWidth: '800px' }}
          >
            {/* Header Section */}
            <div className="mb-10 border-b border-slate-200 pb-6">
              <p className="text-[11px] italic text-slate-400 mb-8 leading-none tracking-wide">
                With the blessings of H.H. Sant Rajinder Singh Ji Maharaj, Jalpan Services Quality Group presents the quality report for {formattedDate}
              </p>
              <h1 className="text-4xl font-semibold text-[#1a2652] mb-2 report-ui-font tracking-tight">Jalpan Services Quality Report</h1>
              <p className="text-xl text-slate-500 font-normal italic tracking-normal">Comprehensive Quality Summary</p>
            </div>

            {/* 1. Duty Overview */}
            <div className="mb-10">
              <h2 className="text-[16px] font-semibold mb-4 text-[#1a2652] uppercase tracking-wider report-ui-font">1. Inspection Overview</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#2D3E7B] text-white">
                    <th className="py-3 px-5 text-left border border-[#2D3E7B] font-medium w-1/3 report-ui-font">Metric</th>
                    <th className="py-3 px-5 text-left border border-[#2D3E7B] font-medium report-ui-font">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 px-5 border border-slate-200 font-medium bg-slate-50/50">Reporting Quality Group</td>
                    <td className="py-3 px-5 border border-slate-200 font-medium text-[#1a2652]">Jalpan Services</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 border border-slate-200 font-medium bg-slate-50/50">Sewadar on Duty</td>
                    <td className="py-3 px-5 border border-slate-200 font-semibold text-[#1a2652]">{inspectorName}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 border border-slate-200 font-medium bg-slate-50/50">Inspection Date</td>
                    <td className="py-3 px-5 border border-slate-200 font-semibold text-[#1a2652]">{formattedDate}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 border border-slate-200 font-medium bg-slate-50/50">Location Covered</td>
                    <td className="py-3 px-5 border border-slate-200">Canteen, Kirpal Bagh</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 border border-slate-200 font-medium bg-slate-50/50">Inspection Timing</td>
                    <td className="py-3 px-5 border border-slate-200 font-medium text-[#1a2652]">{report.completionTime || '--:--'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Rating Distribution */}
            <div className="mb-10">
              <h2 className="text-[16px] font-semibold mb-4 text-[#1a2652] uppercase tracking-wider report-ui-font">2. Rating Distribution</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#4155B1] text-white">
                    <th className="py-3 px-5 text-left border border-[#4155B1] font-medium report-ui-font">Rating Level</th>
                    <th className="py-3 px-5 text-left border border-[#4155B1] font-medium report-ui-font">Description</th>
                    <th className="py-3 px-5 text-left border border-[#4155B1] font-medium report-ui-font">Item Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 px-5 border border-slate-200 font-semibold text-amber-700">Perfect 🌟</td>
                    <td className="py-3 px-5 border border-slate-200 italic text-slate-600">Exceptional quality and hygiene</td>
                    <td className="py-3 px-5 border border-slate-200 font-bold">{perfectCount}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 border border-slate-200 font-semibold text-blue-800">Good ✅</td>
                    <td className="py-3 px-5 border border-slate-200 italic text-slate-600">Standard parameters satisfied</td>
                    <td className="py-3 px-5 border border-slate-200 font-bold">{goodCount}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 border border-slate-200 font-semibold text-red-800">Not Good ❌</td>
                    <td className="py-3 px-5 border border-slate-200 italic text-slate-600">Requires immediate corrective action</td>
                    <td className="py-3 px-5 border border-slate-200 font-bold text-red-800">{notGoodCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Detailed Quality Assessment */}
            <div className="mb-10">
              <h2 className="text-[16px] font-semibold mb-4 text-[#1a2652] uppercase tracking-wider report-ui-font">3. Detailed Quality Assessment</h2>
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="bg-[#2a8b66] text-white">
                    <th className="py-3 px-4 text-left border border-[#2a8b66] font-medium report-ui-font">Category</th>
                    <th className="py-3 px-4 text-left border border-[#2a8b66] font-medium report-ui-font">Specific Item</th>
                    <th className="py-3 px-4 text-left border border-[#2a8b66] font-medium report-ui-font">Incharge</th>
                    <th className="py-3 px-4 text-left border border-[#2a8b66] font-medium report-ui-font">Rating</th>
                    <th className="py-3 px-4 text-left border border-[#2a8b66] font-medium report-ui-font">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 border border-slate-200 font-semibold text-slate-700 w-[180px]">{item.category}</td>
                      <td className="py-3 px-4 border border-slate-200 font-medium text-blue-900">{item.subItem || '—'}</td>
                      <td className="py-3 px-4 border border-slate-200">{item.counterIncharge || '—'}</td>
                      <td className="py-3 px-4 border border-slate-200">{renderStatusSymbol(item.status)}</td>
                      <td className="py-3 px-4 border border-slate-200 italic text-slate-500">{item.remark || 'Satisfactory'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Corrective Actions */}
            <div className="mb-12">
              <h2 className="text-[16px] font-semibold mb-4 text-[#1a2652] uppercase tracking-wider report-ui-font">4. Reported Issues & Corrective Actions</h2>
              <div className="border border-slate-200 p-8 bg-slate-50/50 min-h-[140px] whitespace-pre-wrap leading-relaxed text-slate-700 italic text-[16px]">
                {report.actionsTaken || "No major incidents or corrective actions reported during this session. Standard quality protocols were observed and maintained across all counters."}
              </div>
            </div>

            {/* Footer Signatories */}
            <div className="mt-20 flex justify-end">
              <div className="w-72 text-center">
                <div className="border-t border-slate-300 pt-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.25em] mb-4 report-ui-font">Authorized Signatory</p>
                  <p className="signature-font text-4xl text-[#1a2652] mb-1">{inspectorName}</p>
                  <p className="text-[11px] text-slate-400 font-medium italic">Inspection completed at {report.completionTime || '--:--'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportSheet;