import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { TOOLBOX_SECTIONS } from '../data/toolboxData';
import ToolboxThumbnail from '../components/ToolboxThumbnails';
import ToolboxModal from '../components/ToolboxModals';
import { assetService } from '../services/assets';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  const [recentAssets, setRecentAssets] = useState([]);
  const rowRefs = useRef({});

  useEffect(() => {
    let mounted = true;
    assetService.list()
      .then((res) => {
        if (mounted && Array.isArray(res)) {
          setRecentAssets(res.slice(0, 4));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleScroll = (sectionId, direction) => {
    const el = rowRefs.current[sectionId];
    if (el) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleToolClick = (tool, section) => {
    if (tool.actionType) {
      setActiveModal({ tool, platform: section.id });
    } else if (tool.route) {
      navigate(tool.route);
    }
  };

  return (
    <div className="toolbox-hub-page">
      {/* Background ambient lighting */}
      <div className="toolbox-ambient-glow glow-1" />
      <div className="toolbox-ambient-glow glow-2" />

      {/* Main Toolboxes Container */}
      <div className="toolbox-hub-container">
        {TOOLBOX_SECTIONS.map((section) => (
          <section key={section.id} className="toolbox-section">
            {/* Section Header */}
            <div className="toolbox-section-header">
              <div className="toolbox-title-wrapper">
                <h2 className="toolbox-game-title">
                  <span className={`game-name ${section.id}`}>{section.title}</span>
                  <span className="toolbox-word">{section.titleSuffix}</span>
                </h2>
                {section.badge && (
                  <span className={`toolbox-section-badge ${section.id}`}>
                    {section.badge}
                  </span>
                )}
              </div>

              {/* Navigation Arrow Controls */}
              <div className="toolbox-carousel-arrows">
                <button
                  type="button"
                  className="carousel-arrow prev"
                  onClick={() => handleScroll(section.id, 'left')}
                  aria-label={`Scroll ${section.title} left`}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="carousel-arrow next"
                  onClick={() => handleScroll(section.id, 'right')}
                  aria-label={`Scroll ${section.title} right`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Horizontal Cards Carousel */}
            <div
              className="toolbox-cards-carousel"
              ref={(el) => (rowRefs.current[section.id] = el)}
            >
              {section.tools.map((tool) => (
                <div key={tool.id} className="toolbox-card">
                  {/* Card Thumbnail / Artwork */}
                  <div
                    className="toolbox-card-thumb-container"
                    onClick={() => handleToolClick(tool, section)}
                  >
                    <ToolboxThumbnail
                      imageKey={tool.imageKey}
                      title={tool.title}
                      theme={tool.theme}
                    />
                    <div className="toolbox-card-overlay-shine" />
                  </div>

                  {/* Card Content & Action Button */}
                  <div className="toolbox-card-info">
                    <div className="toolbox-card-text">
                      <h3 className="toolbox-card-title">{tool.title}</h3>
                      <p className="toolbox-card-subtitle">{tool.subtitle}</p>
                    </div>

                    <button
                      type="button"
                      className="toolbox-btn-try"
                      onClick={() => handleToolClick(tool, section)}
                    >
                      {tool.buttonText}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Quick Recent Creations Tray */}
        {recentAssets.length > 0 && (
          <section className="toolbox-recent-section">
            <div className="toolbox-recent-header">
              <span className="recent-tray-title">Your Recent Generations</span>
              <button
                type="button"
                className="btn-text view-all"
                onClick={() => navigate('/assets')}
              >
                View all in Catalog <ArrowRight size={14} />
              </button>
            </div>
            <div className="toolbox-recent-grid">
              {recentAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="toolbox-recent-chip"
                  onClick={() => navigate(`/assets/${asset.id}`)}
                >
                  <div className="chip-indicator" />
                  <span className="chip-name">{asset.name}</span>
                  <span className="chip-badge">{asset.format?.toUpperCase() || asset.type}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Interactive Studio Modal for GUI / Code / SFX */}
      <ToolboxModal
        modalData={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}