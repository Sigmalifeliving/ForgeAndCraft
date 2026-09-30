import React from 'react';

export default function ToolboxThumbnail({ imageKey, title }) {
  switch (imageKey) {
    // -------------------------------------------------------------
    // ROBLOX 3D ASSETS
    // -------------------------------------------------------------
    case 'roblox-3d':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="r3d-sky" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0f172a" />
              <stop offset="0.6" stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#311042" />
            </linearGradient>
            <linearGradient id="r3d-tower" x1="140" y1="60" x2="260" y2="200" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e2e8f0" />
              <stop offset="1" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="r3d-roof" x1="150" y1="20" x2="250" y2="80" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f43f5e" />
              <stop offset="1" stopColor="#9f1239" />
            </linearGradient>
            <linearGradient id="r3d-gold" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fbbf24" />
              <stop offset="1" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#r3d-sky)" />
          
          {/* Mountains and horizon */}
          <path d="M-20 180 L80 120 L160 170 L280 110 L380 170 L420 150 L420 220 L-20 220 Z" fill="#1e1e38" opacity="0.7" />
          <path d="M20 200 L120 150 L220 200 L320 140 L420 190 L420 220 L20 220 Z" fill="#131326" />
          
          {/* Stylized Roblox 3D Tower & windmill */}
          <rect x="175" y="90" width="50" height="110" rx="4" fill="url(#r3d-tower)" />
          <polygon points="170,90 200,30 230,90" fill="url(#r3d-roof)" />
          <polygon points="196,22 204,22 200,10" fill="#fbbf24" />
          {/* Tower windows */}
          <rect x="190" y="110" width="20" height="28" rx="10" fill="#38bdf8" opacity="0.9" />
          <rect x="193" y="155" width="14" height="20" rx="4" fill="#0f172a" />
          
          {/* Left windmill / companion structure */}
          <rect x="75" y="125" width="34" height="75" rx="3" fill="#cbd5e1" />
          <polygon points="70,125 92,85 114,125" fill="#f59e0b" />
          {/* Windmill blades */}
          <g transform="translate(92, 105)">
            <line x1="-35" y1="0" x2="35" y2="0" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            <line x1="0" y1="-35" x2="0" y2="35" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            <circle cx="0" cy="0" r="5" fill="#e11d48" />
          </g>

          {/* Right watchtower */}
          <rect x="290" y="115" width="38" height="85" rx="3" fill="#94a3b8" />
          <polygon points="285,115 309,75 333,115" fill="#0284c7" />
          <rect x="303" y="130" width="12" height="16" rx="6" fill="#fef08a" />

          {/* Floating 3D mesh wireframe accents */}
          <polygon points="200,60 215,70 200,80 185,70" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="340" cy="45" r="14" fill="#facc15" opacity="0.8" />
          <path d="M30 40 Q45 25 65 35 Q85 20 105 35 Q115 45 100 55 Q35 55 30 40 Z" fill="#ffffff" opacity="0.15" />
          
          {/* 3D Asset badge overlay */}
          <g transform="translate(18, 18)">
            <rect width="90" height="24" rx="12" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" />
            <text x="45" y="16" fill="#60a5fa" fontSize="11" fontWeight="700" textAnchor="middle" letterSpacing="0.5">STUDIO 3D</text>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // ROBLOX GUI
    // -------------------------------------------------------------
    case 'roblox-gui':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rgui-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0c1222" />
              <stop offset="1" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="rgui-frame" x1="120" y1="20" x2="280" y2="200" gradientUnits="userSpaceOnUse">
              <stop stopColor="#334155" />
              <stop offset="1" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#rgui-bg)" />

          {/* Grid background */}
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
            <line x1="0" y1="40" x2="400" y2="40" /><line x1="0" y1="80" x2="400" y2="80" />
            <line x1="0" y1="120" x2="400" y2="120" /><line x1="0" y1="160" x2="400" y2="160" />
            <line x1="100" y1="0" x2="100" y2="220" /><line x1="200" y1="0" x2="200" y2="220" />
            <line x1="300" y1="0" x2="300" y2="220" />
          </g>

          {/* Roblox GUI Window Mockup (Like screenshot "APPS" dialog) */}
          <g transform="translate(110, 18)">
            {/* Window Frame with dropshadow */}
            <rect width="180" height="184" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.6))" />
            
            {/* Window Title Bar */}
            <rect width="180" height="30" rx="8" fill="#0f172a" />
            <rect y="22" width="180" height="8" fill="#0f172a" />
            <text x="24" y="20" fill="#f8fafc" fontSize="11" fontWeight="800" letterSpacing="1">SHOP & APPS</text>
            {/* Red 'X' close button */}
            <rect x="154" y="6" width="18" height="18" rx="4" fill="#ef4444" />
            <path d="M159 11 L167 19 M167 11 L159 19" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />

            {/* Row 1: Rocks / Mining */}
            <rect x="12" y="38" width="156" height="30" rx="5" fill="#334155" stroke="#475569" />
            <circle cx="27" cy="53" r="8" fill="#94a3b8" />
            <text x="44" y="52" fill="#f1f5f9" fontSize="10" fontWeight="700">Ores & Rocks</text>
            <rect x="128" y="44" width="34" height="18" rx="4" fill="#10b981" />
            <text x="145" y="56" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">MINE</text>

            {/* Row 2: Upgrades */}
            <rect x="12" y="74" width="156" height="30" rx="5" fill="#1e293b" stroke="#22c55e" strokeWidth="1.5" />
            <circle cx="27" cy="89" r="8" fill="#22c55e" />
            <text x="44" y="88" fill="#4ade80" fontSize="10" fontWeight="700">Upgrades</text>
            <rect x="128" y="80" width="34" height="18" rx="4" fill="#3b82f6" />
            <text x="145" y="92" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">MAX</text>

            {/* Row 3: Store */}
            <rect x="12" y="110" width="156" height="30" rx="5" fill="#334155" stroke="#475569" />
            <circle cx="27" cy="125" r="8" fill="#fbbf24" />
            <text x="44" y="124" fill="#f1f5f9" fontSize="10" fontWeight="700">Game Store</text>
            <rect x="128" y="116" width="34" height="18" rx="4" fill="#f59e0b" />
            <text x="145" y="128" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">BUY</text>

            {/* Row 4: Statistics */}
            <rect x="12" y="146" width="156" height="28" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="27" cy="160" r="7" fill="#38bdf8" />
            <text x="44" y="159" fill="#93c5fd" fontSize="9" fontWeight="700">Leaderboard</text>
            <text x="145" y="159" fill="#38bdf8" fontSize="10" fontWeight="800" textAnchor="middle">#1</text>
          </g>

          {/* Left/Right Floating GUI widgets */}
          <g transform="translate(18, 50)">
            <rect width="65" height="50" rx="6" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="32" y="24" fill="#93c5fd" fontSize="9" fontWeight="700" textAnchor="middle">HEALTH</text>
            <rect x="8" y="32" width="49" height="8" rx="4" fill="#1e293b" />
            <rect x="8" y="32" width="38" height="8" rx="4" fill="#ef4444" />
          </g>

          <g transform="translate(315, 60)">
            <rect width="65" height="55" rx="6" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
            <text x="32" y="22" fill="#fde047" fontSize="9" fontWeight="700" textAnchor="middle">COINS</text>
            <text x="32" y="42" fill="#ffffff" fontSize="12" fontWeight="800" textAnchor="middle">24,500</text>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // ROBLOX CODE (LUAU)
    // -------------------------------------------------------------
    case 'roblox-code':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rcode-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#090d16" />
              <stop offset="1" stopColor="#131b2e" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#rcode-bg)" />

          {/* Code Window Container */}
          <g transform="translate(35, 20)">
            <rect width="330" height="180" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            
            {/* Header bar with tabs & buttons */}
            <rect width="330" height="28" rx="8" fill="#1e293b" />
            <rect y="20" width="330" height="8" fill="#1e293b" />
            {/* Window control dots */}
            <circle cx="16" cy="14" r="4" fill="#ef4444" />
            <circle cx="28" cy="14" r="4" fill="#f59e0b" />
            <circle cx="40" cy="14" r="4" fill="#10b981" />
            
            <rect x="65" y="4" width="110" height="20" rx="4" fill="#0f172a" />
            <text x="120" y="17" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="middle">ServerScript.luau</text>
            <text x="285" y="18" fill="#3b82f6" fontSize="10" fontWeight="700">Luau 5.1</text>

            {/* Code lines with syntax highlighting */}
            <g fontFamily="monospace" fontSize="11">
              {/* Line 1 */}
              <text x="14" y="52" fill="#64748b">1</text>
              <text x="36" y="52">
                <tspan fill="#f43f5e">local </tspan>
                <tspan fill="#e2e8f0">part = </tspan>
                <tspan fill="#38bdf8">script</tspan>
                <tspan fill="#e2e8f0">.</tspan>
                <tspan fill="#a855f7">Parent</tspan>
              </text>

              {/* Line 2 */}
              <text x="14" y="74" fill="#64748b">2</text>
              <text x="36" y="74">
                <tspan fill="#f43f5e">local function </tspan>
                <tspan fill="#38bdf8">spawnReward</tspan>
                <tspan fill="#e2e8f0">(player)</tspan>
              </text>

              {/* Line 3 */}
              <text x="14" y="96" fill="#64748b">3</text>
              <text x="50" y="96">
                <tspan fill="#f43f5e">for </tspan>
                <tspan fill="#e2e8f0">i = 1, 5 </tspan>
                <tspan fill="#f43f5e">do</tspan>
              </text>

              {/* Line 4 */}
              <text x="14" y="118" fill="#64748b">4</text>
              <text x="64" y="118">
                <tspan fill="#38bdf8">emitVoxelSpark</tspan>
                <tspan fill="#e2e8f0">(part.</tspan>
                <tspan fill="#a855f7">Position</tspan>
                <tspan fill="#e2e8f0">)</tspan>
              </text>

              {/* Line 5 */}
              <text x="14" y="140" fill="#64748b">5</text>
              <text x="50" y="140">
                <tspan fill="#f43f5e">end</tspan>
              </text>

              {/* Line 6 */}
              <text x="14" y="162" fill="#64748b">6</text>
              <text x="36" y="162">
                <tspan fill="#f43f5e">end</tspan>
              </text>
            </g>
          </g>

          {/* Left Code Symbol Emblem */}
          <g transform="translate(18, 80)">
            <rect width="40" height="40" rx="8" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M26 14 L20 20 L26 26 M14 14 L8 20 L14 26" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(3,0)" />
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // ROBLOX SOUND EFFECTS (SFX)
    // -------------------------------------------------------------
    case 'roblox-sfx':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rsfx-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0a0a0f" />
              <stop offset="0.6" stopColor="#1e1800" />
              <stop offset="1" stopColor="#2e2000" />
            </linearGradient>
            <linearGradient id="rsfx-head" x1="180" y1="40" x2="280" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fde047" />
              <stop offset="1" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#rsfx-bg)" />

          {/* Audio Waveform Equalizer Background */}
          <g transform="translate(20, 120)">
            {[18, 35, 60, 45, 75, 90, 40, 65, 80, 55, 30, 70, 85, 45, 95, 60, 40, 25].map((h, i) => (
              <rect
                key={i}
                x={i * 20}
                y={-h / 2}
                width="8"
                height={h}
                rx="4"
                fill="#eab308"
                opacity={0.35 + (i % 3) * 0.2}
              />
            ))}
          </g>

          {/* Iconic Yellow Roblox Head with Headphones */}
          <g transform="translate(210, 20)">
            {/* Glow */}
            <circle cx="90" cy="90" r="75" fill="#eab308" opacity="0.15" />
            {/* Cylinder / Block Head */}
            <rect x="40" y="30" width="100" height="100" rx="16" fill="url(#rsfx-head)" stroke="#a16207" strokeWidth="2" />
            
            {/* Classic Smiley Face */}
            <circle cx="70" cy="72" r="6" fill="#1e293b" />
            <circle cx="110" cy="72" r="6" fill="#1e293b" />
            <path d="M72 95 Q90 115 108 95" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" fill="none" />

            {/* Glowing Studio Headset */}
            <path d="M35 80 Q90 10 145 80" stroke="#38bdf8" strokeWidth="6" fill="none" strokeLinecap="round" />
            <rect x="25" y="65" width="16" height="36" rx="8" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            <rect x="139" y="65" width="16" height="36" rx="8" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          </g>

          {/* Classic "OOF!" sound badge */}
          <g transform="translate(30, 45)">
            <rect width="95" height="34" rx="8" fill="rgba(234,179,8,0.2)" stroke="#eab308" strokeWidth="1.5" />
            <text x="47" y="23" fill="#fde047" fontSize="16" fontWeight="900" textAnchor="middle" letterSpacing="1">"OOF!"</text>
            <text x="47" y="52" fill="#94a3b8" fontSize="11" fontWeight="600" textAnchor="middle">100+ Game Sounds</text>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // MINECRAFT 3D ASSETS
    // -------------------------------------------------------------
    case 'minecraft-3d':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mc3d-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#052e16" />
              <stop offset="0.6" stopColor="#064e3b" />
              <stop offset="1" stopColor="#022c22" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#mc3d-bg)" />

          {/* Minecraft Isometric Grass Block */}
          <g transform="translate(195, 45)">
            {/* Top Face (Grass) */}
            <polygon points="0,35 65,0 130,35 65,70" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
            <polygon points="20,35 65,12 85,22 45,45" fill="#4ade80" />
            <polygon points="65,35 95,20 110,27 80,45" fill="#16a34a" />

            {/* Left Face (Dirt + Grass overhang) */}
            <polygon points="0,35 65,70 65,145 0,110" fill="#78350f" stroke="#451a03" strokeWidth="2" />
            {/* Grass drip */}
            <polygon points="0,35 65,70 65,85 50,75 35,90 20,78 0,86" fill="#15803d" />

            {/* Right Face (Dirt + Grass overhang) */}
            <polygon points="65,70 130,35 130,110 65,145" fill="#92400e" stroke="#451a03" strokeWidth="2" />
            <polygon points="65,70 130,35 130,86 110,76 95,90 80,78 65,85" fill="#16a34a" />
          </g>

          {/* Diamond Sword floating */}
          <g transform="translate(60, 40) rotate(-25)">
            <rect x="40" y="20" width="12" height="70" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
            <rect x="25" y="90" width="42" height="10" fill="#0f172a" rx="2" />
            <rect x="42" y="100" width="8" height="24" fill="#78350f" />
            <rect x="38" y="124" width="16" height="10" fill="#38bdf8" rx="2" />
          </g>

          {/* Voxel & Blockbench Badge */}
          <g transform="translate(24, 160)">
            <rect width="115" height="26" rx="6" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
            <text x="57" y="18" fill="#6ee7b7" fontSize="11" fontWeight="800" textAnchor="middle">BLOCKBENCH .JSON</text>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // MINECRAFT GUI
    // -------------------------------------------------------------
    case 'minecraft-gui':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mcgui-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1c1917" />
              <stop offset="1" stopColor="#292524" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#mcgui-bg)" />

          {/* Minecraft Hotbar / Chest Container Mockup */}
          <g transform="translate(60, 35)">
            <rect width="280" height="150" fill="#c6c6c6" stroke="#373737" strokeWidth="4" />
            <rect x="6" y="6" width="268" height="138" fill="#8b8b8b" />
            <text x="18" y="24" fill="#373737" fontSize="12" fontWeight="900" fontFamily="monospace">Crafting & Inventory</text>

            {/* Item slot grid (3x3) */}
            <g transform="translate(20, 36)">
              {[0, 1, 2].map((r) =>
                [0, 1, 2].map((c) => (
                  <g key={`${r}-${c}`} transform={`translate(${c * 30}, ${r * 30})`}>
                    <rect width="26" height="26" fill="#373737" stroke="#ffffff" strokeWidth="1" />
                    <rect x="2" y="2" width="22" height="22" fill="#8b8b8b" />
                    {r === 1 && c === 1 && <rect x="6" y="6" width="14" height="14" fill="#38bdf8" />}
                    {r === 0 && c === 1 && <rect x="6" y="6" width="14" height="14" fill="#fbbf24" />}
                    {r === 2 && c === 2 && <rect x="6" y="6" width="14" height="14" fill="#ef4444" />}
                  </g>
                ))
              )}
            </g>

            {/* Heart icons and hunger icons */}
            <g transform="translate(130, 45)">
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M${i * 18 + 8} 8 C${i * 18 + 8} 4, ${i * 18 + 3} 0, ${i * 18} 4 C${i * 18 - 3} 0, ${i * 18 - 8} 4, ${i * 18 - 8} 8 C${i * 18 - 8} 14, ${i * 18} 20, ${i * 18} 20 C${i * 18} 20, ${i * 18 + 8} 14, ${i * 18 + 8} 8 Z`} fill="#ef4444" transform="scale(0.8) translate(5,0)" />
              ))}
            </g>

            {/* Level badge */}
            <text x="175" y="105" fill="#22c55e" fontSize="18" fontWeight="900" fontFamily="monospace" textAnchor="middle">LVL 45</text>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // MINECRAFT SFX
    // -------------------------------------------------------------
    case 'minecraft-sfx':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mcsfx-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0f172a" />
              <stop offset="1" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#mcsfx-bg)" />

          {/* Minecraft Note Block */}
          <g transform="translate(70, 50)">
            <rect width="90" height="90" fill="#78350f" stroke="#451a03" strokeWidth="3" />
            <rect x="12" y="12" width="66" height="66" fill="#92400e" />
            {/* Note symbol on block */}
            <circle cx="45" cy="50" r="14" fill="#451a03" />
            <circle cx="40" cy="54" r="6" fill="#facc15" />
            <rect x="44" y="38" width="4" height="16" fill="#facc15" />
            <polygon points="48,38 58,34 58,40 48,44" fill="#facc15" />
          </g>

          {/* Floating musical notes & redstone sparks */}
          <g transform="translate(190, 60)">
            <circle cx="20" cy="30" r="5" fill="#ef4444" />
            <circle cx="80" cy="20" r="7" fill="#3b82f6" />
            <circle cx="120" cy="50" r="6" fill="#22c55e" />
            <circle cx="60" cy="80" r="8" fill="#a855f7" />
            <text x="20" y="24" fill="#ef4444" fontSize="22" fontWeight="bold">♪</text>
            <text x="75" y="14" fill="#38bdf8" fontSize="26" fontWeight="bold">♫</text>
            <text x="110" y="45" fill="#4ade80" fontSize="24" fontWeight="bold">♪</text>
          </g>

          <g transform="translate(20, 165)">
            <text x="0" y="20" fill="#6ee7b7" fontSize="13" fontWeight="800">MOB, CAVE & COMBAT SOUNDS</text>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // MINECRAFT CODE / DATAPACKS
    // -------------------------------------------------------------
    case 'minecraft-code':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mccode-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#mccode-bg)" />

          {/* Command Block Glow */}
          <g transform="translate(50, 45)">
            <rect width="80" height="80" rx="10" fill="#b45309" stroke="#fbbf24" strokeWidth="3" />
            <circle cx="40" cy="40" r="22" fill="#78350f" />
            <circle cx="40" cy="40" r="12" fill="#38bdf8" />
            <polygon points="40,24 45,35 35,35" fill="#fef08a" />
            <polygon points="40,56 45,45 35,45" fill="#fef08a" />
          </g>

          {/* MCFunction Terminal */}
          <g transform="translate(150, 40)">
            <rect width="210" height="135" rx="6" fill="#020617" stroke="#334155" strokeWidth="1.5" />
            <rect width="210" height="22" rx="6" fill="#0f172a" />
            <text x="12" y="15" fill="#64748b" fontSize="9" fontWeight="700">main.mcfunction</text>

            <g fontFamily="monospace" fontSize="10">
              <text x="10" y="42" fill="#a855f7"># Summon boss wave</text>
              <text x="10" y="60">
                <tspan fill="#38bdf8">execute as </tspan>
                <tspan fill="#f1f5f9">@a[tag=hero] </tspan>
              </text>
              <text x="10" y="78">
                <tspan fill="#38bdf8">at </tspan>
                <tspan fill="#f1f5f9">@s </tspan>
                <tspan fill="#38bdf8">run summon </tspan>
                <tspan fill="#eab308">iron_golem</tspan>
              </text>
              <text x="10" y="98">
                <tspan fill="#f43f5e">give </tspan>
                <tspan fill="#f1f5f9">@s diamond_sword 1</tspan>
              </text>
              <text x="10" y="118" fill="#22c55e">playsound entity.player.levelup</text>
            </g>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // 2D GAME ASSETS / SPRITES
    // -------------------------------------------------------------
    case '2d-assets':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g2d-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#311042" />
              <stop offset="0.6" stopColor="#4c1d95" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#g2d-bg)" />

          {/* Pixelated Sprite Frames (Hero running) */}
          <g transform="translate(60, 45)">
            {[0, 1, 2].map((frame) => (
              <g key={frame} transform={`translate(${frame * 90}, 0)`}>
                <rect width="70" height="95" rx="6" fill="rgba(255,255,255,0.06)" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="35" y="18" fill="#f472b6" fontSize="9" fontWeight="700" textAnchor="middle">FRAME {frame + 1}</text>
                
                {/* 16-Bit Hero Figure */}
                {/* Head / Helmet */}
                <rect x="25" y="26" width="20" height="18" rx="3" fill="#f59e0b" />
                <rect x="28" y="32" width="14" height="5" fill="#0f172a" />
                {/* Torso & Armor */}
                <rect x="23" y="44" width="24" height="22" rx="3" fill="#3b82f6" />
                <rect x="29" y="48" width="12" height="14" fill="#fbbf24" />
                {/* Legs (animated by frame) */}
                <rect x="23" y="66" width="8" height={frame === 1 ? 16 : 22} fill="#1e293b" />
                <rect x="39" y="66" width="8" height={frame === 1 ? 22 : 16} fill="#1e293b" />
                {/* Weapon */}
                <line x1={frame === 2 ? 46 : 44} y1="46" x2={frame === 2 ? 60 : 54} y2="30" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            ))}
          </g>

          {/* Dungeon Tileset strip */}
          <g transform="translate(60, 155)">
            {[0, 1, 2, 3, 4, 5, 6].map((tile) => (
              <rect key={tile} x={tile * 37} y="0" width="32" height="22" rx="3" fill="#374151" stroke="#4b5563" />
            ))}
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // 2D GAME GUI
    // -------------------------------------------------------------
    case '2d-gui':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g2dgui-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#090d16" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#g2dgui-bg)" />

          {/* Boss Fight Retro Arcade HUD */}
          <g transform="translate(50, 30)">
            {/* Top Boss Bar */}
            <rect width="300" height="26" rx="13" fill="#0f172a" stroke="#ec4899" strokeWidth="2" />
            <rect x="4" y="4" width="210" height="18" rx="9" fill="url(#r3d-roof)" />
            <text x="150" y="17" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="1">ANCIENT DRAGON [HP: 70%]</text>

            {/* Player Mana & Health */}
            <g transform="translate(0, 42)">
              <circle cx="25" cy="25" r="24" fill="#0f172a" stroke="#06b6d4" strokeWidth="3" />
              <text x="25" y="30" fill="#38bdf8" fontSize="11" fontWeight="900" textAnchor="middle">MP</text>

              <rect x="60" y="8" width="140" height="14" rx="4" fill="#1e293b" />
              <rect x="60" y="8" width="110" height="14" rx="4" fill="#22c55e" />
              
              <rect x="60" y="26" width="140" height="10" rx="3" fill="#1e293b" />
              <rect x="60" y="26" width="95" height="10" rx="3" fill="#3b82f6" />
            </g>

            {/* Score & Combo */}
            <g transform="translate(220, 50)">
              <text x="80" y="0" fill="#facc15" fontSize="16" fontWeight="900" textAnchor="end">SCORE 148,200</text>
              <text x="80" y="20" fill="#ec4899" fontSize="14" fontWeight="800" textAnchor="end">COMBO x24</text>
            </g>

            {/* Retro Dialogue Box */}
            <g transform="translate(10, 100)">
              <rect width="280" height="45" rx="6" fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5" />
              <text x="16" y="22" fill="#38bdf8" fontSize="10" fontWeight="800">GUIDE: </text>
              <text x="65" y="22" fill="#e2e8f0" fontSize="10">Press [SPACE] to double jump and dodge!</text>
              <text x="260" y="36" fill="#facc15" fontSize="12">▼</text>
            </g>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // 2D GAME SFX
    // -------------------------------------------------------------
    case '2d-sfx':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g2dsfx-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#051923" />
              <stop offset="1" stopColor="#003554" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#g2dsfx-bg)" />

          {/* Retro 8-bit oscilloscope screen */}
          <g transform="translate(45, 25)">
            <rect width="310" height="150" rx="8" fill="#001219" stroke="#00f5d4" strokeWidth="2" />
            
            {/* Grid overlay */}
            <line x1="0" y1="75" x2="310" y2="75" stroke="#005f73" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="155" y1="0" x2="155" y2="150" stroke="#005f73" strokeWidth="1" strokeDasharray="4 4" />

            {/* Neon Square/Pulse Soundwaves */}
            <path
              d="M10 75 L40 75 L40 30 L80 30 L80 120 L120 120 L120 40 L160 40 L160 110 L200 110 L200 50 L240 50 L240 95 L270 95 L270 75 L300 75"
              fill="none"
              stroke="#00f5d4"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="miter"
              filter="drop-shadow(0 0 8px #00f5d4)"
            />
            
            <text x="20" y="24" fill="#00f5d4" fontSize="10" fontWeight="800" fontFamily="monospace">8-BIT CHIPTUNE SYNTH // PULSE WAVE</text>
            <text x="290" y="138" fill="#94d2bd" fontSize="10" fontWeight="700" textAnchor="end">FREQ: 440 Hz</text>
          </g>

          <g transform="translate(45, 186)">
            <text x="0" y="16" fill="#94d2bd" fontSize="12" fontWeight="700">COIN SOUND • LASER • POWER UP • EXPLOSION</text>
          </g>
        </svg>
      );

    // -------------------------------------------------------------
    // 2D GAME MUSIC
    // -------------------------------------------------------------
    case '2d-music':
      return (
        <svg className="toolbox-card-svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g2dmus-bg" x1="0" y1="0" x2="400" y2="220" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2e0854" />
              <stop offset="0.6" stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#090d16" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill="url(#g2dmus-bg)" />

          {/* Equalizer Spectrum Bars */}
          <g transform="translate(45, 120)">
            {[25, 45, 80, 110, 60, 95, 130, 85, 50, 115, 140, 90, 70, 100, 65, 40].map((h, i) => (
              <g key={i}>
                <rect
                  x={i * 19}
                  y={-h}
                  width="12"
                  height={h}
                  rx="3"
                  fill="url(#r3d-roof)"
                  opacity={0.85}
                />
                <circle cx={i * 19 + 6} cy={-h - 6} r="2.5" fill="#f472b6" />
              </g>
            ))}
          </g>

          {/* Synth Keys */}
          <g transform="translate(45, 135)">
            <rect width="310" height="55" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => (
              <rect key={k} x={k * 25 + 4} y="4" width="22" height="46" rx="2" fill="#ffffff" stroke="#cbd5e1" />
            ))}
            {[1, 2, 4, 5, 6, 8, 9].map((k) => (
              <rect key={k} x={k * 25 - 5} y="4" width="14" height="28" rx="2" fill="#0f172a" />
            ))}
          </g>

          <g transform="translate(45, 30)">
            <text x="0" y="16" fill="#f472b6" fontSize="14" fontWeight="900" letterSpacing="1">DYNAMIC SOUNDTRACK SUITE</text>
            <text x="0" y="32" fill="#cbd5e1" fontSize="11">Ambient, Lo-Fi, Synthwave & Boss Battle Themes</text>
          </g>
        </svg>
      );

    default:
      return (
        <div className="toolbox-card-svg-placeholder">
          <span>{title}</span>
        </div>
      );
  }
}
