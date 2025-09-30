import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const PerformanceBenchmarkChart = () => {
  const [metric, setMetric] = useState('ethTransfer');

  // Transaction cost comparison data
  const costData = {
    ethTransfer: [
      { chain: 'Nexis L3', cost: 0.000042, blockTime: 2, color: '#0D6B93' },
      { chain: 'Base L2', cost: 0.000002, blockTime: 2, color: '#0051FF' },
      { chain: 'Optimism', cost: 0.000003, blockTime: 2, color: '#FF0420' },
      { chain: 'Arbitrum', cost: 0.000004, blockTime: 0.25, color: '#28A0F0' },
      { chain: 'Polygon', cost: 0.0042, blockTime: 2, color: '#8247E5' },
      { chain: 'Ethereum L1', cost: 1.26, blockTime: 12, color: '#627EEA' }
    ],
    swap: [
      { chain: 'Nexis L3', cost: 0.0003, blockTime: 2, color: '#0D6B93' },
      { chain: 'Base L2', cost: 0.000015, blockTime: 2, color: '#0051FF' },
      { chain: 'Optimism', cost: 0.000024, blockTime: 2, color: '#FF0420' },
      { chain: 'Arbitrum', cost: 0.00003, blockTime: 0.25, color: '#28A0F0' },
      { chain: 'Polygon', cost: 0.03, blockTime: 2, color: '#8247E5' },
      { chain: 'Ethereum L1', cost: 9, blockTime: 12, color: '#627EEA' }
    ],
    aiAgent: [
      { chain: 'Nexis L3', cost: 0.0005, blockTime: 2, color: '#0D6B93' },
      { chain: 'Base L2', cost: 0.000025, blockTime: 2, color: '#0051FF' },
      { chain: 'Ethereum L1', cost: 15, blockTime: 12, color: '#627EEA' }
    ]
  };

  const data = costData[metric];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const nexisCost = costData[metric][0].cost;
      const multiplier = (data.cost / nexisCost).toFixed(1);

      return (
        <div style={{
          backgroundColor: '#1a1a1a',
          border: `2px solid ${data.color}`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          minWidth: '180px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: data.color, fontSize: '14px' }}>
            {data.chain}
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Cost: <strong>${data.cost.toFixed(6)}</strong>
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Block Time: <strong>{data.blockTime}s</strong>
          </p>
          {data.chain !== 'Nexis L3' && (
            <p style={{ margin: '4px 0', color: '#07B2C9', fontSize: '12px', fontStyle: 'italic' }}>
              {multiplier}x {parseFloat(multiplier) > 1 ? 'more expensive' : 'cheaper'} than Nexis
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    if (value >= 1) return `$${value.toFixed(0)}`;
    if (value >= 0.01) return `$${value.toFixed(2)}`;
    if (value >= 0.0001) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(6)}`;
  };

  const metricLabels = {
    ethTransfer: 'ETH Transfer',
    swap: 'Token Swap',
    aiAgent: 'AI Agent Registration'
  };

  return (
    <div style={{ width: '100%', marginTop: '24px', marginBottom: '24px' }}>
      {/* Metric selector */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {Object.keys(costData).map((key) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            style={{
              padding: '10px 20px',
              backgroundColor: metric === key ? '#0D6B93' : '#2a2a2a',
              color: metric === key ? '#fff' : '#888',
              border: metric === key ? '2px solid #07B2C9' : '1px solid #444',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: metric === key ? '600' : '400',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (metric !== key) {
                e.target.style.backgroundColor = '#333';
                e.target.style.borderColor = '#555';
              }
            }}
            onMouseLeave={(e) => {
              if (metric !== key) {
                e.target.style.backgroundColor = '#2a2a2a';
                e.target.style.borderColor = '#444';
              }
            }}
          >
            {metricLabels[key]}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="chain"
            stroke="#888"
            angle={-45}
            textAnchor="end"
            height={100}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#888"
            style={{ fontSize: '11px' }}
            tickFormatter={formatYAxis}
            scale="log"
            domain={['auto', 'auto']}
            label={{ value: 'Cost (USD)', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            payload={[
              { value: `Cost Comparison: ${metricLabels[metric]}`, type: 'rect', color: '#0D6B93' }
            ]}
          />
          <Bar
            dataKey="cost"
            radius={[8, 8, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{
        textAlign: 'center',
        marginTop: '16px',
        fontSize: '13px',
        color: '#888',
        fontStyle: 'italic'
      }}>
        Transaction cost comparison across major chains. Nexis is optimized for AI agent operations
        with 2-second blocks, offering 30,000x cost savings vs Ethereum L1.
      </p>
    </div>
  );
};

export default PerformanceBenchmarkChart;