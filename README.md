# ElevenLabs Conversational AI Plugin for Obsidian

This advanced plugin integrates ElevenLabs' conversational AI capabilities into Obsidian, providing a comprehensive voice-powered note management system with semantic search, conversation history, and intelligent automation features.

## ✨ Features

### 🎤 Voice Interaction
- **Natural conversation interface** with AI agent
- **Real-time voice recognition** with customizable sensitivity
- **Multi-language support** (English, Spanish, French, German, Italian, Portuguese, Polish, Dutch)
- **Voice activation controls** with pause/resume functionality

### 📝 Advanced Note Operations
- **Create, edit, and delete notes** through voice commands
- **Append content** to existing notes
- **Template-based note creation** with variable substitution
- **Batch operations** for multiple notes
- **Smart file naming** with sanitization

### 🧠 Semantic Search & AI
- **Vector embeddings** for semantic note discovery
- **TF-IDF based similarity** calculations
- **Context-aware suggestions** based on current work
- **Find similar notes** automatically
- **Smart content analysis** and categorization
- **Keyword extraction** and tagging

### 📊 Vault Analysis & Insights
- **Comprehensive vault statistics** (notes, words, characters, tags)
- **Folder structure analysis** and organization insights
- **Tag frequency analysis** and management
- **Link network analysis** for knowledge graph insights
- **Most connected notes** identification
- **Content overlap detection**

### 💬 Conversation Management
- **Persistent conversation history** across sessions
- **Real-time transcript display** with timestamps
- **Session export** to markdown files
- **Conversation search** and filtering
- **Auto-save transcripts** to specified locations
- **Conversation replay** and review

### 🎨 Enhanced User Interface
- **Modern, responsive design** with dark mode support
- **Quick action buttons** for common tasks
- **Real-time status indicators** (connection, recording, agent state)
- **Conversation transcript** with message history
- **Session management** with view/delete options
- **Keyboard shortcuts** for power users
- **Customizable UI density** (compact/normal/spacious)

### ⚙️ Advanced Settings & Customization
- **Multiple conversation modes** (standard, note-focused, creative, analysis)
- **Custom prompts** with categories and icons
- **Voice sensitivity controls** and audio preferences
- **Auto-export settings** for sessions and transcripts
- **Template integration** with dynamic variables
- **Notification preferences** and behavior
- **Debug mode** with detailed logging

### 🔗 Obsidian Integration
- **Daily notes integration** with AI assistance
- **Template system** compatibility
- **Command palette** integration with shortcuts
- **Ribbon icon** for quick access
- **Settings tab** with organized sections
- **Plugin lifecycle** management

## 🚀 Quick Start

### Prerequisites
- Obsidian v0.15.0 or higher
- ElevenLabs account with AI agent configured
- Working microphone and internet connection

### Installation
1. Open Obsidian Settings → Community Plugins
2. Disable Safe Mode if prompted
3. Browse and search for "ElevenLabs Conversational AI"
4. Install and enable the plugin

### Configuration
1. Go to Settings → ElevenLabs Conversational AI
2. Enter your ElevenLabs Agent ID
3. Configure language, voice preferences, and conversation mode
4. Set up custom prompts and UI preferences
5. Save settings and start your first conversation

## 🎯 Usage Guide

### Starting Conversations
- **Ribbon Icon**: Click the microphone icon in the left ribbon
- **Command Palette**: `Ctrl/Cmd + P` → "Open ElevenLabs Conversational AI"
- **Keyboard Shortcut**: `Ctrl + Shift + V` (if enabled)

### Quick Actions
The conversation interface includes quick action buttons:
- 📝 **Create Note**: Start a note creation conversation
- 📋 **List Notes**: Get an overview of your vault
- 🔍 **Search Notes**: Find notes using semantic search
- 📊 **Vault Stats**: Analyze your vault structure

### Voice Commands Examples
- *"Create a new note about machine learning concepts"*
- *"Search for notes related to project management"*
- *"Show me notes similar to my current research"*
- *"Edit my daily note to add today's accomplishments"*
- *"Analyze my vault and suggest better organization"*
- *"Find connections between my productivity and psychology notes"*

### Advanced Features

#### Semantic Search
```
"Find notes related to artificial intelligence and machine learning"
"Show me content similar to my research methodology"
"What notes discuss productivity techniques?"
```

#### Vault Analysis
```
"Analyze my vault structure and suggest improvements"
"What are my most connected notes?"
"Show me tag usage patterns"
"Which folders need better organization?"
```

#### Custom Prompts
Create personalized quick actions in settings:
- Meeting notes templates
- Research summaries
- Daily reflection prompts
- Project planning assistants

## ⌨️ Keyboard Shortcuts

- `Ctrl + Shift + V`: Quick start conversation
- `Ctrl + Shift + D`: Daily note assistant
- `Ctrl + Enter`: Start/stop conversation (in modal)
- `Ctrl + Space`: Pause/resume recording (in modal)
- `Escape`: Close conversation modal

## 🔧 Advanced Configuration

### Conversation Modes
- **Standard**: Balanced conversation for general use
- **Note-Focused**: Prioritizes note operations and management
- **Creative**: Encourages exploratory and creative thinking
- **Analysis**: Focuses on data analysis and insights

### Voice Settings
- **Activation Threshold**: Adjust microphone sensitivity (0.1-1.0)
- **Pause After Response**: Add natural conversation flow
- **Voice ID**: Use specific ElevenLabs voice (optional)

### Auto-Export Options
- **Sessions**: Automatically save conversations as notes
- **Transcripts**: Save real-time conversation logs
- **Location**: Specify save folder (e.g., "Conversations/")

### Custom Prompts
Create reusable conversation starters:
1. Go to Settings → Custom Prompts
2. Click "Add Prompt"
3. Set name, icon, category, and prompt text
4. Access via quick actions or command palette

## 🛠️ Troubleshooting

### Common Issues

**Microphone Not Working**
- Check browser/Obsidian microphone permissions
- Verify microphone is not used by other applications
- Test with different voice activation threshold

**Connection Errors**
- Verify ElevenLabs Agent ID is correct
- Check internet connection stability
- Review debug logs in developer console

**Slow Semantic Search**
- Rebuild semantic index in settings
- Reduce vault size or exclude large folders
- Check available system memory

**Conversation History Issues**
- Clear conversation history in debug settings
- Check localStorage availability
- Verify browser storage limits

### Debug Mode
Enable in Settings → Debug Settings for:
- Detailed conversation logs
- Vector embedding statistics
- Performance monitoring
- Error tracking

## 🗺️ Roadmap

### Current Version (0.0.4+)
- ✅ Advanced note operations
- ✅ Semantic search with vector embeddings
- ✅ Conversation history and transcripts
- ✅ Enhanced UI with quick actions
- ✅ Vault analysis and insights
- ✅ Custom prompts and templates
- ✅ Comprehensive settings

### Future Enhancements
- 🔄 Real-time collaborative conversations
- 🔄 Integration with external knowledge bases
- 🔄 Advanced AI model selection
- 🔄 Plugin ecosystem integration
- 🔄 Multi-modal input (text + voice)
- 🔄 Advanced automation workflows

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Bug reports and feature requests
- Code contributions and pull requests
- Documentation improvements
- Community feedback and suggestions

### Development Setup
```bash
git clone <repository-url>
cd obsidian-elevenlabs-conversational-ai-plugin
npm install
npm run dev
```

### Building
```bash
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ElevenLabs** for providing the conversational AI platform
- **Obsidian** team for the excellent plugin API
- **Community contributors** for feedback and suggestions
- **Open source libraries** used in this project

## 📞 Support

- **Plugin Issues**: Create an issue in the GitHub repository
- **ElevenLabs Support**: Contact ElevenLabs for agent-related questions
- **Feature Requests**: Use GitHub discussions
- **Documentation**: Visit our wiki for detailed guides

---

**Transform your note-taking with AI-powered conversations!** 🚀

For more information, visit [https://arti8.com](https://arti8.com)
