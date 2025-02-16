'use client'

import { useState, useRef, useEffect } from 'react'

export default function Toolbar({ items = [] }) {
  const [openMenu, setOpenMenu] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="win98-toolbar" ref={menuRef}>
      {items.map((item, index) => (
        <div key={index} className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === index ? null : index)}
            className={`win98-toolbar-button ${openMenu === index ? 'active' : ''}`}
          >
            {item.label}
          </button>
          
          {openMenu === index && (
            <div className="win98-menu">
              {item.menu.map((menuItem, menuIndex) => (
                <>
                  {menuIndex > 0 && menuItem.separator && (
                    <div key={`sep-${menuIndex}`} className="win98-menu-separator" />
                  )}
                  <button
                    key={menuIndex}
                    onClick={() => {
                      menuItem.onClick();
                      setOpenMenu(null);
                    }}
                    className={`win98-menu-item ${menuItem.checked ? 'checked' : ''} ${
                      menuItem.submenu ? 'has-submenu' : ''
                    }`}
                  >
                    <span>{menuItem.label}</span>
                    {menuItem.shortcut && (
                      <span className="text-gray-600 ml-8">{menuItem.shortcut}</span>
                    )}
                  </button>
                </>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 