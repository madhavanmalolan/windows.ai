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
    <div className="h-8 bg-gray-50 border-b flex items-center px-4" ref={menuRef}>
      {items.map((item, index) => (
        <div key={index} className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === index ? null : index)}
            className={`text-sm ${
              openMenu === index ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900'
            } px-2 py-1 rounded mr-2`}
          >
            {item.label}
          </button>
          
          {openMenu === index && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {item.menu.map((menuItem, menuIndex) => (
                <button
                  key={menuIndex}
                  onClick={() => {
                    menuItem.onClick();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>{menuItem.label}</span>
                  {menuItem.checked && (
                    <svg className="w-4 h-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 