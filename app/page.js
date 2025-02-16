'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Chat from '@/components/Chat';
import SystemSettings from '@/components/SystemSettings';
import NewWorkspaceCreation from '@/components/NewWorkspaceCreation';
import StartBar from '@/components/StartBar'
import '@/styles/win98.css';

// Create a global click lock
const globalClickLock = {
  isProcessing: false,
  timestamp: 0
};

export default function App() {
  const [workspaces, setWorkspaces] = useState([{ id: 1, name: 'Home' }]);
  const [currentWorkspace, setCurrentWorkspace] = useState(workspaces[0]);
  const [windowsByWorkspace, setWindowsByWorkspace] = useState({});
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [windowZIndexes, setWindowZIndexes] = useState({});
  const nextZIndexRef = useRef(1);

  // Compute current windows first
  const currentWindows = currentWorkspace 
    ? windowsByWorkspace[currentWorkspace.id] || []
    : [];

  // Bring window to front
  const bringToFront = useCallback((windowId) => {
    setActiveWindowId(windowId);
    setWindowZIndexes(prev => ({
      ...prev,
      [windowId]: nextZIndexRef.current++
    }));
  }, []);

  // Create new window with focus
  const createWindow = useCallback((type, workspaceId) => {
    const newWindow = {
      id: Date.now(),
      type,
      windowData: {
        position: { x: 20, y: 20 },
        size: { width: 600, height: 400 },
        messages: [] // Initialize messages array for chat windows
      }
    };

    setWindowsByWorkspace(prev => ({
      ...prev,
      [workspaceId]: [...(prev[workspaceId] || []), newWindow]
    }));
    // Update localStorage
    const prevWindows = JSON.parse(localStorage.getItem('windowsByWorkspace') || '{}');
    const allWindows = { ...prevWindows, [workspaceId]: [...(prevWindows[workspaceId] || []), newWindow] };
    localStorage.setItem('windowsByWorkspace', JSON.stringify(allWindows)); 

    // Set focus to new window
    bringToFront(newWindow.id);
  }, [bringToFront]);

  // Handle new chat window
  const handleNewChat = useCallback(() => {
    if (!currentWorkspace) return;
    createWindow('chat', currentWorkspace.id);
  }, [currentWorkspace, createWindow]);

  // Handle new workspace window
  const handleNewWorkspace = useCallback(() => {
    if (!currentWorkspace) return;
    createWindow('workspace', currentWorkspace.id);
  }, [currentWorkspace, createWindow]);

  // Handle new settings window
  const handleNewSettings = useCallback(() => {
    if (!currentWorkspace) return;
    createWindow('settings', currentWorkspace.id);
  }, [currentWorkspace, createWindow]);

  // Handle workspace creation
  const handleWorkspaceCreated = useCallback((name) => {
    const newWorkspace = {
      id: Date.now(),
      name
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    setCurrentWorkspace(newWorkspace);
    // Close the workspace creation window after creation
    const workspaceWindow = currentWindows.find(w => w.type === 'workspace');
    if (workspaceWindow) {
      handleCloseWindow(workspaceWindow.id);
    }
  }, [currentWindows]);

  // Handle close window
  const handleCloseWindow = useCallback((windowId) => {
    if (!currentWorkspace) return;
    setWindowsByWorkspace(prev => ({
      ...prev,
      [currentWorkspace.id]: prev[currentWorkspace.id].filter(w => w.id !== windowId)
    }))
      // Update localStorage
      const prevWindows = JSON.parse(localStorage.getItem('windowsByWorkspace') || '{}');
    const allWindows = { ...prevWindows, [currentWorkspace.id]: prevWindows[currentWorkspace.id].filter(w => w.id !== windowId) };
    localStorage.setItem('windowsByWorkspace', JSON.stringify(allWindows));
  }, [currentWorkspace]);

  // Handle window click
  const handleWindowClick = useCallback((windowId) => {
    bringToFront(windowId);
  }, [bringToFront]);

  const [windows, setWindows] = useState([]);
  const [activeWindow, setActiveWindow] = useState(null);
  const [nextId, setNextId] = useState(Date.now());
  const [dragging, setDragging] = useState(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const blockClickLock = useRef(false);
  const blockClickTimeout = useRef(null);
  const processingClick = useRef(false);
  const lastProcessedClick = useRef({ messageIndex: null, content: null, timestamp: 0 });
  const dragWindowRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [currentPositionRef] = useState({ x: 0, y: 0 });

  const getDefaultDimensions = () => {
    if (typeof window === 'undefined') return { width: '360px', height: '480px' }
    
    const screenHeight = window.innerHeight
    const screenWidth = window.innerWidth
    
    // Set height to 90% of screen height
    let height = screenHeight * 0.9
    
    // Calculate width based on 3:4 aspect ratio
    let width = height * (3/4)
    
    // If width is more than 90% of screen width, recalculate based on width
    if (width > screenWidth * 0.9) {
      width = screenWidth * 0.9
      // Recalculate height to maintain aspect ratio
      height = width * (4/3)
    }
    
    return {
      width: `${Math.round(width)}px`,
      height: `${Math.round(height)}px`
    }
  }

  const defaultDimensions = getDefaultDimensions()

  useEffect(() => {
    // Load windows from localStorage on mount
    const savedWindows = localStorage.getItem('windows');
    if (savedWindows) {
      try {
        const parsedWindows = JSON.parse(savedWindows);
        if (Array.isArray(parsedWindows) && parsedWindows.length > 0) {
          // Add new IDs to ensure uniqueness
          const windowsWithNewIds = parsedWindows.map(window => ({
            ...window,
            id: Date.now() + Math.random()
          }));
          setWindows(windowsWithNewIds);
          // Set nextId to be greater than any existing window id
          const maxId = Math.max(...windowsWithNewIds.map(w => w.id));
          setNextId(maxId + 1);
        } else {
          // If saved data is invalid, create initial window
          handleNewWindow('chat', { 
            operator: 'claude-sonnet', 
            messages: [],
            position: { x: 0, y: 0 }
          });
        }
      } catch (error) {
        console.error('Error parsing saved windows:', error);
        // If parsing fails, create initial window
        handleNewWindow('chat', { 
          operator: 'claude-sonnet', 
          messages: [],
          position: { x: 0, y: 0 }
        });
      }
    } else {
      // Create initial chat window if no saved windows
      handleNewWindow('chat', { 
        operator: 'claude-sonnet', 
        messages: [],
        position: { x: 0, y: 0 }
      });
    }
  }, []);

  useEffect(() => {
    // Save windows to localStorage whenever they change
    if (windows.length > 0) {
      localStorage.setItem('windows', JSON.stringify(windows));
    }
  }, [windows]);

  useEffect(() => {
    // Load workspaces and windows from localStorage
    const savedWorkspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
    const savedWindowsByWorkspace = JSON.parse(localStorage.getItem('windowsByWorkspace') || '{}');
    
    setWorkspaces(savedWorkspaces);
    setWindowsByWorkspace(savedWindowsByWorkspace);

    // Get saved current workspace or default to first in list
    if (savedWorkspaces.length > 0) {
      const savedCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
      const currentWorkspace = savedWorkspaces.find(w => w.id === Number(savedCurrentWorkspaceId)) || savedWorkspaces[0];
      setCurrentWorkspace(currentWorkspace);
    }
  }, []);

  useEffect(() => {
    // Save workspaces and windows to localStorage
    //localStorage.setItem('workspaces', JSON.stringify(workspaces));
    //localStorage.setItem('windowsByWorkspace', JSON.stringify(windowsByWorkspace));
  }, [windowsByWorkspace]);

  const findNextAvailablePosition = (basePosition) => {
    let position = { ...basePosition };
    let occupied = true;
    
    while (occupied) {
      occupied = windows.some(window => 
        window.windowData.position?.x === position.x && 
        window.windowData.position?.y === position.y
      );
      if (occupied) {
        position.x = Math.max(0, position.x + 10);
        position.y = Math.max(0, position.y + 10);
      }
    }
    
    return position;
  };

  const handleNewWindow = (type, initialData = {}) => {
    if (!currentWorkspace) return;

    const newWindow = {
      id: nextId,
      type,
      windowData: {
        ...initialData,
        position: initialData.position || { x: 20, y: 20 },
        size: { width: 600, height: 400 },
        apiKeys: windows[0]?.windowData?.apiKeys || {},
        workspaceId: currentWorkspace.id
      }
    };

    setNextId(prev => prev + 1);
    setWindowsByWorkspace(prev => ({
      ...prev,
      [currentWorkspace.id]: [...(prev[currentWorkspace.id] || []), newWindow]
    }));
    // Save windows to localStorage
    const storedWindows = JSON.parse(localStorage.getItem('windowsByWorkspace') || '{}');
    const updatedStoredWindows = {
      ...storedWindows,
      [currentWorkspace.id]: [...(storedWindows[currentWorkspace.id] || []), newWindow]
    };
    localStorage.setItem('windowsByWorkspace', JSON.stringify(updatedStoredWindows));
    setActiveWindow(newWindow.id);
    bringToFront(newWindow.id);
  };

  const handleWindowDataChange = (windowId, newData) => {
    if (!currentWorkspace) return;

    setWindowsByWorkspace(prev => ({
      ...prev,
      [currentWorkspace.id]: prev[currentWorkspace.id].map(window => 
        window.id === windowId 
          ? { ...window, windowData: newData }
          : window
      )
    }));
  };

  const handleWindowFocus = (windowId) => {
    setActiveWindow(windowId);
  };

  const handleWindowClose = (windowId) => {
    setWindows(prev => prev.filter(window => window.id !== windowId));
  };

  const handleWorkspaceChange = (workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('currentWorkspaceId', workspace.id.toString());
  };

  // Handle workspace deletion
  const handleWorkspaceDelete = () => {
    if (!currentWorkspace) return;
    if (currentWorkspace.name === 'Home') {
      alert('Cannot delete Home workspace');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete workspace "${currentWorkspace.name}"?`);
    if (!confirmed) return;

    setWorkspaces(prev => {
      const updatedWorkspaces = prev.filter(w => w.id !== currentWorkspace.id);
      localStorage.setItem('workspaces', JSON.stringify(updatedWorkspaces));
      return updatedWorkspaces;
    });

    // Clean up windows for deleted workspace
    setWindowsByWorkspace(prev => {
      const { [currentWorkspace.id]: deleted, ...rest } = prev;
      localStorage.setItem('windowsByWorkspace', JSON.stringify(rest));
      return rest;
    });

    // Switch to Home workspace
    const homeWorkspace = workspaces.find(w => w.name === 'Home');
    setCurrentWorkspace(homeWorkspace);
    localStorage.setItem('currentWorkspaceId', homeWorkspace.id.toString());
  };

  // Debug logging
  useEffect(() => {
    console.log('Current Workspace:', currentWorkspace);
    console.log('Windows by Workspace:', windowsByWorkspace);
    console.log('Current Windows:', currentWindows);
  }, [currentWorkspace, windowsByWorkspace, currentWindows]);

  const handleMouseDown = useCallback((e, windowId) => {
    // Always bring window to front when clicked anywhere
    bringToFront(windowId);

    // Handle dragging only if clicking the title bar
    if (e.target.closest('.window-handle')) {
      e.preventDefault();
      document.body.style.userSelect = 'none';
      
      const windowElement = e.target.closest('.window-container');
      const rect = windowElement.getBoundingClientRect();
      
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      
      const handleMouseMove = (moveEvent) => {
        const x = moveEvent.clientX - startX;
        const y = moveEvent.clientY - startY;
        
        if (!currentWorkspace) return;
        
        setWindowsByWorkspace(prev => ({
          ...prev,
          [currentWorkspace.id]: prev[currentWorkspace.id].map(window => 
            window.id === windowId
              ? {
                  ...window,
                  windowData: {
                    ...window.windowData,
                    position: { x, y }
                  }
                }
              : window
          )
        }));
      };
      
      const handleMouseUp = () => {
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, [bringToFront, currentWorkspace]);

  const handleMouseMove = (e) => {
    if (dragging !== null) {
      const newX = Math.max(0, e.clientX - dragStartPos.current.x);
      const newY = Math.max(0, e.clientY - dragStartPos.current.y);
      
      // Store current position
      currentPositionRef.current = { x: newX, y: newY };
      // Update visual position
      const windowElement = document.querySelector(`[data-window-id="${dragging}"]`);
      if (windowElement) {
        
        windowElement.style.transform = `translate(${newX}px, ${newY}px)`;
        // Update localStorage with current position
        const storedWindows = JSON.parse(localStorage.getItem('windowsByWorkspace') || '{}');
        if (storedWindows[currentWorkspace.id]) {
          const updatedWorkspaceWindows = [...storedWindows[currentWorkspace.id]];
          for (let i = 0; i < updatedWorkspaceWindows.length; i++) {
            if (updatedWorkspaceWindows[i].id === dragging) {
              updatedWorkspaceWindows[i] = {
                ...updatedWorkspaceWindows[i],
                windowData: {
                  ...updatedWorkspaceWindows[i].windowData,
                  position: { x: newX, y: newY }
                }
              };
              break;
            }
          }
          storedWindows[currentWorkspace.id] = updatedWorkspaceWindows;
          localStorage.setItem('windowsByWorkspace', JSON.stringify(storedWindows));
        }
      }
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    currentPositionRef.current = { x: 0, y: 0 };
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, currentWorkspace]);

  const handleBlockClick = (messageIndex, blockContent, windowData) => {
    // Check global lock
    const now = Date.now();
    if (globalClickLock.isProcessing || now - globalClickLock.timestamp < 100) {
      return;
    }

    // Set global lock
    globalClickLock.isProcessing = true;
    globalClickLock.timestamp = now;

    try {
      const messages = windowData.messages;
      const previousMessages = messages.slice(0, messageIndex);
      const clickedMessage = messages[messageIndex];
      
      const findContentInMessage = (message, content) => {
        if (typeof content === 'string') {
          const parts = message.content.split(content);
          return parts.length > 1 ? parts[0] + content : null;
        } else if (typeof content === 'object') {
          try {
            const messageObj = JSON.parse(message.content);
            const contentStr = JSON.stringify(content);
            const messageStr = JSON.stringify(messageObj);
            const parts = messageStr.split(contentStr);
            return parts.length > 1 ? JSON.parse(parts[0] + contentStr) : null;
          } catch (e) {
            const contentStr = JSON.stringify(content);
            const parts = message.content.split(contentStr);
            return parts.length > 1 ? parts[0] + contentStr : null;
          }
        }
        return null;
      };
      
      const contentBeforeBlock = findContentInMessage(clickedMessage, blockContent);
      
      if (contentBeforeBlock) {
        const truncatedMessage = {
          ...clickedMessage,
          content: typeof contentBeforeBlock === 'string' 
            ? contentBeforeBlock 
            : JSON.stringify(contentBeforeBlock)
        };
        
        const newHistory = [...previousMessages, truncatedMessage];
        
        handleNewWindow('chat', {
          operator: windowData.operator,
          messages: newHistory
        }, true);
      }
    } finally {
      // Release global lock after a short delay
      setTimeout(() => {
        globalClickLock.isProcessing = false;
      }, 100);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (blockClickTimeout.current) {
        clearTimeout(blockClickTimeout.current);
      }
    };
  }, []);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Add this helper function
  const getWindowTitle = (window) => {
    if (window.type === 'chat') {
      return window.windowData.title || 'Chat'
    } else if (window.type === 'workspace') {
      return 'New Workspace'
    } else if (window.type === 'settings') {
      return 'System Settings'
    }
    return 'Window'
  }

  return (
    <div className="min-h-screen bg-[#008080] win98">
      <div className="flex flex-wrap gap-4 p-4">
        {currentWindows.map(window => (
          <div 
            key={window.id}
            data-window-id={window.id}
            className="win98-window absolute overflow-hidden flex flex-col resize window-container"
            style={{
              transform: `translate(${window.windowData.position?.x || 0}px, ${window.windowData.position?.y || 0}px)`,
              width: window.windowData.size?.width || 600,
              height: window.windowData.size?.height || 400,
              zIndex: windowZIndexes[window.id] || 0
            }}
            onMouseDown={(e) => {
              // Always bring window to front when clicked anywhere
              bringToFront(window.id)
              
              // Only handle drag if clicking the title bar
              if (e.target.closest('.window-handle')) {
                handleMouseDown(e, window.id)
              }
            }}
          >
            <div className={`win98-window-header window-handle cursor-move select-none ${activeWindowId === window.id ? 'active' : ''}`}>
              <span className="win98-window-title">
                {getWindowTitle(window)}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation() // Prevent window activation when closing
                  handleCloseWindow(window.id)
                }}
                className="win98-close-button"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-[#c0c0c0] p-2">
              {window.type === 'chat' ? (
                <Chat
                  windowData={window.windowData}
                  onWindowDataChange={(newData) => handleWindowDataChange(window.id, newData)}
                  onNewWindow={handleNewWindow}
                />
              ) : window.type === 'workspace' ? (
                <NewWorkspaceCreation
                  windowData={window.windowData}
                  onWindowDataChange={(newData) => handleWindowDataChange(window.id, newData)}
                  onWorkspaceCreated={handleWorkspaceCreated}
                />
              ) : (
                <SystemSettings
                  windowData={window.windowData}
                  onWindowDataChange={(newData) => handleWindowDataChange(window.id, newData)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      
      <StartBar 
        onNewChat={handleNewChat}
        onNewWorkspace={handleNewWorkspace}
        onNewSettings={handleNewSettings}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onWorkspaceChange={handleWorkspaceChange}
        onWorkspaceDelete={handleWorkspaceDelete}
        windows={currentWindows}
        activeWindowId={activeWindowId}
        onWindowClick={handleWindowClick}
      />
    </div>
  );
}
