"use client";

import { useState } from "react";
import { IconMicrophone } from "@tabler/icons-react";

export function VoiceEnrollment() {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [status, setStatus] = useState("");

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      setStatus("Recording enrollment sample... Speak now");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("audio", audioBlob);

        const response = await fetch("/api/auth/enroll", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Enrollment failed");
        }

        setStatus("Voice profile enrolled successfully");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
        setIsEnrolling(false);
      }, 5000); // Record for 5 seconds
    } catch (error) {
      console.error("Enrollment error:", error);
      setStatus("Error during enrollment");
      setIsEnrolling(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleEnroll}
        disabled={isEnrolling}
        className={`p-4 rounded-full bg-green-500 hover:bg-green-600 transition-colors ${
          isEnrolling ? "opacity-50 cursor-not-allowed" : ""
        }`}
        aria-label="Enroll voice profile"
      >
        <IconMicrophone size={48} className="theme-text-accent" />
      </button>
      {status && <p className="mt-4 text-sm text-white/80">{status}</p>}
    </div>
  );
}
