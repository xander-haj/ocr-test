// script.js
// Main JavaScript file handling camera access, ROI manipulation, and OCR processing

let video = document.getElementById('cameraFeed');
let startScannerButton = document.getElementById('startScanner');
let captureOCRButton = document.getElementById('captureOCR');
let roi = document.getElementById('roi');
let outputText = document.getElementById('outputText');
let languageSelect = document.getElementById('languageSelect');
let debugCanvas = document.getElementById('debugCanvas');
let debugContext = debugCanvas.getContext('2d');
let cameraSelect = document.getElementById('cameraSelect');
let resolutionSelect = document.getElementById('resolutionSelect');
let workerSelect = document.getElementById('workerSelect');

let stream;
let worker;
let processing = false;

let videoConstraints = {
    video: { facingMode: 'environment' },
    audio: false
};

// Populate camera options after permissions are granted
async function getCameraOptions() {
    let devices = await navigator.mediaDevices.enumerateDevices();
    let videoDevices = devices.filter(device => device.kind === 'videoinput');

    cameraSelect.innerHTML = '';
    videoDevices.forEach(device => {
        let option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `Camera ${cameraSelect.length + 1}`;
        cameraSelect.appendChild(option);
    });
}

// Populate resolution options
function getResolutionOptions() {
    // Common resolutions
    const resolutions = [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
        { width: 640, height: 480 },
        { width: 320, height: 240 }
    ];

    resolutionSelect.innerHTML = '';
    resolutions.forEach(res => {
        let option = document.createElement('option');
        option.value = JSON.stringify(res);
        option.text = `${res.width} x ${res.height}`;
        resolutionSelect.appendChild(option);
    });
}

// Function to start the camera
async function startCamera() {
    // Update video constraints based on selected camera and resolution
    let selectedCamera = cameraSelect.value;
    let selectedResolution = JSON.parse(resolutionSelect.value);

    videoConstraints.video = {
        deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
        width: { ideal: selectedResolution.width },
        height: { ideal: selectedResolution.height },
        facingMode: 'environment'
    };

    // Stop any existing stream
    stopCamera();

    try {
        stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        video.srcObject = stream;
    } catch (error) {
        alert('Error accessing the camera: ' + error.message);
    }
}

// Function to start the scanner
async function startScanner() {
    // Hide the start button and show the OCR button
    startScannerButton.style.display = 'none';
    captureOCRButton.style.display = 'inline-block';

    // Get camera options and resolutions
    await getCameraOptions();
    getResolutionOptions();

    // Start the camera
    await startCamera();

    // Show the ROI
    roi.style.display = 'block';

    // Initialize ROI position and size
    initROI();
}

// Initialize ROI to default size and position
function initROI() {
    let rect = video.getBoundingClientRect();
    roi.style.width = rect.width / 2 + 'px';
    roi.style.height = rect.height / 2 + 'px';
    roi.style.left = rect.width / 4 + 'px';
    roi.style.top = rect.height / 4 + 'px';

    // Reset transformations
    roi.style.transform = 'translate(0px, 0px)';
    roi.setAttribute('data-x', 0);
    roi.setAttribute('data-y', 0);
}

// Set up ROI draggable and resizable functionality using Interact.js
interact('#roi').draggable({
    onmove: dragMoveListener
}).resizable({
    edges: { left: true, right: true, bottom: true, top: true }
}).on('resizemove', function (event) {
    let target = event.target;
    let x = (parseFloat(target.getAttribute('data-x')) || 0);
    let y = (parseFloat(target.getAttribute('data-y')) || 0);

    // Update the element's style
    target.style.width = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';

    // Translate when resizing from top or left edges
    x += event.deltaRect.left;
    y += event.deltaRect.top;

    target.style.webkitTransform = target.style.transform =
        'translate(' + x + 'px,' + y + 'px)';

    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
});

function dragMoveListener(event) {
    let target = event.target;
    // Keep the dragged position in the data-x/data-y attributes
    let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // Translate the element
    target.style.webkitTransform = target.style.transform =
        'translate(' + x + 'px, ' + y + 'px)';

    // Update the position attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}

// Function to capture frame and perform OCR
function captureFrameAndOCR() {
    if (processing) {
        return;
    }

    processing = true;

    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');

    // Get ROI position and size
    let roiRect = roi.getBoundingClientRect();
    let videoRect = video.getBoundingClientRect();

    // Calculate scale factor
    let scaleX = video.videoWidth / videoRect.width;
    let scaleY = video.videoHeight / videoRect.height;

    // Correct the ROI position considering transformations
    let roiX = roiRect.left - videoRect.left + parseFloat(roi.getAttribute('data-x') || 0);
    let roiY = roiRect.top - videoRect.top + parseFloat(roi.getAttribute('data-y') || 0);

    // Set canvas size
    canvas.width = roiRect.width * scaleX;
    canvas.height = roiRect.height * scaleY;

    // Draw the ROI frame onto the canvas
    context.drawImage(
        video,
        roiX * scaleX,
        roiY * scaleY,
        roiRect.width * scaleX,
        roiRect.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Image preprocessing (convert to grayscale)
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        data[i] = data[i + 1] = data[i + 2] = gray;
    }
    context.putImageData(imageData, 0, 0);

    // Update debug canvas
    debugCanvas.width = canvas.width;
    debugCanvas.height = canvas.height;
    debugContext.drawImage(canvas, 0, 0, canvas.width, canvas.height);

    // Get image data as Blob
    canvas.toBlob(function (blob) {
        // Update ROI border color to indicate processing
        roi.style.borderColor = 'green';

        // Send image data to Web Worker for OCR processing
        if (!worker) {
            worker = new Worker('worker.js');

            // Set the number of workers
            let numWorkers = parseInt(workerSelect.value);

            worker.postMessage({ cmd: 'init', numWorkers });

            worker.onmessage = function (e) {
                if (e.data.status === 'result') {
                    outputText.value = e.data.text;
                    roi.style.borderColor = 'red';
                    processing = false;
                } else if (e.data.status === 'initialized') {
                    // Worker initialized
                    // Start OCR processing
                    worker.postMessage({
                        imageBlob: blob,
                        lang: languageSelect.value
                    });
                } else if (e.data.status === 'error') {
                    alert(e.data.text);
                    roi.style.borderColor = 'red';
                    processing = false;
                }
            };
        } else {
            // Worker already initialized
            worker.postMessage({
                imageBlob: blob,
                lang: languageSelect.value
            });
        }
    }, 'image/png');
}

// Event listener for the start scanner button
startScannerButton.addEventListener('click', startScanner);

// Event listener for the OCR button
captureOCRButton.addEventListener('click', captureFrameAndOCR);

// Event listeners for camera, resolution, and worker changes
cameraSelect.addEventListener('change', startCamera);
resolutionSelect.addEventListener('change', startCamera);
workerSelect.addEventListener('change', () => {
    if (worker) {
        worker.terminate();
        worker = null;
    }
});

// Cleanup function to stop camera stream
function stopCamera() {
    if (stream) {
        let tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
}

// Event listener for beforeunload to stop the camera
window.addEventListener('beforeunload', stopCamera);
