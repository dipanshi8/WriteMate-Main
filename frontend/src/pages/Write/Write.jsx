// import React, { useState, useRef, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import { useAuth } from '../../context/AuthContext';
// import {
//   MicrophoneIcon,
//   HandRaisedIcon,
//   SpeakerWaveIcon,
//   SparklesIcon,
//   DocumentTextIcon,
//   ClockIcon,
//   BookOpenIcon
// } from '@heroicons/react/24/outline';

// const Write = () => {
//   const { voiceEnabled, gestureEnabled, setVoiceEnabled, setGestureEnabled, darkMode } = useAuth();
//   const [documentTitle, setDocumentTitle] = useState('');
//   const [content, setContent] = useState('');
//   const [transcript, setTranscript] = useState(''); // live transcript
//   const [isListening, setIsListening] = useState(false); // whether server is listening
//   const pollRef = useRef(null); // interval ref for polling transcript

//   const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
//   const characterCount = content.length;
//   const readingTime = Math.ceil(wordCount / 200);

//   // Start/Stop voice: call backend endpoints
//   const toggleVoice = async () => {
//     if (!voiceEnabled) {
//       try {
//         const res = await fetch('http://127.0.0.1:5000/voice/start', { method: 'POST' });
//         const data = await res.json();
//         if (res.ok && data.success) {
//           setVoiceEnabled(true);
//           setIsListening(true);
//           setTranscript('');
//           pollRef.current = setInterval(async () => {
//             try {
//               const r = await fetch('http://127.0.0.1:5000/voice/transcript');
//               const j = await r.json();
//               const t = j.transcript || '';
//               setTranscript(t);
//               setContent(t);
//             } catch (err) {
//               console.error('poll transcript error', err);
//             }
//           }, 800);
//         } else {
//           console.error('Could not start voice:', data);
//         }
//       } catch (err) {
//         console.error('Error starting voice:', err);
//       }
//     } else {
//       try {
//         if (pollRef.current) {
//           clearInterval(pollRef.current);
//           pollRef.current = null;
//         }

//         const res = await fetch('http://127.0.0.1:5000/voice/stop', { method: 'POST' });

//         if (res.ok) {
//           const blob = await res.blob();
//           let filename = 'output.svg';
//           const cd = res.headers.get('Content-Disposition') || '';
//           const match = cd.match(/filename="?([^"]+)"?/);
//           if (match && match[1]) filename = match[1];

//           const url = window.URL.createObjectURL(blob);
//           const a = document.createElement('a');
//           a.href = url;
//           a.download = filename;
//           document.body.appendChild(a);
//           a.click();
//           a.remove();
//           window.URL.revokeObjectURL(url);

//           try {
//             const rr = await fetch('http://127.0.0.1:5000/voice/transcript');
//             const jj = await rr.json();
//             const finalT = jj.transcript || '';
//             setTranscript(finalT);
//             setContent(finalT);
//           } catch (err) {
//             console.error('final transcript fetch failed', err);
//           }
//         } else {
//           const j = await res.json().catch(() => ({}));
//           console.error('Stop returned error', j);
//         }
//       } catch (err) {
//         console.error('Error stopping voice:', err);
//       } finally {
//         setVoiceEnabled(false);
//         setIsListening(false);
//         if (pollRef.current) {
//           clearInterval(pollRef.current);
//           pollRef.current = null;
//         }
//       }
//     }
//   };

//   // Start/Stop gestures: call backend endpoints
//   const toggleGesture = async () => {
//     if (!gestureEnabled) {
//       try {
//         const res = await fetch('http://127.0.0.1:5000/gesture/start', { method: 'POST' });
//         const data = await res.json();
//         if (res.ok && data.success) {
//           setGestureEnabled(true);
//           setTranscript('');
//           pollRef.current = setInterval(async () => {
//             try {
//               const r = await fetch('http://127.0.0.1:5000/gesture/transcript');
//               const j = await r.json();
//               const t = j.transcript || '';
//               setTranscript(t);
//               setContent(t);
//             } catch (err) {
//               console.error('poll gesture transcript error', err);
//             }
//           }, 800);
//         } else {
//           console.error('Could not start gesture:', data);
//         }
//       } catch (err) {
//         console.error('Error starting gesture:', err);
//       }
//     } else {
//       try {
//         if (pollRef.current) {
//           clearInterval(pollRef.current);
//           pollRef.current = null;
//         }

//         const res = await fetch('http://127.0.0.1:5000/gesture/stop', { method: 'POST' });

//         if (res.ok) {
//           const blob = await res.blob();
//           let filename = 'gesture.svg';
//           const cd = res.headers.get('Content-Disposition') || '';
//           const match = cd.match(/filename="?([^"]+)"?/);
//           if (match && match[1]) filename = match[1];

//           const url = window.URL.createObjectURL(blob);
//           const a = document.createElement('a');
//           a.href = url;
//           a.download = filename;
//           document.body.appendChild(a);
//           a.click();
//           a.remove();
//           window.URL.revokeObjectURL(url);

//           try {
//             const rr = await fetch('http://127.0.0.1:5000/gesture/transcript');
//             const jj = await rr.json();
//             const finalT = jj.transcript || '';
//             setTranscript(finalT);
//             setContent(finalT);
//           } catch (err) {
//             console.error('final gesture transcript fetch failed', err);
//           }
//         } else {
//           const j = await res.json().catch(() => ({}));
//           console.error('Stop gesture returned error', j);
//         }
//       } catch (err) {
//         console.error('Error stopping gesture:', err);
//       } finally {
//         setGestureEnabled(false);
//         if (pollRef.current) {
//           clearInterval(pollRef.current);
//           pollRef.current = null;
//         }
//       }
//     }
//   };

//   useEffect(() => {
//   if (gestureEnabled) {
//       navigator.mediaDevices.getUserMedia({ video: true })
//         .then(stream => {
//           const videoElement = document.createElement("video");
//           videoElement.srcObject = stream;
//           videoElement.play();
//           document.body.appendChild(videoElement); // just for testing, later render in React
//         })
//         .catch(err => console.error("Camera access denied:", err));
//     }
//   }, [gestureEnabled]);


//   const sendFrame = async (videoElement) => {
//     const canvas = document.createElement("canvas");
//     canvas.width = videoElement.videoWidth;
//     canvas.height = videoElement.videoHeight;
//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

//     const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
//     const formData = new FormData();
//     formData.append("frame", blob);

//     await fetch("http://127.0.0.1:5000/gesture/frame", {
//       method: "POST",
//       body: formData
//     });
//   };


//   useEffect(() => {
//     return () => {
//       if (pollRef.current) {
//         clearInterval(pollRef.current);
//       }
//     };
//   }, []);

//   return (
//     <div
//       className={`min-h-screen pt-24 pb-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
//         darkMode ? 'bg-gray-900' : 'bg-gray-50'
//       }`}
//     >
//       <div className="max-w-7xl mx-auto">
//         <div className="flex flex-col lg:flex-row gap-8">
//           <div className="flex-1">
//             <motion.div
//               className={`backdrop-blur-md rounded-2xl border transition-colors duration-300 ${
//                 darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/30 border-white/20'
//               }`}
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.6 }}
//             >
//               <div
//                 className={`p-6 border-b transition-colors ${
//                   darkMode ? 'border-gray-700' : 'border-white/20'
//                 }`}
//               >
//                 <div className="flex items-center justify-between">
//                   <div className="flex-1">
//                     <h1
//                       className={`text-3xl font-bold mb-2 ${
//                         darkMode ? 'text-white' : 'text-gray-800'
//                       }`}
//                     >
//                       <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
//                         Write
//                       </span>{' '}
//                       Mode
//                     </h1>
//                     <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
//                       Express your ideas with voice, gestures, or keyboard
//                     </p>
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
//                       {wordCount} words
//                     </span>
//                     <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-semibold hover:from-orange-600 hover:to-pink-600 transition-all duration-200">
//                       Save Document
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               <div
//                 className={`p-6 border-b transition-colors ${
//                   darkMode ? 'border-gray-700' : 'border-white/20'
//                 }`}
//               >
//                 <input
//                   type="text"
//                   placeholder="Enter document title..."
//                   value={documentTitle}
//                   onChange={(e) => setDocumentTitle(e.target.value)}
//                   className={`w-full text-2xl font-semibold bg-transparent border-none outline-none placeholder-gray-400 ${
//                     darkMode ? 'text-white' : 'text-gray-800'
//                   }`}
//                 />
//               </div>

//               <div className="p-6">
//                 <textarea
//                   placeholder="Start writing... Use voice commands or gestures for a hands-free experience."
//                   value={content}
//                   onChange={(e) => setContent(e.target.value)}
//                   className={`w-full h-96 text-lg bg-transparent border-none outline-none resize-none leading-relaxed placeholder-gray-400 ${
//                     darkMode ? 'text-white' : 'text-gray-800'
//                   }`}
//                 />
//                 {transcript && (
//                   <div className={`mt-4 p-3 rounded-lg text-sm ${
//                     darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
//                   }`}>
//                     <strong>Live Transcript:</strong> {transcript}
//                   </div>
//                 )}
//               </div>
//             </motion.div>
//           </div>

//           <div className="lg:w-80 space-y-6">
//             <motion.div
//               className={`backdrop-blur-md rounded-2xl p-6 border transition-colors duration-300 ${
//                 darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/30 border-white/20'
//               }`}
//               initial={{ opacity: 0, x: 20 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ duration: 0.6, delay: 0.2 }}
//             >
//               <h3
//                 className={`text-xl font-bold mb-4 flex items-center ${
//                   darkMode ? 'text-white' : 'text-gray-800'
//                 }`}
//               >
//                 <SparklesIcon className="w-5 h-5 mr-2" />
//                 Input Controls
//               </h3>
//               <div className="space-y-4">
//                 <ControlButton
//                   active={isListening}
//                   onClick={toggleVoice}
//                   icon={MicrophoneIcon}
//                   label={isListening ? "Listening..." : "Start Voice"}
//                   enabled={true}
//                   darkMode={darkMode}
//                 />
//                 <ControlButton
//                   active={gestureEnabled}
//                   onClick={toggleGesture}
//                   icon={HandRaisedIcon}
//                   label="Start Gestures"
//                   enabled={true}
//                   darkMode={darkMode}
//                 />
//               </div>
//             </motion.div>
//             <motion.div
//               className={`backdrop-blur-md rounded-2xl p-6 border transition-colors duration-300 ${
//                 darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/30 border-white/20'
//               }`}
//               initial={{ opacity: 0, x: 20 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ duration: 0.6, delay: 0.3 }}
//             >
//               <h3
//                 className={`text-xl font-bold mb-4 flex items-center ${
//                   darkMode ? 'text-white' : 'text-gray-800'
//                 }`}
//               >
//                 <DocumentTextIcon className="w-5 h-5 mr-2" />
//                 Writing Stats
//               </h3>
//               <div className="space-y-4">
//                 <StatItem label="Words:" value={wordCount} darkMode={darkMode} />
//                 <StatItem label="Characters:" value={characterCount} darkMode={darkMode} />
//                 <StatItem label="Reading time:" value={`${readingTime} min`} darkMode={darkMode} />
//               </div>
//             </motion.div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// const ControlButton = ({ active, onClick, icon: Icon, label, enabled, darkMode }) => (
//   <button
//     onClick={onClick}
//     disabled={!enabled}
//     className={`w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
//       active && enabled
//         ? 'bg-orange-500 text-white shadow-lg'
//         : enabled
//         ? darkMode
//           ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
//           : 'bg-white/50 text-gray-700 hover:bg-white/70'
//         : 'bg-gray-200 text-gray-400 cursor-not-allowed'
//     }`}
//   >
//     <Icon className="w-5 h-5" />
//     <span className="font-medium">{label}</span>
//   </button>
// );

// const StatItem = ({ label, value, darkMode }) => (
//   <div className="flex justify-between items-center">
//     <span className={darkMode ? 'text-gray-300 font-medium' : 'text-gray-700 font-medium'}>
//       {label}
//     </span>
//     <span className={darkMode ? 'text-white font-bold' : 'text-gray-800 font-bold'}>{value}</span>
//   </div>
// );

// export default Write;


import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  MicrophoneIcon,
  HandRaisedIcon,
  SpeakerWaveIcon,
  SparklesIcon,
  DocumentTextIcon,
  ClockIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

const Write = () => {
  const { voiceEnabled, gestureEnabled, setVoiceEnabled, setGestureEnabled, darkMode } = useAuth();
  const [documentTitle, setDocumentTitle] = useState('');
  const [content, setContent] = useState('');
  const [transcript, setTranscript] = useState(''); // live transcript
  const [isListening, setIsListening] = useState(false); // whether server is listening
  const pollRef = useRef(null); // interval ref for polling transcript

  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = content.length;
  const readingTime = Math.ceil(wordCount / 200);

  // Start/Stop voice: call backend endpoints
  const toggleVoice = async () => {
    if (!voiceEnabled) {
      try {
        const res = await fetch('http://127.0.0.1:5000/voice/start', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          setVoiceEnabled(true);
          setIsListening(true);
          setTranscript('');
          pollRef.current = setInterval(async () => {
            try {
              const r = await fetch('http://127.0.0.1:5000/voice/transcript');
              const j = await r.json();
              const t = j.transcript || '';
              setTranscript(t);
              setContent(t);
            } catch (err) {
              console.error('poll transcript error', err);
            }
          }, 800);
        } else {
          console.error('Could not start voice:', data);
        }
      } catch (err) {
        console.error('Error starting voice:', err);
      }
    } else {
      try {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }

        const res = await fetch('http://127.0.0.1:5000/voice/stop', { method: 'POST' });

        if (res.ok) {
          // 🔽 download SVG file from response
          const blob = await res.blob();
          let filename = 'output.svg';
          const cd = res.headers.get('Content-Disposition') || '';
          const match = cd.match(/filename="?([^"]+)"?/);
          if (match && match[1]) filename = match[1];

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);

          // update transcript one last time
          try {
            const rr = await fetch('http://127.0.0.1:5000/voice/transcript');
            const jj = await rr.json();
            const finalT = jj.transcript || '';
            setTranscript(finalT);
            setContent(finalT);
          } catch (err) {
            console.error('final transcript fetch failed', err);
          }
        } else {
          const j = await res.json().catch(() => ({}));
          console.error('Stop returned error', j);
        }
      } catch (err) {
        console.error('Error stopping voice:', err);
      } finally {
        setVoiceEnabled(false);
        setIsListening(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }
  };

  // Start/Stop gestures: call backend endpoints
  const toggleGesture = async () => {
    if (!gestureEnabled) {
      try {
        const res = await fetch('http://127.0.0.1:5000/gesture/start', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          setGestureEnabled(true);
          setTranscript('');
          pollRef.current = setInterval(async () => {
            try {
              const r = await fetch('http://127.0.0.1:5000/gesture/transcript');
              const j = await r.json();
              const t = j.transcript || '';
              setTranscript(t);
              setContent(t);
            } catch (err) {
              console.error('poll gesture transcript error', err);
            }
          }, 800);
        } else {
          console.error('Could not start gesture:', data);
        }
      } catch (err) {
        console.error('Error starting gesture:', err);
      }
    } else {
      try {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }

        const res = await fetch('http://127.0.0.1:5000/gesture/stop', { method: 'POST' });

        if (res.ok) {
          // 🔽 download SVG file from response
          const blob = await res.blob();
          let filename = 'gesture.svg';
          const cd = res.headers.get('Content-Disposition') || '';
          const match = cd.match(/filename="?([^"]+)"?/);
          if (match && match[1]) filename = match[1];

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);

          // update transcript one last time
          try {
            const rr = await fetch('http://127.0.0.1:5000/gesture/transcript');
            const jj = await rr.json();
            const finalT = jj.transcript || '';
            setTranscript(finalT);
            setContent(finalT);
          } catch (err) {
            console.error('final gesture transcript fetch failed', err);
          }
        } else {
          const j = await res.json().catch(() => ({}));
          console.error('Stop gesture returned error', j);
        }
      } catch (err) {
        console.error('Error stopping gesture:', err);
      } finally {
        setGestureEnabled(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }
  };

  useEffect(() => {
    if (gestureEnabled) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          const videoElement = document.createElement("video");
          videoElement.srcObject = stream;
          videoElement.play();
          document.body.appendChild(videoElement); // just for testing, later render in React
        })
        .catch(err => console.error("Camera access denied:", err));
    }
  }, [gestureEnabled]);

  const sendFrame = async (videoElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
    const formData = new FormData();
    formData.append("frame", blob);

    await fetch("http://127.0.0.1:5000/gesture/frame", {
      method: "POST",
      body: formData
    });
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`min-h-screen pt-24 pb-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <motion.div
              className={`backdrop-blur-md rounded-2xl border transition-colors duration-300 ${
                darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/30 border-white/20'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div
                className={`p-6 border-b transition-colors ${
                  darkMode ? 'border-gray-700' : 'border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h1
                      className={`text-3xl font-bold mb-2 ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}
                    >
                      <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                        Write
                      </span>{' '}
                      Mode
                    </h1>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                      Express your ideas with voice, gestures, or keyboard
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {wordCount} words
                    </span>
                    <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-semibold hover:from-orange-600 hover:to-pink-600 transition-all duration-200">
                      Save Document
                    </button>
                  </div>
                </div>
              </div>

              <div
                className={`p-6 border-b transition-colors ${
                  darkMode ? 'border-gray-700' : 'border-white/20'
                }`}
              >
                <input
                  type="text"
                  placeholder="Enter document title..."
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className={`w-full text-2xl font-semibold bg-transparent border-none outline-none placeholder-gray-400 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}
                />
              </div>

              <div className="p-6">
                <textarea
                  placeholder="Start writing... Use voice commands or gestures for a hands-free experience."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`w-full h-96 text-lg bg-transparent border-none outline-none resize-none leading-relaxed placeholder-gray-400 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}
                />
                {transcript && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    <strong>Live Transcript:</strong> {transcript}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="lg:w-80 space-y-6">
            <motion.div
              className={`backdrop-blur-md rounded-2xl p-6 border transition-colors duration-300 ${
                darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/30 border-white/20'
              }`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3
                className={`text-xl font-bold mb-4 flex items-center ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                Input Controls
              </h3>
              <div className="space-y-4">
                <ControlButton
                  active={isListening}
                  onClick={toggleVoice}
                  icon={MicrophoneIcon}
                  label={isListening ? "Listening..." : "Start Voice"}
                  enabled={true}
                  darkMode={darkMode}
                />
                <ControlButton
                  active={gestureEnabled}
                  onClick={toggleGesture}
                  icon={HandRaisedIcon}
                  label="Start Gestures"
                  enabled={true}
                  darkMode={darkMode}
                />
              </div>
            </motion.div>
            <motion.div
              className={`backdrop-blur-md rounded-2xl p-6 border transition-colors duration-300 ${
                darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/30 border-white/20'
              }`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3
                className={`text-xl font-bold mb-4 flex items-center ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Writing Stats
              </h3>
              <div className="space-y-4">
                <StatItem label="Words:" value={wordCount} darkMode={darkMode} />
                <StatItem label="Characters:" value={characterCount} darkMode={darkMode} />
                <StatItem label="Reading time:" value={`${readingTime} min`} darkMode={darkMode} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlButton = ({ active, onClick, icon: Icon, label, enabled, darkMode }) => (
  <button
    onClick={onClick}
    disabled={!enabled}
    className={`w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active && enabled
        ? 'bg-orange-500 text-white shadow-lg'
        : enabled
        ? darkMode
          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          : 'bg-white/50 text-gray-700 hover:bg-white/70'
        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

const StatItem = ({ label, value, darkMode }) => (
  <div className="flex justify-between items-center">
    <span className={darkMode ? 'text-gray-300 font-medium' : 'text-gray-700 font-medium'}>
      {label}
    </span>
    <span className={darkMode ? 'text-white font-bold' : 'text-gray-800 font-bold'}>{value}</span>
  </div>
);

export default Write;
