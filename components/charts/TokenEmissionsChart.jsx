import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const TokenEmissionsChart = () => {
  // Emission data from the tokenomics schedule
  const data = [
    { year: 'Launch', annual: 100, cumulative: 100, inflation: 0 },
    { year: 'Year 1', annual: 200, cumulative: 300, inflation: 200 },
    { year: 'Year 2', annual: 250, cumulative: 550, inflation: 83 },
    { year: 'Year 3', annual: 200, cumulative: 750, inflation: 36 },
    { year: 'Year 4', annual: 150, cumulative: 900, inflation: 20 },
    { year: 'Year 5', annual: 100, cumulative: 1000, inflation: 11 },
    { year: 'Year 6+', annual: 0, cumulative: 1000, inflation: 0 },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #0D6B93',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#07B2C9' }}>
            {payload[0].payload.year}
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Annual Emission: <strong>{payload[0].payload.annual}M NZT</strong>
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Cumulative Supply: <strong>{payload[0].payload.cumulative}M NZT</strong>
          </p>
          <p style={{ margin: '4px 0', color: '#fff', fontSize: '13px' }}>
            Inflation Rate: <strong>{payload[0].payload.inflation}%</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', marginTop: '24px', marginBottom: '24px' }}>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorAnnual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0D6B93" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#0D6B93" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#07B2C9" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#07B2C9" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="year"
            stroke="#888"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#888"
            style={{ fontSize: '12px' }}
            label={{ value: 'NZT (Millions)', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Area
            type="monotone"
            dataKey="annual"
            stroke="#0D6B93"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorAnnual)"
            name="Annual Emission"
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#07B2C9"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCumulative)"
            name="Cumulative Supply"
          />
        </AreaChart>
      </ResponsiveContainer>
      <p style={{
        textAlign: 'center',
        marginTop: '16px',
        fontSize: '13px',
        color: '#888',
        fontStyle: 'italic'
      }}>
        5-year emission schedule showing annual emissions declining from 250M to 100M NZT,
        reaching 1B max supply by Year 5
      </p>
    </div>
  );
};

export default TokenEmissionsChart;