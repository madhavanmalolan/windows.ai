import { useState, useEffect, useRef } from 'react'

export default function StartBar({ 
  onNewChat, 
  onNewWorkspace, 
  workspaces, 
  currentWorkspace,
  onWorkspaceChange,
  onWorkspaceDelete,
  windows = [],
  activeWindowId = null,
  onWindowClick
}) {
  const [time, setTime] = useState('')
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false)
  const submenuRef = useRef(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}`)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Calculate submenu position
  const getSubmenuStyle = (parentRect) => {
    if (!parentRect || !submenuRef.current) return {}

    const viewportHeight = window.innerHeight
    const submenuHeight = submenuRef.current.offsetHeight
    const taskbarHeight = 28 // Height of the taskbar

    // Calculate bottom position that ensures menu is fully visible
    let bottomPosition = Math.min(
      viewportHeight - taskbarHeight, // Don't go below taskbar
      parentRect.bottom // Don't go below parent menu item
    )

    // Ensure menu doesn't extend above viewport
    const topPosition = bottomPosition - submenuHeight
    if (topPosition < 0) {
      bottomPosition -= topPosition // Push menu down if it would extend above viewport
    }

    return {
      bottom: `${viewportHeight - bottomPosition}px`,
      left: `${parentRect.right}px`
    }
  }

  // Get window title
  const getWindowTitle = (window) => {
    switch (window.type) {
      case 'chat':
        return 'Chat'
      case 'workspace':
        return 'New Workspace'
      case 'settings':
        return 'System Settings'
      default:
        return 'Window'
    }
  }

  // Get window icon
  const getWindowIcon = (window) => {
    switch (window.type) {
      case 'chat':
        return '/chat-icon.png'
      case 'workspace':
        return '/workspace-icon.png'
      case 'settings':
        return '/settings-icon.png'
      default:
        return '/window-icon.png'
    }
  }

  return (
    <div className="win98-taskbar fixed bottom-0 left-0 right-0 h-[28px] bg-[#c0c0c0] flex items-center justify-between px-1 z-50">
      <div className="flex items-center flex-1 gap-1">
        <div className="relative">
          <button 
            className={`win98-start-button flex items-center gap-2 px-2 py-1 ${isStartMenuOpen ? 'active' : ''}`}
            onClick={() => setIsStartMenuOpen(!isStartMenuOpen)}
          >
            <img src="/win98-logo.png" alt="Windows 98" className="w-4 h-4" />
            <span className="font-bold">Start</span>
          </button>

          {isStartMenuOpen && (
            <>
              <div 
                className="fixed inset-0" 
                onClick={() => setIsStartMenuOpen(false)}
              />
              <div className="win98-start-menu absolute bottom-full left-0 mb-1 w-[200px] bg-[#c0c0c0] shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff,inset_-2px_-2px_grey,inset_2px_2px_#dfdfdf]">
                <div className="bg-[#000080] absolute left-0 top-0 bottom-0 w-[21px]" />
                <div className="pl-6 py-2">
                  <div className="relative group">
                    <button 
                      className="w-full text-left px-4 py-1 hover:bg-[#000080] hover:text-white flex items-center gap-2 justify-between"
                      onMouseEnter={(e) => {
                        if (submenuRef.current) {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const style = getSubmenuStyle(rect)
                          Object.assign(submenuRef.current.style, {
                            position: 'fixed',
                            ...style,
                            visibility: 'visible'
                          })
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.relatedTarget?.closest('.win98-submenu')) {
                          submenuRef.current.style.visibility = 'hidden'
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <img src="/folder-icon.png" alt="" className="w-4 h-4" />
                        Workspaces
                      </div>
                      <span>►</span>
                    </button>
                    <div 
                      ref={submenuRef}
                      className="win98-submenu fixed hidden group-hover:block w-[200px] bg-[#c0c0c0] shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff,inset_-2px_-2px_grey,inset_2px_2px_#dfdfdf]"
                      onMouseLeave={(e) => {
                        if (!e.relatedTarget?.closest('.group')) {
                          e.currentTarget.style.visibility = 'hidden'
                        }
                      }}
                    >
                      <button 
                        className="w-full text-left px-4 py-1 hover:bg-[#000080] hover:text-white flex items-center gap-2"
                        onClick={() => {
                          onNewWorkspace()
                          setIsStartMenuOpen(false)
                        }}
                      >
                        <img src="/new-folder-icon.png" alt="" className="w-4 h-4" />
                        New Workspace
                      </button>
                      <div className="border-t border-gray-500 my-1" />
                      {workspaces.map(workspace => (
                        <button 
                          key={workspace.id}
                          className="w-full text-left px-4 py-1 hover:bg-[#000080] hover:text-white flex items-center gap-2"
                          onClick={() => {
                            onWorkspaceChange(workspace)
                            setIsStartMenuOpen(false)
                          }}
                        >
                          <img src="/workspace-icon.png" alt="" className="w-4 h-4" />
                          {workspace.name}
                          {currentWorkspace?.id === workspace.id && (
                            <span className="ml-2">✓</span>
                          )}
                        </button>
                      ))}
                      <div className="border-t border-gray-500 my-1" />
                      <button 
                        className="w-full text-left px-4 py-1 hover:bg-[#000080] hover:text-white flex items-center gap-2"
                        onClick={() => {
                          if (currentWorkspace?.name !== 'Home') {
                            onWorkspaceDelete()
                          }
                          setIsStartMenuOpen(false)
                        }}
                        disabled={currentWorkspace?.name === 'Home'}
                      >
                        <img src="/delete-icon.png" alt="" className="w-4 h-4" />
                        Delete Current Workspace
                      </button>
                    </div>
                  </div>

                  <button 
                    className="w-full text-left px-4 py-1 hover:bg-[#000080] hover:text-white flex items-center gap-2"
                    onClick={() => {
                      onNewChat()
                      setIsStartMenuOpen(false)
                    }}
                  >
                    <img src="/chat-icon.png" alt="" className="w-4 h-4" />
                    New Chat
                  </button>
                  <button 
                    className="w-full text-left px-4 py-1 hover:bg-[#000080] hover:text-white flex items-center gap-2"
                    onClick={() => {
                      setIsStartMenuOpen(false)
                    }}
                  >
                    <img src="/settings-icon.png" alt="" className="w-4 h-4" />
                    Settings
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 flex items-center gap-1 px-1 overflow-x-auto">
          {windows.map(window => (
            <button
              key={window.id}
              className={`win98-taskbar-button flex items-center gap-1 px-2 py-1 min-w-[120px] max-w-[200px] ${
                activeWindowId === window.id ? 'active' : ''
              }`}
              onClick={() => onWindowClick(window.id)}
            >
              <img 
                src={getWindowIcon(window)} 
                alt="" 
                className="w-4 h-4 flex-shrink-0"
              />
              <span className="truncate">{getWindowTitle(window)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center flex-shrink-0">
        <div className="win98-taskbar-workspace px-2 py-1 border-l border-gray-500 shadow-[inset_-1px_-1px_#fff,inset_1px_1px_grey] flex items-center gap-1">
          <img src="/workspace-icon.png" alt="" className="w-4 h-4" />
          <span>{currentWorkspace?.name || 'Home'}</span>
        </div>
        <div className="win98-taskbar-time px-2 py-1 border-l border-gray-500 shadow-[inset_-1px_-1px_#fff,inset_1px_1px_grey]">
          {time}
        </div>
      </div>
    </div>
  )
} 