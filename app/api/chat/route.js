export async function POST(req) {
  const { model, message, history, apiKey } = await req.json();

  const modelConfigs = {
    'claude-sonnet': {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          ...history.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        //format: "text",
        max_tokens: 4096,
        system: "Always format your responses in markdown. Use code blocks with language identifiers when sharing code. Use proper headings, lists, and other markdown formatting for better readability."
      },
      responseExtractor: (data) => data.content[0].text
    },
    'gpt-4': {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'Always format your responses in markdown. Use code blocks with language identifiers when sharing code. Use proper headings, lists, and other markdown formatting for better readability.'
          },
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        max_tokens: 4096
      },
      responseExtractor: (data) => data.choices[0].message.content
    },
    'deepseek-r1': {
      url: 'https://api.deepseek.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: 'Always format your responses in markdown. Use code blocks with language identifiers when sharing code. Use proper headings, lists, and other markdown formatting for better readability.'
          },
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        max_tokens: 4096
      },
      responseExtractor: (data) => data.choices[0].message.content
    },
    'deepseek-v3': {
      url: 'https://api.deepseek.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        model: 'deepseek-chat-v3',
        messages: [
          { 
            role: 'system', 
            content: 'Always format your responses in markdown. Use code blocks with language identifiers when sharing code. Use proper headings, lists, and other markdown formatting for better readability.'
          },
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        max_tokens: 4096
      },
      responseExtractor: (data) => data.choices[0].message.content
    },
    'llama-3.3': {
      url: 'https://api.groq.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        model: 'llama2-70b-4096',
        messages: [
          { 
            role: 'system', 
            content: 'Always format your responses in markdown. Use code blocks with language identifiers when sharing code. Use proper headings, lists, and other markdown formatting for better readability.'
          },
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        max_tokens: 4096
      },
      responseExtractor: (data) => data.choices[0].message.content
    }
  };

  const config = modelConfigs[model];
  if (!config) {
    return new Response(JSON.stringify({ error: 'Invalid model' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Making request to Claude API with config:', {
      url: config.url,
      headers: { ...config.headers, 'x-api-key': '***' }, // Hide actual API key
      body: config.body
    });

    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(config.body)
    });

    console.log('Claude API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(e => ({ error: 'Failed to parse error response' }));
      console.error('Claude API error response:', errorData);
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Claude API response data structure:', Object.keys(data));
    console.log(JSON.stringify(data));  
    
    const result = config.responseExtractor(data);
    console.log('Extracted result length:', result.length);

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Full error details:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString(),
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 