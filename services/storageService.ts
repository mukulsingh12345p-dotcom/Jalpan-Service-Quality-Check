import { DailyReport, Status } from '../types';
import { FOOD_CATEGORIES, INITIAL_INSPECTOR } from '../constants';
import { supabase } from '../lib/supabase';

export const saveReport = async (report: DailyReport) => {
  const { error } = await supabase
    .from('daily_reports')
    .upsert({
      date: report.date,
      inspector_name: report.inspectorName,
      completion_time: report.completionTime,
      actions_taken: report.actionsTaken,
      finalized: report.finalized,
      items: report.items
    }, { onConflict: 'date' });

  if (error) {
    console.error('Error saving report:', error);
    throw error;
  }
};

export const hasReportForDate = async (date: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('finalized')
      .eq('date', date)
      .single();
    
    if (error || !data) return false;
    return data.finalized;
};

export const getReportForDate = async (date: string): Promise<DailyReport> => {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (data) {
    return {
      date: data.date,
      items: data.items,
      finalized: data.finalized,
      inspectorName: data.inspector_name,
      completionTime: data.completion_time,
      actionsTaken: data.actions_taken
    };
  }
  
  // Initialize empty report if not found in DB
  return {
    date,
    items: FOOD_CATEGORIES.map((cat, index) => ({
      id: `${date}-${index}`,
      category: cat,
      status: Status.PENDING,
      remark: '',
      inspectorName: INITIAL_INSPECTOR,
      counterIncharge: '',
      timestamp: Date.now()
    })),
    finalized: false,
    inspectorName: INITIAL_INSPECTOR,
    actionsTaken: ''
  };
};

export const getAllReportsArray = async (): Promise<DailyReport[]> => {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('finalized', true)
    .order('date', { ascending: false });

  if (error || !data) {
    console.error('Error fetching reports:', error);
    return [];
  }

  return data.map(row => ({
    date: row.date,
    items: row.items,
    finalized: row.finalized,
    inspectorName: row.inspector_name,
    completionTime: row.completion_time,
    actionsTaken: row.actions_taken
  }));
};