"use client";
import { useState } from 'react';

export const GrowthChart = ({ data, emptyMessage }: { data: { x: number, y: number }[]; emptyMessage: string }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);

  if (!data || data.length < 2) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: '13px', background: 'var(--bg-mid)', borderRadius: '16px' }}>
        {emptyMessage}
      </div>
    );
  }

  const padding = 40;
  const width = 600;
  const height = 240;

  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));
  const minY = 0;
  const maxY = Math.max(...data.map(d => d.y)) * 1.2;

  const getX = (x: number) => padding + ((x - minX) / (maxX - minX || 1)) * (width - padding * 2);
  const getY = (y: number) => height - padding - ((y - minY) / (maxY - minY || 1)) * (height - padding * 2);

  const points = data.map(d => `${getX(d.x)},${getY(d.y)}`).join(' ');

  return (
    <div style={{ width: '100%', overflow: 'hidden', position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grids */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={padding} y1={getY(maxY * p)} x2={width - padding} y2={getY(maxY * p)} stroke="var(--border)" strokeDasharray="4 4" />
        ))}

        {/* Gradient Fill */}
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M ${getX(data[0].x)} ${height - padding} L ${points} L ${getX(data[data.length - 1].x)} ${height - padding} Z`}
          fill="url(#growthGradient)"
        />

        {/* Line */}
        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data Points */}
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHoveredPoint(d)} onMouseLeave={() => setHoveredPoint(null)}>
            <circle
              cx={getX(d.x)}
              cy={getY(d.y)}
              r={hoveredPoint === d ? "6" : "4"}
              fill={hoveredPoint === d ? "var(--primary)" : "#FFF"}
              stroke="var(--primary)"
              strokeWidth="2"
              style={{ transition: 'all 0.2s', cursor: 'pointer' }}
            />
            {/* Larger invisible hit area */}
            <circle
              cx={getX(d.x)}
              cy={getY(d.y)}
              r="20"
              fill="transparent"
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {/* Labels */}
        <text x={padding} y={height - 10} fontSize="10" fill="var(--text-faint)" fontWeight="600">DOC {minX}</text>
        <text x={width - padding} y={height - 10} textAnchor="end" fontSize="10" fill="var(--text-faint)" fontWeight="600">DOC {maxX}</text>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          left: `${(getX(hoveredPoint.x) / width) * 100}%`,
          top: `${(getY(hoveredPoint.y) / height) * 100}%`,
          transform: 'translate(-50%, -120%)',
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#FFF',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10,
          whiteSpace: 'nowrap',
          transition: 'all 0.1s ease-out'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>DOC {hoveredPoint.x}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>MBW: <span style={{ color: '#FFF', fontWeight: 600 }}>{hoveredPoint.y}g</span></div>
          <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: 'rgba(15, 23, 42, 0.9)' }} />
        </div>
      )}
    </div>
  );
};
