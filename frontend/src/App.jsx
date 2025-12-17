// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { AuthProvider } from './context/AuthContext';
// import Layout from './components/Layout/Layout';
// import Landing from './pages/Landing/Landing';
// import Dashboard from './pages/Dashboard/Dashboard';
// import Write from './pages/Write/Write';
// import Documents from './pages/Documents/Documents';
// import Settings from './pages/Settings/Settings';
// import Profile from './pages/Profile/Profile';
// import SignIn from './pages/Auth/SignIn';
// import SignUp from './pages/Auth/SignUp';
// import About from './pages/About/About';
// import Contact from './pages/Contact/Contact';
// import { useAuth } from './context/AuthContext';

// const AppContent = () => {
//   const { darkMode } = useAuth();
  
//   return (
//     <div className={`min-h-screen transition-colors duration-300 ${
//       darkMode 
//         ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
//         : 'bg-gradient-to-br from-orange-50 via-pink-50 to-orange-100'
//     }`}>
//       <Routes>
//         <Route path="/signin" element={<SignIn />} />
//         <Route path="/signup" element={<SignUp />} />
//         <Route path="/" element={<Layout />}>
//           <Route index element={<Landing />} />
//           <Route path="dashboard" element={<Dashboard />} />
//           <Route path="write" element={<Write />} />
//           <Route path="documents" element={<Documents />} />
//           <Route path="settings" element={<Settings />} />
//           <Route path="profile" element={<Profile />} />
//           <Route path="about" element={<About />} />
//           <Route path="contact" element={<Contact />} />
//         </Route>
//       </Routes>
//     </div>
//   );
// };

// function App() {
//   return (
//     <AuthProvider>
//       <Router>
//         <AppContent />
//       </Router>
//     </AuthProvider>
//   );
// }

// export default App;

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing/Landing';
import Dashboard from './pages/Dashboard/Dashboard';
import Write from './pages/Write/Write';
import Documents from './pages/Documents/Documents';
import Settings from './pages/Settings/Settings';
import Profile from './pages/Profile/Profile';
import SignIn from './pages/Auth/SignIn';
import SignUp from './pages/Auth/SignUp';
import About from './pages/About/About';
import Contact from './pages/Contact/Contact';
import { useAuth } from './context/AuthContext';

// ---------------- Voice Page ----------------
function VoicePage() {
  const [text, setText] = useState("");
  const [svgUrl, setSvgUrl] = useState("");
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.start();
    setMediaRecorder(recorder);

    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const formData = new FormData();
        formData.append("file", e.data, "chunk.wav");

        const res = await fetch("http://127.0.0.1:5000/realtime-speech", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (result.recognized_text) {
          setText((prev) => prev + " " + result.recognized_text);
          setSvgUrl(`http://127.0.0.1:5000${result.svg_url}`);
        }
      }
    };
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">🎤 Voice to SVG</h1>
      <button onClick={startRecording} className="bg-green-500 text-white px-4 py-2 rounded mr-2">
        Start Recording
      </button>
      <button onClick={stopRecording} className="bg-red-500 text-white px-4 py-2 rounded">
        Stop Recording
      </button>

      <p className="mt-4">Recognized Text: {text}</p>
      {svgUrl && (
        <div className="mt-4">
          <h2 className="font-semibold">Generated SVG:</h2>
          <img src={svgUrl} alt="SVG Output" />
        </div>
      )}
    </div>
  );
}

// ---------------- App Layout ----------------
const AppContent = () => {
  const { darkMode } = useAuth();
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
        : 'bg-gradient-to-br from-orange-50 via-pink-50 to-orange-100'
    }`}>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="write" element={<Write />} />
          <Route path="documents" element={<Documents />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="voice" element={<VoicePage />} /> {/* ✅ New Voice Route */}
        </Route>
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
