// frontend/src/App.jsx
import { useState, useEffect } from 'react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Failed fetching products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      setUrl('');
      setTimeout(fetchProducts, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (id) => {
    setRefreshingIds(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`${API_URL}/product/${id}/refresh`, { method: 'POST' });
      setTimeout(() => {
        fetchProducts();
        setRefreshingIds(prev => ({ ...prev, [id]: false }));
      }, 5000);
    } catch (err) {
      console.error(err);
      setRefreshingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const deleteProduct = async (id) => {
    try {
      await fetch(`${API_URL}/product/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Injecting clean M3 tokens directly into the document header */}
      <style>{`
        :root {
          --m3-background: #141218;
          --m3-surface: #1d1b20;
          --m3-surface-variant: #49454f;
          --m3-primary: #d0bcff;
          --m3-on-primary: #381e72;
          --m3-on-surface: #e6e1e5;
          --m3-on-surface-variant: #cac4d0;
          --m3-error: #ffb4ab;
          --m3-on-error: #690005;
          --m3-outline: #938f99;
        }
        body {
          background-color: var(--m3-background);
          color: var(--m3-on-surface);
          font-family: 'Roboto', system-ui, sans-serif;
          margin: 0;
          padding: 0;
        }
        .m3-layout {
          max-width: 840px;
          margin: 0 auto;
          padding: 2.5rem 1rem;
        }
        .m3-title {
          font-size: 2.5rem;
          font-weight: 400;
          letter-spacing: -0.5px;
          margin-bottom: 2rem;
          color: var(--m3-on-surface);
        }
        .m3-text-field-box {
          display: flex;
          gap: 12px;
          margin-bottom: 2.5rem;
          background: var(--m3-surface);
          padding: 1rem;
          border-radius: 16px;
        }
        .m3-input {
          flex: 1;
          background: transparent;
          border: 1px solid var(--m3-outline);
          border-radius: 8px;
          padding: 0.8rem 1rem;
          color: var(--m3-on-surface);
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .m3-input:focus {
          border-color: var(--m3-primary);
          border-width: 2px;
        }
        .m3-btn-filled {
          background: var(--m3-primary);
          color: var(--m3-on-primary);
          border: none;
          border-radius: 100px;
          padding: 0 1.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .m3-btn-filled:hover {
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        .m3-btn-filled:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .m3-card {
          background: var(--m3-surface);
          border-radius: 12px;
          padding: 1.2rem;
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1px solid var(--m3-surface-variant);
          transition: transform 0.2s;
        }
        .m3-card:hover {
          transform: translateY(-2px);
        }
        .m3-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .m3-product-title {
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0;
          color: var(--m3-on-surface);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }
        .m3-price-badge {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--m3-primary);
          white-space: nowrap;
        }
        .m3-card-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          border-top: 1px solid #2d2a33;
          padding-top: 10px;
        }
        .m3-btn-tonal {
          background: var(--m3-surface-variant);
          color: var(--m3-on-surface-variant);
          border: none;
          border-radius: 100px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .m3-btn-error {
          background: transparent;
          color: var(--m3-error);
          border: 1px solid var(--m3-error);
          border-radius: 100px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .m3-btn-error:hover {
          background: rgba(255, 180, 171, 0.08);
        }
        .m3-link {
          color: var(--m3-primary);
          text-decoration: none;
          font-size: 0.85rem;
          align-self: flex-start;
        }
        .m3-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="m3-layout">
        <h1 className="m3-title">Price Tracker</h1>
        
        <form onSubmit={handleSubmit} className="m3-text-field-box">
          <input 
            type="url" 
            className="m3-input"
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            placeholder="Paste Amazon.in product URL" 
            required 
          />
          <button type="submit" className="m3-btn-filled" disabled={loading}>
            {loading ? 'Adding...' : 'Track'}
          </button>
        </form>

        <div className="m3-list">
          {products.map(product => {
            const isRefreshing = !!refreshingIds[product._id];
            return (
              <div key={product._id} className="m3-card">
                <div className="m3-card-header">
                  <h3 className="m3-product-title" title={product.name}>
                    {product.name || 'Fetching item tracking profiles...'}
                  </h3>
                  <div className="m3-price-badge">
                    {isRefreshing ? '⏳' : product.price ? `₹${product.price}` : 'Pending...'}
                  </div>
                </div>

                <a href={product.url} target="_blank" rel="noreferrer" className="m3-link">
                  Open Original Amazon Listing →
                </a>

                <div className="m3-card-actions">
                  <button 
                    className="m3-btn-tonal"
                    onClick={() => handleRefresh(product._id)} 
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button 
                    className="m3-btn-error"
                    onClick={() => deleteProduct(product._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          {products.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--m3-on-surface-variant)' }}>No products tracked yet.</p>
          )}
        </div>
      </div>
    </>
  );
}