import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const StakingTiersChart = () => {
  // Staking tier data
  const data = [
    {
      tier: 'Starter',
      minStake: 1000,
      maxTasks: 10,
      apyMin: 5,
      apyMax: 8,
      multiplier: 1.0
    },
    {
      tier: 'Standard',
      minStake: 5000,
      maxTasks: 50,
      apyMin: 7,
      apyMax: 10,
      multiplier: 1.5
    },
    {
      tier: 'Pro',
      minStake: 10000,
      maxTasks: 200,
      apyMin: 9,
      apyMax: 13,
      multiplier: 2.0
    },
    {
      tier: 'Elite',
      minStake: 50000,
      maxTasks: 999,
      apyMin: 12,
      apyMax: 15,
      multiplier: 3.0
    }
  ];

  const COLORS = ['#0D6B93', '#0D7FA5', '#0D93B7', '#07B2C9'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #0D6B93',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          minWidth: '200px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#07B2C9', fontSize: '14px' }}>
            {data.tier} Tier
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Min Stake: <strong>{data.minStake.toLocaleString()} NZT</strong>
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Max Tasks/Day: <strong>{data.maxTasks === 999 ? 'Unlimited' : data.maxTasks}</strong>
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            APY Range: <strong>{data.apyMin}% - {data.apyMax}%</strong>
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Rep Multiplier: <strong>{data.multiplier}x</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value;
  };

  return (
    <div style={{ width: '100%', marginTop: '24px', marginBottom: '24px' }}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="tier"
            stroke="#888"
            style={{ fontSize: '13px', fontWeight: '500' }}
          />
          <YAxis
            stroke="#888"
            style={{ fontSize: '12px' }}
            tickFormatter={formatYAxis}
            label={{ value: 'Minimum Stake (NZT)', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            payload={[
              { value: 'Minimum Stake Required', type: 'rect', color: '#0D6B93' }
            ]}
          />
          <Bar
            dataKey="minStake"
            radius={[8, 8, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
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
        Four staking tiers with increasing benefits: Starter (1k NZT) to Elite (50k NZT).
        Higher tiers unlock more tasks, better APY, and reputation multipliers.
      </p>
    </div>
  );
};

export default StakingTiersChart;