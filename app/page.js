'use client'

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import FloatingActionButton from '../components/FloatingActionButton';
import Window from '../components/Window';
import Chat from '@/components/Chat';
import SystemSettings from '@/components/SystemSettings';
import NewWorkspaceCreation from '@/components/NewWorkspaceCreation';

// Create a global click lock
const globalClickLock = {
  isProcessing: false,
  timestamp: 0
};

export default function App() {
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
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [windowsByWorkspace, setWindowsByWorkspace] = useState({});
  const currentPositionRef = useRef({ x: 0, y: 0 });

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

  const handleMouseDown = (e, windowId) => {
    if (e.target.closest('.window-handle')) {
      setDragging(windowId);
      const window = windows.find(w => w.id === windowId);
      dragStartPos.current = {
        x: e.clientX - (window.windowData.position?.x || 0),
        y: e.clientY - (window.windowData.position?.y || 0)
      };
    }
  };

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

  const handleNewWorkspace = () => {
    handleNewWindow('workspace', {
      position: { x: 20, y: 20 }
    });
  };

  // Handle workspace creation
  const handleWorkspaceCreated = (newWorkspace) => {
    setWorkspaces(prev => {
      const updatedWorkspaces = [...prev, newWorkspace];
      localStorage.setItem('workspaces', JSON.stringify(updatedWorkspaces));
      return updatedWorkspaces;
    });

    // Initialize empty windows array for new workspace
    setWindowsByWorkspace(prev => {
      const updatedWindows = {
        ...prev,
        [newWorkspace.id]: []
      };
      localStorage.setItem('windowsByWorkspace', JSON.stringify(updatedWindows));
      return updatedWindows;
    });

    // Set as current workspace
    setCurrentWorkspace(newWorkspace);
    localStorage.setItem('currentWorkspaceId', newWorkspace.id.toString());
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

  // Handle workspace change
  const handleWorkspaceChange = (workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('currentWorkspaceId', workspace.id.toString());
  };

  // Get current workspace's windows
  const currentWindows = currentWorkspace 
    ? windowsByWorkspace[currentWorkspace.id] || []
    : [];

  // Handle window closing
  const handleCloseWindow = (windowId) => {
    if (!currentWorkspace) return;

    setWindowsByWorkspace(prev => {
      const updatedWindows = {
        ...prev,
        [currentWorkspace.id]: prev[currentWorkspace.id].filter(w => w.id !== windowId)
      };
      
      // Save to localStorage immediately
      localStorage.setItem('windowsByWorkspace', JSON.stringify(updatedWindows));
      
      return updatedWindows;
    });
  };

  // Initialize Home workspace and load saved data
  useEffect(() => {
    const savedWorkspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
    const savedWindows = JSON.parse(localStorage.getItem('windowsByWorkspace') || '{}');
    
    // Check if Home workspace exists
    let homeWorkspace = savedWorkspaces.find(w => w.name === 'Home');
    
    // Create Home workspace if it doesn't exist
    if (!homeWorkspace) {
      homeWorkspace = {
        id: Date.now(),
        name: 'Home',
        createdAt: new Date().toISOString()
      };
      savedWorkspaces.push(homeWorkspace);
      
      // Initialize empty windows array for Home workspace
      savedWindows[homeWorkspace.id] = [];
    }
    
    // Save everything to localStorage
    localStorage.setItem('workspaces', JSON.stringify(savedWorkspaces));
    localStorage.setItem('windowsByWorkspace', JSON.stringify(savedWindows));
    
    // Set state
    setWorkspaces(savedWorkspaces);
    setWindowsByWorkspace(savedWindows);

    // Set current workspace to Home or saved workspace
    const savedCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
    const currentWorkspace = savedWorkspaces.find(w => w.id === Number(savedCurrentWorkspaceId)) || homeWorkspace;
    setCurrentWorkspace(currentWorkspace);
    localStorage.setItem('currentWorkspaceId', currentWorkspace.id.toString());
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Current Workspace:', currentWorkspace);
    console.log('Windows by Workspace:', windowsByWorkspace);
    console.log('Current Windows:', currentWindows);
  }, [currentWorkspace, windowsByWorkspace, currentWindows]);

  // Handle new chat window
  const handleNewChat = () => {
    handleNewWindow('chat', {
      operator: 'claude-sonnet',
      messages: [],
      position: { x: 20, y: 20 }
    });
  };

  return (
    <div className="min-h-screen bg-gray-800">
      {/* Workspace Controls */}
      {workspaces.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <select
            value={currentWorkspace?.id || ''}
            onChange={(e) => {
              const workspace = workspaces.find(w => w.id === Number(e.target.value))
              handleWorkspaceChange(workspace)
            }}
            className="border rounded-lg px-4 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black shadow-lg min-w-[200px]"
          >
            {workspaces.map(workspace => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          
          {/* Delete Workspace Button */}
          <button
            onClick={handleWorkspaceDelete}
            className="p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Delete Workspace"
            disabled={currentWorkspace?.name === 'Home'}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </button>
        </div>
      )}

      {/* Windows Container */}
      <div className="flex flex-wrap gap-4 p-4">
        {currentWindows.map(window => (
          <div 
            key={window.id}
            data-window-id={window.id}
            className="absolute overflow-hidden flex flex-col resize window-container rounded-tl-xl rounded-tr-xl rounded-bl-xl shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-200"
            style={{
              transform: `translate(${window.windowData.position?.x || 0}px, ${window.windowData.position?.y || 0}px)`,
              width: window.windowData.size?.width || 600,
              height: window.windowData.size?.height || 400,
            }}
            onMouseDown={(e) => handleMouseDown(e, window.id)}
            onResize={(e) => alert}
          >
            <div className="window-handle px-4 py-2 text-sm font-bold border-b flex justify-between items-center cursor-move transition-colors duration-200 bg-black text-white">
              <span>{window.type === 'chat' ? 'Chat' : window.type === 'workspace' ? 'New Workspace' : 'System Settings'}</span>
              <button 
                onClick={() => handleCloseWindow(window.id)}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-full transition-colors duration-150 text-white"
              >
                <span className="text-xl leading-none select-none">×</span>
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-white">
              {window.type === 'chat' ? (
                <Chat
                  windowData={window.windowData}
                  onWindowDataChange={(newData) => handleWindowDataChange(window.id, newData)}
                  onNewWindow={handleNewWindow}
                  onBlockClick={handleBlockClick}
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
        <FloatingActionButton 
          onNewChat={handleNewChat}
          onNewWorkspace={handleNewWorkspace}
        />
      </div>
    </div>
  );
}
