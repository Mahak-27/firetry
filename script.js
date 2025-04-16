document.addEventListener('DOMContentLoaded', () => {
    const signupBtn = document.getElementById('signupBtn');
    const loginBtn = document.getElementById('loginBtn');

    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            window.location.href = 'signup.html';
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await signUp(username, email, password);
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await logIn(email, password);
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = 'index.html'; // Redirect to landing page after logout
        });
    }

    // Dashboard functionality will be added here later
    const cameraFeed = document.getElementById('cameraFeed');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const stopCameraBtn = document.getElementById('stopCameraBtn');

    let videoStream = null;

    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', startCamera);
    }

    if (stopCameraBtn) {
        stopCameraBtn.addEventListener('click', stopCamera);
    }

    async function startCamera() {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraFeed.srcObject = videoStream;
            startCameraBtn.disabled = true;
            stopCameraBtn.disabled = false;
        } catch (error) {
            console.error("Error accessing camera:", error);
            alert("Unable to access camera. Please check your browser permissions.");
        }
    }

    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            cameraFeed.srcObject = null;
            startCameraBtn.disabled = false;
            stopCameraBtn.disabled = true;
            stopDetection(); // Also stop detection if camera is stopped
        }
    }

    // Detection controls and logic will be added in the next step
    const startDetectionBtn = document.getElementById('startDetectionBtn');
    const stopDetectionBtn = document.getElementById('stopDetectionBtn');
    let detectionIntervalId = null;
    let isDetecting = false;

    if (startDetectionBtn) {
        startDetectionBtn.addEventListener('click', startDetection);
    }

    if (stopDetectionBtn) {
        stopDetectionBtn.addEventListener('click', stopDetection);
    }

    function startDetection() {
        if (cameraFeed.srcObject && !isDetecting) {
            isDetecting = true;
            startDetectionBtn.disabled = true;
            stopDetectionBtn.disabled = false;
            detectionIntervalId = setInterval(() => {
                sendFrameForPrediction(cameraFeed);
            }, 2000); // Send frame every 2 seconds
        } else if (!cameraFeed.srcObject) {
            alert("Please start the camera first.");
        }
    }

    function stopDetection() {
        if (detectionIntervalId) {
            clearInterval(detectionIntervalId);
            detectionIntervalId = null;
            isDetecting = false;
            startDetectionBtn.disabled = false;
            stopDetectionBtn.disabled = true;
        }
    }

    function displayAlert(message) {
        const alertContainer = document.getElementById('alert-container');
        const alertDiv = document.createElement('div');
        alertDiv.textContent = message;
        alertContainer.appendChild(alertDiv);
        // You can add styling to make it more visually prominent (e.g., different colors for fire/smoke)
    }

    // WebSocket connection (to be implemented in the next step)
    let websocket;

    function connectWebSocket() {
        websocket = new WebSocket('ws://localhost:5000'); // Replace with your actual URL and port

        websocket.onopen = () => {
            console.log('WebSocket connection established.');
        };

        websocket.onmessage = (event) => {
            const message = event.data;
            console.log('Received alert:', message);
            displayAlert(message);
        };

        websocket.onclose = () => {
            console.log('WebSocket connection closed.');
            // Optionally attempt to reconnect after a delay
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    // Check if the user is logged in (e.g., by checking for the token in localStorage)
    const authToken = localStorage.getItem('authToken');
    if (authToken && window.location.pathname.includes('index.html')) {
        window.location.href = 'dashboard.html'; // Redirect to dashboard if already logged in
    } else if (!authToken && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html'; // Redirect to landing page if not logged in
    }

    if (window.location.pathname.includes('dashboard.html')) {
        connectWebSocket(); // Connect to WebSocket on dashboard page
    }

    async function signUp(username, email, password) {
        try {
            const response = await fetch('http://localhost:5000/api/users/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: username, email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                window.location.href = 'login.html'; // Redirect to login after successful signup
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error signing up:', error);
            alert('An error occurred during signup.');
        }
    }

    async function logIn(email, password) {
        try {
            const response = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                localStorage.setItem('authToken', data.token);
                window.location.href = 'dashboard.html'; // Redirect to dashboard after login
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error logging in:', error);
            alert('An error occurred during login.');
        }
    }

    async function sendFrameForPrediction(videoElement) {
        console.log('➡️ sendFrameForPrediction called');
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (blob) {
                const formData = new FormData();
                formData.append('frame', blob, 'frame.jpg');

                try {
                    console.log('➡️ Sending frame to /api/process-frame');
                    const response = await fetch('http://localhost:5000/api/process-frame', {
                        method: 'POST',
                        body: formData,
                    });
                    console.log('⬅️ Response from /api/process-frame:', response); // Log the entire response
                    const data = await response.json();
                    console.log('Node.js response:', data);
                    //console.log('Prediction:', data.prediction);
                    // Handle the prediction result here (e.g., update UI, trigger local alerts if needed)
                    if (data.prediction === 'Fire') {
                       displayAlert('🔥 Fire Detected!');
                    } else if (data.prediction === 'Smoke') {
                      displayAlert('💨 Smoke Detected!');
                    }
                } catch (error) {
                    console.error('Error sending frame for prediction:', error);
                }
            }
        }, 'image/jpeg');
    }
});



