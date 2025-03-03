// Predefined timestamps where the video should pause (in seconds)
const pauseTimestamps = [15, 21, 30, 45, 60]; // Example timestamps, modify as needed

let mediaRecorder;
let audioChunks = [];
let currentTimestampIndex = 0;
let isRecording = false;
let silenceTimeout;
let audioContext;
let analyser;
let microphone;
let audioStream;
let silenceDetectionFrame;

const video = document.getElementById('mainVideo');
const recordingStatus = document.getElementById('recordingStatus');
const recordingsList = document.getElementById('recordingsList');

// Silence detection configuration
const SILENCE_THRESHOLD = -50; // dB
const SILENCE_DURATION = 1500; // milliseconds

// Initialize audio context and analyser
async function initializeAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        
        return { audioContext, analyser, dataArray };
    } catch (error) {
        console.error('Error initializing audio:', error);
        return null;
    }
}

// Check for silence in the audio stream
function checkSilence(dataArray) {
    if (!analyser || !isRecording) return true;
    analyser.getFloatTimeDomainData(dataArray);
    const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + val * val, 0) / dataArray.length);
    const db = 20 * Math.log10(rms);
    return db < SILENCE_THRESHOLD;
}

// Format time in MM:SS format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Clean up audio resources
async function cleanupAudio() {
    // Cancel any ongoing silence detection
    if (silenceDetectionFrame) {
        cancelAnimationFrame(silenceDetectionFrame);
        silenceDetectionFrame = null;
    }

    // Clear any existing silence timeout
    if (silenceTimeout) {
        clearTimeout(silenceTimeout);
        silenceTimeout = null;
    }

    // Stop all audio tracks
    if (audioStream) {
        audioStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
        audioStream = null;
    }

    // Close audio context
    if (audioContext) {
        if (audioContext.state !== 'closed') {
            await audioContext.close();
        }
        audioContext = null;
    }

    // Clean up other audio resources
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    analyser = null;
    mediaRecorder = null;
}

// Start recording automatically
async function startRecording() {
    try {
        // Ensure any previous audio resources are cleaned up
        await cleanupAudio();

        // Get microphone access only when needed
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];

        // Set up audio analysis
        const audioSetup = await initializeAudio();
        if (audioSetup) {
            const { audioContext, analyser, dataArray } = audioSetup;
            microphone = audioContext.createMediaStreamSource(audioStream);
            microphone.connect(analyser);

            // Start silence detection
            function detectSilence() {
                if (!isRecording) return;

                if (checkSilence(dataArray)) {
                    if (!silenceTimeout) {
                        silenceTimeout = setTimeout(() => {
                            stopRecording();
                        }, SILENCE_DURATION);
                    }
                } else {
                    if (silenceTimeout) {
                        clearTimeout(silenceTimeout);
                        silenceTimeout = null;
                    }
                }
                silenceDetectionFrame = requestAnimationFrame(detectSilence);
            }
            detectSilence();
        }

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const timestamp = pauseTimestamps[currentTimestampIndex];
            await uploadRecording(audioBlob, timestamp);
            await cleanupAudio();
            disableRecording();
            video.play();
            currentTimestampIndex++;
        };

        mediaRecorder.start();
        isRecording = true;
        updateRecordingUI(true);
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
        await cleanupAudio();
    }
}

// Stop recording
async function stopRecording() {
    if (mediaRecorder && isRecording) {
        isRecording = false;
        updateRecordingUI(false);
        mediaRecorder.stop();
        await cleanupAudio();
    }
}

// Initialize video player
video.addEventListener('timeupdate', () => {
    const currentTime = video.currentTime;
    
    // Check if we've reached a pause timestamp
    if (currentTimestampIndex < pauseTimestamps.length && 
        currentTime >= pauseTimestamps[currentTimestampIndex]) {
        video.pause();
        startRecording();
    }
});

// Upload recording to server
async function uploadRecording(audioBlob, timestamp) {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('timestamp', timestamp);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            addRecordingToList(data.filename, timestamp);
        }
    } catch (error) {
        console.error('Error uploading recording:', error);
        alert('Error uploading recording. Please try again.');
    }
}

// Add recording to the list
function addRecordingToList(filename, timestamp) {
    const recordingItem = document.createElement('div');
    recordingItem.className = 'recording-item';
    
    const timestampLabel = document.createElement('div');
    timestampLabel.className = 'timestamp-label';
    timestampLabel.textContent = `Recording at ${formatTime(timestamp)}`;
    
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = `/uploads/${filename}`;
    
    recordingItem.appendChild(timestampLabel);
    recordingItem.appendChild(audio);
    recordingsList.appendChild(recordingItem);
}

// Update UI based on recording state
function updateRecordingUI(isRecording) {
    recordingStatus.textContent = isRecording ? 'Recording...' : '';
}

// Disable recording controls
function disableRecording() {
    recordingStatus.textContent = '';
}

// Clean up when the page is unloaded
window.addEventListener('beforeunload', async () => {
    await cleanupAudio();
}); 