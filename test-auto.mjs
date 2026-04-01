import axios from 'axios';

const API_KEY = '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';

async function test(modelName) {
    console.log('Testing with model:', modelName);
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: modelName,
            messages: [{ role: 'user', content: 'Say hello in 5 words' }]
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        console.log('✅ Success:', response.data.choices[0].message.content);
    } catch (error) {
        console.error('❌ Failed:', error.response?.data?.error?.message || error.message);
    }
}

test('openrouter/auto');
