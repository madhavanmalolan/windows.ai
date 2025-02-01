'use client'

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import FloatingActionButton from '../components/FloatingActionButton';
import Window from '../components/Window';
import Chat from '@/components/Chat';
import SystemSettings from '@/components/SystemSettings';

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

  const handleNewWindow = (type, windowData, scrollToBottom = false) => {
    const basePosition = windowData.position || { x: 0, y: 0 };
    const position = findNextAvailablePosition(basePosition);
    
    // Add timestamps to messages if they don't exist
    const messagesWithTimestamps = windowData.messages.map(message => ({
      ...message,
      timestamp: message.timestamp || Date.now() + Math.random()
    }));
    
    const newWindow = {
      id: Date.now() + Math.random(),  // Ensure unique ID
      type,
      windowData: {
        ...windowData,
        messages: messagesWithTimestamps,
        position,
        scrollToBottom,
        apiKeys: windows[0]?.windowData?.apiKeys || {}
      }
    };
    setWindows(prev => [...prev, newWindow]);
    setActiveWindow(newWindow.id);
    setNextId(prev => prev + Math.random() + 1);  // Ensure next ID is unique
  };

  const handleWindowDataChange = (windowId, newWindowData) => {
    setWindows(prev => prev.map(window => 
      window.id === windowId 
        ? { ...window, windowData: newWindowData }
        : window
    ));
  };

  const handleWindowFocus = (windowId) => {
    setActiveWindow(windowId);
  };

  const handleWindowClose = (windowId) => {
    setWindows(prev => prev.filter(window => window.id !== windowId));
  };

  const handleMouseDown = (e, windowId) => {
    setActiveWindow(windowId);
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
      
      handleWindowDataChange(dragging, {
        ...windows.find(w => w.id === dragging).windowData,
        position: { x: newX, y: newY }
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging]);

  const handleResize = (e, windowId) => {
    const element = e.target.closest('.window-container');
    if (element) {
      const rect = element.getBoundingClientRect();
      const x = Math.max(0, rect.left);
      const y = Math.max(0, rect.top);
      
      handleWindowDataChange(windowId, {
        ...windows.find(w => w.id === windowId).windowData,
        position: { x, y },
        size: {
          width: element.style.width,
          height: element.style.height
        }
      });
    }
  };

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

  return (
    <div className="flex flex-wrap gap-4 p-4">
      {windows.map(window => (
        <div 
          key={window.id} 
          className={`absolute overflow-hidden flex flex-col resize window-container rounded-tl-xl rounded-tr-xl rounded-bl-xl shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-200
            ${activeWindow === window.id ? 'bg-white' : 'bg-gray-50'}`}
          style={{
            transform: `translate(${Math.max(0, window.windowData.position?.x || 0)}px, ${Math.max(0, window.windowData.position?.y || 0)}px)`,
            width: window.windowData.size?.width || defaultDimensions.width,
            height: window.windowData.size?.height || defaultDimensions.height,
            minWidth: '300px',
            minHeight: '400px',
            maxWidth: '90vw',
            zIndex: activeWindow === window.id ? 10 : 1
          }}
          onMouseDown={(e) => handleMouseDown(e, window.id)}
          onResize={(e) => handleResize(e, window.id)}
        >
          <div className={`window-handle px-4 py-2 text-sm font-bold border-b flex justify-between items-center cursor-move transition-colors duration-200
            ${activeWindow === window.id ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}
          >
            <span>{window.type === 'chat' ? 'Chat' : 'System Settings'} Window {window.id}</span>
            <button 
              onClick={() => setWindows(prev => prev.filter(w => w.id !== window.id))}
              className={`w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-full transition-colors duration-150
                ${activeWindow === window.id ? 'text-white hover:text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
            >
              <span className="text-xl leading-none select-none">×</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {window.type === 'chat' ? (
              <Chat
                windowData={window.windowData}
                onWindowDataChange={(newData) => handleWindowDataChange(window.id, newData)}
                onNewWindow={handleNewWindow}
                onBlockClick={handleBlockClick}
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
      <FloatingActionButton onNewChat={() => handleNewWindow('chat', { 
        operator: 'claude-sonnet', 
        messages: [
          {
            role: 'assistant',
            content: 'What would you like to discuss today?'
          }
        ] 
      })} />
    </div>
  );
}
