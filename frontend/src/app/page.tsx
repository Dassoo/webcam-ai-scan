"use client";
import { useRef, useState } from 'react';
import { Lato } from 'next/font/google';
import { FiCopy } from 'react-icons/fi';
import { FaGithub } from "react-icons/fa";
import { FaLinkedin } from "react-icons/fa";
import { FaEnvelope } from "react-icons/fa";
 
const customFont = Lato({
  weight: '400',
  subsets: ['latin'],
})

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [handlingOCR, setHandlingOCR] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>("");

  const toggleCamera = async () => {
    try {
      if (isStreaming) {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        // Ferma tutti i track dello stream memorizzato
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setIsStreaming(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream; // Memorizza lo stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsStreaming(true);
      }
    } catch (error) {
      console.error("Camera access denied:", error);
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(ocrResult || "");
    alert("Contenuto copiato negli appunti!");
  };

  const handleOcr = async () => {
    setHandlingOCR(true);
    if (!isStreaming || !videoRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !videoRef.current) return;

    canvas.width = 800;
    canvas.height = 450;
    ctx.drawImage(videoRef.current, 0, 0, 800, 450);
    
    const blob = await new Promise<Blob>(resolve => 
      canvas.toBlob(blob => blob && resolve(blob), 'image/jpeg')
    );

    const formData = new FormData();
    formData.append('image', blob, 'frame.jpg');

    try {
      const response = await fetch('https://webcam-ai-scan.onrender.com/scan', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) setOcrResult("Scan failed, try again.");
      const result = await response.json();
      setOcrResult(JSON.stringify(result, null, 2));
      setHandlingOCR(false)
    } catch (error) {
      setHandlingOCR(false)
      setOcrResult("Scan failed, try again.");
      console.error('Error:', error);
    }
  };

  return (
    <div className={`${customFont.className} font-sans bg-slate-800 text-gray-900 antialiased`}>
      <h1 className="text-4xl bg-slate-900 text-white font-bold pt-10 pb-5 text-center">
          Webcam JSON Scan/OCR
        </h1>
        <div className="bg-slate-900 text-center pb-10 mb-5 text-white">
          Image Understanding tool powered by Mistral AI, using frames taken from your camera.
        </div>
      <div className="container mx-auto py-8 px-8 max-w-7xl">

        <div className="grid grid-cols-2 gap-12">
          {/* Left Column: Webcam */}
          <div className="shadow-lg rounded-lg overflow-hidden">
            <video  
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover block bg-slate-700`}
              style={{ height: '450px' }}
            />

            <div className="p-4 bg-slate-900 flex justify-center gap-4 items-center">
              <button
                onClick={toggleCamera}
                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`}
              >
                {isStreaming ? "Close Camera" : "Open Camera"}
              </button>

              <button
                onClick={handleOcr}
                className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                  handlingOCR ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!isStreaming || handlingOCR}
              >
                {handlingOCR ? "Loading..." : "Scan Frame"}
              </button>
            </div>
          </div>

          {/* Right Column: OCR Results */}
          <div className="bg-slate-700 shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <h2 className="text-xl text-white font-semibold mb-0">JSON</h2>
              </div>
              <button 
                onClick={handleCopy}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiCopy size={20} />
              </button>
            </div>
            <div className="p-6">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap break-words overflow-auto h-[400px]">
                {ocrResult || "Open the camera using the blue button on the bottom left and start the scan with the red button to begin."}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center footer sm:footer-horizontal footer-center bg-slate-900 text-white mt-10 p-6">
        <aside className="mb-5">
          <p>Copyright © {new Date().getFullYear()} - All right reserved by Federico Dassiè and Mistral</p>
        </aside>
        <div className="flex justify-center space-x-4">
          <a 
            href="https://github.com/Dassoo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaGithub size={35} />
          </a>
          <a 
            href="https://linkedin.com/in/federico-dassi%C3%A8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaLinkedin size={35} />
          </a>
          <a 
            href="mailto:federico.dassie@gmail.com"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaEnvelope size={35} />
          </a>
        </div>
      </footer>

    </div>
  );
}
