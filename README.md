<div align="center">

# Gemini Multimodal Playground ✨

A Python application for having voice, video, and screen sharing conversations with Google's new Gemini 2.0 model. Features real-time voice, video, and screen-sharing input with audio responses. Available in two versions: a full-stack web application and a standalone Python script.

<p>
<a href="https://www.linkedin.com/in/sahar-mor/" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-Connect-blue" alt="LinkedIn"></a>
<a href="https://x.com/theaievangelist" target="_blank"><img src="https://img.shields.io/twitter/follow/:theaievangelist" alt="X"></a>
<a href="http://aitidbits.ai/" target="_blank"><img src="https://github.com/saharmor/saharmor.github.io/blob/main/images/ai%20tidbits%20logo.png?raw=true" alt="Stay updated on AI" width="20" height="20" style="vertical-align: middle;"> Stay updated on AI</a>
</p>

</div>


## Full-Stack Version

## Live Camera Stream

https://github.com/user-attachments/assets/a81abaa5-2e70-42a9-857c-5ffbff22f821

## Live Screen Sharing

https://github.com/user-attachments/assets/925e3936-c2b8-4442-adf7-8dacd47f9f92



## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key and paste it into the appropriate .env file

<img width="600" alt="API key creation" src="https://github.com/saharmor/gemini-multimodal-playground/blob/main/ai%20studio%20api%20key.png">

### Prerequisites
1. Python 3.12 or higher
2. Node.js 18 or higher
3. A Google Cloud account
4. A Gemini API key

### Backend Setup
1. Clone this repository
2. Create a virtual environment and activate it:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install the required packages:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory with your API key:
```
GEMINI_API_KEY=your_api_key_here
```

5. Start the backend server:
```bash
python backend/main.py
```

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## Standalone Version

https://github.com/user-attachments/assets/82228033-fcfb-4730-9723-3ed09e1979a2

### Prerequisites
Same as above, but only Python-related requirements are needed and Tkinter:
   - On Ubuntu/Debian: `sudo apt-get install python3-tk`
   - On Fedora: `sudo dnf install python3-tkinter`
   - On macOS & Windows: Already included with Python

### Installation

1. Clone this repository or download the standalone folder

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install the required packages:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the standalone directory with your API key:
```
GEMINI_API_KEY=your_api_key_here
```

### Running the Standalone Application

1. Make sure your virtual environment is activated
2. Run the script:
```bash
python standalone.py
```

## Configuration Options

Both versions provide several configuration options:

- **System Prompt**: The initial instructions given to Gemini about its role and behavior
- **Input Mode**: Choose your preferred input method:
  - Video (webcam)
  - Screen sharing
- **Voice**: Choose from different voice options for Gemini's responses:
  - Puck
  - Charon
  - Kore
  - Fenrir
  - Aoede
- **Enable Google Search**: Allows Gemini to search the internet for current information
- **Allow Interruptions**: Enables interrupting Gemini while it's speaking

## Troubleshooting

- **Audio feedback loop issue** - Gemini may interrupt itself when it detects its own voice output through your microphone. This occurs because the application processes all incoming audio, including Gemini's responses. To prevent this feedback loop, either:
  1. Disable the "Allow Interruptions" option in settings
  2. Use headphones/earphones to prevent your microphone from picking up Gemini's audio output
