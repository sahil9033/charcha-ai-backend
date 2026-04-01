import axios from 'axios';
axios.post('https://openrouter.ai/api/v1/chat/completions', {
  model: 'openrouter/free',
  messages: [{ role: 'user', content: 'i am sad' }]
}, {
  headers: {
    'Authorization': 'Bearer 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',
    'Content-Type': 'application/json'
  }
}).then(res => {
  console.log("RESPONSE CHOICES:", JSON.stringify(res.data.choices[0], null, 2));
}).catch(err => console.error(err.response?.status, err.response?.data));
