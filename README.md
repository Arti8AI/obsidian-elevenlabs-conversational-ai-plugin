# ElevenLabs Conversational AI Plugin for Obsidian

This plugin integrates ElevenLabs' conversational AI capabilities into Obsidian, allowing you to interact with your notes using voice commands and receive spoken responses. You can create, read, and manage your notes through natural conversation with an AI agent.

## Features

- Voice-based interaction with your Obsidian vault
- Create new notes through voice commands
- Read existing notes using text-to-speech
- Natural conversation interface with AI
- Real-time status indicators for connection and agent state
- Simple settings configuration

## Prerequisites

- Obsidian v0.15.0 or higher
- An ElevenLabs account with an AI agent ID
- A device with a working microphone
- An internet connection

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "ElevenLabs Conversational AI"
4. Install the plugin
5. Enable the plugin in your list of installed plugins

## Configuration

1. Go to Settings > ElevenLabs Conversational AI
2. Enter your ElevenLabs Agent ID in the settings field
3. Save the settings

## Usage

### Starting a Conversation

There are two ways to start using the plugin:

1. Click the microphone icon in the left ribbon
2. Use the command palette (Ctrl/Cmd + P) and search for "Open ElevenLabs Conversational AI"

### During a Conversation

1. The modal will show the current connection status and whether the agent is listening or speaking
2. Click "Start Conversation" to begin
3. Speak naturally to the agent to:
   - Create new notes
   - Read existing notes
   - Get a list of your notes
4. Click "Stop Conversation" when you're done

### Available Voice Commands

The exact commands will depend on your ElevenLabs agent's capabilities, but generally you can:
- Ask to create a new note
- Request to read an existing note
- Ask for a list of your notes
- Have natural conversations about your notes' content

## Troubleshooting

If you encounter issues:

1. Ensure your microphone is working and has proper permissions
2. Check your internet connection
3. Verify your ElevenLabs Agent ID is correct
4. Restart Obsidian if the plugin isn't responding

## Roadmap

### Phase 1: Basic Conversational AI (Current)
- ✅ Voice interaction with Obsidian
- ✅ Basic note operations (create, read, list)
- ✅ AI Multi-language support thanks to ElevenLabs
- ✅ Real-time status indicators
- ✅ Settings configuration
- ✅ AI assistant that can discuss your notes
- ✅ Context-aware conversations about note content
- ✅ Ability to answer questions based on your notes

### Phase 2: Conversational Notes Assistant
- 🚧 Implement vector embeddings for notes
- 🚧 Semantic search capabilities
- 🚧 Better context understanding
- 🚧 Cross-reference information between notes

### Future Plans
- 📋 Advanced note organization features
- 📋 Integration with other Obsidian plugins

## Development

### Contributing
If you want to contribute to the plugin:

1. Clone the repository
2. Install dependencies with `npm install`
3. Run `npm run dev` to start compilation in watch mode
4. Make your changes
5. Build with `npm run build`

### Running Tests
```bash
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run build          # Type check and build
```

### Continuous Integration
All pull requests automatically run:
- ESLint linting
- TypeScript type checking  
- Jest tests
- Build verification

## Support

- For plugin-specific issues, please create an issue in the GitHub repository
- For ElevenLabs-related questions, please contact ElevenLabs support
- Visit the author's website at [https://arti8.com](https://arti8.com)

## License

This project is licensed under the MIT License.
