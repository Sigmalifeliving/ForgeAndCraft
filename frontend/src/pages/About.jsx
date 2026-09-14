import { Box, Mic, Image, Music, Shield, Zap, Globe } from 'lucide-react';

export default function About() {
  return (
    <div className="page-container">
      <h1 className="page-title">About ForgeCraft</h1>
      <p className="page-subtitle">One workspace for creating digital assets with AI</p>

      <div className="about-content">
        <div className="card about-section">
          <h3>What is ForgeCraft?</h3>
          <p>
            ForgeCraft is an AI-powered creative platform that lets you generate 3D models,
            voice narration, and more from simple text descriptions. Run locally or connect
            to cloud services for maximum flexibility.
          </p>
        </div>

        <div className="card about-section">
          <h3>Supported AI Models</h3>
          <div className="about-models">
            <div className="about-model">
              <Box size={20} className="gradient-text" />
              <div>
                <strong>TripoSR</strong>
                <p>Fast 3D mesh generation from text and images</p>
              </div>
            </div>
            <div className="about-model">
              <Mic size={20} className="gradient-text" />
              <div>
                <strong>ElevenLabs / Kokoro</strong>
                <p>Cloud and local text-to-speech engines</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card about-section">
          <h3>Key Features</h3>
          <div className="about-features">
            <div className="about-feature">
              <Zap size={18} />
              <span>Local generation - no cloud required</span>
            </div>
            <div className="about-feature">
              <Shield size={18} />
              <span>Privacy-first - your data stays on your machine</span>
            </div>
            <div className="about-feature">
              <Globe size={18} />
              <span>Multiple export formats</span>
            </div>
          </div>
        </div>

        <div className="card about-section">
          <h3>Future Integrations</h3>
          <div className="about-comming-soon">
            <span className="badge badge-info"><Image size={12} /> Image Generation</span>
            <span className="badge badge-info"><Music size={12} /> Music Generation</span>
            <span className="badge badge-info">Roblox Studio Plugin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
