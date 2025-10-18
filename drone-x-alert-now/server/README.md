# DroneX Backend Server

This is the backend server for DroneX AI assistant functionality.

## Setup

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your Gemini API key:**
   - Get a free API key from: https://aistudio.google.com/app/apikey
   - Open `.env` and replace `your_gemini_api_key_here` with your actual API key

3. **Start the server:**
   ```bash
   npm start
   ```

The server will run on `http://localhost:4000`

## Environment Variables

- `GEMINI_API_KEY` - **Required** - Your Google Gemini AI API key
- `PORT` - Optional - Server port (defaults to 4000)

## API Endpoints

- `POST /api/gemini-assistant` - AI assistant chat endpoint

## Troubleshooting

### 500 Internal Server Error
- Check that `GEMINI_API_KEY` is set in your `.env` file
- Verify your API key is valid at https://aistudio.google.com/

### Connection Refused
- Make sure the server is running with `npm start`
- Check that the port 4000 is not blocked by firewall