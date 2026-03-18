import React from 'react';

function ExtendedCounter({ label, value, onChange }) {
  const adjust = (amount) => {
    const newValue = value + amount;
    onChange(newValue < 0 ? 0 : newValue);
  };

  return (
    <div className="extended-counter">
      <div className="ext-counter-header">
        <span className="counter-label">{label}</span>
        <span className="ext-counter-value">{value}</span>
      </div>
      <div className="extended-counter-controls">
        <button type="button" className="ext-btn ext-dec-lg" onClick={() => adjust(-10)}>-10</button>
        <button type="button" className="ext-btn ext-dec-md" onClick={() => adjust(-5)}>-5</button>
        <button type="button" className="ext-btn ext-dec" onClick={() => adjust(-1)}>-1</button>
        <button type="button" className="ext-btn ext-inc" onClick={() => adjust(1)}>+1</button>
        <button type="button" className="ext-btn ext-inc-md" onClick={() => adjust(5)}>+5</button>
        <button type="button" className="ext-btn ext-inc-lg" onClick={() => adjust(10)}>+10</button>
      </div>
    </div>
  );
}

export default ExtendedCounter;
