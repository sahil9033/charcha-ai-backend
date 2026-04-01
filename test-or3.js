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
