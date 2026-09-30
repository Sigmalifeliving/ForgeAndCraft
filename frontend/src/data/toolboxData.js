// Toolbox Suite Configuration & Visuals

export const TOOLBOX_SECTIONS = [
  {
    id: 'roblox',
    title: 'ROBLOX',
    titleSuffix: 'Toolbox',
    badge: 'Popular',
    tagline: 'AI-Powered Creation Suite for Roblox Studio & Luau',
    description: 'Generate production-ready 3D meshes, custom ScreenGuis, modular Luau scripts, and game SFX.',
    accentColor: '#3b82f6',
    tools: [
      {
        id: 'roblox-3d',
        title: '3D Assets',
        subtitle: '3D Asset Generation Tool',
        desc: 'Generate optimized low-poly & stylized 3D models with materials for Roblox Studio (.obj & .glb).',
        buttonText: 'Try Now',
        route: '/create/3d?platform=roblox',
        type: 'route',
        tag: 'Studio Ready',
        theme: 'roblox',
        imageKey: 'roblox-3d'
      },
      {
        id: 'roblox-gui',
        title: 'GUI',
        subtitle: 'GUI Generation Tool',
        desc: 'Generate custom Roblox screen GUIs, inventory frames, store menus, and leaderboards.',
        buttonText: 'Try Now',
        actionType: 'gui-modal',
        platform: 'roblox',
        tag: 'Drag & Drop',
        theme: 'roblox',
        imageKey: 'roblox-gui'
      },
      {
        id: 'roblox-code',
        title: 'Code',
        subtitle: 'Roblox Coding Tool',
        desc: 'Generate clean, modular Luau scripts (ServerScript, LocalScript, ModuleScript, DataStore).',
        buttonText: 'Try Now',
        actionType: 'code-modal',
        platform: 'roblox',
        tag: 'Luau AI',
        theme: 'roblox',
        imageKey: 'roblox-code'
      },
      {
        id: 'roblox-sfx',
        title: 'Sound Effects',
        subtitle: 'SFX Generation Tool',
        desc: 'Generate procedural audio clips, hit sounds, level-up chimes, and UI audio for Roblox games.',
        buttonText: 'Try Now',
        route: '/create/voice?mode=sfx&platform=roblox',
        type: 'route',
        tag: 'WAV & MP3',
        theme: 'roblox',
        imageKey: 'roblox-sfx'
      }
    ]
  },
  {
    id: 'minecraft',
    title: 'MINECRAFT',
    titleSuffix: 'Toolbox',
    badge: 'New',
    tagline: 'AI Generation for Bedrock & Java Edition',
    description: 'Create custom block models, mob geometry, HUD overlays, and mcfunction datapacks.',
    accentColor: '#10b981',
    tools: [
      {
        id: 'minecraft-3d',
        title: '3D Assets',
        subtitle: 'Mob & Block Model Tool',
        desc: 'Generate Blockbench & Java JSON-compatible voxel models for custom mobs, tools, and blocks.',
        buttonText: 'Try Now',
        route: '/create/3d?platform=minecraft',
        type: 'route',
        tag: 'Voxel / JSON',
        theme: 'minecraft',
        imageKey: 'minecraft-3d'
      },
      {
        id: 'minecraft-gui',
        title: 'GUI',
        subtitle: 'Custom HUD & Texture Tool',
        desc: 'Generate custom inventory screens, hotbars, chest containers, and stylized item frames.',
        buttonText: 'Try Now',
        actionType: 'gui-modal',
        platform: 'minecraft',
        tag: '16x / 32x',
        theme: 'minecraft',
        imageKey: 'minecraft-gui'
      },
      {
        id: 'minecraft-sfx',
        title: 'Sound Effects',
        subtitle: 'SFX Generation Tool',
        desc: 'Generate cave ambience, block breaking echoes, creature sound effects, and portal hums.',
        buttonText: 'Try Now',
        route: '/create/voice?mode=sfx&platform=minecraft',
        type: 'route',
        tag: 'Stereo Audio',
        theme: 'minecraft',
        imageKey: 'minecraft-sfx'
      },
      {
        id: 'minecraft-code',
        title: 'Code & Datapacks',
        subtitle: 'Datapack & Function Tool',
        desc: 'Generate MCFunction scripts, custom recipes, loot tables, and command block sequences.',
        buttonText: 'Try Now',
        actionType: 'code-modal',
        platform: 'minecraft',
        tag: 'MCFunction',
        theme: 'minecraft',
        imageKey: 'minecraft-code'
      }
    ]
  },
  {
    id: '2d-game',
    title: '2D GAME',
    titleSuffix: 'Toolbox',
    badge: 'Indie Suite',
    tagline: 'Sprite Sheets, Pixel Art, Tilesets & Retro Audio',
    description: 'Complete pipeline for 2D platformers, top-down RPGs, roguelikes, and WebGL games.',
    accentColor: '#ec4899',
    tools: [
      {
        id: '2d-assets',
        title: '2D & 3D Assets',
        subtitle: 'Sprite & Tileset Tool',
        desc: 'Generate isometric character sheets, seamless tilesets, item icons, and animated frame sequences.',
        buttonText: 'Try Now',
        route: '/create/3d?platform=2d',
        type: 'route',
        tag: 'PNG Spritesheet',
        theme: '2d-game',
        imageKey: '2d-assets'
      },
      {
        id: '2d-gui',
        title: 'GUI',
        subtitle: 'Game UI & HUD Generator',
        desc: 'Craft retro arcade menus, dialogue boxes, health bars, mana gauges, and game-over screens.',
        buttonText: 'Try Now',
        actionType: 'gui-modal',
        platform: '2d-game',
        tag: 'Vector & Pixel',
        theme: '2d-game',
        imageKey: '2d-gui'
      },
      {
        id: '2d-sfx',
        title: 'Sound Effects',
        subtitle: '8-Bit & Retro SFX Tool',
        desc: 'Synthesize classic 8-bit laser blasts, jump noises, explosion booms, and item pickup bleeps.',
        buttonText: 'Try Now',
        route: '/create/voice?mode=sfx&platform=2d',
        type: 'route',
        tag: 'Chiptune SFX',
        theme: '2d-game',
        imageKey: '2d-sfx'
      },
      {
        id: '2d-music',
        title: 'Music',
        subtitle: 'Soundtrack Generation Tool',
        desc: 'Generate looping dynamic background tracks, synthwave rhythms, and chiptune boss battle music.',
        buttonText: 'Try Now',
        route: '/create/voice?mode=music&platform=2d',
        type: 'route',
        tag: 'Seamless Loop',
        theme: '2d-game',
        imageKey: '2d-music'
      }
    ]
  }
];
