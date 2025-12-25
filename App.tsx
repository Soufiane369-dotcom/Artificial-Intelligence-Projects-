import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, Plus, Folder, Sun, Moon, 
  MessageSquare, LayoutGrid, GraduationCap, Heart, 
  Music, CalendarClock, ScanSearch, BrainCircuit, 
  Languages, Gamepad2, FileText, FileEdit, Trash2,
  User, Edit3, Rocket, Palette, Laptop, Leaf, Zap, Lightbulb, Smile
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
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  
  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempProfileBio, setTempProfileBio] = useState('');
  const [tempAvatarId, setTempAvatarId] = useState('student');

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timetable, setTimetable] = useState<Timetable>({ content: '' });
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Étudiant',
    avatarId: 'student',
    bio: 'Un étudiant motivé.',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Initial Chat Setup
    initializeChat(mode);
    
    // Load local storage preferences
    const storedProjects = localStorage.getItem('brainassist_projects');
    if (storedProjects) {
        try {
            setProjects(JSON.parse(storedProjects));
        } catch (e) {
            console.error("Failed to parse projects", e);
        }
    }

    const storedProfile = localStorage.getItem('brainassist_profile');
    if (storedProfile) {
        try {
            const parsed = JSON.parse(storedProfile);
            setUserProfile({
                ...parsed,
                createdAt: new Date(parsed.createdAt),
                updatedAt: new Date(parsed.updatedAt)
            });
        } catch (e) {
            console.error("Failed to parse profile", e);
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
    // Auto-scroll only if not in focus mode (to avoid jumping)
    if (!focusedMessageId) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, focusedMessageId]);

  // --- Handlers ---

  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    setMessages([]);
    setFocusedMessageId(null);
    resetChat(newMode);
    setSidebarOpen(false);
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;

    // If we send a message, we exit focus mode to see the conversation
    setFocusedMessageId(null);

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
    setFocusedMessageId(null);
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

  // Profile Management
  const handleOpenProfileModal = () => {
      setTempProfileName(userProfile.name);
      setTempProfileBio(userProfile.bio);
      setTempAvatarId(userProfile.avatarId);
      setShowProfileModal(true);
  };

  const handleSaveProfile = () => {
      if (!tempProfileName.trim()) return;

      const updatedProfile: UserProfile = {
          ...userProfile,
          name: tempProfileName,
          bio: tempProfileBio,
          avatarId: tempAvatarId,
          updatedAt: new Date()
      };

      setUserProfile(updatedProfile);
      localStorage.setItem('brainassist_profile', JSON.stringify(updatedProfile));
      setShowProfileModal(false);
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

  // Attractive Color Configuration for Modes
  const modes: {id: ChatMode, label: string, icon: any, colorClass: string, activeClass: string, hoverClass: string }[] = [
    { id: 'learning', label: 'Apprentissage', icon: GraduationCap, colorClass: 'text-blue-500', activeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400' },
    { id: 'deep_research', label: 'Recherche', icon: ScanSearch, colorClass: 'text-violet-500', activeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', hoverClass: 'hover:bg-violet-50 dark:hover:bg-violet-900/20 group-hover:text-violet-600 dark:group-hover:text-violet-400' },
    { id: 'chatpdf', label: 'ChatPDF', icon: FileText, colorClass: 'text-rose-500', activeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', hoverClass: 'hover:bg-rose-50 dark:hover:bg-rose-900/20 group-hover:text-rose-600 dark:group-hover:text-rose-400' },
    { id: 'notes', label: 'Notes & Rédac', icon: FileEdit, colorClass: 'text-orange-500', activeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', hoverClass: 'hover:bg-orange-50 dark:hover:bg-orange-900/20 group-hover:text-orange-600 dark:group-hover:text-orange-400' },
    { id: 'polyglot', label: 'Polyglot', icon: Languages, colorClass: 'text-teal-500', activeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300', hoverClass: 'hover:bg-teal-50 dark:hover:bg-teal-900/20 group-hover:text-teal-600 dark:group-hover:text-teal-400' },
    { id: 'analytics', label: 'Analytics', icon: BrainCircuit, colorClass: 'text-sky-500', activeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', hoverClass: 'hover:bg-sky-50 dark:hover:bg-sky-900/20 group-hover:text-sky-600 dark:group-hover:text-sky-400' },
    { id: 'organization', label: 'Organisation', icon: CalendarClock, colorClass: 'text-indigo-500', activeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', hoverClass: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400' },
    { id: 'games', label: 'Jeux & Quiz', icon: Gamepad2, colorClass: 'text-amber-500', activeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', hoverClass: 'hover:bg-amber-50 dark:hover:bg-amber-900/20 group-hover:text-amber-600 dark:group-hover:text-amber-400' },
    { id: 'music', label: 'Musique', icon: Music, colorClass: 'text-fuchsia-500', activeClass: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300', hoverClass: 'hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400' },
    { id: 'support', label: 'Soutien', icon: Heart, colorClass: 'text-emerald-500', activeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', hoverClass: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400' },
  ];

  const avatars = [
    { id: 'student', icon: User, label: 'Standard' },
    { id: 'academic', icon: GraduationCap, label: 'Académique' },
    { id: 'modern', icon: Rocket, label: 'Moderne' },
    { id: 'creative', icon: Palette, label: 'Créatif' },
    { id: 'tech', icon: Laptop, label: 'Tech' },
    { id: 'calm', icon: Leaf, label: 'Zen' },
    { id: 'energy', icon: Zap, label: 'Énergie' },
    { id: 'smart', icon: Lightbulb, label: 'Génie' },
    { id: 'friendly', icon: Smile, label: 'Sympa' },
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
                   {modes.map(m => {
                       const isActive = mode === m.id;
                       return (
                           <button
                             key={m.id}
                             onClick={() => handleModeChange(m.id)}
                             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                                 isActive 
                                 ? `${m.activeClass} shadow-sm transform scale-[1.02]` 
                                 : `text-gray-600 dark:text-gray-400 ${m.hoverClass}`
                             }`}
                           >
                               <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} ${m.colorClass}`}>
                                   <m.icon size={18} />
                               </div>
                               <span className="flex-1 text-left">{m.label}</span>
                               {isActive && <div className={`w-1.5 h-1.5 rounded-full ${m.colorClass.replace('text-', 'bg-')}`}></div>}
                           </button>
                       );
                   })}
               </div>
           </div>

           {/* Projects List */}
           <div>
            <div className="flex items-center justify-between mb-2 px-1 mt-4">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Projets</h3>
            </div>
            <div className="space-y-1">
                {projects.map(proj => {
                    // Determine color based on the project mode
                    const pMode = modes.find(m => m.id === proj.mode);
                    const iconColor = pMode ? pMode.colorClass : 'text-amber-500';

                    return (
                        <div
                            key={proj.id}
                            className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
                            onClick={() => handleProjectClick(proj)}
                        >
                            <div className={`${iconColor} opacity-80 group-hover:opacity-100 transition-opacity`}>
                                <Folder size={18} />
                            </div>
                            <span className="truncate flex-1 text-left">{proj.title}</span>
                            <button 
                                onClick={(e) => handleDeleteProject(e, proj.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    );
                })}
                {projects.length === 0 && (
                  <p className="text-xs text-gray-400 italic px-3 py-1">Aucun projet sauvegardé</p>
                )}
            </div>
          </div>
        
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
                <div 
                    className="flex-1 flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    onClick={handleOpenProfileModal}
                    title="Modifier le profil"
                >
                    <div className="relative">
                         <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-white dark:ring-gray-800">
                             {(() => {
                                const AvIcon = avatars.find(a => a.id === userProfile.avatarId)?.icon || User;
                                return <AvIcon size={18} />;
                             })()}
                         </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {userProfile.name}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">Étudiant</div>
                    </div>
                    
                    {/* Adjusted Pencil: Faintly visible by default, Blue on hover */}
                    <div className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors duration-200 transform scale-95 group-hover:scale-110">
                        <Edit3 size={16} />
                    </div>
                </div>

                <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    title={darkMode ? "Mode Clair" : "Mode Sombre"}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
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
                       {focusedMessageId && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">Lecture focalisée</span>}
                   </h1>
                   <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                       Gemini 2.5 Flash & 3 Pro Preview
                   </span>
               </div>
           </div>
           
           <div className="flex items-center gap-2">
               {focusedMessageId && (
                   <button 
                   onClick={() => setFocusedMessageId(null)}
                   className="p-2 rounded-lg text-blue-500 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium flex items-center gap-2"
                   title="Quitter le mode focus"
                   >
                    <span>Quitter Focus</span>
                   </button>
               )}
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
            <div className={`max-w-4xl mx-auto min-h-full flex flex-col justify-start pb-4 ${focusedMessageId ? 'justify-center' : ''}`}>
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
                    // Display either all messages OR only the focused one
                    messages
                    .filter(msg => focusedMessageId === null || msg.id === focusedMessageId)
                    .map((msg) => (
                        <ChatMessage 
                            key={msg.id}
                            message={msg}
                            mode={mode}
                            themeColor={themeColor}
                            userProfile={userProfile}
                            onRetry={handleRetry}
                            onImproveCode={handleImproveCode}
                            isFocused={focusedMessageId === msg.id}
                            onFocus={() => setFocusedMessageId(msg.id)}
                            onExitFocus={() => setFocusedMessageId(null)}
                        />
                    ))
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>
        </div>

        {/* Input Area */}
        <div className={focusedMessageId ? 'opacity-50 pointer-events-none blur-sm transition-all duration-300' : 'transition-all duration-300'}>
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
        </div>

      </main>

      {/* --- Profile Modal --- */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-soft-pop transition-colors duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Edit3 size={20} className="text-blue-500" />
                    Profil Étudiant
                </h2>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                {/* Avatar Selection */}
                <div>
                   <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Choisir un Avatar</label>
                   <div className="grid grid-cols-5 gap-2">
                       {avatars.map(av => (
                           <button
                             key={av.id}
                             onClick={() => setTempAvatarId(av.id)}
                             className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                                 tempAvatarId === av.id 
                                 ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 ring-2 ring-blue-500' 
                                 : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                             }`}
                             title={av.label}
                           >
                               <av.icon size={20} />
                           </button>
                       ))}
                   </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Nom ou Pseudo</label>
                  <input 
                    type="text" 
                    value={tempProfileName}
                    onChange={(e) => setTempProfileName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 outline-none transition-all font-medium"
                  />
                </div>

                {/* Bio Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Bio / Objectif</label>
                  <textarea 
                    value={tempProfileBio}
                    onChange={(e) => setTempProfileBio(e.target.value)}
                    placeholder="Ex: Prépa Maths Sup, passionné de physique..."
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 outline-none transition-all resize-none h-20 text-sm"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={!tempProfileName.trim()}
                  className={`flex-1 py-3 px-4 rounded-2xl text-white font-medium shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                    tempProfileName.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;