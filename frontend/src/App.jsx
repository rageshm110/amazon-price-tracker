// frontend/src/App.jsx
import { useState, useEffect } from 'react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  // Track individual product refresh operations by their MongoDB ID
  const [refreshingIds, setRefreshingIds] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchProducts = async () => {
    try {
      // Fixed: matches the /api/products endpoint in backend
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
      
      // Wait briefly for the backend's immediate background scrape to get a head start,
      // then refresh the list view.
      setTimeout(fetchProducts, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (id) => {
    // Mark this specific item as currently refreshing
    setRefreshingIds(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`${API_URL}/product/${id}/refresh`, { method: 'POST' });
      
      // Puppeteer takes around 4-6 seconds to spin up, bypass bot detection, and extract the text.
      // We poll the database right after this window closes to get the fresh price.
      setTimeout(() => {
        fetchProducts();
        setRefreshingIds(prev => ({ ...prev, [id]: false }));
      }, 5000);
    } catch (err) {
      console.error('Failed to trigger refresh:', err);
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
    <div className="container" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Amazon Price Tracker</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        <input 
          type="url" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="Paste Amazon.in product URL" 
          required 
          style={{ padding: '0.5rem', width: '300px', marginRight: '0.5rem' }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Track Product'}
        </button>
      </form>

      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {products.map(product => {
          const isRefreshing = !!refreshingIds[product._id];
          return (
            <li key={product._id} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <a href={product.url} target="_blank" rel="noreferrer">
                View Product Link
              </a>
              
              <strong style={{ minWidth: '120px' }}>
                {isRefreshing ? '🔄 Scraping...' : `₹${product.price || 'Pending...'}`}
              </strong>

              <button 
                onClick={() => handleRefresh(product._id)} 
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Price'}
              </button>

              <button 
                onClick={() => deleteProduct(product._id)}
                style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '0.3rem 0.6rem', cursor: 'pointer' }}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}