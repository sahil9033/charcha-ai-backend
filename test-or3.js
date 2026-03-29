import axios from 'axios';
axios.post('https://openrouter.ai/api/v1/chat/completions', {
  model: 'openrouter/free',
  messages: [{ role: 'user', content: 'hello' }]
}, {
  headers: {
    'Authorization': 'Bearer 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',
    'Content-Type': 'application/json'
  }
}).then(res => {
  const msg = res.data.choices[0].message;
  console.log("CONTENT TYPE:", typeof msg.content);
  console.log("IS NULL?", msg.content === null);
  console.log("REASONING:", msg.reasoning ? "YES" : "NO");
  console.log("CONTENT:", msg.content);
}).catch(err => console.error(err.response?.status, err.response?.data));
