export enum Status {
  PENDING = 'PENDING',
  NOT_GOOD = 'NOT_GOOD',
  GOOD = 'GOOD',
  PERFECT = 'PERFECT'
}

export interface InspectionItem {
  id: string;
  category: string;
  status: Status;
  remark: string;
  inspectorName: string;
  counterIncharge?: string; // Name of the person in charge of this specific counter
  subItem?: string; // Stores specific details like "Aloo Gobi" or "Rajma Chawal"
  timestamp: number;
}

export interface DailyReport {
  date: string; // YYYY-MM-DD
  items: InspectionItem[];
  overallRemark?: string;
  actionsTaken?: string;
  finalized: boolean;
  inspectorName?: string;
  completionTime?: string; // e.g., "11:20 AM"
}

export type ViewState = 'form' | 'report' | 'dashboard' | 'history';

export interface ChartDataPoint {
  date: string;
  issues: number;
  ok: number;
}