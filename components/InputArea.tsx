
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Heart, Headphones, Plus, X, FileText, Upload, Wand2, FolderPlus, Square, CalendarClock, Trash, CheckSquare, ScanSearch, AlertCircle, ArrowUp, ArrowRight, ArrowDown, BrainCircuit, Languages, Gamepad2, FileAudio, FileEdit, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { ChatMode, Attachment, Project, Task, Timetable, ThemeColor } from '../types';
import { optimizeUserPrompt } from '../services/gemini';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  onSaveProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  onUpdateOrganization: (tasks: Task[], timetable: Timetable) => void;
  tasks: Task[];
  timetable: Timetable;
  onStop: () => void;
  isLoading: boolean;
  mode: ChatMode;
  themeColor: ThemeColor;
  onOpenOrgModal: () => void;
  suggestions: string[];
}

const InputArea: React.FC<InputAreaProps> = ({ 
    onSendMessage, 
    onSaveProject, 
    onUpdateOrganization, 
    tasks, 
    timetable,
    onStop, 
    isLoading, 
    mode,
    themeColor,
    onOpenOrgModal,
    suggestions
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Options Bar State
  const [showOptions, setShowOptions] = useState(false);
  const [optLevel, setOptLevel] = useState('Adaptatif');
  const [optFormat, setOptFormat] = useState('Auto');
  const [optTone, setOptTone] = useState('Pédagogique');
  
  // Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-show options for organization mode
  useEffect(() => {
    if (mode === 'organization') {
      setShowOptions(true);
    }
  }, [mode]);
  
  const isSupport = mode === 'support';
  const isMusic = mode === 'music';
  const isOrg = mode === 'organization';
  const isDeepResearch = mode === 'deep_research';
  const isAnalytics = mode === 'analytics';
  const isPolyglot = mode === 'polyglot';
  const isGames = mode === 'games';
  const isChatPDF = mode === 'chatpdf';
  const isNotes = mode === 'notes';

  // Determine Color Base
  let colorBase = 'blue';
  
  if (themeColor !== 'default') {
      colorBase = themeColor;
  } else {
      if (isSupport) colorBase = 'emerald';
      else if (isMusic) colorBase = 'fuchsia';
      else if (isOrg) colorBase = 'indigo';
      else if (isDeepResearch) colorBase = 'violet';
      else if (isAnalytics) colorBase = 'sky';
      else if (isPolyglot) colorBase = 'cyan';
      else if (isGames) colorBase = 'amber';
      else if (isChatPDF) colorBase = 'rose';
      else if (isNotes) colorBase = 'yellow';
  }

  // Icons and Placeholders logic
  let Icon = Sparkles;
  let placeholder = "Ask me anything about your studies...";
  
  if (isSupport) {
    Icon = Heart;
    placeholder = "Exprimes-toi, je t'écoute...";
  } else if (isMusic) {
    Icon = Headphones;
    placeholder = "Cherche une musique, un genre, une playlist...";
  } else if (isOrg) {
    Icon = CalendarClock;
    placeholder = "Organise ma journée, ajoute une tâche...";
  } else if (isDeepResearch) {
    Icon = ScanSearch;
    placeholder = "Deep Research : Déposez des fichiers pour analyse approfondie...";
  } else if (isAnalytics) {
    Icon = BrainCircuit;
    placeholder = "Analyse mes données d'études...";
  } else if (isPolyglot) {
    Icon = Languages;
    placeholder = "Traduis, apprends ou corrige un texte dans n'importe quelle langue...";
  } else if (isGames) {
    Icon = Gamepad2;
    placeholder = "Lance un quiz, un vrai ou faux, un jeu de mémoire...";
  } else if (isChatPDF) {
    Icon = FileText;
    placeholder = "Déposez vos fichiers (PDF, Doc, Txt) pour résumé et analyse...";
  } else if (isNotes) {
    Icon = FileEdit;
    placeholder = "Demandez de l'aide pour rédiger ou corriger vos notes...";
  }

  // Construct Dynamic Classes based on colorBase
  const buttonColor = `bg-${colorBase}-600 hover:bg-${colorBase}-700 dark:bg-${colorBase}-500 dark:hover:bg-${colorBase}-600`;
  const focusRing = `focus-within:border-gray-400 dark:focus-within:border-gray-500 focus-within:ring-0 focus-within:outline-none`;
  const dragRing = `ring-2 ring-${colorBase}-500 border-${colorBase}-500 bg-${colorBase}-50 dark:bg-${colorBase}-900/30 dark:border-${colorBase}-400`;
  const iconColor = `text-${colorBase}-400 dark:text-${colorBase}-500`;
  const optimizeHoverColor = `hover:text-${colorBase}-600 dark:hover:text-${colorBase}-400`;
  const themeHoverColor = `hover:text-${colorBase}-600 dark:hover:text-${colorBase}-400`;
  const modalTitleColor = `text-${colorBase}-800 dark:text-${colorBase}-300`;
  const modalIconBg = `bg-${colorBase}-100 dark:bg-${colorBase}-900/30 text-${colorBase}-700 dark:text-${colorBase}-300`;


  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAttachments(prev => [...prev, {
          name: file.name,
          mimeType: file.type,
          data: base64String
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFiles(Array.from(e.clipboardData.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptimizePrompt = async () => {
    if (!input.trim() || isOptimizing) return;
    
    setIsOptimizing(true);
    try {
      const optimizedText = await optimizeUserPrompt(input, mode);
      setInput(optimizedText);
      setTimeout(() => {
        if (textareaRef.current) {
           textareaRef.current.style.height = 'auto';
           textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
      }, 0);
    } catch (err) {
      console.error("Failed to optimize", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const openProjectModal = () => {
    setProjectName('');
    // If user has typed something, we can use it as a starting description
    setProjectDesc(input);
    setShowProjectModal(true);
  };

  const confirmProjectCreation = () => {
    if (!projectName.trim()) return;

    let prompt = "";
    
    // Generate a structured prompt based on the mode and user description
    if (isMusic) {
        prompt = `Je souhaite lancer un projet musical intitulé : "${projectName}".\nContexte et Vibe souhaitée : ${projectDesc}`;
    } else if (isDeepResearch) {
        prompt = `Projet de recherche : "${projectName}".\nObjectifs : ${projectDesc}\nJe vais fournir des documents. Aide-moi à les structurer et les analyser.`;
    } else if (isPolyglot) {
        prompt = `Projet linguistique : "${projectName}".\nLangue cible et objectifs : ${projectDesc}`;
    } else if (isGames) {
        prompt = `Je veux créer un parcours de jeu éducatif : "${projectName}".\nThème et type de jeux : ${projectDesc}`;
    } else if (isChatPDF) {
        prompt = `Projet ChatPDF : "${projectName}".\nJe vais uploader des fichiers. Fais une analyse complète. Contexte: ${projectDesc}`;
    } else {
        // Default / Learning
        prompt = `Je lance un nouveau projet d'étude/travail sur le thème : "${projectName}".\nDescription et Objectifs : ${projectDesc}`;
    }

    onSaveProject({
        title: projectName,
        description: projectDesc,
        mode: mode,
        prompt: prompt
    });

    // Optionally set the input to the generated prompt so the user can send it immediately
    setInput(prompt);
    setShowProjectModal(false);

    setTimeout(() => {
        if (textareaRef.current) {
           textareaRef.current.focus();
           textareaRef.current.style.height = 'auto';
           textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, 0);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      
      let finalInput = input.trim();
      
      // Append Options Context if enabled and not default
      if (showOptions) {
          const params = [];
          if (optLevel !== 'Adaptatif') params.push(`Niveau Cible: ${optLevel}`);
          if (optFormat !== 'Auto') params.push(`Format de Réponse: ${optFormat}`);
          if (optTone !== 'Pédagogique') params.push(`Ton/Style: ${optTone}`);
          
          if (params.length > 0) {
              finalInput += `\n\n[INSTRUCTIONS DE GÉNÉRATION: ${params.join(' | ')}]`;
          }
      }

      onSendMessage(finalInput, attachments);
      setInput('');
      setAttachments([]);
      
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      // Reset height to auto to allow shrinking when text is deleted
      textareaRef.current.style.height = 'auto';
      // Set to scrollHeight to expand, capped at 200px
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <>
      <div className="w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4 md:px-6 md:py-5 transition-colors duration-300">
        <div className="max-w-4xl mx-auto relative flex flex-col gap-3">
          
          {attachments.length > 0 && (
            <div className="flex gap-3 mb-1 overflow-x-auto pb-2 scrollbar-hide px-1">
              {attachments.map((att, index) => (
                <div key={index} className="relative flex-shrink-0 w-24 h-24 group animate-fade-in">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={att.data} alt={att.name} className="w-full h-full object-cover rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2 text-center">
                      <FileText size={28} className={`mb-1 ${iconColor}`} />
                      <span className="text-[9px] text-gray-600 dark:text-gray-300 leading-tight line-clamp-2 break-all">{att.name}</span>
                    </div>
                  )}
                  <button 
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 text-red-500 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90 hover:bg-red-50 dark:hover:bg-red-900/20 z-10"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Options Bar */}
          {showOptions && (
              <div className="flex flex-wrap items-center gap-4 mb-2 p-4 bg-white dark:bg-gray-800 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-black/20 animate-slide-up relative z-10">
                  <div className="flex items-center gap-2 mr-2">
                     <div className={`p-1.5 rounded-lg ${modalIconBg}`}>
                        <SlidersHorizontal size={16} />
                     </div>
                     <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options</span>
                  </div>
                  
                  {/* Level Selector */}
                  <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Niveau</label>
                      <div className="relative">
                        <select 
                            value={optLevel}
                            onChange={(e) => setOptLevel(e.target.value)}
                            className="w-full appearance-none px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                        >
                            <option value="Adaptatif">Adaptatif (Auto)</option>
                            <option value="Collège">Collège (11-14 ans)</option>
                            <option value="Lycée">Lycée (15-18 ans)</option>
                            <option value="Université">Université / Supérieur</option>
                            <option value="Débutant">Débutant / Vulgarisation</option>
                            <option value="Expert">Expert / Technique</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                  </div>

                  {/* Format Selector */}
                  <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Format</label>
                      <div className="relative">
                        <select 
                            value={optFormat}
                            onChange={(e) => setOptFormat(e.target.value)}
                            className="w-full appearance-none px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                        >
                            <option value="Auto">Automatique</option>
                            <option value="Cours complet">Cours Complet</option>
                            <option value="Fiche de révision">Fiche de Révision</option>
                            <option value="QCM / Quiz">QCM / Quiz</option>
                            <option value="Exercices">Exercices Pratiques</option>
                            <option value="Plan détaillé">Plan Détaillé</option>
                            <option value="Tableau comparatif">Tableau Comparatif</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                  </div>

                  {/* Tone Selector */}
                  <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Ton</label>
                      <div className="relative">
                        <select 
                            value={optTone}
                            onChange={(e) => setOptTone(e.target.value)}
                            className="w-full appearance-none px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all cursor-pointer hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                        >
                            <option value="Pédagogique">Pédagogique (Standard)</option>
                            <option value="Direct & Concis">Direct & Concis</option>
                            <option value="Socratique">Socratique (Questionnement)</option>
                            <option value="Ludique">Ludique / Fun</option>
                            <option value="Académique">Académique / Formel</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => { setOptLevel('Adaptatif'); setOptFormat('Auto'); setOptTone('Pédagogique'); }}
                    className="text-[10px] underline text-gray-400 hover:text-red-500 mt-4 px-2"
                  >
                      Réinitialiser
                  </button>
              </div>
          )}

          <form 
              onSubmit={handleSubmit} 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex items-end gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-[2rem] p-2 transition-all shadow-sm ${isDragging ? dragRing : focusRing}`}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-[2rem] flex items-center justify-center z-10 backdrop-blur-sm">
                  <div className={`flex flex-col items-center ${iconColor}`}>
                      <Upload size={32} className="animate-bounce mb-2" />
                      <span className="font-semibold dark:text-gray-200">Drop files here</span>
                  </div>
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              multiple 
              // Updated accepted files to ensure broad compatibility for text extraction and docs
              accept="image/*,application/pdf,text/plain,.docx,.txt"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90 active:bg-gray-300 dark:active:bg-gray-600 active:ring-2 active:ring-gray-300 ring-2 ring-gray-200 dark:ring-gray-700 ${themeHoverColor}`}
              title="Attach file"
              disabled={isLoading}
            >
              <Plus size={19} />
            </button>
            
            {/* Options Toggle Button */}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-colors active:scale-90 active:ring-2 active:ring-gray-300 ${
                  showOptions 
                  ? `bg-${colorBase}-100 dark:bg-${colorBase}-900/30 text-${colorBase}-600 dark:text-${colorBase}-400 ring-2 ring-${colorBase}-200 dark:ring-${colorBase}-800` 
                  : `text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 ${themeHoverColor}`
              }`}
              title="Options de réponse (Niveau, Format...)"
              disabled={isLoading}
            >
              <SlidersHorizontal size={19} />
            </button>

            {isOrg && (
                <button
                type="button"
                onClick={onOpenOrgModal}
                className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90 active:bg-gray-300 dark:active:bg-gray-600 active:ring-2 active:ring-gray-300 ${themeHoverColor}`}
                title="Mon Organisateur"
                disabled={isLoading}
                >
                <CalendarClock size={19} />
                </button>
            )}

            <button
              type="button"
              onClick={openProjectModal}
              className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-90 active:bg-gray-300 dark:active:bg-gray-600 active:ring-2 active:ring-gray-300 ${themeHoverColor}`}
              title="Sauvegarder en Projet"
              disabled={isLoading}
            >
              <FolderPlus size={19} />
            </button>

            <div className="relative flex-1">
              <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={placeholder}
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none resize-none py-2 pr-8 text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 max-h-[200px] overflow-y-auto custom-scrollbar leading-relaxed"
                  style={{ minHeight: '36px' }}
                  disabled={isLoading || isOptimizing}
              />
              {input.trim() && !isLoading && (
                  <button
                      type="button"
                      onClick={handleOptimizePrompt}
                      disabled={isOptimizing}
                      className={`absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors text-gray-400 dark:text-gray-500 active:scale-90 ${optimizeHoverColor}`}
                      title="Optimize Prompt with AI"
                  >
                      <Wand2 size={18} className={isOptimizing ? "animate-spin text-fuchsia-500" : ""} />
                  </button>
              )}
            </div>
            
            {!input.trim() && (
               <div className={`py-2 pr-2 hidden md:block ${iconColor}`}>
                  <Icon size={20} />
               </div>
            )}

            {isLoading ? (
                <button
                    type="button"
                    onClick={onStop}
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white shadow-sm transition-all duration-200 group active:scale-90"
                    title="Arrêter la génération"
                >
                    <Square size={16} fill="currentColor" className="group-hover:scale-90 transition-transform" />
                </button>
            ) : (
                <button
                    type="submit"
                    disabled={(!input.trim() && attachments.length === 0) || isOptimizing}
                    className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 active:scale-90 ring-4 ring-opacity-20 ${
                        (input.trim() || attachments.length > 0) && !isOptimizing
                        ? `${buttonColor} text-white shadow-md transform hover:scale-105 active:ring-${colorBase}-400 ring-transparent`
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed ring-transparent'
                    }`}
                >
                    <Send size={19} />
                </button>
            )}
          </form>

          {/* Suggestions */}
          {!isLoading && suggestions.length > 0 && !showOptions && (
             <div className="flex flex-wrap gap-2 justify-center px-2 animate-fade-in">
                {suggestions.slice(0, 4).map((s, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSendMessage(s, [])}
                        className={`text-xs px-3 py-1.5 rounded-full border bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:scale-105 transition-all duration-200 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-${colorBase}-300 dark:hover:border-${colorBase}-700 shadow-sm active:scale-95 active:brightness-90`}
                    >
                        {s}
                    </button>
                ))}
             </div>
          )}

          <div className="text-center mt-1 flex justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              <p>Gemini can make mistakes. Please double check responses.</p>
          </div>
        </div>
      </div>

      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden animate-fade-in transition-colors duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${modalIconBg}`}>
                    <FolderPlus size={24} />
                  </div>
                  <h2 className={`text-xl font-bold ${modalTitleColor}`}>Sauvegarder en Projet</h2>
                </div>
                <button 
                  onClick={() => setShowProjectModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Nom du projet</label>
                  <input 
                    type="text" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex: Révision Bac Maths..."
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Description / Objectifs</label>
                  <textarea 
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Détaillez ce que vous voulez accomplir..."
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 outline-none transition-all resize-none h-32"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmProjectCreation}
                  disabled={!projectName.trim()}
                  className={`flex-1 py-3 px-4 rounded-2xl text-white font-medium shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] active:ring-2 active:ring-offset-1 active:ring-${colorBase}-400 active:brightness-110 ${
                    projectName.trim() ? buttonColor : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InputArea;
