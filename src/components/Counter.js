import React from 'react';

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
        <button type="button" className="decrement" onClick={decrement}>-</button>
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(parseInt(e.target.value) || 0)} 
          min="0"
        />
        <button type="button" className="increment" onClick={increment}>+</button>
      </div>
    </div>
  );
}

export default Counter;
