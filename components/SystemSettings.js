'use client'

import { useState, useEffect } from 'react'

export default function SystemSettings({ windowData, onWindowDataChange }) {
  const [saveMessage, setSaveMessage] = useState('');

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('systemSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.apiKeys) {
        onWindowDataChange({
          ...windowData,
          apiKeys: settings.apiKeys
        });
      }
    }
  }, []);

  const handleApiKeyChange = (provider, value) => {
    onWindowDataChange({
      ...windowData,
      apiKeys: {
        ...windowData?.apiKeys,
        [provider]: value
      }
    });
  };

  const handleSave = () => {
    // Save API keys to localStorage
    localStorage.setItem('systemSettings', JSON.stringify({
      apiKeys: windowData?.apiKeys || {}
    }));
    
    // Save API keys through window data
    onWindowDataChange({
      ...windowData,
      apiKeys: windowData?.apiKeys
    });
    
    // Show success message
    setSaveMessage('Settings saved successfully');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSaveMessage('');
    }, 3000);
  };

  return (
    <div className="flex flex-col h-full p-6">
      <h2 className="text-lg font-semibold mb-6 text-gray-700">System Settings</h2>
      
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">API Keys</h3>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm text-gray-500">OpenAI API Key</span>
              <input 
                type="password"
                className="mt-1 block w-full win98-input"
                placeholder="sk-..."
                value={windowData?.apiKeys?.openai || ''}
                onChange={(e) => handleApiKeyChange('openai', e.target.value)}
              />
              <span className="text-xs text-gray-400 mt-1">Used for GPT-4 and other OpenAI models</span>
            </label>

            <label className="block">
              <span className="text-sm text-gray-500">Anthropic API Key</span>
              <input 
                type="password"
                className="mt-1 block w-full win98-input"
                placeholder="sk-ant-..."
                value={windowData?.apiKeys?.anthropic || ''}
                onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
              />
              <span className="text-xs text-gray-400 mt-1">Used for Claude models</span>
            </label>

            <label className="block">
              <span className="text-sm text-gray-500">Gemini API Key</span>
              <input 
                type="password"
                className="mt-1 block w-full win98-input"
                placeholder="AIza..."
                value={windowData?.apiKeys?.gemini || ''}
                onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
              />
              <span className="text-xs text-gray-400 mt-1">Used for Google's Gemini models</span>
            </label>

            <label className="block">
              <span className="text-sm text-gray-500">DeepSeek API Key</span>
              <input 
                type="password"
                className="mt-1 block w-full win98-input"
                placeholder="sk-ds-..."
                value={windowData?.apiKeys?.deepseek || ''}
                onChange={(e) => handleApiKeyChange('deepseek', e.target.value)}
              />
              <span className="text-xs text-gray-400 mt-1">Used for DeepSeek models</span>
            </label>

            <label className="block">
              <span className="text-sm text-gray-500">Groq API Key</span>
              <input 
                type="password"
                className="mt-1 block w-full win98-input"
                placeholder="gsk_..."
                value={windowData?.apiKeys?.groq || ''}
                onChange={(e) => handleApiKeyChange('groq', e.target.value)}
              />
              <span className="text-xs text-gray-400 mt-1">Used for Llama models</span>
            </label>
          </div>
        </div>

        <div className="pt-4 pb-6">
          {saveMessage && (
            <p className="text-sm text-green-600 mb-2 text-center">{saveMessage}</p>
          )}
          <button
            onClick={handleSave}
            className="w-full win98-button-active"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
} 