import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type NavigationHistoryItem = {
  pathname: string;
  title: string;
  timestamp: number;
};

export function useNavigationHistory(maxEntries = 10) {
  const location = useLocation();
  const navigate = useNavigate();
  const [history, setHistory] = useState<NavigationHistoryItem[]>([]);
  const [currentPageTitle, setCurrentPageTitle] = useState<string>('');

  // Update history when location changes
  useEffect(() => {
    // Don't record duplicate consecutive entries
    if (history.length > 0 && history[history.length - 1].pathname === location.pathname) {
      return;
    }

    // Get current page title
    const title = document.title || getPageTitleFromPath(location.pathname);

    // Add current location to history
    setHistory(prev => {
      const newHistory = [...prev, {
        pathname: location.pathname,
        title,
        timestamp: Date.now()
      }];

      // Limit history length
      if (newHistory.length > maxEntries) {
        return newHistory.slice(newHistory.length - maxEntries);
      }
      return newHistory;
    });

    // Store in localStorage for persistence across sessions
    try {
      localStorage.setItem('navigationHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save navigation history to localStorage:', error);
    }
  }, [location, maxEntries]);

  // Load history from localStorage on initial mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('navigationHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Failed to load navigation history from localStorage:', error);
    }
  }, []);

  // Set page title
  const setPageTitle = (title: string) => {
    document.title = `GeekCare - ${title}`;
    setCurrentPageTitle(title);
    
    // Update the title in the history
    setHistory(prev => {
      if (prev.length === 0) return prev;
      
      const lastItem = prev[prev.length - 1];
      if (lastItem.pathname === location.pathname) {
        const updatedHistory = [...prev];
        updatedHistory[updatedHistory.length - 1] = {
          ...lastItem,
          title
        };
        return updatedHistory;
      }
      return prev;
    });
  };

  // Navigate back with context
  const goBack = () => {
    if (history.length <= 1) {
      // Default fallback if no history
      navigate('/home');
      return;
    }

    // Go back to previous page in history
    const previousPage = history[history.length - 2];
    navigate(previousPage.pathname);
    
    // Remove current page from history
    setHistory(prev => prev.slice(0, prev.length - 1));
  };

  return {
    history,
    currentPageTitle,
    setPageTitle,
    goBack
  };
}

// Helper to extract a readable page title from path
function getPageTitleFromPath(path: string): string {
  // Remove leading slash and query params
  const cleanPath = path.replace(/^\//, '').split('?')[0];
  
  // Handle empty path (home)
  if (!cleanPath) return 'Home';
  
  // Handle nested paths
  const segments = cleanPath.split('/');
  const lastSegment = segments[segments.length - 1];
  
  // Convert kebab-case or snake_case to Title Case
  return lastSegment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
} 