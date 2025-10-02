import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#E9967A', '#FFA07A', '#FA8072', '#BC8F8F', '#CD5C5C'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface SheetData {
  [key: string]: any;
}

interface ParsedData {
  salesByMarketUnits: SheetData[];
  inventoryByMarket: SheetData[];
  salesByMarketSKUUnits: SheetData[];
  inventoryByMarketSKU: SheetData[];
  salesByMarketDollars: SheetData[];
  salesByMarketSKUDollars: SheetData[];
}

function App() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('market-units');
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedSKU, setSelectedSKU] = useState('All');
  const [selectedMonths, setSelectedMonths] = useState<string[]>(MONTHS);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        
        const parsedData: ParsedData = {
          salesByMarketUnits: parseSheet(workbook.Sheets[workbook.SheetNames[0]], 'market'),
          inventoryByMarket: parseSheet(workbook.Sheets[workbook.SheetNames[1]], 'inventory'),
          salesByMarketSKUUnits: parseSheet(workbook.Sheets[workbook.SheetNames[2]], 'sku'),
          inventoryByMarketSKU: parseSheet(workbook.Sheets[workbook.SheetNames[3]], 'inventorySKU'),
          salesByMarketDollars: parseSheet(workbook.Sheets[workbook.SheetNames[4]], 'marketDollars'),
          salesByMarketSKUDollars: parseSheet(workbook.Sheets[workbook.SheetNames[5]], 'skuDollars')
        };
        
        setData(parsedData);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing file:', error);
        setError('Error parsing the Excel file. Please make sure it has the correct format.');
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading the file. Please try again.');
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const parseSheet = (sheet: XLSX.WorkSheet, type: string): SheetData[] => {
    const json = XLSX.utils.sheet_to_json(sheet);
    
    if (type === 'sku' || type === 'skuDollars') {
      return json.filter((row: any) => row.SKU && row.SKU.trim() !== '' && !row.SKU.toLowerCase().includes('total'));
    }
    
    return json.filter((row: any) => row.Market);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-2xl w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-amber-900 mb-2">🍬 Smokiez Dashboard</h1>
              <p className="text-gray-600">Upload your sales data to get started</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="border-2 border-dashed border-amber-300 rounded-lg p-12 text-center hover:border-amber-500 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={loading}
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer"
              >
                <div className="mb-4">
                  <svg className="mx-auto h-16 w-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {loading ? (
                  <div>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-amber-600 mx-auto mb-2"></div>
                    <p className="text-amber-700 font-semibold">Loading your data...</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-semibold text-amber-900 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      Smokiez Sales Output Excel file (.xlsx)
                    </p>
                  </div>
                )}
              </label>
            </div>

            <div className="mt-6 bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>Expected file:</strong> Smokiez Sales Output_20250930_130330.xlsx
              </p>
              <p className="text-xs text-gray-600 mt-2">
                The file should contain 6 sheets with sales and inventory data.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const markets = ['All', ...new Set(data.salesByMarketUnits.map(d => d.Market))];
  const skus = ['All', ...new Set(data.salesByMarketSKUUnits.map(d => d.SKU))];

  const renderMarketUnitsTab = () => {
    const filteredData = selectedMarket === 'All'
      ? data.salesByMarketUnits
      : data.salesByMarketUnits.filter(d => d.Market === selectedMarket);

    const monthlyData = selectedMonths.map(month => {
      const dataPoint: any = { month };
      filteredData.forEach(market => {
        dataPoint[market.Market] = market[month] || 0;
      });
      return dataPoint;
    });

    const totalsByMarket = filteredData.map(market => ({
      market: market.Market,
      total: market.Total || 0,
      inventory: market.Inventory || 0,
      monthsOnHand: market['Months of Inventory on Hand'] || 0
    })).sort((a, b) => b.total - a.total);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Sales by Market - Units</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Market:</label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {markets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Months:</label>
              <select
                multiple
                value={selectedMonths}
                onChange={(e) => setSelectedMonths(Array.from(e.target.selectedOptions, option => option.value))}
                size={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value: any) => value.toLocaleString()} />
              <Legend />
              {filteredData.map((market, idx) => (
                <Line 
                  key={market.Market}
                  type="monotone" 
                  dataKey={market.Market} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 mb-4">Total Sales by Market</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalsByMarket}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="market" />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
                <Bar dataKey="total" fill="#D2691E" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 mb-4">Inventory vs Sales</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalsByMarket}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="market" />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="total" fill="#CD853F" name="Total Sales" />
                <Bar dataKey="inventory" fill="#8B4513" name="Current Inventory" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-amber-800 mb-4">Inventory Metrics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Market</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Total Sales</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Inventory</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Months on Hand</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {totalsByMarket.map((row, idx) => (
                  <tr key={row.market} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.market}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.total.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.inventory.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.monthsOnHand.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSKUUnitsTab = () => {
    let filteredData = data.salesByMarketSKUUnits;
    
    if (selectedMarket !== 'All') {
      filteredData = filteredData.filter(d => d.Market === selectedMarket);
    }
    if (selectedSKU !== 'All') {
      filteredData = filteredData.filter(d => d.SKU === selectedSKU);
    }

    const topSKUs = [...filteredData]
      .sort((a, b) => (b.Total || 0) - (a.Total || 0))
      .slice(0, 15)
      .map(item => ({
        sku: item.SKU,
        market: item.Market,
        total: item.Total || 0,
        inventory: item.Inventory || 0
      }));

    const skusByMarket: { [key: string]: number } = {};
    filteredData.forEach(item => {
      if (!skusByMarket[item.Market]) {
        skusByMarket[item.Market] = 0;
      }
      skusByMarket[item.Market] += (item.Total || 0);
    });

    const marketPieData = Object.entries(skusByMarket).map(([market, total]) => ({
      name: market,
      value: total
    })).sort((a, b) => b.value - a.value);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Sales by Market by SKU - Units</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Market:</label>
              <select 
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {markets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by SKU:</label>
              <select 
                value={selectedSKU}
                onChange={(e) => setSelectedSKU(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {skus.slice(0, 50).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-3">Top 15 SKUs by Sales</h4>
              <ResponsiveContainer width="100%" height={600}>
                <BarChart data={topSKUs} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="sku" width={200} tick={{ fontSize: 9 }} interval={0} />
                  <Tooltip formatter={(value: any) => value.toLocaleString()} />
                  <Bar dataKey="total" fill="#D2691E" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-3">Sales Distribution by Market</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={marketPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {marketPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-amber-800 mb-4">SKU Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Market</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Total Sales</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">% of Market</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">% of Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Inventory</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Months on Hand</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topSKUs.map((row, idx) => {
                  const marketTotal = filteredData
                    .filter(d => d.Market === row.market)
                    .reduce((sum, item) => sum + (item.Total || 0), 0);
                  const percentOfMarket = marketTotal > 0 ? (row.total / marketTotal) * 100 : 0;

                  const grandTotal = filteredData.reduce((sum, item) => sum + (item.Total || 0), 0);
                  const percentOfTotal = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;

                  return (
                    <tr key={`${row.market}-${row.sku}`} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.market}</td>
                      <td className="px-6 py-4 text-gray-900">{row.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">{row.total.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">{percentOfMarket.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">{percentOfTotal.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">{row.inventory.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {filteredData.find(d => d.Market === row.market && d.SKU === row.sku)?.['Inventory On Hand']?.toFixed(1) || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderMarketDollarsTab = () => {
    const filteredData = selectedMarket === 'All'
      ? data.salesByMarketDollars
      : data.salesByMarketDollars.filter(d => d.Market === selectedMarket);

    const monthlyData = selectedMonths.map(month => {
      const dataPoint: any = { month };
      filteredData.forEach(market => {
        dataPoint[market.Market] = market[month] || 0;
      });
      return dataPoint;
    });

    const totalsByMarket = filteredData.map(market => ({
      market: market.Market,
      total: market.Total || 0
    })).sort((a, b) => b.total - a.total);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Sales by Market ($)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Market:</label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {markets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Months:</label>
              <select
                multiple
                value={selectedMonths}
                onChange={(e) => setSelectedMonths(Array.from(e.target.selectedOptions, option => option.value))}
                size={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
              <Legend />
              {filteredData.map((market, idx) => (
                <Line 
                  key={market.Market}
                  type="monotone" 
                  dataKey={market.Market} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 mb-4">Total Sales by Market ($)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalsByMarket}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="market" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                <Bar dataKey="total" fill="#228B22" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 mb-4">Sales Distribution ($)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={totalsByMarket}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ market, percent }: any) => `${market}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {totalsByMarket.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-amber-800 mb-4">Sales Summary ($)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Market</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Total Sales ($)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {totalsByMarket.map((row, idx) => {
                  const totalRevenue = totalsByMarket.reduce((sum, m) => sum + m.total, 0);
                  const percentage = (row.total / totalRevenue) * 100;
                  return (
                    <tr key={row.market} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.market}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">${row.total.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">{percentage.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSKUDollarsTab = () => {
    let filteredData = data.salesByMarketSKUDollars;
    
    if (selectedMarket !== 'All') {
      filteredData = filteredData.filter(d => d.Market === selectedMarket);
    }
    if (selectedSKU !== 'All') {
      filteredData = filteredData.filter(d => d.SKU === selectedSKU);
    }

    const topSKUs = [...filteredData]
      .sort((a, b) => (b.Total || 0) - (a.Total || 0))
      .slice(0, 15)
      .map(item => ({
        sku: item.SKU,
        market: item.Market,
        total: item.Total || 0
      }));

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Sales by Market by SKU ($)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Market:</label>
              <select 
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {markets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by SKU:</label>
              <select 
                value={selectedSKU}
                onChange={(e) => setSelectedSKU(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {skus.slice(0, 50).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-3">Top 15 SKUs by Sales ($)</h4>
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={topSKUs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="sku" width={250} tick={{ fontSize: 9 }} interval={0} />
                <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                <Bar dataKey="total" fill="#228B22" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-amber-800 mb-4">SKU Sales Details ($)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Market</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Total Sales ($)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">% of Market</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topSKUs.map((row, idx) => {
                  const marketTotal = filteredData
                    .filter(d => d.Market === row.market)
                    .reduce((sum, item) => sum + (item.Total || 0), 0);
                  const percentOfMarket = marketTotal > 0 ? (row.total / marketTotal) * 100 : 0;

                  const grandTotal = filteredData.reduce((sum, item) => sum + (item.Total || 0), 0);
                  const percentOfTotal = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;

                  return (
                    <tr key={`${row.market}-${row.sku}`} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.market}</td>
                      <td className="px-6 py-4 text-gray-900">{row.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">${row.total.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">{percentOfMarket.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">{percentOfTotal.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'market-units', label: 'Market Sales (Units)', icon: '📊' },
    { id: 'sku-units', label: 'SKU Sales (Units)', icon: '📦' },
    { id: 'market-dollars', label: 'Market Sales ($)', icon: '💰' },
    { id: 'sku-dollars', label: 'SKU Sales ($)', icon: '💵' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-amber-900 mb-2">🍬 Smokiez Sales & Inventory Dashboard</h1>
            <p className="text-gray-600">Comprehensive analytics across all markets and products</p>
          </div>
          <button
            onClick={() => {
              setData(null);
              setSelectedMarket('All');
              setSelectedSKU('All');
              setSelectedMonths(MONTHS);
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            📁 Load Different File
          </button>
        </header>

        <div className="mb-6 bg-white rounded-lg shadow-md p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedMarket('All');
                  setSelectedSKU('All');
                  setSelectedMonths(MONTHS);
                }}
                className={`px-6 py-3 rounded-md font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="transition-all duration-300">
          {activeTab === 'market-units' && renderMarketUnitsTab()}
          {activeTab === 'sku-units' && renderSKUUnitsTab()}
          {activeTab === 'market-dollars' && renderMarketDollarsTab()}
          {activeTab === 'sku-dollars' && renderSKUDollarsTab()}
        </div>
      </div>
    </div>
  );
}

export default App;