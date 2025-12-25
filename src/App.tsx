import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, Plus, Folder, Sun, Moon, 
  MessageSquare, LayoutGrid, GraduationCap, Heart, 
  Music, CalendarClock, ScanSearch, BrainCircuit, 
  Languages, Gamepad2, FileText, FileEdit, Trash2 
} from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import { 
  Message, ChatMode, ThemeColor, UserProfile, 
  Project, Task, Timetable, Attachment 
} from './types';
import { 
  initializeChat, sendMessageStream, resetChat, 
  formatError, buildOrganizationContext 
} from './services/gemini';
import { 
  APP_NAME, LEARNING_SUGGESTED_PROMPTS, SUPPORT_SUGGESTED_PROMPTS,
  MUSIC_SUGGESTED_PROMPTS, ORGANIZATION_SUGGESTED_PROMPTS,
  DEEP_RESEARCH_SUGGESTED_PROMPTS, ANALYTICS_SUGGESTED_PROMPTS,
  POLYGLOT_SUGGESTED_PROMPTS, GAMES_SUGGESTED_PROMPTS,
  CHATPDF_SUGGESTED_PROMPTS, NOTES_SUGGESTED_PROMPTS
} from './constants';

const App: React.FC = () => {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('learning');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeColor, setThemeColor] = useState<ThemeColor>('default');
  const [darkMode, setDarkMode] = useState(false);
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timetable, setTimetable] = useState<Timetable>({ content: '' });
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Student',
    avatarId: 'student',
    bio: 'A hardworking student.',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Initial Chat Setup
    initializeChat(mode);
    
    // Load local storage preferences (mock)
    const storedProjects = localStorage.getItem('brainassist_projects');
    if (storedProjects) {
        try {
            setProjects(JSON.parse(storedProjects));
        } catch (e) {
            console.error("Failed to parse projects", e);
        }
    }

    // Dark mode init
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    // Auto-scroll
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Handlers ---

  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    setMessages([]);
    resetChat(newMode);
    setSidebarOpen(false);
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date(),
      attachments
    };

    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    // Abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Inject context if needed (Organization)
      let contextMessage = text;
      
      // Inject organization data if applicable and it's the start of conversation
      if (mode === 'organization' && messages.length === 0 && (tasks.length > 0 || timetable.content)) {
          const context = buildOrganizationContext(timetable, tasks);
          contextMessage = `${context}\n\nUser Request: ${text}`;
      }

      // Prepare bot message placeholder
      const botMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: botMessageId,
        role: 'model',
        text: '',
        timestamp: new Date()
      }]);

      const stream = sendMessageStream(contextMessage, attachments, abortControllerRef.current.signal);
      
      let fullText = "";
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId ? { ...msg, text: fullText } : msg
        ));
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errInfo = formatError(error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: errInfo.text,
          timestamp: new Date(),
          isError: true,
          isRetryable: errInfo.retryable
        }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleSaveProject = (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    const updatedProjects = [newProject, ...projects];
    setProjects(updatedProjects);
    localStorage.setItem('brainassist_projects', JSON.stringify(updatedProjects));
  };

  const handleProjectClick = (project: Project) => {
    setMode(project.mode);
    setMessages([]); // Clear current chat
    resetChat(project.mode);
    
    // Auto-start with the project prompt
    handleSendMessage(project.prompt, []);
    setSidebarOpen(false);
  };
  
  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
      e.stopPropagation();
      const updated = projects.filter(p => p.id !== projectId);
      setProjects(updated);
      localStorage.setItem('brainassist_projects', JSON.stringify(updated));
  };

  const handleRetry = (messageId: string) => {
      // Find the user message before this error
      const errorIndex = messages.findIndex(m => m.id === messageId);
      if (errorIndex > 0) {
          const lastUserMsg = messages[errorIndex - 1];
          if (lastUserMsg.role === 'user') {
              // Remove error message
              setMessages(prev => prev.filter(m => m.id !== messageId));
              // Retry
              handleSendMessage(lastUserMsg.text, lastUserMsg.attachments || []);
          }
      }
  };
  
  const handleImproveCode = (code: string, lang: string) => {
      const prompt = `Review and improve this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\``;
      handleSendMessage(prompt, []);
  };

  // --- Render Helpers ---

  const getSuggestions = () => {
      switch(mode) {
          case 'learning': return LEARNING_SUGGESTED_PROMPTS;
          case 'support': return SUPPORT_SUGGESTED_PROMPTS;
          case 'music': return MUSIC_SUGGESTED_PROMPTS;
          case 'organization': return ORGANIZATION_SUGGESTED_PROMPTS;
          case 'deep_research': return DEEP_RESEARCH_SUGGESTED_PROMPTS;
          case 'analytics': return ANALYTICS_SUGGESTED_PROMPTS;
          case 'polyglot': return POLYGLOT_SUGGESTED_PROMPTS;
          case 'games': return GAMES_SUGGESTED_PROMPTS;
          case 'chatpdf': return CHATPDF_SUGGESTED_PROMPTS;
          case 'notes': return NOTES_SUGGESTED_PROMPTS;
          default: return [];
      }
  };

  const modes: {id: ChatMode, label: string, icon: any}[] = [
    { id: 'learning', label: 'Apprentissage', icon: GraduationCap },
    { id: 'deep_research', label: 'Recherche', icon: ScanSearch },
    { id: 'chatpdf', label: 'ChatPDF', icon: FileText },
    { id: 'notes', label: 'Notes & Rédac', icon: FileEdit },
    { id: 'polyglot', label: 'Polyglot', icon: Languages },
    { id: 'analytics', label: 'Analytics', icon: BrainCircuit },
    { id: 'organization', label: 'Organisation', icon: CalendarClock },
    { id: 'games', label: 'Jeux & Quiz', icon: Gamepad2 },
    { id: 'music', label: 'Musique', icon: Music },
    { id: 'support', label: 'Soutien', icon: Heart },
  ];

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 overflow-hidden`}>
      
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
           <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-600 dark:text-blue-400">
             <LayoutGrid className="w-6 h-6" />
             <span>{APP_NAME}</span>
           </div>
           <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
             <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
           
           {/* Modes */}
           <div>
               <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">Modes</h3>
               <div className="space-y-1">
                   {modes.map(m => (
                       <button
                         key={m.id}
                         onClick={() => handleModeChange(m.id)}
                         className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                             mode === m.id 
                             ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                             : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                         }`}
                       >
                           <m.icon size={18} />
                           <span>{m.label}</span>
                       </button>
                   ))}
               </div>
           </div>

           {/* Projects List */}
           <div>
            <div className="flex items-center justify-between mb-2 px-1 mt-4">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Projets</h3>
            </div>
            <div className="space-y-1">
                {projects.map(proj => (
                    <div
                        key={proj.id}
                        className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
                        onClick={() => handleProjectClick(proj)}
                    >
                        <Folder size={18} />
                        <span className="truncate flex-1 text-left">{proj.title}</span>
                        <button 
                            onClick={(e) => handleDeleteProject(e, proj.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-xs text-gray-400 italic px-3 py-1">Aucun projet sauvegardé</p>
                )}
            </div>
          </div>
        
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                        {userProfile.name.charAt(0)}
                    </div>
                    <div className="text-sm font-medium">
                        <div className="truncate max-w-[100px]">{userProfile.name}</div>
                        <div className="text-xs text-gray-400 font-normal">Étudiant</div>
                    </div>
                </div>
                <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-10">
           <div className="flex items-center gap-3">
               <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                   <Menu size={20} />
               </button>
               <div className="flex flex-col">
                   <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                       {modes.find(m => m.id === mode)?.label}
                       {isLoading && <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>}
                   </h1>
                   <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                       Gemini 2.5 Flash & 3 Pro Preview
                   </span>
               </div>
           </div>
           
           <div className="flex items-center gap-2">
               <button 
                onClick={() => handleModeChange(mode)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Reset Chat"
               >
                   <Plus size={20} />
               </button>
           </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 scroll-smooth">
            <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-start pb-4">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 mt-10">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 animate-float">
                            {React.createElement(modes.find(m => m.id === mode)?.icon || MessageSquare, { size: 40, className: "text-blue-500" })}
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Bonjour, {userProfile.name}</h2>
                        <p className="text-gray-500 max-w-md">
                            Je suis prêt à t'aider en mode <strong className="text-blue-600 dark:text-blue-400">{modes.find(m => m.id === mode)?.label}</strong>.
                            Pose-moi une question ou utilise une suggestion.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <ChatMessage 
                            key={msg.id}
                            message={msg}
                            mode={mode}
                            themeColor={themeColor}
                            userProfile={userProfile}
                            onRetry={handleRetry}
                            onImproveCode={handleImproveCode}
                        />
                    ))
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>
        </div>

        {/* Input Area */}
        <InputArea 
            onSendMessage={handleSendMessage}
            onSaveProject={handleSaveProject}
            onUpdateOrganization={(t, time) => { setTasks(t); setTimetable(time); }}
            tasks={tasks}
            timetable={timetable}
            onStop={handleStop}
            isLoading={isLoading}
            mode={mode}
            themeColor={themeColor}
            onOpenOrgModal={() => {}} 
            suggestions={getSuggestions()}
        />

      </main>
    </div>
  );
};

export default App;