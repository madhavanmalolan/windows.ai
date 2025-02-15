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
  const windowRef = useRef(null)


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

    </div>
  )
} 