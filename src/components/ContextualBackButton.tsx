import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigationHistory } from '../hooks/useNavigationHistory';

interface ContextualBackButtonProps {
  fallbackPath?: string;
  className?: string;
  showLabel?: boolean;
  labelText?: string;
}

export function ContextualBackButton({
  fallbackPath = '/home',
  className = '',
  showLabel = true,
  labelText = 'Back',
}: ContextualBackButtonProps) {
  const { history, goBack } = useNavigationHistory();
  
  // Only show if we have history to go back to
  if (history.length <= 1) {
    return null;
  }
  
  // Get the previous page for label
  const previousPage = history.length > 1 ? history[history.length - 2] : null;
  const displayText = previousPage 
    ? `Back to ${previousPage.title}` 
    : labelText;
  
  return (
    <button
      onClick={goBack}
      className={`flex items-center text-pink-500 hover:text-pink-600 transition-colors ${className}`}
      aria-label={displayText}
    >
      <ArrowLeft className="w-5 h-5 mr-1" />
      {showLabel && (
        <span>{displayText}</span>
      )}
    </button>
  );
} 