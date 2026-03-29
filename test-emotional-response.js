import axios from 'axios';

const testCases = [
  {
    emotion: "sadness",
    message: "I feel so alone and empty right now",
    mode: "friend",
    expectedStructure: "Acknowledge + Validate + Comfort"
  },
  {
    emotion: "anger",
    message: "I'm so angry at everyone right now, this is unfair!",
    mode: "therapist",
    expectedStructure: "Mirror + Normalize + Explore"
  },
  {
    emotion: "anxiety",
    message: "I'm panicking and can't breathe, I'm so worried",
    mode: "parent",
    expectedStructure: "Reassurance + Normalize + Guidance"
  },
  {
    emotion: "low_self_worth",
    message: "I'm so stupid and worthless, nobody likes me",
    mode: "friend",
    expectedStructure: "Acknowledge + Validate + Support"
  },
  {
    emotion: "crisis",
    message: "I want to kill myself, I can't take this anymore",
    mode: "friend",
    expectedStructure: "Presence + Grounding + Helplines"
  }
];

async function testEmotionalResponses() {
  console.log("\n🧠 CHARCHA AI - EMOTIONAL RESPONSE SYSTEM TEST\n");
  console.log("=" .repeat(60));
  
  for (const test of testCases) {
    try {
      console.log(`\n📝 Test: ${test.emotion.toUpperCase()} | Mode: ${test.mode.toUpperCase()}`);
      console.log(`Expected: ${test.expectedStructure}`);
      console.log(`User Message: "${test.message}"\n`);
      
      const response = await axios.post('http://localhost:3000/api/chat', {
        userId: 'test-user',
        message: test.message,
        mode: test.mode,
        memory: { name: 'Alex' },
        isEmergency: test.emotion === 'crisis'
      }, { timeout: 5000 });
      
      console.log(`✅ AI Response (${response.data.emotion} detected):\n`);
      console.log(`"${response.data.reply}"\n`);
      
      // Validate response characteristics
      const reply = response.data.reply.toLowerCase();
      const hasAcknowledge = reply.includes('hear') || reply.includes('sound') || reply.includes('tell me');
      const hasValidate = reply.includes('that') || reply.includes('valid') || reply.includes('sense');
      const isShort = response.data.reply.length < 200;
      
      console.log(`📊 Response Characteristics:`);
      console.log(`   • Acknowledges: ${hasAcknowledge ? '✅' : '❌'}`);
      console.log(`   • Validates: ${hasValidate ? '✅' : '❌'}`);
      console.log(`   • Concise (<200 chars): ${isShort ? '✅' : '❌'}`);
      console.log(`   • Crisis Helpline: ${response.data.showHelpline ? '✅ YES' : '❌ NO'}`);
      console.log(`   • Tokens Used: ${response.data.tokensUsed || 'Fallback (0)'}`);
      
      console.log("\n" + "─".repeat(60));
      
    } catch (error) {
      console.error(`❌ Error in test: ${error.message}`);
    }
  }
  
  console.log("\n✨ Test Complete!\n");
}

testEmotionalResponses().catch(console.error);
