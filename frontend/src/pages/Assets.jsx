import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import AssetCard from '../components/AssetCard';
import { assetService } from '../services/assets';

const filters = ['All', '3D', 'Voice', 'Music', 'SFX', 'Ambience'];

const filterMatch = {
  '3D': (a) => a.type === '3d',
  Voice: (a) => a.type === 'voice',
  Music: (a) => a.type === 'music',
  SFX: (a) => a.type === 'sfx',
  Ambience: (a) => a.type === 'ambience',
};

export default function Assets() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    assetService
      .list()
      .then((data) => !cancelled && setAssets(data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const fn = filterMatch[activeFilter];
    const matchesFilter = activeFilter === 'All' || (fn ? fn(a) : a.type === activeFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id) => {
    try {
      await assetService.remove(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">My Assets</h1>
      <p className="page-subtitle">All your generated files in one place</p>

      <div className="assets-toolbar">
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
        </div>
        <div className="filter-tabs">
          {filters.map((f) => (
            <button
              key={f}
              className={`filter-tab ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading assets...</div>
      ) : filtered.length > 0 ? (
        <div className="assets-grid">
          {filtered.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No assets found. Generate something to get started.</p>
        </div>
      )}
    </div>
  );
}