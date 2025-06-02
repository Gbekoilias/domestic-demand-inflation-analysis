import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, AreaChart } from 'recharts';
import * as Papa from 'papaparse';
import _ from 'lodash';

const FiscalDataAnalysis = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    const loadData = async () => {
      try {
        const fileContent = await window.fs.readFile('fiscal_data.csv', { encoding: 'utf8' });
        const parsed = Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          delimitersToGuess: [',', '\t', '|', ';']
        });
        
        if (parsed.errors.length > 0) {
          console.warn('Parsing warnings:', parsed.errors);
        }
        
        // Clean and process the data
        const cleanedData = parsed.data.map(row => {
          const cleanedRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            cleanedRow[cleanKey] = row[key];
          });
          return cleanedRow;
        }).filter(row => row.Year && !isNaN(row.Year));

        setData(cleanedData);
        setLoading(false);
      } catch (err) {
        setError(`Error loading data: ${err.message}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading fiscal data...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (data.length === 0) return <div className="p-8 text-center">No data available</div>;

  // Calculate key metrics
  const latestYear = _.maxBy(data, 'Year');
  const earliestYear = _.minBy(data, 'Year');
  const avgDeficit = _.meanBy(data, 'Budget_Deficit_or_Surplus');
  const avgDebtRatio = _.meanBy(data, 'Debt_to_GDP_Ratio');

  // Format currency values
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `₦${(value / 1000).toFixed(1)}B`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-800">Latest Revenue</h3>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(latestYear?.Government_Revenue)}
          </p>
          <p className="text-xs text-blue-600">{latestYear?.Year}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-sm font-medium text-red-800">Latest Expenditure</h3>
          <p className="text-2xl font-bold text-red-900">
            {formatCurrency(latestYear?.Government_Expenditure)}
          </p>
          <p className="text-xs text-red-600">{latestYear?.Year}</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-800">Avg Budget Balance</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {formatCurrency(avgDeficit)}
          </p>
          <p className="text-xs text-yellow-600">Historical Average</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-purple-800">Avg Debt-to-GDP</h3>
          <p className="text-2xl font-bold text-purple-900">
            {formatPercent(avgDebtRatio)}
          </p>
          <p className="text-xs text-purple-600">Historical Average</p>
        </div>
      </div>

      {/* Revenue vs Expenditure Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Government Revenue vs Expenditure</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Year" />
            <YAxis tickFormatter={(value) => `₦${(value/1000).toFixed(0)}B`} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Government_Revenue" fill="#3b82f6" name="Revenue" />
            <Bar dataKey="Government_Expenditure" fill="#ef4444" name="Expenditure" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderDebtAnalysis = () => (
    <div className="space-y-6">
      {/* Debt Composition */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Debt Composition Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Year" />
            <YAxis tickFormatter={(value) => `₦${(value/1000).toFixed(0)}B`} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="External_Debt" 
              stackId="1" 
              stroke="#8884d8" 
              fill="#8884d8" 
              name="External Debt"
            />
            <Area 
              type="monotone" 
              dataKey="Domestic_Debt" 
              stackId="1" 
              stroke="#82ca9d" 
              fill="#82ca9d" 
              name="Domestic Debt"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Debt-to-GDP Ratio */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Debt-to-GDP Ratio Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Year" />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => `${value?.toFixed(1)}%`} />
            <Line 
              type="monotone" 
              dataKey="Debt_to_GDP_Ratio" 
              stroke="#ff7300" 
              strokeWidth={3}
              name="Debt-to-GDP Ratio"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderBudgetBalance = () => (
    <div className="space-y-6">
      {/* Budget Balance Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Budget Balance (Deficit/Surplus)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Year" />
            <YAxis tickFormatter={(value) => `₦${(value/1000).toFixed(0)}B`} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Bar 
              dataKey="Budget_Deficit_or_Surplus" 
              fill={(entry) => entry > 0 ? "#10b981" : "#ef4444"}
              name="Budget Balance"
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-600 mt-2">
          Positive values indicate surplus, negative values indicate deficit
        </p>
      </div>

      {/* Fiscal Health Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Fiscal Health Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.filter(d => d.Budget_Deficit_or_Surplus > 0).length}
            </div>
            <div className="text-sm text-gray-600">Years with Surplus</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.filter(d => d.Budget_Deficit_or_Surplus < 0).length}
            </div>
            <div className="text-sm text-gray-600">Years with Deficit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatPercent(_.maxBy(data, 'Debt_to_GDP_Ratio')?.Debt_to_GDP_Ratio)}
            </div>
            <div className="text-sm text-gray-600">Peak Debt-to-GDP Ratio</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nigeria Fiscal Data Analysis</h1>
        <p className="text-gray-600">
          Analysis covering {earliestYear?.Year} - {latestYear?.Year} 
          ({data.length} years of data)
        </p>
      </div>

      {/* Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white p-1 rounded-lg shadow">
          {['overview', 'debt', 'budget'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
                selectedView === view
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {view === 'overview' ? 'Overview' : view === 'debt' ? 'Debt Analysis' : 'Budget Balance'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'debt' && renderDebtAnalysis()}
      {selectedView === 'budget' && renderBudgetBalance()}

      {/* Data Source */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Data Source: Federal Ministry of Finance / DMO
      </div>
    </div>
  );
};

export default FiscalDataAnalysis;