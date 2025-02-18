'use client'

import { useState } from 'react'

export default function NewWorkspaceCreation({ windowData, onWindowDataChange, onWorkspaceCreated }) {
  const [name, setName] = useState('')

  const handleCreate = () => {
    if (!name.trim()) return;

    // Get existing workspaces or initialize empty array
    const existingWorkspaces = JSON.parse(localStorage.getItem('workspaces') || '[]')
    
    // Create new workspace
    const newWorkspace = {
      id: Date.now(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    }
    
    // Add to existing workspaces
    const updatedWorkspaces = [...existingWorkspaces, newWorkspace]
    
    // Save to localStorage
    localStorage.setItem('workspaces', JSON.stringify(updatedWorkspaces))
    
    // Notify parent of new workspace - make sure parent component expects an object
    if (onWorkspaceCreated) {
      onWorkspaceCreated(newWorkspace)
    }
    
    // Clear input
    setName('')
  }

  return (
    <div className="flex flex-col p-6 gap-4">
      <h2 className="text-lg font-semibold text-black">Create New Workspace</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="workspace-name" className="text-sm text-gray-600">
          Workspace Name
        </label>
        <input
          id="workspace-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter workspace name"
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black placeholder:text-gray-400"
        />
      </div>
      <button
        onClick={handleCreate}
        disabled={!name.trim()}
        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Create Workspace
      </button>
    </div>
  )
} 