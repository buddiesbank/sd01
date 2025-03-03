# Interactive Video Experience

A web application that plays a video and pauses at predefined timestamps, allowing users to record voice input at each pause point.

## Features

- Video playback with automatic pausing at predefined timestamps
- Voice recording capability at each pause point
- Playback of recorded voice clips
- Modern, minimalistic UI design
- Responsive layout that works on all devices

## Setup

1. Install dependencies:
```bash
npm install
```

2. Place your video file in the `public` directory and update the video source in `public/index.html`:
```html
<video id="videoPlayer" controls>
    <source src="your-video.mp4" type="video/mp4">
</video>
```

3. Update the pause timestamps in `public/script.js`:
```javascript
const pauseTimestamps = [5, 15, 30, 45, 60]; // Modify these timestamps as needed
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. The video will automatically play and pause at the predefined timestamps
2. When the video pauses, click "Start Recording" to begin recording your voice
3. Click "Stop Recording" when you're done speaking
4. The recording will be uploaded and appear in the recordings list
5. You can play back your recordings using the audio controls
6. The video will automatically resume playing after each recording

## Technical Details

- Backend: Node.js with Express
- Frontend: Vanilla JavaScript
- File Upload: Multer
- Audio Recording: MediaRecorder API
- Styling: Custom CSS with modern design principles

## Requirements

- Modern web browser with MediaRecorder API support
- Microphone access
- Node.js installed on your system 