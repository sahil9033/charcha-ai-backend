import axios from 'axios';

const API_KEY = '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';

async function test() {
    console.log('Testing OpenRouter without referer...');
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [{ role: 'user', content: 'Say hello in 5 words' }]
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        console.log('✅ Success:', response.data.choices[0].message.content);
    } catch (error) {
        console.error('❌ Error Status:', error.response?.status);
        console.error('❌ Error Data:', JSON.stringify(error.response?.data, null, 2));
    }
}

test();
