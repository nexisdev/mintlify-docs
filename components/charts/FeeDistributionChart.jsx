import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const FeeDistributionChart = () => {
  // Fee distribution data
  const data = [
    { name: 'BaseFeeVault (Burned)', value: 35, description: '50% of 70% base fee - permanently burned', color: '#8B0000' },
    { name: 'BaseFeeVault (Stakers)', value: 35, description: '50% of 70% base fee - distributed to stakers', color: '#0D6B93' },
    { name: 'SequencerFeeVault', value: 20, description: 'Sequencer operations and infrastructure', color: '#07B2C9' },
    { name: 'L1FeeVault', value: 10, description: 'Base L2 data availability costs', color: '#1BACCD' }
  ];

  const RADIAN = Math.PI / 180;

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#1a1a1a',
          border: `2px solid ${data.color}`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          maxWidth: '280px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: data.color, fontSize: '14px' }}>
            {data.name}
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Share: <strong>{data.value}%</strong>
          </p>
          <p style={{ margin: '4px 0', color: '#ccc', fontSize: '12px', lineHeight: '1.4' }}>
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '20px',
        fontSize: '13px'
      }}>
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: entry.color,
              borderRadius: '3px'
            }} />
            <span style={{ color: '#ccc' }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', marginTop: '24px', marginBottom: '24px' }}>
      <ResponsiveContainer width="100%" height={450}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={140}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
      <p style={{
        textAlign: 'center',
        marginTop: '16px',
        fontSize: '13px',
        color: '#888',
        fontStyle: 'italic'
      }}>
        Transaction fee distribution: 70% to BaseFeeVault (35% burned + 35% to stakers),
        20% to sequencer operations, 10% for Base L2 data availability costs.
      </p>
    </div>
  );
};

export default FeeDistributionChart;