import React, { useState, useEffect, useRef } from 'react';
import { Message, ChatMode, ThemeColor, UserProfile } from '../types';
import { User, AlertCircle, HeartHandshake, Music, FileText, CalendarClock, BookOpen, ScanSearch, Download, Printer, FileType, GraduationCap, Rocket, Palette, Laptop, Leaf, Zap, Lightbulb, Smile, BarChart3, Languages, Gamepad2, RotateCcw, AlertTriangle, Play, Pause, Check, Copy, FileEdit, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  mode: ChatMode;
  themeColor: ThemeColor;
  userProfile: UserProfile | null;
  onRetry?: (messageId: string) => void;
  onImproveCode?: (code: string, language: string) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  onExitFocus?: () => void;
}

const colorMap: Record<string, string> = {
    slate: '#334155', gray: '#374151', zinc: '#3f3f46', neutral: '#404040', stone: '#44403c',
    red: '#dc2626', orange: '#ea580c', amber: '#d97706', yellow: '#ca8a04', lime: '#65a30d',
    green: '#16a34a', emerald: '#059669', teal: '#0d9488', cyan: '#0891b2', sky: '#0284c7',
    blue: '#2563eb', indigo: '#4f46e5', violet: '#7c3aed', purple: '#9333ea', fuchsia: '#c026d3',
    pink: '#db2777', rose: '#e11d48', default: '#2563eb'
};

const PRISM_THEMES = [
  { id: 'tomorrow', name: 'Sombre (Tomorrow)', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css' },
  { id: 'twilight', name: 'Sombre (Twilight)', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-twilight.min.css' },
  { id: 'okaidia', name: 'Sombre (Okaidia)', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css' },
  { id: 'solarizedlight', name: 'Clair (Solarisé)', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-solarizedlight.min.css' },
  { id: 'coy', name: 'Clair (Coy)', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-coy.min.css' },
];

const detectLanguage = (code: string): string => {
    const c = code.trim();
    if (!c) return '';

    // HTML/XML
    if (c.startsWith('<') && (c.includes('</') || c.includes('/>') || c.includes('<!DOCTYPE'))) return 'html';
    
    // Python (Indentation based, no braces usually, def keyword)
    if (/^def\s+/.test(c) || /^import\s+/.test(c) || (/print\s*\(/.test(c) && !c.includes(';'))) return 'python';

    // React/JSX/TSX
    if (c.includes('import React') || /export\s+default\s+function/.test(c) || c.includes('className=') || /<\w+>/.test(c)) return 'tsx';

    // JavaScript/TypeScript
    if (/const\s+/.test(c) || /let\s+/.test(c) || /var\s+/.test(c) || /console\.log\(/.test(c) || /function\s+/.test(c) || /=>/.test(c)) return 'typescript';

    // CSS
    if (c.includes('{') && c.includes('}') && c.includes(':') && c.includes(';') && (c.includes('px') || c.includes('rem') || c.includes('@media'))) return 'css';

    // SQL
    if (/SELECT\s+.+\s+FROM\s+/i.test(c)) return 'sql';

    // C/C++
    if (c.includes('#include') && (c.includes('<stdio.h>') || c.includes('<iostream>'))) return 'cpp';

    // Java
    if (c.includes('public class') && c.includes('static void main')) return 'java';

    // JSON
    if ((c.startsWith('{') && c.endsWith('}')) || (c.startsWith('[') && c.endsWith(']'))) {
        try {
            JSON.parse(c);
            return 'json';
        } catch (e) {
            // not valid json, might be object literal in JS
        }
    }
    
    // Shell/Bash
    if (c.startsWith('#!/bin/bash') || c.includes('echo ') || c.includes('sudo ') || c.includes('npm install') || c.includes('pip install')) return 'bash';

    return '';
};

// Sub-component for individual code blocks to handle copy state and theme
const CodeBlock: React.FC<{ language: string; code: string; onImprove?: (code: string, lang: string) => void }> = ({ language, code, onImprove }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [currentTheme, setCurrentTheme] = useState('tomorrow');

    useEffect(() => {
        // Load saved theme
        const saved = localStorage.getItem('prism-theme-pref');
        if (saved) setCurrentTheme(saved);

        // Listen for global theme changes to sync all blocks
        const handleThemeUpdate = (e: CustomEvent) => setCurrentTheme(e.detail);
        window.addEventListener('prism-theme-change' as any, handleThemeUpdate);
        return () => window.removeEventListener('prism-theme-change' as any, handleThemeUpdate);
    }, []);

    const handleCopy = async () => {
        if (!navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    const changeTheme = (themeId: string) => {
        const theme = PRISM_THEMES.find(t => t.id === themeId);
        if (theme) {
            const link = document.getElementById('prism-theme-link') as HTMLLinkElement;
            if (link) link.href = theme.url;
            localStorage.setItem('prism-theme-pref', themeId);
            // Notify other components
            window.dispatchEvent(new CustomEvent('prism-theme-change', { detail: themeId }));
        }
    };

    return (
        <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-700/50 shadow-lg bg-slate-900/40">
            {/* Code Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono ml-2">
                        {language || 'TEXT'}
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                     {/* Theme Selector */}
                     <div className="relative group/theme">
                         <div className="flex items-center gap-1.5 bg-slate-700/50 border border-slate-600 rounded-lg px-2 py-1">
                             <Palette size={10} className="text-slate-400" />
                             <select 
                                value={currentTheme}
                                onChange={(e) => changeTheme(e.target.value)}
                                className="bg-transparent text-[10px] font-medium text-slate-300 outline-none appearance-none cursor-pointer w-[90px]"
                                title="Changer le thème du code"
                             >
                                 {PRISM_THEMES.map(t => (
                                     <option key={t.id} value={t.id} className="bg-slate-800 text-slate-300">{t.name}</option>
                                 ))}
                             </select>
                         </div>
                     </div>

                     {/* AI Improve Button */}
                     {onImprove && (
                        <button 
                            onClick={() => onImprove(code, language)}
                            className="flex items-center gap-1.5 text-xs transition-all p-1.5 rounded-lg border bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20 hover:text-violet-300 active:scale-95"
                            title="Analyser et améliorer ce code"
                        >
                            <Sparkles size={13} />
                            <span className="font-semibold text-[10px] uppercase tracking-wider hidden sm:inline">Améliorer</span>
                        </button>
                     )}

                    {/* Copy Button */}
                    <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 text-xs transition-all p-1.5 rounded-lg border ${
                            isCopied 
                            ? 'bg-green-500/20 text-green-400 border-green-500/50 ring-1 ring-green-500/20' 
                            : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white hover:border-slate-500'
                        } active:scale-95`}
                        title="Copier le code"
                    >
                        {isCopied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                        <span className="font-semibold text-[10px] uppercase tracking-wider">{isCopied ? 'Copié !' : 'Copier'}</span>
                    </button>
                </div>
            </div>
            {/* Code Content */}
            <pre className={`${language ? `language-${language}` : 'language-none'} code-scrollbar`} style={{ margin: 0, borderRadius: 0 }}>
                <code>{code}</code>
            </pre>
        </div>
    );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, mode, themeColor, userProfile, onRetry, onImproveCode, isFocused, onFocus, onExitFocus }) => {
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [latexReady, setLatexReady] = useState(false);

  const isUser = message.role === 'user';
  const isError = message.isError;
  const isSupport = mode === 'support';
  const isMusic = mode === 'music';
  const isOrg = mode === 'organization';
  const isDeepResearch = mode === 'deep_research';
  const isAnalytics = mode === 'analytics';
  const isPolyglot = mode === 'polyglot';
  const isGames = mode === 'games';
  const isChatPDF = mode === 'chatpdf';
  const isNotes = mode === 'notes';

  // Trigger Prism Highlight and check KaTeX
  useEffect(() => {
      if ((window as any).Prism) {
          (window as any).Prism.highlightAll();
      }
      // Check if KaTeX is loaded
      if ((window as any).katex) {
          setLatexReady(true);
      } else {
          // Poll for KaTeX
          const interval = setInterval(() => {
              if ((window as any).katex) {
                  setLatexReady(true);
                  clearInterval(interval);
              }
          }, 100);
          return () => clearInterval(interval);
      }
  }, [message.text]);

  // Determine effective color base based on Theme Preference OR Mode Default
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

  // Construct dynamic classes for bubble styling
  // User: Vibrant Gradient, Rounded-TR-SM for distinct shape
  const userBgColor = `bg-gradient-to-br from-${colorBase}-600 to-${colorBase}-700 shadow-${colorBase}-500/20`;
  
  // Bot: White/Dark background, Border-Left colored, Rounded-TL-SM for distinct shape
  const botBgColor = `bg-white dark:bg-gray-800`;
  const botBorderColor = `border-${colorBase}-200 dark:border-${colorBase}-800`;
  const botLeftBorder = `border-l-[3px] border-l-${colorBase}-500`;
  const botShadow = `shadow-sm shadow-gray-200/50 dark:shadow-none`;
  
  const headingColor = `text-${colorBase}-700 dark:text-${colorBase}-400`;
  const bulletColor = `bg-${colorBase}-400 dark:bg-${colorBase}-500`;
  const numberColor = `text-${colorBase}-600 dark:text-${colorBase}-400`;

  // Icons based on MODE
  const iconSize = 22; // Increased size for visibility
  let botIcon = <BookOpen size={iconSize} />;
  if (isSupport) botIcon = <HeartHandshake size={iconSize} />;
  else if (isMusic) botIcon = <Music size={iconSize} />;
  else if (isOrg) botIcon = <CalendarClock size={iconSize} />;
  else if (isDeepResearch) botIcon = <ScanSearch size={iconSize} />;
  else if (isAnalytics) botIcon = <BarChart3 size={iconSize} />;
  else if (isPolyglot) botIcon = <Languages size={iconSize} />;
  else if (isGames) botIcon = <Gamepad2 size={iconSize} />;
  else if (isChatPDF) botIcon = <FileText size={iconSize} />;
  else if (isNotes) botIcon = <FileEdit size={iconSize} />;

  // Mode Label for Header
  const getModeLabel = () => {
    if (isSupport) return 'Soutien';
    if (isMusic) return 'Musique';
    if (isOrg) return 'Planning';
    if (isDeepResearch) return 'Recherche';
    if (isAnalytics) return 'Analytics';
    if (isPolyglot) return 'Polyglot';
    if (isGames) return 'Jeux';
    if (isChatPDF) return 'ChatPDF';
    if (isNotes) return 'Notes';
    return 'BrainAssist';
  };

  // User Avatar Logic
  const getUserAvatar = () => {
    if (!userProfile) return <User size={iconSize} />;
    
    switch(userProfile.avatarId) {
        case 'academic': return <GraduationCap size={iconSize} />;
        case 'modern': return <Rocket size={iconSize} />;
        case 'creative': return <Palette size={iconSize} />;
        case 'tech': return <Laptop size={iconSize} />;
        case 'calm': return <Leaf size={iconSize} />;
        case 'energy': return <Zap size={iconSize} />;
        case 'smart': return <Lightbulb size={iconSize} />;
        case 'friendly': return <Smile size={iconSize} />;
        default: return <User size={iconSize} />;
    }
  };

  // Safe KaTeX renderer
  const renderLatex = (latex: string, displayMode: boolean = false) => {
    if (!latexReady) return <span className="opacity-50">...</span>;

    if ((window as any).katex) {
        try {
            const html = (window as any).katex.renderToString(latex, {
                displayMode: displayMode,
                throwOnError: false,
                output: 'html' 
            });
            const containerClass = displayMode 
                ? "katex-display-container my-3 overflow-x-auto py-2 text-center" 
                : "katex-inline-container inline-block align-middle px-1";
            return <span className={containerClass} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (e) {
            return <span className="text-red-400 font-mono text-xs">{latex}</span>;
        }
    }
    return <span>{latex}</span>;
  };

  // Parse Markdown-like syntax
  const formatRichText = (text: string) => {
    const blockMathParts = text.split(/(\$\$[\s\S]*?\$\$)/g);
    return blockMathParts.map((blockPart, bIdx) => {
        if (blockPart.startsWith('$$') && blockPart.endsWith('$$')) {
            let math = blockPart.slice(2, -2).trim();
            math = math.replace(/\*/g, ' \\times ');
            return <div key={bIdx} className="w-full text-center my-2">{renderLatex(math, true)}</div>;
        }
        const inlineCodeParts = blockPart.split(/(`[^`]+`)/g);
        return (
            <span key={bIdx}>
                {inlineCodeParts.map((codePart, cIdx) => {
                    if (codePart.startsWith('`') && codePart.endsWith('`') && codePart.length > 2) {
                         return <code key={cIdx}>{codePart.slice(1, -1)}</code>;
                    }
                    const inlineMathParts = codePart.split(/(\$[^\n$]+\$)/g);
                    return (
                       <span key={cIdx}>
                           {inlineMathParts.map((inlinePart, iIdx) => {
                                if (inlinePart.startsWith('$') && inlinePart.endsWith('$') && inlinePart.length > 2) {
                                    let mathContent = inlinePart.slice(1, -1);
                                    mathContent = mathContent.replace(/\*/g, ' \\times ');
                                    return <span key={iIdx} className={isUser ? "" : "text-gray-900 dark:text-gray-100"}>{renderLatex(mathContent, false)}</span>;
                                }
                                const boldParts = inlinePart.split(/(\*\*.*?\*\*)/g);
                                return (
                                    <span key={iIdx}>
                                        {boldParts.map((part, index) => {
                                            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                                                return <strong key={index} className={isUser ? "font-bold text-white" : "font-bold text-gray-900 dark:text-white"}>{part.slice(2, -2)}</strong>;
                                            }
                                            const subParts = part.split(/(\*[^*]+\*)/g);
                                            return (
                                                <span key={index}>
                                                    {subParts.map((subPart, subIndex) => {
                                                        if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length >= 3) {
                                                            return <em key={subIndex} className="italic">{subPart.slice(1, -1)}</em>;
                                                        }
                                                        return subPart;
                                                    })}
                                                </span>
                                            );
                                        })}
                                    </span>
                                );
                           })}
                       </span>
                    )
                })}
            </span>
        );
    });
  };

  const renderContent = (text: string) => {
    const codeBlockParts = text.split(/(```[\s\S]*?```)/g);
    return codeBlockParts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
            const match = part.match(/```(\w+)?\s*([\s\S]*?)```/);
            let language = match && match[1] ? match[1] : '';
            const codeContent = match ? match[2] : part.slice(3, -3);
            
            // Try to auto-detect if no language specified
            if (!language) {
                language = detectLanguage(codeContent);
            }

            return <CodeBlock key={index} language={language} code={codeContent} onImprove={onImproveCode} />;
        }
        const lines = part.split('\n');
        return lines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={`${index}-${i}`} className="h-2" />;
            if (trimmed.startsWith('#') && !isUser) {
                const content = trimmed.replace(/^#+\s*/, '');
                const level = trimmed.match(/^#+/)?.[0].length || 1;
                const sizeClass = level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg';
                return <h3 key={`${index}-${i}`} className={`font-bold ${sizeClass} mt-5 mb-3 leading-tight ${headingColor}`}>{formatRichText(content)}</h3>;
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const content = trimmed.substring(2);
                return <div key={`${index}-${i}`} className="flex items-start gap-3 mb-1.5 ml-1"><span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUser ? 'bg-white/70' : bulletColor}`}></span><div className="leading-relaxed">{formatRichText(content)}</div></div>;
            }
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
            if (numMatch) {
                return <div key={`${index}-${i}`} className="flex items-start gap-2 mb-1.5 ml-1"><span className={`font-bold min-w-[1.2rem] ${isUser ? 'text-white/90' : numberColor}`}>{numMatch[1]}.</span><div className="leading-relaxed">{formatRichText(numMatch[2])}</div></div>;
            }
            return <p key={`${index}-${i}`} className={`mb-2 leading-relaxed ${isUser ? 'text-white/95' : 'text-gray-700 dark:text-gray-300'}`}>{formatRichText(line)}</p>;
        });
    });
  };

  const getThemeHex = () => colorMap[colorBase] || '#1d4ed8';

  // Export functions
  const markdownToHtml = (markdown: string, themeHex: string) => {
      let html = markdown;
      html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html = html.replace(/^### (.*$)/gim, `<h3 style="color: ${themeHex}; font-size: 14pt;">$1</h3>`);
      html = html.replace(/^## (.*$)/gim, `<h2 style="color: ${themeHex}; font-size: 16pt;">$1</h2>`);
      html = html.replace(/^# (.*$)/gim, `<h1 style="color: ${themeHex}; font-size: 20pt;">$1</h1>`);
      html = html.replace(/\*\*(.*?)\*\*/gim, `<strong style="color: ${themeHex};">$1</strong>`);
      html = html.replace(/\*(.*?)\*/gim, `<em>$1</em>`);
      html = html.replace(/```([\s\S]*?)```/g, `<pre style="background: #f5f5f5; padding: 10px;">$1</pre>`);
      html = html.replace(/\n/gim, '<br>');
      return html;
  };

  const exportTxt = () => {
    const blob = new Blob([message.text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BrainAssist_Export_${message.id.slice(-6)}.txt`;
    link.click();
  };

  const exportDocx = () => {
    const themeHex = getThemeHex();
    const bodyContent = markdownToHtml(message.text, themeHex);
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body>${bodyContent}</body></html>`;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BrainAssist_Export_${message.id.slice(-6)}.doc`;
    link.click();
  };

  const exportPDF = () => {
    const themeHex = getThemeHex();
    const bodyContent = markdownToHtml(message.text, themeHex);
    const printWindow = window.open('', '_blank');
    if(printWindow) {
        printWindow.document.write(`<html><head><title>Export</title><style>body{font-family:sans-serif;padding:40px;}</style></head><body>${bodyContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up ${isFocused ? 'justify-center' : ''}`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2 transition-all duration-300 ${isFocused ? 'max-w-4xl w-full' : 'max-w-[90%] md:max-w-[80%] lg:max-w-[70%]'}`}>
        
        <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-2xl flex items-center justify-center mb-1 shadow-sm transition-all ${
            isUser 
                ? `${userBgColor} text-white shadow-md ring-2 ring-white dark:ring-gray-900` 
                : isError 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                    : `bg-white dark:bg-gray-800 text-${colorBase}-700 dark:text-${colorBase}-200 border border-${colorBase}-200 dark:border-${colorBase}-700`
            }`}>
            {isUser ? getUserAvatar() : isError ? <AlertTriangle size={22} /> : botIcon}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${isFocused ? 'w-full' : 'max-w-full'}`}>
                <div
                className={`px-6 py-5 rounded-[2rem] text-sm md:text-base overflow-hidden transition-all duration-200 hover:scale-[1.005] relative group w-fit ${
                    isUser 
                    ? `${userBgColor} text-white rounded-tr-sm shadow-lg shadow-${colorBase}-500/20` 
                    : isError
                        ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-bl-sm'
                        : `${botBgColor} text-gray-800 dark:text-gray-100 border ${botBorderColor} rounded-tl-sm ${botLeftBorder} ${botShadow}`
                } ${isFocused ? 'w-full shadow-2xl scale-[1.01]' : ''}`}
                >
                
                {/* User Name Label */}
                {isUser && userProfile && (
                    <div className="text-[10px] font-semibold opacity-70 mb-1 text-right uppercase tracking-wider">
                        {userProfile.name}
                    </div>
                )}

                {/* Bot Mode Label Header */}
                {!isUser && !isError && (
                     <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700/50 justify-between bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800 dark:to-transparent -mx-6 -mt-5 px-6 pt-5">
                        <div className={`flex items-center gap-2`}>
                             {/* Small Icon Badge */}
                            <div className={`flex items-center justify-center w-5 h-5 rounded-md bg-${colorBase}-100 dark:bg-${colorBase}-900/40 text-${colorBase}-600 dark:text-${colorBase}-400`}>
                                {botIcon && React.cloneElement(botIcon as React.ReactElement, { size: 12 })}
                            </div>
                            <span className={`text-[11px] font-bold uppercase tracking-widest text-${colorBase}-700 dark:text-${colorBase}-300`}>
                                {getModeLabel()}
                            </span>
                        </div>
                        {isFocused && <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 animate-pulse bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Mode Lecture</span>}
                     </div>
                )}
                
                {/* Error Header */}
                {isError && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-200 dark:border-red-800/50">
                        <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                        <span className="font-bold text-xs uppercase tracking-wider text-red-700 dark:text-red-400">Erreur</span>
                    </div>
                )}

                <div className="w-full break-words">
                    {/* Render Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {message.attachments.map((att, idx) => (
                          <div key={idx} className="relative rounded-2xl overflow-hidden border border-white/20 shadow-sm">
                            {att.mimeType.startsWith('image/') ? (
                              <img src={att.data} alt="attachment" className="max-h-48 max-w-full object-cover rounded-2xl" />
                            ) : (
                              <div className="flex items-center gap-2 bg-white/10 p-2 rounded">
                                <FileText size={20} className="text-white" />
                                <span className="text-xs text-white truncate max-w-[150px]">{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Render Text */}
                    {renderContent(message.text)}
                </div>

                 {/* Retry Button for Errors */}
                 {isError && message.isRetryable && onRetry && (
                     <div className="mt-3 flex justify-end">
                         <button 
                            onClick={() => onRetry(message.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors shadow-sm active:scale-95 active:ring-2 active:ring-red-300 ring-1 ring-red-200 dark:ring-red-800 animate-pulse-soft"
                         >
                             <RotateCcw size={14} /> Réessayer
                         </button>
                     </div>
                 )}

                {/* Export Action & Focus (Only for Bot messages) */}
                {!isUser && !isError && (
                    <div className={`mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex flex-col gap-2 transition-opacity duration-300 ${isDeepResearch || isAnalytics || isNotes || isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         
                         <div className="flex justify-end gap-2">
                             {/* Focus Button */}
                             {onFocus && onExitFocus && (
                                <button
                                    onClick={isFocused ? onExitFocus : onFocus}
                                    className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95 ring-1 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-600 ${headingColor}`}
                                    title={isFocused ? "Quitter le mode lecture" : "Mode lecture focalisée"}
                                >
                                    {isFocused ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                    {isFocused ? "Réduire" : "Focus"}
                                </button>
                             )}

                             {!showExportOptions ? (
                                 <button 
                                    onClick={() => setShowExportOptions(true)}
                                    className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95 active:ring-2 active:ring-gray-200 dark:active:ring-gray-700 ring-1 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-600 ${headingColor}`}
                                    title="Exporter"
                                 >
                                    <Download size={14} />
                                    Exporter
                                 </button>
                             ) : (
                                 <div className="flex flex-col items-end gap-2 w-full animate-fade-in bg-gray-50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                     <p className={`text-xs italic font-medium mb-1 ${headingColor}`}>Quelle type de fichiers voulez vous exporter ?</p>
                                     <div className="flex flex-wrap gap-2 justify-end">
                                         <button onClick={exportDocx} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors shadow-sm active:scale-95 active:ring-2 active:ring-blue-200 dark:active:ring-blue-800 ring-1 ring-blue-200 dark:ring-blue-800">
                                            <FileType size={14} /> DOCX
                                         </button>
                                         <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors shadow-sm active:scale-95 active:ring-2 active:ring-red-200 dark:active:ring-red-800 ring-1 ring-red-200 dark:ring-red-800">
                                            <Printer size={14} /> PDF
                                         </button>
                                         <button onClick={exportTxt} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-sm active:scale-95 active:ring-2 active:ring-gray-300 dark:active:ring-gray-600 ring-1 ring-gray-300 dark:ring-gray-600">
                                            <FileText size={14} /> TXT
                                         </button>
                                         <button onClick={() => setShowExportOptions(false)} className="ml-2 px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            <span className="text-xs font-bold">Fermer</span>
                                         </button>
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                )}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-1.5 px-1 font-medium">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ChatMessage;