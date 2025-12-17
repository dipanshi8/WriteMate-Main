# # backend_file.py
from flask import Flask, send_file, jsonify, request, send_from_directory, Response 
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
import threading
import time
import io
from flask import send_file

# speech_recognition import
import speech_recognition as sr

# gesture imports
import cv2
import mediapipe as mp
import numpy as np
import pickle


# Try to import text_to_svg from your Speech/speech module (safe fallback included)
try:
    from Speech import text_to_svg
except Exception:
    try:
        from Speech import text_to_svg
    except Exception:
        def text_to_svg(text, filename="output.svg"):
            try:
                import svgwrite
                dwg = svgwrite.Drawing(filename, profile='tiny')
                dwg.add(dwg.text(text or "No speech detected",
                                 insert=(10, 50),
                                 fill='black',
                                 font_size=20,
                                 font_family='Arial'))
                dwg.save()
            except Exception:
                svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
  <text x="10" y="50" font-family="Arial" font-size="20" fill="black">{text or "No speech detected"}</text>
</svg>'''
                with open(filename, "w", encoding="utf-8") as f:
                    f.write(svg)

app = Flask(__name__, static_folder="frontend_build", static_url_path="")
CORS(app)

SVG_OUTPUT_DIR = 'svg_outputs'
UPLOAD_DIR = 'uploads'

os.makedirs(SVG_OUTPUT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ------------------- Globals for background listening -------------------
_listening_thread = None
_listening_flag = threading.Event()   # signals thread stop
_listening_enabled = False            # actual speech-to-text enabled after "start listening"
_cumulative_text = ""                 
_listening_lock = threading.Lock()

# ------------------- Globals for GESTURE -------------------
_gesture_thread = None
_gesture_flag = threading.Event()
_gesture_text = ""
_gesture_lock = threading.Lock()

# ------------------- Frontend serving -------------------
@app.route('/frontend')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/frontend/<path:filename>')
def serve_frontend_files(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'WriteMate Backend API',
        'endpoints': {
            'POST /process-speech': 'Process audio file and generate SVG',
            'GET /get-svg/<filename>': 'Retrieve generated SVG file',
            'GET /voice/start': 'Start real-time voice script (but not listening yet)',
            'POST /voice/stop': 'Stop and return final SVG',
            'GET /voice/transcript': 'Get live transcript text',
            'POST /gesture/start': 'Start gesture',
            'POST /gesture/stop': 'Stop gesture and return SVG',
            'GET /gesture/transcript': 'Get live gesture transcript',
            'GET /frontend': 'Serve frontend application'
        }
    })

# ------------------- Background worker -------------------
def _listen_worker():
    """Background thread: waits for 'start listening'/'stop listening' keywords to toggle transcription."""
    global _cumulative_text, _listening_flag, _listening_enabled
    recognizer = sr.Recognizer()
    try:
        with sr.Microphone() as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
            print("[voice-worker] ready. Say 'start listening' to begin.")
            while not _listening_flag.is_set():
                try:
                    audio = recognizer.listen(source, timeout=3, phrase_time_limit=5)
                    try:
                        text = recognizer.recognize_google(audio)
                        text = text.strip().lower()
                        if not text:
                            continue

                        # handle voice commands
                        if "start listening" in text:
                            _listening_enabled = True
                            print("[voice-worker] >>> Listening ENABLED")
                            continue
                        if "stop listening" in text:
                            _listening_enabled = False
                            print("[voice-worker] >>> Listening DISABLED")
                            continue

                        # only add transcript when enabled
                        if _listening_enabled:
                            with _listening_lock:
                                _cumulative_text += (" " + text if _cumulative_text else text)
                            print(f"[voice-worker] recognized: {text}")
                        else:
                            print(f"[voice-worker] heard (ignored): {text}")

                    except sr.UnknownValueError:
                        continue
                    except sr.RequestError as e:
                        print("[voice-worker] recognition request error:", e)
                        break
                except sr.WaitTimeoutError:
                    continue
                except Exception as ex:
                    print("[voice-worker] error:", ex)
                    break
            print("[voice-worker] stopping thread.")
    except Exception as e:
        print("[voice-worker] microphone init error:", e)

# ------------------- Voice control endpoints -------------------
@app.route('/voice/start', methods=['POST'])
def voice_start():
    """Start background listening thread, but actual transcription begins only after 'start listening' voice command."""
    global _listening_thread, _listening_flag, _cumulative_text, _listening_enabled
    if _listening_thread and _listening_thread.is_alive():
        return jsonify({'success': False, 'error': 'Already running'}), 400

    _listening_flag.clear()
    _listening_enabled = False   # not listening yet until user says "start listening"
    with _listening_lock:
        _cumulative_text = ""

    _listening_thread = threading.Thread(target=_listen_worker, daemon=True)
    _listening_thread.start()
    return jsonify({'success': True, 'message': 'Voice system started. Say "start listening" to begin.'}), 200

@app.route('/voice/stop', methods=['POST'])
def voice_stop():
    """Stop listener, return SVG with transcript."""
    global _listening_thread, _listening_flag, _cumulative_text, _listening_enabled
    if not (_listening_thread and _listening_thread.is_alive()):
        return jsonify({'success': False, 'error': 'Not currently active'}), 400

    _listening_flag.set()
    _listening_thread.join(timeout=6)

    with _listening_lock:
        final_text = _cumulative_text.strip()

    filename = f"final_output_{uuid.uuid4().hex[:6]}.svg"
    svg_path = os.path.join(SVG_OUTPUT_DIR, filename)

    try:
        text_to_svg(final_text or "No speech detected", filename=svg_path)
        with open(svg_path, "rb") as f:
            data = f.read()
    except Exception:
        import svgwrite
        dwg = svgwrite.Drawing(size=("1000px", "200px"))
        x, y = 10, 30
        max_chars = 80
        txt = final_text or "No speech detected"
        while txt:
            dwg.add(dwg.text(txt[:max_chars], insert=(x, y),
                             fill='black', font_size=20, font_family='Arial'))
            txt = txt[max_chars:]
            y += 24
        data = dwg.tostring().encode("utf-8")

    with _listening_lock:
        _cumulative_text = ""
    _listening_thread = None
    _listening_flag.clear()
    _listening_enabled = False

    headers = {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return Response(data, headers=headers)

@app.route('/voice/transcript', methods=['GET'])
def voice_transcript():
    with _listening_lock:
        return jsonify({'transcript': _cumulative_text})

# ------------------- File upload & SVG endpoints -------------------
@app.route('/process-speech', methods=['POST'])
def process_speech():
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected'}), 400
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        original_filename = secure_filename(audio_file.filename)
        filename_parts = original_filename.rsplit('.', 1)
        if len(filename_parts) == 2:
            audio_filename = f"{filename_parts[0]}_{timestamp}_{unique_id}.{filename_parts[1]}"
        else:
            audio_filename = f"{original_filename}_{timestamp}_{unique_id}"
        
        audio_path = os.path.join(UPLOAD_DIR, audio_filename)
        audio_file.save(audio_path)
        
        svg_filename = f"speech_output_{timestamp}_{unique_id}.svg"
        svg_path = os.path.join(SVG_OUTPUT_DIR, svg_filename)
        
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_path) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
        
        text_to_svg(text, filename=svg_path)
        os.remove(audio_path)

        return jsonify({
            'success': True,
            'svg_filename': svg_filename,
            'svg_url': f'/get-svg/{svg_filename}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get-svg/<filename>', methods=['GET'])
def get_svg(filename):
    secure_name = secure_filename(filename)
    if not secure_name.endswith('.svg'):
        return jsonify({'error': 'Invalid file type'}), 400
    
    svg_path = os.path.join(SVG_OUTPUT_DIR, secure_name)
    if os.path.exists(svg_path):
        return send_file(svg_path, mimetype='image/svg+xml')
    else:
        return jsonify({'error': 'SVG not found'}), 404

@app.route('/api/list-svgs', methods=['GET'])
def list_svgs():
    svg_files = [f for f in os.listdir(SVG_OUTPUT_DIR) if f.endswith('.svg')]
    return jsonify({'svg_files': svg_files, 'count': len(svg_files)})



# ------------------- GESTURE worker -------------------
def _gesture_worker():
    global _gesture_text, _gesture_flag
    width, height = 720, 360
    cam = cv2.VideoCapture(0)
    cam.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    cam.set(cv2.CAP_PROP_FRAME_HEIGHT, height)

    mp_hands = mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    # load trained data
    try:
        with open("file1.pkl", "rb") as f:
            gestNames = pickle.load(f)
            knownGestures = pickle.load(f)
    except:
        print("No training data found (default.pkl).")
        cam.release()
        return

    keyPoints = [0, 4, 5, 9, 13, 17, 8, 12, 16, 20]
    tol = 10
    last_time = 0

    def findDistances(handData):
        distMatrix = np.zeros([len(handData), len(handData)], dtype='float')
        palmSize = ((handData[0][0] - handData[9][0]) ** 2 + (handData[0][1] - handData[9][1]) ** 2) ** 0.5
        for row in range(len(handData)):
            for column in range(len(handData)):
                distMatrix[row][column] = (((handData[row][0] - handData[column][0]) ** 2 +
                                            (handData[row][1] - handData[column][1]) ** 2) ** 0.5) / palmSize
        return distMatrix

    def findError(gestureMatrix, unknownMatrix, keyPoints):
        error = 0
        for row in keyPoints:
            for column in keyPoints:
                error += abs(gestureMatrix[row][column] - unknownMatrix[row][column])
        return error

    def findGesture(unknownGesture, knownGestures, keyPoints, gestNames, tol):
        errorArray = []
        for i in range(len(gestNames)):
            error = findError(knownGestures[i], unknownGesture, keyPoints)
            errorArray.append(error)
        minError = min(errorArray)
        if minError < tol:
            return gestNames[errorArray.index(minError)]
        return None

    while not _gesture_flag.is_set():
        ret, frame = cam.read()
        if not ret:
            break
        frameRGB = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = mp_hands.process(frameRGB)
        if results.multi_hand_landmarks:
            for handLms in results.multi_hand_landmarks:
                myHand = [(int(lm.x * width), int(lm.y * height)) for lm in handLms.landmark]
                unknown = findDistances(myHand)
                gest = findGesture(unknown, knownGestures, keyPoints, gestNames, tol)
                if gest:
                    now = time.time()
                    if now - last_time > 1.5:
                        with _gesture_lock:
                            _gesture_text += (" " + gest if _gesture_text else gest)
                        last_time = now
        time.sleep(0.05)

    cam.release()

# ------------------- GESTURE endpoints -------------------
@app.route('/gesture/start', methods=['POST'])
def gesture_start():
    global _gesture_thread, _gesture_flag, _gesture_text
    if _gesture_thread and _gesture_thread.is_alive():
        return jsonify({'success': False, 'error': 'Gesture already running'}), 400

    _gesture_flag.clear()
    with _gesture_lock:
        _gesture_text = ""

    _gesture_thread = threading.Thread(target=_gesture_worker, daemon=True)
    _gesture_thread.start()
    return jsonify({'success': True, 'message': 'Gesture started'}), 200

# @app.route('/gesture/stop', methods=['POST'])
# def gesture_stop():
#     global _gesture_thread, _gesture_flag, _gesture_text
#     if not (_gesture_thread and _gesture_thread.is_alive()):
#         return jsonify({'success': False, 'error': 'Gesture not active'}), 400

#     _gesture_flag.set()
#     _gesture_thread.join(timeout=5)

#     with _gesture_lock:
#         final_text = _gesture_text.strip()

#     filename = f"gesture_{uuid.uuid4().hex[:6]}.svg"
#     svg_path = os.path.join(SVG_OUTPUT_DIR, filename)
#     text_to_svg(final_text or "No gesture", filename=svg_path)

#     with open(svg_path, "rb") as f:
#         data = f.read()

#     with _gesture_lock:
#         _gesture_text = ""
#     _gesture_thread = None
#     _gesture_flag.clear()

#     headers = {
#         "Content-Type": "image/svg+xml",
#         "Content-Disposition": f'attachment; filename="{filename}"'
#     }
#     return Response(data, headers=headers)

@app.route('/gesture/stop', methods=['POST'])
def gesture_stop():
    global _gesture_thread, _gesture_flag, _gesture_text

    # Signal stop
    _gesture_flag.set()

    if _gesture_thread and _gesture_thread.is_alive():
        _gesture_thread.join(timeout=5)

    with _gesture_lock:
        final_text = _gesture_text.strip() or "No gesture detected"

    # Generate SVG file
    filename = f"gesture_{uuid.uuid4().hex[:6]}.svg"
    svg_path = os.path.join(SVG_OUTPUT_DIR, filename)
    text_to_svg(final_text, filename=svg_path)

    # Reset state
    with _gesture_lock:
        _gesture_text = ""
    _gesture_thread = None
    _gesture_flag.clear()

    # Send file back to frontend
    return send_file(
        svg_path,
        mimetype="image/svg+xml",
        as_attachment=True,
        download_name=filename
    )

@app.route('/gesture/frame', methods=['POST'])
def gesture_frame():
    global _gesture_text
    file = request.files['frame']
    if not file:
        return jsonify({"error": "No frame"}), 400
    
    # Convert to OpenCV image
    import numpy as np
    file_bytes = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    # Process with mediapipe here (reuse your gesture logic)
    # Update _gesture_text accordingly

    return jsonify({"success": True, "transcript": _gesture_text})


@app.route('/gesture/transcript', methods=['GET'])
def gesture_transcript():
    with _gesture_lock:
        return jsonify({'transcript': _gesture_text})


# ------------------- Run -------------------
if __name__ == '__main__':
    print("Starting WriteMate Backend Server...")
    print(f"SVG output directory: {SVG_OUTPUT_DIR}")
    print(f"Upload directory: {UPLOAD_DIR}")
    app.run(debug=True, host='0.0.0.0', port=5000)


# ------------------- Run -------------------
# if __name__ == '__main__':
#     app.run(debug=True, host='0.0.0.0', port=5000)



# Simple camera test script
import cv2
import numpy as np

def test_camera():
    print("Testing camera...")
    
    # Try different camera indices
    for camera_index in [0, 1, 2]:
        print(f"Trying camera index: {camera_index}")
        cap = cv2.VideoCapture(camera_index)
        
        if cap.isOpened():
            print(f"✓ Camera {camera_index} opened successfully")
            
            # Test reading a frame
            ret, frame = cap.read()
            if ret:
                print(f"✓ Frame read successfully. Shape: {frame.shape}")
                
                # Show frame for 3 seconds
                cv2.imshow(f'Camera Test {camera_index}', frame)
                print("Showing test frame for 3 seconds...")
                cv2.waitKey(3000)  # Wait 3 seconds
                cv2.destroyAllWindows()
                
                cap.release()
                return camera_index
            else:
                print(f"✗ Failed to read frame from camera {camera_index}")
        else:
            print(f"✗ Failed to open camera {camera_index}")
            
        cap.release()
    
    print("No working cameras found!")
    return None

def test_hand_detection():
    print("\nTesting MediaPipe hand detection...")
    try:
        import mediapipe as mp
        
        mp_hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.3,
            min_tracking_confidence=0.3
        )
        
        # Create a simple test image with a hand-like shape
        test_image = np.ones((480, 640, 3), dtype=np.uint8) * 255
        
        # Convert to RGB
        rgb_image = cv2.cvtColor(test_image, cv2.COLOR_BGR2RGB)
        results = mp_hands.process(rgb_image)
        
        print("✓ MediaPipe hands module imported and initialized successfully")
        return True
        
    except Exception as e:
        print(f"✗ MediaPipe test failed: {e}")
        return False

if __name__ == "__main__":
    # Test camera
    working_camera = test_camera()
    
    # Test MediaPipe
    mp_working = test_hand_detection()
    
    print("\n" + "="*50)
    print("DIAGNOSIS:")
    
    if working_camera is not None:
        print(f"✓ Camera working on index: {working_camera}")
    else:
        print("✗ No working camera found")
        print("  - Check if camera is connected")
        print("  - Close other applications using the camera")
        print("  - Try running as administrator")
    
    if mp_working:
        print("✓ MediaPipe working correctly")
    else:
        print("✗ MediaPipe not working")
        print("  - Install: pip install mediapipe")
    
    print("\nIf both are working, the issue might be:")
    print("1. Missing training data file (file1.pkl)")
    print("2. Lighting conditions too poor for hand detection") 
    print("3. Hands not in camera view")
    print("4. Wrong coordinate scaling (width/height mismatch)")
