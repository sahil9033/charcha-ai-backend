import axios from 'axios';

const API_KEY = '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';

async function test() {
    console.log('Testing NEW OpenRouter key:', API_KEY.substring(0, 20) + '...');
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'nousresearch/hermes-3-llama-3.1-405b:free',
            messages: [{ role: 'user', content: 'Say hello in 5 words' }]
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://chrcha-ai.web.app',
                'X-Title': 'Charcha AI'
            }
        });
        console.log('✅ Success:', response.data.choices[0].message.content);
    } catch (error) {
        if (error.response) {
            console.error('❌ Error Status:', error.response?.status);
            console.error('❌ Error Data:', JSON.stringify(error.response?.data, null, 2));
        } else {
            console.error('❌ Error Message:', error.message);
        }
    }
}

test();
