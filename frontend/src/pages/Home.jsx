import { Link } from 'react-router-dom';
import { Box, Mic, Image, ArrowRight, Sparkles, Download, Zap } from 'lucide-react';

const tools = [
  {
    icon: Box,
    title: '3D Generator',
    description: 'Generate 3D models from text prompts and reference images.',
    to: '/create/3d',
    status: 'available',
  },
  {
    icon: Mic,
    title: 'Voice Generator',
    description: 'Create speech and narration from text with AI voices.',
    to: '/create/voice',
    status: 'available',
  },
  {
    icon: Image,
    title: 'Image Generator',
    description: 'Generate images and textures with AI.',
    to: '#',
    status: 'coming-soon',
  },
];

const features = [
  { icon: Sparkles, title: 'AI-Powered', desc: 'Built-in local AI models for generation.' },
  { icon: Download, title: 'Export Anywhere', desc: 'Download in GLB, OBJ, MP3, WAV and more.' },
  { icon: Zap, title: 'Fast Generation', desc: 'Optimized pipelines with progress tracking.' },
];

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-glow" />
        <h1 className="hero-title">
          Create <span className="gradient-text">Without Limits</span>
        </h1>
        <p className="hero-subtitle">
          Turn your ideas into digital assets. Generate 3D models, voice narration, and more with AI.
        </p>
        <Link to="/dashboard" className="btn btn-primary btn-lg">
          Start Creating
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="tools-section">
        <h2 className="section-title">AI Tools</h2>
        <div className="tools-grid">
          {tools.map((tool) => (
            <Link
              key={tool.title}
              to={tool.to}
              className={`tool-card ${tool.status === 'coming-soon' ? 'disabled' : ''}`}
            >
              <div className="tool-icon">
                <tool.icon size={28} />
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
              {tool.status === 'coming-soon' ? (
                <span className="badge badge-warning">Coming Soon</span>
              ) : (
                <span className="tool-arrow">
                  <ArrowRight size={16} />
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Why ForgeCraft?</h2>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <f.icon size={24} className="gradient-text" />
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="formats-section">
        <h2 className="section-title">Supported Formats</h2>
        <div className="formats-row">
          {['GLB', 'OBJ', 'FBX', 'MP3', 'WAV', 'OGG'].map((fmt) => (
            <span key={fmt} className="format-badge">{fmt}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
