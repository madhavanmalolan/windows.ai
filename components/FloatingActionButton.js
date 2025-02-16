'use client'

import { useState } from 'react'

export default function FloatingActionButton({ onNewChat, onNewWorkspace }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2">
      <button 
        onClick={onNewChat}
        className="win98-button"
      >
        New Chat
      </button>
      <button 
        onClick={onNewWorkspace}
        className="win98-button"
      >
        New Workspace
      </button>
    </div>
  );
} 