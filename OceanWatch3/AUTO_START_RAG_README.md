# Auto-Start RAG Chatbot Feature

## Overview

The RAG chatbot now automatically starts when the OceanWatch map loads, eliminating the need for a separate startup process. The chatbot backend server is managed by the Next.js API routes and integrates seamlessly with the frontend.

## How It Works

### 1. **Automatic Startup**
- When the map page loads, the `useChat` hook automatically calls the `/api/start-rag-chatbot` endpoint
- This endpoint starts the Python RAG server as a background process
- The server runs on `http://localhost:8001` and is managed by the Next.js process

### 2. **Connection Monitoring**
- The frontend continuously monitors the server status every 5 seconds
- Connection status is displayed in real-time: "Starting..." → "Connected" → "Offline"
- Visual indicators show the current state with appropriate colors and icons

### 3. **Error Handling**
- Graceful fallbacks if the server fails to start
- Automatic retry logic for connection issues
- Clear error messages for debugging

## Setup Requirements

### Environment Variables
Create a `.env` file in the **root directory** (same level as `client/` and `server/` folders):

```bash
# OpenAI API Key for RAG Chatbot
OPENAI_API_KEY=your-openai-api-key-here

# MongoDB Connection String
MONGODB_URI=mongodb+srv://johnliu:pword@neptune-main.2w2qohn.mongodb.net/main
```

**Note**: The system automatically loads environment variables from the root `.env` file, so you don't need to create separate files in the client directory.

### Python Dependencies
Ensure all Python dependencies are installed in the `server/` directory:

```bash
cd server
pip install -r requirements.txt
```

## Files Added/Modified

### New Files
- `client/src/services/ragServerService.ts` - Server management service
- `client/src/pages/api/start-rag-chatbot.ts` - API route to start server
- `client/src/pages/api/rag-server-status.ts` - API route to check status

### Modified Files
- `client/src/hooks/useChat.ts` - Added auto-start logic and server monitoring
- `client/src/pages/map.tsx` - Integrated chat hook with debugging logs
- `client/src/components/chat/chat-overlay.tsx` - Enhanced status display
- `client/next.config.js` - Added environment variable configuration

## Usage

### Starting the Application
1. Set up your environment variables in the root `.env` file
2. Install the new dependency:
   ```bash
   cd client
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   cd client
   npm run dev
   ```
4. Navigate to the map page - the RAG chatbot will start automatically

### Testing Environment Setup
You can test if your environment variables are loaded correctly by visiting:
`http://localhost:3000/api/test-env`

### Monitoring
- Check the browser console for startup logs
- Watch the connection status badge in the chat overlay
- Server logs appear in the Next.js console

### Troubleshooting

#### Server Won't Start
- Check that `OPENAI_API_KEY` is set in your environment
- Verify Python dependencies are installed
- Check that port 8001 is available
- Look for error messages in the Next.js console

#### Connection Issues
- The system automatically retries connections
- Check the server status API: `http://localhost:3000/api/rag-server-status`
- Verify the RAG server is running: `http://localhost:8001/health`

#### Environment Variables
- Ensure `.env` is in the **root directory** (same level as `client/` and `server/` folders)
- Restart the Next.js server after changing environment variables
- Test environment loading at `http://localhost:3000/api/test-env`
- Check that variables are properly exposed in `next.config.js`

## Benefits

✅ **No Separate Startup Process** - Everything starts with the map
✅ **Seamless Integration** - Managed by Next.js API routes
✅ **Real-time Status** - Visual feedback on connection state
✅ **Automatic Recovery** - Handles server restarts and errors
✅ **Environment Management** - Uses Next.js environment system
✅ **Debugging Support** - Comprehensive logging and error handling

## Technical Details

### Process Management
- Uses Node.js `child_process.spawn()` to start Python server
- Global variables track process state across API calls
- Automatic cleanup on process exit

### Health Monitoring
- Periodic health checks every 5 seconds
- HTTP requests to `/health` endpoint
- Status caching to reduce API calls

### Error Recovery
- Automatic retry logic for failed connections
- Graceful degradation when server is unavailable
- Clear error messages for user feedback

## Future Enhancements

- **Auto-restart on failure** - Automatically restart crashed servers
- **Load balancing** - Support for multiple RAG server instances
- **Configuration UI** - Web interface for server settings
- **Performance metrics** - Monitor server performance and usage
