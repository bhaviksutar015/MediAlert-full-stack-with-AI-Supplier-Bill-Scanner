import React from 'react';

export const TableSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="table-skeleton-container" aria-label="Loading inventory table data">
      <div className="skeleton-header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton-cell skeleton-th" style={{ width: `${60 + (i % 3) * 20}px` }}></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="skeleton-row">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="skeleton-cell"
              style={{
                width: cIdx === 0 ? '140px' : cIdx === cols - 1 ? '70px' : '90px',
                animationDelay: `${(rIdx * 0.08 + cIdx * 0.04).toFixed(2)}s`
              }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ count = 4 }) => {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi-card skeleton-kpi">
          <div className="skeleton-cell" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
          <div style={{ flex: 1 }}>
            <div className="skeleton-cell" style={{ width: '80px', height: '14px', marginBottom: '8px' }}></div>
            <div className="skeleton-cell" style={{ width: '50px', height: '24px' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default { TableSkeleton, CardSkeleton };
