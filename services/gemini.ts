
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { LEARNING_SYSTEM_INSTRUCTION, SUPPORT_SYSTEM_INSTRUCTION, MUSIC_SYSTEM_INSTRUCTION, ORGANIZATION_SYSTEM_INSTRUCTION, DEEP_RESEARCH_SYSTEM_INSTRUCTION, ANALYTICS_SYSTEM_INSTRUCTION, POLYGLOT_SYSTEM_INSTRUCTION, GAMES_SYSTEM_INSTRUCTION, CHATPDF_SYSTEM_INSTRUCTION, NOTES_SYSTEM_INSTRUCTION } from "../constants";
import { ChatMode, Attachment, Task, Timetable, Message, UserProfile, StudySession, SubjectGrade } from "../types";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable is missing");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export const initializeChat = (mode: ChatMode = 'learning', history?: Message[]) => {
  const ai = getAiClient();
  
  let instruction = LEARNING_SYSTEM_INSTRUCTION;
  // Default to Gemini 3 Pro for maximum precision and reasoning capabilities in academic contexts
  let modelName = "gemini-3-pro-preview"; 
  
  // Professional Grade Tuning: Optimized for Precision vs Creativity
  let temperature = 0.3; 
  let topK = 35; // Balanced for academic clarity and natural flow

  if (mode === 'support') {
    instruction = SUPPORT_SYSTEM_INSTRUCTION;
    modelName = "gemini-2.5-flash"; // Flash is excellent for empathetic, quick conversational flows
    temperature = 0.7; // Higher warmth and empathy, less robotic
    topK = 40;
  } else if (mode === 'music') {
    instruction = MUSIC_SYSTEM_INSTRUCTION;
    modelName = "gemini-2.5-flash"; // Flash is sufficient and fast for creative curation
    temperature = 0.9; // Maximum creativity for diverse curation
    topK = 60;
  } else if (mode === 'organization') {
    instruction = ORGANIZATION_SYSTEM_INSTRUCTION;
    // Keep Pro for complex scheduling logic
    temperature = 0.1; // Extremely precise and deterministic for logic/planning
    topK = 10;
  } else if (mode === 'deep_research') {
    instruction = DEEP_RESEARCH_SYSTEM_INSTRUCTION;
    // Keep Pro for heavy context window and reasoning
    temperature = 0.1; // Strict adherence to documents and facts
    topK = 10;
  } else if (mode === 'analytics') {
    instruction = ANALYTICS_SYSTEM_INSTRUCTION;
    // Keep Pro for data interpretation
    temperature = 0.1; // Precise data interpretation, no creative hallucination
    topK = 10;
  } else if (mode === 'polyglot') {
    instruction = POLYGLOT_SYSTEM_INSTRUCTION;
    // Keep Pro for subtle linguistic nuances
    temperature = 0.3; // Low temp for accurate translation, slight flexibility for style
    topK = 20;
  } else if (mode === 'games') {
    instruction = GAMES_SYSTEM_INSTRUCTION;
    modelName = "gemini-2.5-flash"; // Flash is great for interactive, low-latency games
    temperature = 0.8; // High variance for fun, unpredictable quizzes and games
    topK = 50;
  } else if (mode === 'chatpdf') {
    instruction = CHATPDF_SYSTEM_INSTRUCTION;
    // Keep Pro for document understanding
    temperature = 0.2; // Accurate document analysis
    topK = 20;
  } else if (mode === 'notes') {
    instruction = NOTES_SYSTEM_INSTRUCTION;
    // Keep Pro for high quality drafting/editing
    temperature = 0.3;
    topK = 20;
  }
  
  // Transform app messages to SDK history format if provided
  let sdkHistory: any[] = [];
  if (history && history.length > 0) {
      sdkHistory = history.map(msg => {
          const parts: any[] = [];
          if (msg.attachments) {
               msg.attachments.forEach(att => {
                   const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
                   parts.push({ inlineData: { mimeType: att.mimeType, data: base64Data } });
               });
          }
          if (msg.text) parts.push({ text: msg.text });
          
          return {
              role: msg.role,
              parts: parts
          };
      }).filter(h => h.parts.length > 0);
  }

  const chatConfig: any = {
    systemInstruction: instruction,
    temperature: temperature,
    topK: topK,
  };

  chatSession = ai.chats.create({
    model: modelName,
    config: chatConfig,
    history: sdkHistory
  });
  return chatSession;
};

export const optimizeUserPrompt = async (originalInput: string, mode: ChatMode): Promise<string> => {
  if (!originalInput.trim()) return "";
  
  const ai = getAiClient();
  
  let context = "academic and educational inquiries";
  if (mode === 'support') context = "emotional support and psychological well-being";
  if (mode === 'music') context = "music curation and audio vibes";
  if (mode === 'organization') context = "productivity, time-management and logistics";
  if (mode === 'deep_research') context = "document analysis, summarization and extraction of key concepts";
  if (mode === 'analytics') context = "data analysis, performance tracking and study insights";
  if (mode === 'polyglot') context = "translation, linguistics, grammar correction and language learning";
  if (mode === 'games') context = "educational games, quizzes, trivia and memory challenges";
  if (mode === 'chatpdf') context = "document analysis, summarizing PDFs, extracting key points from files";
  if (mode === 'notes') context = "text editing, note-taking, summarizing and content structuring";

  // Meta-prompt for "Prompt Engineering"
  const prompt = `
    ACT AS AN EXPERT PROMPT ENGINEER.
    Your goal is to rewrite the user's raw input into a "Perfect Prompt" that will yield the best possible result from a Large Language Model specialized in ${context}.
    
    ORIGINAL INPUT: "${originalInput}"
    
    OPTIMIZATION RULES:
    1.  **Clarify Intent:** Make the goal explicit.
    2.  **Add Structure:** Request a specific format (e.g., "Use bullet points", "Step-by-step").
    3.  **Add Context:** If the input is vague, add logical assumptions or ask the model to cover basics.
    4.  **Language Preservation:** Keep the output in the SAME language as the input (French or English).
    5.  **Output:** Return ONLY the rewritten prompt text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Use Pro for superior instruction following and prompt rewriting
      contents: prompt,
      config: { temperature: 0.4 } // Balanced for prompt rewriting
    });
    return response.text?.trim() || originalInput;
  } catch (error) {
    console.error("Optimization failed", error);
    return originalInput;
  }
};

export const generateTagsForContent = async (content: string): Promise<string[]> => {
    if (!content || content.trim().length < 10) return [];
    
    const ai = getAiClient();
    const prompt = `
      ANALYSE LE TEXTE SUIVANT ET EXTRAIS 3 À 5 MOTS-CLÉS (TAGS) PERTINENTS.
      
      TEXTE:
      "${content.substring(0, 1000)}"
      
      RÈGLES:
      1. Retourne UNIQUEMENT un tableau JSON de chaînes de caractères.
      2. Pas de Markdown, pas d'explication.
      3. Exemple de sortie : ["Histoire", "Napoléon", "Guerre"]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Flash is sufficient for simple tagging
            contents: prompt,
            config: { temperature: 0.1, responseMimeType: "application/json" }
        });
        
        const text = response.text;
        if (text) {
            return JSON.parse(text);
        }
        return [];
    } catch (e) {
        console.error("Tag generation failed", e);
        return [];
    }
};

// Helper to inject user data context into the message stream invisibly
export const buildOrganizationContext = (timetable: Timetable, tasks: Task[]): string => {
    return `
[SYSTEM DATA INJECTION - STRICT CONTEXT]
The user has provided the following personal data. USE THIS to generate the response.

CURRENT TIMETABLE:
${timetable.content || "No fixed timetable provided."}

CURRENT TASK LIST:
${tasks.map(t => `- [${t.isCompleted ? 'COMPLETED' : 'TODO'}] ${t.title} (Due: ${t.dueDate || 'N/A'}) ${t.comment ? `Note: ${t.comment}` : ''}`).join('\n')}

INSTRUCTION: Analyze this data to provide a concrete, realistic plan.
`;
};

// Helper to inject user profile
export const buildUserProfileContext = (profile: UserProfile): string => {
  return `
[SYSTEM CONTEXT: USER PROFILE]
User Name: ${profile.name}
User Bio: ${profile.bio}

INSTRUCTION: Address the user by their name occasionally. Adapt your tone to be personalized, encouraging, and relevant to their bio.
`;
};

// Helper to inject analytics data
export const buildAnalyticsContext = (sessions: StudySession[], grades: SubjectGrade[]): string => {
    const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const sessionsBySubject = sessions.reduce((acc: any, s) => {
        acc[s.subject] = (acc[s.subject] || 0) + s.durationMinutes;
        return acc;
    }, {});
    
    return `
[SYSTEM DATA INJECTION - ANALYTICS]
RAW STUDY DATA:
- Total Study Time: ${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m
- Sessions Count: ${sessions.length}
- Time per Subject: ${JSON.stringify(sessionsBySubject)}
- Grades/Performance: ${JSON.stringify(grades)}

INSTRUCTION: Act as an expert data analyst. Use these numbers to derive insights. Highlight strengths and weaknesses. Warn if study time doesn't correlate with grades.
`;
}

// Error formatting helper
export const formatError = (error: any): { text: string, retryable: boolean } => {
    if (!error) return { text: "Erreur inconnue.", retryable: true };

    let msg = error.message || error.toString();
    if (error.statusText) msg += " " + error.statusText;
    msg = msg.toLowerCase();
    
    // API Key Errors
    if (msg.includes('api_key') || msg.includes('apikey') || msg.includes('403')) {
        return { 
            text: "Clé API manquante ou invalide. Veuillez vérifier votre configuration système.", 
            retryable: false 
        };
    }

    // Model Not Found (404)
    if (msg.includes('404') || msg.includes('not found')) {
         return {
            text: "Le modèle d'IA demandé est introuvable. Cela peut arriver si le modèle est en preview ou déprécié.",
            retryable: false 
        };
    }
    
    // Network Errors
    if (msg.includes('fetch failed') || msg.includes('networkerror') || msg.includes('failed to fetch') || msg.includes('network request failed')) {
        return { 
            text: "Problème de connexion internet détecté. Veuillez vérifier votre réseau.", 
            retryable: true 
        };
    }
    
    // Rate Limiting (429)
    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted') || msg.includes('too many requests')) {
        return { 
            text: "Le serveur est très sollicité (Quota dépassé). Veuillez patienter quelques instants avant de réessayer.", 
            retryable: true 
        };
    }
    
    // Server Errors (500/503)
    if (msg.includes('500') || msg.includes('503') || msg.includes('internal server error') || msg.includes('service unavailable') || msg.includes('overloaded')) {
        return { 
            text: "Les serveurs de l'IA sont temporairement surchargés. Veuillez réessayer dans une minute.", 
            retryable: true 
        };
    }

    // Bad Request (400)
    if (msg.includes('400') || msg.includes('invalid argument') || msg.includes('bad request')) {
        return {
            text: "La requête est invalide (fichier trop lourd, format non supporté ou prompt vide).",
            retryable: false
        };
    }
    
    // Safety Blocks
    if (msg.includes('safety') || msg.includes('blocked') || msg.includes('harmful') || msg.includes('finish reason')) {
        return { 
            text: "La réponse a été interrompue ou bloquée par les filtres de sécurité. Essayez de reformuler votre demande de manière plus académique.", 
            retryable: false 
        };
    }
    
    // Abort (User stopped)
    if (msg.includes('abort') || msg.includes('user aborted')) {
        return { 
            text: "Génération interrompue.", 
            retryable: true 
        };
    }

    // Default Fallback
    return { 
        text: `Une erreur inattendue est survenue : ${msg.slice(0, 150)}...`, 
        retryable: true 
    };
};

export const sendMessageStream = async function* (message: string, attachments: Attachment[] = [], signal?: AbortSignal) {
  if (!chatSession) {
    initializeChat('learning');
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session");
  }

  try {
    let messageParam: any = message;

    // If there are attachments, construct a multipart message
    if (attachments.length > 0) {
      const parts: any[] = [];
      
      // Add attachments first (common practice for multimodal)
      attachments.forEach(att => {
        // Extract raw base64 if it has the data prefix
        const base64Data = att.data.includes(',') 
          ? att.data.split(',')[1] 
          : att.data;

        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: base64Data
          }
        });
      });

      // Add text part if exists
      if (message && message.trim()) {
        parts.push({ text: message });
      }

      messageParam = parts;
    }

    const resultStream = await chatSession.sendMessageStream({ message: messageParam });
    
    for await (const chunk of resultStream) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const contentResponse = chunk as GenerateContentResponse;
      
      // Handle Text output
      const text = contentResponse.text;
      if (text) {
        yield text;
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error; 
    }
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};

export const resetChat = (mode: ChatMode, history: Message[] = []) => {
  chatSession = null;
  initializeChat(mode, history);
};
