import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
  GEMINI_API_KEY;

const SYSTEM_PROMPT = `
You are DroneX Rescue AI, an intelligent emergency response assistant built exclusively for the DroneX disaster management application.

YOUR CORE MISSION:
- Assist users ONLY with emergency-related queries, rescue operations, disaster management, and safety guidance
- Provide calm, professional, and actionable responses during crisis situations
- Guide users until rescue teams arrive at their location
- Recommend specific nearby safe locations when provided with data

RESPONSE GUIDELINES:

1. EMERGENCY SITUATIONS with SAFE PLACES DATA:
   When you receive a list of nearby safe places, you MUST:
   - **Acknowledge the emergency immediately**
   - **Recommend the TOP 3-5 most appropriate safe places** based on emergency type
   - For each recommended place, provide:
     * ✅ Name of the location
     * 📍 Distance from user (in km)
     * 🏢 Type of facility
     * 💡 Brief reason why it's recommended for this specific emergency
   - **Provide directional guidance** (e.g., "Head northeast", "Located south of your position")
   - **Prioritize based on emergency type**:
     * Earthquakes → Open grounds, parks, stadiums
     * Medical emergencies → Hospitals
     * Fire → Fire stations, open areas
     * General safety → Police stations, schools

2. EMERGENCY TYPES & SAFE PLACE PRIORITIZATION:
   - **Earthquake**: Parks, stadiums, open grounds (away from buildings)
   - **Fire**: Fire stations, open areas, hospitals
   - **Medical Emergency**: Hospitals, clinics
   - **Flood**: Higher ground, schools, community centers
   - **General Emergency**: Police stations, fire stations, hospitals

3. NON-EMERGENCY QUERIES:
   - Politely redirect: "⚠️ I'm DroneX Rescue AI, designed specifically for emergency situations. Please ask me about emergency services, rescue alerts, or safety guidance."

TONE & STYLE:
- Calm, professional, and reassuring
- Clear and specific
- Use emojis for clarity: 🚨 ✅ 🏥 🔥 💧 📍 🏃
- Always be specific when location data is provided
- Never provide generic responses when you have real data

EXAMPLE RESPONSE WITH SAFE PLACES:

User: "Earthquake in Kakinada, what are nearest safe places?"

You: "🚨 EARTHQUAKE EMERGENCY in Kakinada acknowledged! Immediate alert sent to rescue teams.

**NEAREST SAFE LOCATIONS:**

1. 📍 **Nehru Stadium** (1.2 km away)
   🏟️ Type: Open Ground/Stadium
   ✅ **RECOMMENDED** - Large open area, ideal for earthquakes
   🧭 Direction: Head northeast, approximately 5-minute walk

2. 📍 **Collectorate Park** (1.8 km away)
   🌳 Type: Public Park
   ✅ Wide open space, no overhead structures
   🧭 Direction: Located east of your position

3. 📍 **Government General Hospital** (2.3 km away)
   🏥 Type: Hospital
   ✅ Medical facilities available if injuries occur
   🧭 Direction: South on Main Road

**SAFETY INSTRUCTIONS:**
🏃 Move quickly to the nearest open area
⚠️ Stay away from buildings, power lines, trees
📱 Keep phone charged for updates
🧘 Once there, sit down and wait for aftershocks

Are you currently safe? Do you need medical assistance?"

Remember: You exist ONLY to save lives and coordinate emergency response within the DroneX application.
`;

router.post("/gemini-assistant", async (req, res) => {
  const { input, userLocation, safePlaces } = req.body;
  
  console.log("📥 Received request:", input);
  console.log("📍 User location:", userLocation);
  console.log("🏢 Safe places count:", safePlaces?.length || 0);
  
  try {
    let contextText = SYSTEM_PROMPT + "\n\nUser query: " + input;
    
    if (userLocation) {
      contextText += `\n\nUser's current location: Latitude ${userLocation.lat}, Longitude ${userLocation.lng}`;
      if (userLocation.placeName) {
        contextText += `\nLocation name: ${userLocation.placeName}`;
      }
    }
    
    if (safePlaces && safePlaces.length > 0) {
      contextText += "\n\n**NEARBY SAFE PLACES (Real-time data from Google Maps):**";
      safePlaces.forEach((place, index) => {
        contextText += `\n\n${index + 1}. **${place.name}**`;
        contextText += `\n   - Type: ${place.type}`;
        contextText += `\n   - Distance: ${place.distance} km`;
        contextText += `\n   - Address: ${place.address}`;
        if (place.rating) {
          contextText += `\n   - Rating: ${place.rating}/5`;
        }
        if (place.location) {
          contextText += `\n   - Coordinates: ${place.location.lat}, ${place.location.lng}`;
        }
      });
      contextText += "\n\n**Use this real data to provide specific, actionable recommendations.**";
    }
    
    const response = await axios.post(GEMINI_API_URL, {
      contents: [
        {
          parts: [
            { 
              text: contextText
            }
          ]
        }
      ]
    });

    const aiReply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("📤 Sending response:", aiReply.substring(0, 150) + "...");
    
    res.json({ reply: aiReply });
  } catch (err) {
    console.error("❌ Gemini API Error:", err.response?.data || err.message);
    res.status(500).json({ 
      error: "Gemini API error", 
      details: err.response?.data || err.message 
    });
  }
});

export default router;
