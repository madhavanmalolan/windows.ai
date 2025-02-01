'use client'

import { useState } from 'react'

export default function FloatingActionButton({ onNewChat }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 flex flex-col-reverse gap-4 items-end z-50">
      {/* Nested FABs */}
      {isOpen && (
        <>
          <button 
            className="bg-white hover:bg-gray-50 text-gray-800 rounded-full p-4 shadow-lg transition-all duration-200 flex items-center gap-2 z-40 absolute bottom-20 right-0 min-w-[160px] justify-center"
            onClick={() => {
              onNewChat();
              setIsOpen(false);
            }}
          >
            <span className="text-sm">New Chat</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          
          <button 
            className="bg-white hover:bg-gray-50 text-gray-800 rounded-full p-4 shadow-lg transition-all duration-200 flex items-center gap-2 z-40 absolute bottom-36 right-0 min-w-[160px] justify-center"
            onClick={() => {
              alert("Creating new app...");
              setIsOpen(false);
            }}
          >
            <span className="text-sm">New App</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </>
      )}

      {/* Main FAB */}
      <button 
        className={`bg-white hover:bg-gray-50 text-gray-800 rounded-full p-4 shadow-lg transition-all duration-200 z-50 ${isOpen ? 'rotate-45' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
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
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    </div>
  );
} 