'use client'

import { useState, useRef, useEffect } from 'react'
import Chat from './Chat'
import SystemSettings from './SystemSettings'

export default function Window({ 
  type = 'default',
  windowData,
  onWindowDataChange,
  onNewWindow,
  title = "Window", 
  children, 
  initialPosition = { x: 20, y: 20 },
  initialSize = { 
    width: 380,
    height: window ? window.innerHeight * 0.8 : 800
  },
  onPositionChange,
  isActive = false,
  onFocus,
  onClose
}) {
  const [position, setPosition] = useState(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState(null)
  const windowRef = useRef(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const initialSizeRef = useRef({ width: 0, height: 0 })

  const handleMouseDown = (e, action, direction = null) => {
    e.preventDefault(); // Prevent text selection during drag
    if (action === 'drag') {
      setIsDragging(true)
      dragStart.current = { 
        x: e.clientX - position.x, 
        y: e.clientY - position.y 
      }
    } else if (action === 'resize') {
      setIsResizing(true)
      setResizeDirection(direction)
      dragStart.current = { x: e.clientX, y: e.clientY }
      initialSizeRef.current = { width: size.width, height: size.height }
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging && !isResizing) return;

      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
        }
        setPosition(newPosition)
      } else if (isResizing) {
        const dx = e.clientX - dragStart.current.x
        const dy = e.clientY - dragStart.current.y
        
        const newSize = { ...size }
        const newPosition = { ...position }
        
        if (resizeDirection.includes('e')) {
          newSize.width = initialSizeRef.current.width + dx
        }
        if (resizeDirection.includes('w')) {
          const newWidth = initialSizeRef.current.width - dx
          if (newWidth >= 300) {  // Only update if we're above minimum size
            newSize.width = newWidth
            newPosition.x = e.clientX
          }
        }
        if (resizeDirection.includes('s')) {
          newSize.height = initialSizeRef.current.height + dy
        }
        if (resizeDirection.includes('n')) {
          const newHeight = initialSizeRef.current.height - dy
          if (newHeight >= 400) {  // Only update if we're above minimum size
            newSize.height = newHeight
            newPosition.y = e.clientY
          }
        }
        
        // Enforce minimum size
        newSize.width = Math.max(300, newSize.width)
        newSize.height = Math.max(400, newSize.height)
        
        setSize(newSize)
        setPosition(newPosition)
      }
    }

    const handleMouseUp = () => {
      if ((isDragging || isResizing) && onPositionChange) {
        onPositionChange(position, size)
      }
      setIsDragging(false)
      setIsResizing(false)
    }

    // Only add listeners if we're dragging or resizing
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, position, size, resizeDirection, onPositionChange])

  return (
    <div 
      ref={windowRef}
      className="absolute bg-white rounded-lg shadow-xl overflow-hidden flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isActive ? 50 : 10
      }}
      onMouseDown={() => onFocus?.()}
    >
      {/* Title Bar */}
      <div 
        className={`h-10 ${isActive ? 'bg-gray-100' : 'bg-gray-50'} flex items-center px-4 cursor-move select-none`}
        onMouseDown={(e) => {
          handleMouseDown(e, 'drag');
          onFocus?.();
        }}
      >
        <div className="font-medium text-black flex-1">{title}</div>
        <button
          className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-500 hover:text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {type === 'chat' ? (
          <Chat 
            windowData={windowData}
            onWindowDataChange={onWindowDataChange}
            onNewWindow={onNewWindow}
          />
        ) : type === 'system-settings' ? (
          <SystemSettings 
            windowData={windowData}
            onWindowDataChange={onWindowDataChange}
            onNewWindow={onNewWindow}
          />
        ) : (
          children
        )}
      </div>

      {/* Resize Handles */}
      <div className="absolute top-0 left-0 right-0 h-1 cursor-n-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'n')} />
      <div className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 's')} />
      <div className="absolute left-0 top-0 bottom-0 w-1 cursor-w-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'w')} />
      <div className="absolute right-0 top-0 bottom-0 w-1 cursor-e-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'e')} />
      <div className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'nw')} />
      <div className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'ne')} />
      <div className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'sw')} />
      <div className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize" onMouseDown={(e) => handleMouseDown(e, 'resize', 'se')} />
    </div>
  )
} 