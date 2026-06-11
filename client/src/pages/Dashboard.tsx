import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api';

interface Item {
  _id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
}

function Dashboard() {
  const { user } = useAuth0();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ title: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/items');
      // API returns { items: [...], pagination: {...} }
      setItems(response.data.items || []);
      setError(null);
    } catch (err) {
      setError('Failed to load items. Make sure the server is running.');
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    try {
      setIsAdding(true);
      const response = await api.post('/items', newItem);
      setItems([response.data, ...items]);
      setNewItem({ title: '', description: '' });
    } catch (err) {
      setError('Failed to add item');
      console.error('Error adding item:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleComplete = async (item: Item) => {
    try {
      const response = await api.put(`/items/${item._id}`, {
        completed: !item.completed,
      });
      setItems(items.map((i) => (i._id === item._id ? response.data : i)));
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter((i) => i._id !== id));
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.given_name || user?.name || 'User'}!
        </h1>
        <p className="text-gray-600">
          Manage your items and track your progress from your personal dashboard.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Total Items</p>
          <p className="text-3xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-600">
            {items.filter((i) => i.completed).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-3xl font-bold text-orange-600">
            {items.filter((i) => !i.completed).length}
          </p>
        </div>
      </div>

      {/* Add New Item Form */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Item</h2>
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              className="input"
              placeholder="Enter item title..."
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Enter item description..."
            />
          </div>
          <button type="submit" className="btn-primary" disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={fetchItems} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Items List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Items</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No items yet. Add your first item above!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item._id} className="py-4 flex items-start gap-4">
                <button
                  onClick={() => handleToggleComplete(item)}
                  className={`mt-1 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    item.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-primary-500'
                  }`}
                >
                  {item.completed && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      item.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteItem(item._id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
