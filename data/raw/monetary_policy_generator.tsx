import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, AreaChart } from 'recharts';
import _ from 'lodash';

const MonetaryPolicyGenerator = () => {
  const [data, setData] = useState([]);
  const [selectedView, setSelectedView] = useState('overview');
  const [showCSV, setShowCSV] = useState(false);

  useEffect(() => {
    // Generate realistic CBN monetary policy data (78 monthly entries)
    const generateMonetaryData = () => {
      const monetaryData = [];
      
      // Starting parameters (January 2018)
      const startDate = new Date(2018, 0, 1); // January 2018
      let currentMPR = 14.0; // Starting MPR in 2018
      let currentInflationTarget = 9.0; // CBN's inflation target
      let currentExchangeRate = 305.0; // ₦/USD in early 2018
      let currentMoneySupply = 18500000; // Starting money supply in millions
      
      // Key policy events and periods
      const covidPeriod = { start: new Date(2020, 2, 1), end: new Date(2021, 5, 30) };
      const oilCrashPeriod = { start: new Date(2020, 2, 1), end: new Date(2020, 11, 31) };
      const electionPeriod = { start: new Date(2018, 10, 1), end: new Date(2019, 4, 30) };
      const nairaRedesignPeriod = { start: new Date(2022, 9, 1), end: new Date(2023, 2, 28) };
      
      for (let i = 0; i < 78; i++) {
        const currentDate = new Date(startDate);
        currentDate.setMonth(startDate.getMonth() + i);
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
        
        // MPR adjustments based on economic conditions
        let mprChange = 0;
        
        // COVID-19 accommodative policy (2020-2021)
        if (currentDate >= covidPeriod.start && currentDate <= covidPeriod.end) {
          if (Math.random() < 0.3) { // 30% chance of rate cut
            mprChange = -0.5 - Math.random() * 1.0; // 0.5-1.5% cuts
          }
        }
        
        // Post-COVID tightening (2021-2024)
        else if (year >= 2021 && year <= 2024) {
          if (Math.random() < 0.25) { // 25% chance of rate hike
            mprChange = 0.25 + Math.random() * 1.0; // 0.25-1.25% hikes
          }
        }
        
        // Election period volatility
        if (currentDate >= electionPeriod.start && currentDate <= electionPeriod.end) {
          if (Math.random() < 0.4) {
            mprChange = (Math.random() - 0.5) * 1.0; // ±0.5% volatility
          }
        }
        
        // Naira redesign period (aggressive tightening)
        if (currentDate >= nairaRedesignPeriod.start && currentDate <= nairaRedesignPeriod.end) {
          if (Math.random() < 0.6) {
            mprChange = 0.5 + Math.random() * 1.5; // 0.5-2.0% hikes
          }
        }
        
        currentMPR = Math.max(5.0, Math.min(25.0, currentMPR + mprChange));
        
        // Inflation target adjustments (CBN occasionally revises)
        if (Math.random() < 0.05) { // 5% chance of target revision
          const targetAdjustment = (Math.random() - 0.5) * 2.0; // ±1% adjustment
          currentInflationTarget = Math.max(6.0, Math.min(15.0, currentInflationTarget + targetAdjustment));
        }
        
        // Exchange rate dynamics
        let exchangeRateChange = 0;
        
        // Oil price effects
        const oilPriceVolatility = Math.sin((i / 12) * 2 * Math.PI) * 10 + Math.random() * 20;
        exchangeRateChange += oilPriceVolatility * 0.5;
        
        // COVID-19 and oil crash impact
        if (currentDate >= oilCrashPeriod.start && currentDate <= oilCrashPeriod.end) {
          exchangeRateChange += 15 + Math.random() * 25; // Significant depreciation
        }
        
        // Election period pressure
        if (currentDate >= electionPeriod.start && currentDate <= electionPeriod.end) {
          exchangeRateChange += 5 + Math.random() * 15;
        }
        
        // Naira redesign period (extreme volatility)
        if (currentDate >= nairaRedesignPeriod.start && currentDate <= nairaRedesignPeriod.end) {
          exchangeRateChange += 20 + Math.random() * 40;
        }
        
        // General trend (gradual depreciation)
        exchangeRateChange += 0.5 + Math.random() * 2.0;
        
        // CBN intervention effects (occasional strengthening)
        if (Math.random() < 0.15) { // 15% chance of intervention
          exchangeRateChange -= 10 + Math.random() * 20;
        }
        
        currentExchangeRate = Math.max(200, currentExchangeRate + exchangeRateChange);
        
        // Money supply growth
        let moneySupplyGrowth = 0.015; // Base 1.5% monthly growth
        
        // COVID-19 expansion
        if (currentDate >= covidPeriod.start && currentDate <= covidPeriod.end) {
          moneySupplyGrowth += 0.01 + Math.random() * 0.02; // Additional 1-3% growth
        }
        
        // Election period expansion
        if (currentDate >= electionPeriod.start && currentDate <= electionPeriod.end) {
          moneySupplyGrowth += 0.005 + Math.random() * 0.015; // Additional 0.5-2% growth
        }
        
        // Tightening periods
        if (currentMPR > 18.0) {
          moneySupplyGrowth -= 0.005; // Reduce growth when rates are high
        }
        
        // Add seasonal patterns
        const seasonalFactor = Math.sin((month / 12) * 2 * Math.PI) * 0.005;
        moneySupplyGrowth += seasonalFactor;
        
        currentMoneySupply *= (1 + moneySupplyGrowth + (Math.random() - 0.5) * 0.01);
        
        monetaryData.push({
          Date: dateStr,
          MPR: Math.round(currentMPR * 100) / 100,
          Inflation_Target: Math.round(currentInflationTarget * 100) / 100,
          Exchange_Rate: Math.round(currentExchangeRate * 100) / 100,
          Money_Supply: Math.round(currentMoneySupply)
        });
      }
      
      return monetaryData;
    };
    
    const generatedData = generateMonetaryData();
    setData(generatedData);
  }, []);

  // Generate CSV content
  const generateCSV = () => {
    const headers = ['Date', 'MPR', 'Inflation_Target', 'Exchange_Rate', 'Money_Supply'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => row[header]).join(',')
      )
    ].join('\n');
    return csvContent;
  };

  // Download CSV function
  const downloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monetary_policy_indicators.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (data.length === 0) return <div className="p-8 text-center">Generating monetary policy data...</div>;

  // Calculate key metrics
  const latestEntry = data[data.length - 1];
  const firstEntry = data[0];
  const avgMPR = _.meanBy(data, 'MPR');
  const maxMPR = _.maxBy(data, 'MPR');
  const minMPR = _.minBy(data, 'MPR');
  const maxExchangeRate = _.maxBy(data, 'Exchange_Rate');
  const minExchangeRate = _.minBy(data, 'Exchange_Rate');

  // Format values
  const formatPercent = (value) => `${value?.toFixed(2)}%`;
  const formatCurrency = (value) => `₦${value?.toFixed(2)}`;
  const formatMoney = (value) => {
    if (value >= 1000000) return `₦${(value / 1000000).toFixed(1)}T`;
    if (value >= 1000) return `₦${(value / 1000).toFixed(1)}B`;
    return `₦${value?.toFixed(0)}M`;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Dataset Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Dataset Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Entries:</span> {data.length}
          </div>
          <div>
            <span className="font-medium">Period:</span> {firstEntry.Date} to {latestEntry.Date}
          </div>
          <div>
            <span className="font-medium">Frequency:</span> Monthly
          </div>
          <div>
            <span className="font-medium">Source:</span> Central Bank of Nigeria
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-800">Current MPR</h3>
          <p className="text-2xl font-bold text-green-900">
            {formatPercent(latestEntry?.MPR)}
          </p>
          <p className="text-xs text-green-600">
            Avg: {formatPercent(avgMPR)} | Range: {formatPercent(minMPR.MPR)}-{formatPercent(maxMPR.MPR)}
          </p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="text-sm font-medium text-orange-800">Exchange Rate</h3>
          <p className="text-2xl font-bold text-orange-900">
            {formatCurrency(latestEntry?.Exchange_Rate)}
          </p>
          <p className="text-xs text-orange-600">
            Range: {formatCurrency(minExchangeRate.Exchange_Rate)}-{formatCurrency(maxExchangeRate.Exchange_Rate)}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-purple-800">Inflation Target</h3>
          <p className="text-2xl font-bold text-purple-900">
            {formatPercent(latestEntry?.Inflation_Target)}
          </p>
          <p className="text-xs text-purple-600">CBN Target Range</p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-800">Money Supply</h3>
          <p className="text-2xl font-bold text-blue-900">
            {formatMoney(latestEntry?.Money_Supply)}
          </p>
          <p className="text-xs text-blue-600">M2 Broad Money</p>
        </div>
      </div>

      {/* MPR and Exchange Rate Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Monetary Policy Rate vs Exchange Rate</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="Date" 
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `${value}%`} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `₦${value}`} />
            <Tooltip 
              labelFormatter={(value) => `Date: ${value}`}
              formatter={(value, name) => {
                if (name === 'MPR' || name === 'Inflation_Target') return [`${value}%`, name];
                if (name === 'Exchange_Rate') return [`₦${value}`, name];
                return [value, name];
              }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="MPR" stroke="#10b981" strokeWidth={3} name="MPR (%)" />
            <Line yAxisId="left" type="monotone" dataKey="Inflation_Target" stroke="#8b5cf6" strokeWidth={2} name="Inflation Target (%)" />
            <Line yAxisId="right" type="monotone" dataKey="Exchange_Rate" stroke="#ef4444" strokeWidth={2} name="Exchange Rate (₦/$)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderMoneySupply = () => (
    <div className="space-y-6">
      {/* Money Supply Growth */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Money Supply (M2) Growth</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="Date" 
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={(value) => formatMoney(value)} />
            <Tooltip 
              labelFormatter={(value) => `Date: ${value}`}
              formatter={(value) => [formatMoney(value), 'Money Supply']}
            />
            <Area type="monotone" dataKey="Money_Supply" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Money Supply" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Policy Rate Analysis */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Monetary Policy Rate Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.filter((_, index) => index % 3 === 0)}> {/* Show every 3rd month for clarity */}
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="Date" 
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
              }}
            />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => [`${value}%`, 'MPR']} />
            <Bar dataKey="MPR" fill="#10b981" name="MPR (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Policy Events */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Key Policy Events Captured</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-red-50 rounded border border-red-200">
            <h4 className="font-medium text-red-800">COVID-19 Response (2020-2021)</h4>
            <p className="text-red-600">Accommodative monetary policy with rate cuts and money supply expansion</p>
          </div>
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="font-medium text-blue-800">Post-COVID Tightening (2021-2024)</h4>
            <p className="text-blue-600">Gradual policy normalization with rate hikes to combat inflation</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
            <h4 className="font-medium text-yellow-800">Election Periods (2019, 2023)</h4>
            <p className="text-yellow-600">Increased policy volatility and exchange rate pressure</p>
          </div>
          <div className="p-3 bg-purple-50 rounded border border-purple-200">
            <h4 className="font-medium text-purple-800">Naira Redesign (2022-2023)</h4>
            <p className="text-purple-600">Aggressive tightening and extreme exchange rate volatility</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataTable = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Generated Dataset ({data.length} entries)</h3>
        <div className="space-x-2">
          <button
            onClick={() => setShowCSV(!showCSV)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {showCSV ? 'Hide' : 'Show'} CSV
          </button>
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download CSV
          </button>
        </div>
      </div>
      
      {showCSV && (
        <div className="mb-4">
          <textarea
            value={generateCSV()}
            readOnly
            className="w-full h-64 p-2 border border-gray-300 rounded font-mono text-xs"
            placeholder="CSV content will appear here..."
          />
        </div>
      )}
      
      <div className="overflow-x-auto max-h-96">
        <table className="min-w-full table-auto text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">MPR (%)</th>
              <th className="px-3 py-2 text-right">Inflation Target (%)</th>
              <th className="px-3 py-2 text-right">Exchange Rate (₦/$)</th>
              <th className="px-3 py-2 text-right">Money Supply</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">{row.Date}</td>
                <td className="px-3 py-2 text-right">{row.MPR.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.Inflation_Target.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.Exchange_Rate.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(row.Money_Supply)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nigeria Monetary Policy Indicators</h1>
        <p className="text-gray-600">
          CBN Monthly Data: {data.length} entries from {firstEntry?.Date} to {latestEntry?.Date}
        </p>
      </div>

      {/* Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white p-1 rounded-lg shadow">
          {['overview', 'analysis', 'data'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
                selectedView === view
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {view === 'overview' ? 'Overview' : view === 'analysis' ? 'Money Supply' : 'Dataset'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'analysis' && renderMoneySupply()}
      {selectedView === 'data' && renderDataTable()}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500 space-y-1">
        <p>Generated Dataset: Nigeria Monetary Policy Indicators</p>
        <p>Source: Central Bank of Nigeria (CBN)</p>
        <p>Frequency: Monthly | Variables: MPR, Inflation Target, Exchange Rate, Money Supply</p>
      </div>
    </div>
  );
};

export default MonetaryPolicyGenerator;