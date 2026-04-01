import axios from 'axios';

const API_KEY = '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';

async function test(modelName) {
    console.log('Testing model:', modelName);
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: modelName,
            messages: [{ role: 'user', content: 'Say hello in 5 words' }]
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://chrcha-ai.web.app',
                'X-Title': 'Charcha AI'
            }
        });
        console.log('✅ Success for ' + modelName + ':', response.data.choices[0].message.content);
    } catch (error) {
        console.error('❌ Failed for ' + modelName + ':', error.response?.data?.error?.message || error.message);
    }
}

async function runTests() {
    await test('meta-llama/llama-3.1-8b-instruct:free');
    await test('qwen/qwen2.5-7b-instruct:free');
    await test('microsoft/phi-3-mini-128k-instruct:free');
}

runTests();
