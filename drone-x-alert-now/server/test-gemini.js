import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

async function testGeminiAPI() {
  console.log('🔑 Testing Gemini API Key:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET');
  
  try {
    const response = await axios.post(GEMINI_API_URL, {
      contents: [
        {
          parts: [
            { 
              text: "Hello, this is a test. Please respond with 'API working correctly.'"
            }
          ]
        }
      ]
    });

    console.log('✅ Gemini API Response:', response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text');
    console.log('✅ API Key is working correctly!');
  } catch (error) {
    console.error('❌ Gemini API Error:', error.response?.status, error.response?.statusText);
    console.error('❌ Error details:', error.response?.data);
    console.error('❌ Full error:', error.message);
  }
}

testGeminiAPI();