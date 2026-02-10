import { GoogleGenAI } from "@google/genai";
import { DailyReport, Status } from "../types";

// Helper to get formatted text for Gemini
const formatReportForPrompt = (report: DailyReport): string => {
  let text = `Date: ${report.date}\n`;
  text += `Sewadar on Duty: ${report.inspectorName || 'Unknown'}\n\n`;
  
  report.items.forEach(item => {
    let line = `- ${item.category}`;
    if (item.subItem) {
        line += ` (${item.subItem})`;
    }
    // Explicitly mention the status string (e.g., PERFECT, GOOD, NOT_GOOD)
    line += `: ${item.status} (${item.remark || 'No remark'})`;
    text += line + '\n';
  });

  if (report.actionsTaken) {
    text += `\nActions Taken: ${report.actionsTaken}\n`;
  }

  return text;
};

export const analyzeReport = async (report: DailyReport, apiKey: string): Promise<string> => {
  if (!apiKey) return "Error: API Key is missing. Please set it in settings.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // We use the flash model for speed and summarization tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are the Quality Control Manager for Jalpan Services canteen. 
        Review the following daily food quality check report.
        
        The rating system is:
        - PERFECT (Exceptional quality)
        - GOOD (Standard acceptable quality)
        - NOT_GOOD (Quality failure, requires action)

        Generate a concise, professional summary for the kitchen staff.
        1. Mention what specific items were cooked (e.g. which subzi, which snack) if listed.
        2. Highlight any items marked NOT_GOOD.
        3. Mention items marked PERFECT as "Highlights" to encourage the team.
        4. Acknowledge the "Actions Taken" if any were recorded.
        5. Give a 1-sentence action item if there are pending issues.
        
        Keep it brief (max 120 words).
        
        REPORT DATA:
        ${formatReportForPrompt(report)}
      `,
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to analyze report. Please check your API key and connection.";
  }
};