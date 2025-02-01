'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import Toolbar from './Toolbar'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

export default function Chat({ windowData, onWindowDataChange, onNewWindow }) {
    const [inputValue, setInputValue] = useState('')
    const [chatMessages, setChatMessages] = useState(windowData?.messages || [])
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
    const [systemSettings, setSystemSettings] = useState(null)
    const [isHandlingBlockClick, setIsHandlingBlockClick] = useState(false);
    const lastMessageRef = useRef(null)
    const textareaRef = useRef(null)
    const messagesContainerRef = useRef(null)

    // Load system settings on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            setSystemSettings(JSON.parse(savedSettings));
        }
    }, []);

    // Update windowData when messages change
    useEffect(() => {
        onWindowDataChange({
            ...windowData,
            messages: chatMessages
        });
    }, [chatMessages]);

    // Load messages from windowData when it changes
    useEffect(() => {
        if (windowData?.messages) {
            setChatMessages(windowData.messages);
        }
    }, [windowData?.messages]);

    const allOperators = {
        'claude-sonnet': { name: 'Claude Sonnet', provider: 'anthropic' },
        'gpt-4': { name: 'OpenAI 4.0', provider: 'openai' },
        'deepseek-r1': { name: 'DeepSeek r1', provider: 'deepseek' },
        'deepseek-v3': { name: 'DeepSeek v3', provider: 'deepseek' },
        'llama-3.3': { name: 'Llama3.3', provider: 'groq' }
    }

    // Filter operators based on available API keys
    const availableOperators = Object.entries(allOperators).reduce((acc, [id, info]) => {
        if (systemSettings?.apiKeys?.[info.provider]) {
            acc[id] = info.name;
        }
        return acc;
    }, {});

    const handleOperatorChange = (operatorId) => {
        onWindowDataChange({
            ...windowData,
            operator: operatorId
        })
    }

    // If current operator is not available, switch to first available operator
    useEffect(() => {
        if (systemSettings && Object.keys(availableOperators).length > 0) {
            if (!availableOperators[windowData?.operator]) {
                handleOperatorChange(Object.keys(availableOperators)[0]);
            }
        }
    }, [systemSettings, windowData?.operator]);

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = `${textarea.scrollHeight}px`
        }
    }, [inputValue])

    // Scroll to new message when it's added
    useEffect(() => {
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [chatMessages]);

    // Scroll to absolute bottom on mount if flag is set
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, []); // Only run on mount

    const getResponse = async (message) => {
        const provider = allOperators[windowData.operator].provider;
        const apiKey = systemSettings?.apiKeys?.[provider];

        if (!apiKey) {
            throw new Error('API key not found for selected operator');
        }

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: windowData.operator,
                message,
                history: chatMessages,
                apiKey
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get response');
        }

        const data = await response.json();
        return data.response;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isWaitingForResponse) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleSend = async () => {
        if (inputValue.trim() && !isWaitingForResponse) {
            const userMessage = {
                role: 'user',
                content: inputValue.trim()
            }

            // Clear input and update UI immediately
            setInputValue('')
            setChatMessages(prev => [...prev, userMessage])
            setIsWaitingForResponse(true)

            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }

            try {
                // Get response from the API
                const response = await getResponse(userMessage.content)

                // Add response to chat
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response
                }])
            } catch (error) {
                console.error('Failed to get response:', error)
                // Add error message to the chat
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error processing your request.'
                }])
            } finally {
                setIsWaitingForResponse(false)
            }
        }
    }

    const toolbarItems = [
        {
            label: 'Operator',
            menu: [
                ...Object.entries(availableOperators).map(([id, name]) => ({
                    label: name,
                    onClick: () => handleOperatorChange(id),
                    checked: windowData.operator === id
                })),
                { type: 'separator' },
                {
                    label: 'Add Operator...',
                    onClick: () => onNewWindow('system-settings')
                }
            ]
        },
        {
            label: 'Clear',
            menu: [
                { label: 'Clear All Messages', onClick: () => console.log('Clear all messages') },
                { label: 'Clear User Messages', onClick: () => console.log('Clear user messages') },
                { label: 'Clear Assistant Messages', onClick: () => console.log('Clear assistant messages') }
            ]
        },
        {
            label: 'Export',
            menu: [
                { label: 'Export as Text', onClick: () => console.log('Export as text') },
                { label: 'Export as JSON', onClick: () => console.log('Export as JSON') },
                { label: 'Export as Markdown', onClick: () => console.log('Export as markdown') }
            ]
        },
        {
            label: 'Settings',
            menu: [
                { label: 'System Settings', onClick: () => onNewWindow('system-settings') }
            ]
        }
    ];

    const TypingIndicator = () => (
        <div className="flex space-x-2 p-3 bg-gray-100 rounded-2xl w-16">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        </div>
    );

    const handleBlockClick = async (messageIndex, blockContent) => {
        if (isHandlingBlockClick) return;
        await setIsHandlingBlockClick(true);
        console.log('handleBlockClick', messageIndex, blockContent);
        const messages = windowData.messages;
        // Get all messages up to the clicked message
        const previousMessages = messages.slice(0, messageIndex);
        
        // Get the clicked message
        const clickedMessage = messages[messageIndex];
    
        let lastText = "";
        // Recursively process block content to find the last non-empty text
        const findLastText = (content) => {
            if (!Array.isArray(content)) {
                return typeof content === 'string' && content.trim() ? content.trim() : null;
            }

            // Iterate array in reverse
            for (let i = content.length - 1; i >= 0; i--) {
                const item = content[i];
                
                if (typeof item === 'string') {
                    if (item.trim()) {
                        return item.trim();
                    }
                    continue;
                }

                // Handle React element objects
                if (item && typeof item === 'object' && item.props) {
                    const result = findLastText(item.props.children);
                    if (result) {
                        return result;
                    }
                }
            }
            return null;
        };

        lastText = findLastText(blockContent) || "";
        console.log('lastText', lastText);
        // Find the position of the clicked block in the message
        const contentBeforeBlock = clickedMessage.content.split(lastText)[0];
        
        // Create truncated message with content up to and including the clicked block
        const truncatedMessage = {
            ...clickedMessage,
            content: contentBeforeBlock + lastText
        };
        
        // Create new history with truncated message
        const newHistory = [...previousMessages, truncatedMessage];
        
        // Create new window with the modified history
        onNewWindow('chat', {
            operator: windowData.operator,
            messages: newHistory
        });
        await setIsHandlingBlockClick(false);
    };

    return (
        <div className="flex flex-col h-full">
            <Toolbar items={toolbarItems} />

            {/* Messages Area */}
            <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-6"
            >
                {windowData.messages.map((message, messageIndex) => {
                    // Create a unique key using timestamp if it exists, or generate one
                    const timestamp = message.timestamp || Date.now() + messageIndex;
                    const messageKey = `${timestamp}-${messageIndex}-${message.role}`;
                    
                    return (
                        <div
                            key={messageKey}
                            ref={messageIndex === windowData.messages.length - 1 ? lastMessageRef : null}
                            className={`${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
                        >
                            {message.role === 'user' ? (
                                <div className="bg-black text-white rounded-2xl px-4 py-2 max-w-[80%]">
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                </div>
                            ) : (
                                <div className="prose prose-slate max-w-[80%] [&_*]:text-black [&_p]:text-black [&_a]:text-blue-600 [&_code]:text-white">
                                    <ReactMarkdown
                                        components={{
                                            code({ node, inline, className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                const content = String(children).replace(/\n$/, '')
                                                return !inline && match ? (
                                                    <div
                                                        className="group cursor-pointer hover:bg-gray-100 rounded-lg p-1"
                                                        onClick={() => handleBlockClick(messageIndex, children)}
                                                    >
                                                        <SyntaxHighlighter
                                                            {...props}
                                                            style={oneDark}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            className="rounded-lg !bg-[#282c34]"
                                                            customStyle={{
                                                                color: 'white'
                                                            }}
                                                        >
                                                            {content}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                ) : (
                                                    <code
                                                        {...props}
                                                        className={`${className} bg-[#282c34] text-white px-1 py-0.5 rounded cursor-pointer hover:bg-gray-700`}
                                                        onClick={() => handleBlockClick(messageIndex, children)}
                                                    >
                                                        {content}
                                                    </code>
                                                )
                                            },
                                            p: ({ node, children, ...props }) => {
                                                const content = String(children)
                                                return (
                                                    <div
                                                        className="group cursor-pointer hover:bg-gray-100 rounded-lg p-1"
                                                        onClick={() => handleBlockClick(messageIndex, children)}
                                                    >
                                                        <p {...props} className="my-2">{children}</p>
                                                    </div>
                                                )
                                            },
                                            h1: ({ node, children, ...props }) => {
                                                const content = String(children)
                                                return (
                                                    <div
                                                        className="group cursor-pointer hover:bg-gray-100 rounded-lg p-1"
                                                        onClick={() => handleBlockClick(messageIndex, children)}
                                                    >
                                                        <h1 {...props} className="text-2xl font-bold mt-6 mb-4">{children}</h1>
                                                    </div>
                                                )
                                            },
                                            h2: ({ node, children, ...props }) => {
                                                const content = String(children)
                                                return (
                                                    <div
                                                        className="group cursor-pointer hover:bg-gray-100 rounded-lg p-1"
                                                        onClick={() => handleBlockClick(messageIndex, children)}
                                                    >
                                                        <h2 {...props} className="text-xl font-bold mt-5 mb-3">{children}</h2>
                                                    </div>
                                                )
                                            },
                                            h3: ({ node, children, ...props }) => {
                                                const content = String(children)
                                                return (
                                                    <div
                                                        className="group cursor-pointer hover:bg-gray-100 rounded-lg p-1"
                                                        onClick={() => handleBlockClick(messageIndex, children)}
                                                    >
                                                        <h3 {...props} className="text-lg font-bold mt-4 mb-2">{children}</h3>
                                                    </div>
                                                )
                                            },
                                            ul: ({ node, children, depth = 0, ...props }) => {
                                                const content = String(children)
                                                return (
                                                        <ul 
                                                            {...props} 
                                                            className={`list-disc my-4 ${depth === 0 ? 'pl-4' : 'pl-6'}`}
                                                            style={{ marginLeft: `${depth * 1.5}rem` }}
                                                        >
                                                            {children}
                                                        </ul>
                                                )
                                            },
                                            ol: ({ node, children, depth = 0, ...props }) => {
                                                const content = String(children)
                                                return (
                                                        <ol 
                                                            {...props} 
                                                            className={`list-decimal my-4 ${depth === 0 ? 'pl-4' : 'pl-6'}`}
                                                            style={{ marginLeft: `${depth * 1.5}rem` }}
                                                        >
                                                            {children}
                                                        </ol>
                                                )
                                            },
                                            li: ({ node, children, ...props }) => {
                                                const content = String(children)
                                                // Check if children contains a nested list
                                                const hasNestedList = Array.isArray(children) && 
                                                    children.some(child => 
                                                        child?.props?.node?.tagName === 'ul' || 
                                                        child?.props?.node?.tagName === 'ol'
                                                    );
                                                if(hasNestedList) {
                                                    return (
                                                        <div
                                                            className="group"
                                                        >
                                                            <li {...props} className="my-2">{children}</li>
                                                        </div>
                                                    )
                                                }
                                                return (
                                                    <div
                                                        className="group cursor-pointer hover:bg-gray-100 rounded-lg p-1"
                                                        onClick={() => handleBlockClick(messageIndex, children)}
                                                    >
                                                        <li {...props} className="my-2">{children}</li>
                                                    </div>
                                                )
                                            },
                                            blockquote: ({ node, children, ...props }) => {
                                                const content = String(children)
                                                return (
                                                    <div
                                                        className="group cursor-pointer hover:bg-gray-100 rounded-lg p-1"
                                                        onClick={() => handleBlockClick(messageIndex, children)}
                                                    >
                                                        <blockquote {...props} className="border-l-4 border-gray-300 pl-4 my-4 italic">{children}</blockquote>
                                                    </div>
                                                )
                                            },
                                            table: ({ node, children, ...props }) => {
                                                const content = String(children)
                                                return (
                                                    <div
                                                        className="group cursor-pointer hover:bg-gray-100 rounded-lg p-1"
                                                        onClick={() => handleBlockClick(messageIndex, message.content)}
                                                    >
                                                        <table {...props} className="min-w-full divide-y divide-gray-300 my-4">{children}</table>
                                                    </div>
                                                )
                                            },
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    );
                })}
                {isWaitingForResponse && (
                    <div className="flex justify-start">
                        <TypingIndicator />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t p-4 flex items-end gap-2">
                <div className="flex-1 min-h-[44px] flex items-center bg-gray-100 rounded-lg">
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isWaitingForResponse ? "Waiting for response..." : "Type a message..."}
                        className="flex-1 bg-transparent border-none resize-none max-h-[200px] p-3 focus:outline-none text-black placeholder:text-gray-500"
                        rows={1}
                        disabled={isWaitingForResponse}
                    />
                </div>
                <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isWaitingForResponse}
                    className={`p-3 rounded-lg ${inputValue.trim() && !isWaitingForResponse
                            ? 'bg-black text-white hover:bg-gray-800'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                    >
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </div>
        </div>
    )
} 