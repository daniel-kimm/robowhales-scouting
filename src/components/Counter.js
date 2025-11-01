import React from 'react';
import { Plus, Minus } from 'lucide-react';

function Counter({ label, value, onChange }) {
  const increment = () => {
    onChange(value + 1);
  };

  const decrement = () => {
    if (value > 0) {
      onChange(value - 1);
    }
  };

  return (
    <div className="counter">
      <div className="counter-label">{label}</div>
      <div className="counter-controls">
        <button type="button" className="decrement" onClick={decrement}>
          <Minus size={16} />
        </button>
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(parseInt(e.target.value) || 0)} 
          min="0"
        />
        <button type="button" className="increment" onClick={increment}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default Counter;
