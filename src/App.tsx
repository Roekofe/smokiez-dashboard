import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#e11d48', '#0d9488', '#ea580c', '#4f46e5', '#be123c', '#0284c7', '#16a34a'];
const MONTHS_2024 = ['January 2024', 'February 2024', 'March 2024', 'April 2024', 'May 2024', 'June 2024', 'July 2024', 'August 2024', 'September 2024', 'October 2024', 'November 2024', 'December 2024'];
const MONTHS_2025 = ['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025', 'July 2025', 'August 2025', 'September 2025', 'October 2025'];
const ALL_MONTHS = [...MONTHS_2024, ...MONTHS_2025];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Months with known data quality issues (6 markets had no data)
const MONTHS_WITH_ISSUES = ['January 2024', 'February 2024', 'March 2024'];
const QUALITY_MONTHS = ALL_MONTHS.filter(m => !MONTHS_WITH_ISSUES.includes(m));

// Recent, actionable data (last 6 months of quality data for analysis)
// Use April 2025 - Oct 2025 for most recent complete data
const RECENT_MONTHS = ['May 2025', 'June 2025', 'July 2025', 'August 2025', 'September 2025', 'October 2025'];

// Custom tooltip that sorts entries by value
const CustomTooltip = ({ active, payload, label, valueFormatter }: any) => {
  if (active && payload && payload.length) {
    // Sort payload by value in descending order
    const sortedPayload = [...payload].sort((a, b) => {
      const aVal = Number(a.value) || 0;
      const bVal = Number(b.value) || 0;
      return bVal - aVal;
    });

    // Calculate total
    const total = sortedPayload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

    return (
      <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</p>
        {sortedPayload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color, fontSize: '14px', margin: '4px 0' }}>
            {entry.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value.toLocaleString()}
          </p>
        ))}
        <div style={{ borderTop: '1px solid #ccc', marginTop: '8px', paddingTop: '8px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Total: {valueFormatter ? valueFormatter(total) : total.toLocaleString()}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface SheetData {
  [key: string]: any;
}

interface ParsedData {
  salesByMarketDollars: SheetData[];
  salesByMarketUnits: SheetData[];
  pricePerUnit: SheetData[];
  salesByMarketUnitsClean: SheetData[];
  salesByMarketSKUUnits: SheetData[];
  salesByMarketSKUDollars: SheetData[];
  inventoryByMarket: SheetData[];
  inventoryByMarketSKU: SheetData[];
}

function App() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('market-units');
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedSKU, setSelectedSKU] = useState('All');
  const [selectedMonths, setSelectedMonths] = useState<string[]>(ALL_MONTHS);
  const [excludeBadData, setExcludeBadData] = useState(false);
  const [recentMonthsCount, setRecentMonthsCount] = useState(6);
  const [selectedOpportunityType, setSelectedOpportunityType] = useState('All');
  const [selectedImpactLevel, setSelectedImpactLevel] = useState('All');
  const [minInventoryThreshold, setMinInventoryThreshold] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Auto-load Excel file on mount
  React.useEffect(() => {
    const loadDefaultFile = async () => {
      setLoading(true);
      try {
        const response = await fetch('/data.xlsx');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Parse Sheet 0: "Sales by Market ($ and Units)" - contains 3 sections
        const multiSectionData: any = parseSheet(workbook.Sheets[workbook.SheetNames[0]], 'multiSection');

        const parsedData: ParsedData = {
          salesByMarketDollars: multiSectionData.salesDollars,        // Sheet 0, Section 1
          salesByMarketUnits: parseSheet(workbook.Sheets[workbook.SheetNames[1]], 'market'), // Sheet 1 (cleaner)
          pricePerUnit: multiSectionData.pricePerUnit,                // Sheet 0, Section 3
          salesByMarketUnitsClean: parseSheet(workbook.Sheets[workbook.SheetNames[1]], 'market'), // Keep for compatibility
          salesByMarketSKUUnits: parseSheet(workbook.Sheets[workbook.SheetNames[2]], 'sku'),
          salesByMarketSKUDollars: parseSheet(workbook.Sheets[workbook.SheetNames[3]], 'skuDollars'),
          inventoryByMarket: parseSheet(workbook.Sheets[workbook.SheetNames[4]], 'inventory'),
          inventoryByMarketSKU: parseSheet(workbook.Sheets[workbook.SheetNames[5]], 'inventorySKU')
        };

        setData(parsedData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading default file:', error);
        setError('Error loading the default Excel file. You can still upload your own file.');
        setLoading(false);
      }
    };

    loadDefaultFile();
  }, []);

  // Update selected months when data quality filter changes
  React.useEffect(() => {
    if (excludeBadData) {
      setSelectedMonths(QUALITY_MONTHS);
    } else {
      setSelectedMonths(ALL_MONTHS);
    }
  }, [excludeBadData]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });

        // Parse Sheet 0: "Sales by Market ($ and Units)" - contains 3 sections
        const multiSectionData: any = parseSheet(workbook.Sheets[workbook.SheetNames[0]], 'multiSection');

        const parsedData: ParsedData = {
          salesByMarketDollars: multiSectionData.salesDollars,        // Sheet 0, Section 1
          salesByMarketUnits: parseSheet(workbook.Sheets[workbook.SheetNames[1]], 'market'), // Sheet 1 (cleaner)
          pricePerUnit: multiSectionData.pricePerUnit,                // Sheet 0, Section 3
          salesByMarketUnitsClean: parseSheet(workbook.Sheets[workbook.SheetNames[1]], 'market'), // Keep for compatibility
          salesByMarketSKUUnits: parseSheet(workbook.Sheets[workbook.SheetNames[2]], 'sku'),
          salesByMarketSKUDollars: parseSheet(workbook.Sheets[workbook.SheetNames[3]], 'skuDollars'),
          inventoryByMarket: parseSheet(workbook.Sheets[workbook.SheetNames[4]], 'inventory'),
          inventoryByMarketSKU: parseSheet(workbook.Sheets[workbook.SheetNames[5]], 'inventorySKU')
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

    if (type === 'multiSection') {
      // Sheet 1: "Sales by Market ($ and Units)" has 3 sections
      // Row 0 contains the header mapping
      const headerRow = json[0] as any;

      // Create a mapping from __EMPTY_X to actual column names
      const columnMapping: {[key: string]: string} = {};
      Object.keys(headerRow).forEach(key => {
        columnMapping[key] = headerRow[key];
      });

      // Helper function to remap row data
      const remapRow = (row: any) => {
        const remapped: any = {};
        Object.keys(row).forEach(key => {
          const newKey = columnMapping[key] || key;
          remapped[newKey] = row[key];
        });
        // Rename 'Sales Orders $$' to 'Market'
        if (remapped['Market']) {
          remapped.Market = remapped['Market'];
        }
        return remapped;
      };

      // Section 1 (rows 1-13): Sales Orders $$ - skip row 0 (header)
      const salesDollars = json.slice(1, 14).map(remapRow).filter((row: any) => row.Market && row.Market !== 'Market');

      // Section 2: Skip (duplicate of Sheet 1)

      // Section 3 (rows 31-44): $ / Unit Avg - row 30 is section header, row 31 is column headers
      const pricePerUnit = json.slice(32, 45).map(remapRow).filter((row: any) => row.Market && row.Market !== 'Market');

      return { salesDollars, pricePerUnit } as any;
    }

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
                <strong>Expected file:</strong> Smokiez Sales Output_20251006_194854.xlsx
              </p>
              <p className="text-xs text-gray-600 mt-2">
                The file should contain 6 sheets with 22 months of sales and inventory data (Jan 2024 - Oct 2025).
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const markets = ['All', ...new Set(data.salesByMarketUnits.map(d => d.Market))];
  const skus = ['All', ...new Set(data.salesByMarketSKUUnits.map(d => d.SKU))];

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortData = <T extends Record<string, any>>(data: T[], key: string): T[] => {
    if (!sortConfig || sortConfig.key !== key) return data;

    return [...data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Helper function to calculate market-relative performance thresholds
  const calculateMarketThresholds = (market: string) => {
    // Get all SKUs for this specific market
    const marketSkus = data.salesByMarketSKUUnits.filter(sku => sku.Market === market);

    // Calculate recent sales for each SKU in this market
    const recentSalesList = marketSkus.map(sku => calculateRecentSales(sku));

    // Calculate statistics
    const count = recentSalesList.length;
    const sum = recentSalesList.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    // Calculate standard deviation
    const squaredDiffs = recentSalesList.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const stdDev = Math.sqrt(variance);

    // Define thresholds based on standard deviations from mean
    // Strong: > mean + 0.5 * stdDev
    // Above Average: > mean
    // Average: between mean - 0.5 * stdDev and mean
    // Below Average: < mean - 0.5 * stdDev
    // Weak: < mean - 1 * stdDev

    return {
      market,
      mean,
      stdDev,
      strong: mean + (0.5 * stdDev),
      aboveAverage: mean,
      average: mean - (0.5 * stdDev),
      belowAverage: mean - (0.5 * stdDev),
      weak: mean - (1 * stdDev),
      // High potential threshold (top 25% percentile)
      highPotential: mean + (0.75 * stdDev),
      // Understocked threshold (top 40% percentile)
      understockedThreshold: mean + (0.25 * stdDev)
    };
  };

  const renderMarketUnitsTab = () => {
    const filteredData = selectedMarket === 'All'
      ? data.salesByMarketUnits
      : data.salesByMarketUnits.filter(d => d.Market === selectedMarket);

    const totalsByMarket = filteredData.map(market => {
      // Get inventory data from inventoryByMarket (Sheet 4)
      const inventoryData = data.inventoryByMarket.find(inv => inv.Market === market.Market);

      // Calculate total from selected months only
      const total = selectedMonths.reduce((sum, month) => sum + (market[month] || 0), 0);

      return {
        market: market.Market,
        total: total,
        inventory: inventoryData?.['Total Available Inventory (Units)'] || 0,
        monthsOnHand: inventoryData?.['Avg Months of Inventory'] || 0
      };
    }).sort((a, b) => b.total - a.total);

    // Sort filteredData by total sales for consistent ordering
    const sortedFilteredData = [...filteredData].sort((a, b) => (b.Total || 0) - (a.Total || 0));

    const monthlyData = selectedMonths.map(month => {
      const dataPoint: any = { month };
      sortedFilteredData.forEach(market => {
        dataPoint[market.Market] = market[month] || 0;
      });
      return dataPoint;
    });

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Sales by Market - Units</h3>

          {/* Data Quality Warning Banner */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Data Quality Issue</p>
                <p className="text-xs text-yellow-700 mt-1">Jan-Mar 2024 data is incomplete (6 markets had no data). Use the filter below to exclude these months.</p>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip content={<CustomTooltip valueFormatter={(value: any) => value.toLocaleString()} />} />
              <Legend />
              {sortedFilteredData.map((market, idx) => (
                <Bar
                  key={market.Market}
                  dataKey={market.Market}
                  fill={COLORS[idx % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-bold text-amber-800 mb-4">Total Units Sold Trend (All Markets)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData.map((month) => {
              const total = Object.keys(month).reduce((sum, key) => key !== 'month' ? sum + (month[key] || 0) : sum, 0);
              return { month: month.month, total };
            })} margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
              <YAxis width={100} tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip formatter={(value: any) => value.toLocaleString()} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 mb-4">Total Units Sold by Market</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalsByMarket} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="market" />
                <YAxis tickFormatter={(value) => value.toLocaleString()} width={80} />
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
                <Bar dataKey="total" fill="#D2691E" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 mb-4">Inventory vs Units Sold</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalsByMarket} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="market" />
                <YAxis tickFormatter={(value) => value.toLocaleString()} width={80} />
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="total" fill="#CD853F" name="Total Units Sold" />
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('market')}
                  >
                    Market {sortConfig?.key === 'market' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('total')}
                  >
                    Total Sales {sortConfig?.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('inventory')}
                  >
                    Inventory {sortConfig?.key === 'inventory' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('monthsOnHand')}
                  >
                    Months on Hand {sortConfig?.key === 'monthsOnHand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(totalsByMarket, sortConfig?.key || '').map((row, idx) => (
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
        skuLabel: `${item.SKU} (${item.Market})`,
        market: item.Market,
        total: item.Total || 0,
        inventory: item.Inventory || 0,
        monthsOnHand: item['Months of Inventory'] || 0
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-3">Top 15 SKUs by Sales</h4>
              <ResponsiveContainer width="100%" height={600}>
                <BarChart data={topSKUs} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} />
                  <YAxis type="category" dataKey="skuLabel" width={200} tick={{ fontSize: 9 }} interval={0} />
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('market')}
                  >
                    Market {sortConfig?.key === 'market' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('sku')}
                  >
                    SKU {sortConfig?.key === 'sku' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('total')}
                  >
                    Total Sales {sortConfig?.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('percentOfMarket')}
                  >
                    % of Market {sortConfig?.key === 'percentOfMarket' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('percentOfTotal')}
                  >
                    % of Total {sortConfig?.key === 'percentOfTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('inventory')}
                  >
                    Inventory {sortConfig?.key === 'inventory' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('monthsOnHand')}
                  >
                    Months on Hand {sortConfig?.key === 'monthsOnHand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(topSKUs.map(row => {
                  const marketTotal = filteredData
                    .filter(d => d.Market === row.market)
                    .reduce((sum, item) => sum + (item.Total || 0), 0);
                  const percentOfMarket = marketTotal > 0 ? (row.total / marketTotal) * 100 : 0;

                  const grandTotal = filteredData.reduce((sum, item) => sum + (item.Total || 0), 0);
                  const percentOfTotal = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
                  const monthsOnHand = filteredData.find(d => d.Market === row.market && d.SKU === row.sku)?.['Months of Inventory'] || 0;

                  return { ...row, percentOfMarket, percentOfTotal, monthsOnHand };
                }), sortConfig?.key || '').map((row, idx) => (
                  <tr key={`${row.market}-${row.sku}`} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.market}</td>
                    <td className="px-6 py-4 text-gray-900">{row.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.total.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.percentOfMarket.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.percentOfTotal.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.inventory.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {row.monthsOnHand > 0 ? row.monthsOnHand.toFixed(1) : 'N/A'}
                    </td>
                  </tr>
                ))}
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

    const totalsByMarket = filteredData.map(market => ({
      market: market.Market,
      total: market.Total || 0
    })).sort((a, b) => b.total - a.total);

    // Sort filteredData by total sales for consistent ordering
    const sortedFilteredData = [...filteredData].sort((a, b) => (b.Total || 0) - (a.Total || 0));

    const monthlyData = selectedMonths.map(month => {
      const dataPoint: any = { month };
      sortedFilteredData.forEach(market => {
        dataPoint[market.Market] = market[month] || 0;
      });
      return dataPoint;
    });

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Sales by Market ($)</h3>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip content={<CustomTooltip valueFormatter={(value: any) => `$${value.toLocaleString()}`} />} />
              <Legend />
              {sortedFilteredData.map((market, idx) => (
                <Bar
                  key={market.Market}
                  dataKey={market.Market}
                  fill={COLORS[idx % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-bold text-amber-800 mb-4">Total Revenue Trend (All Markets)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData.map((month) => {
              const total = Object.keys(month).reduce((sum, key) => key !== 'month' ? sum + (month[key] || 0) : sum, 0);
              return { month: month.month, total };
            })} margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={100} />
              <YAxis width={100} tickFormatter={(value) => `$${value.toLocaleString()}`} />
              <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 mb-4">Total Sales by Market ($)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalsByMarket} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="market" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} width={100} />
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('market')}
                  >
                    Market {sortConfig?.key === 'market' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('total')}
                  >
                    Total Sales ($) {sortConfig?.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('percentage')}
                  >
                    % of Total {sortConfig?.key === 'percentage' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(totalsByMarket.map(row => {
                  const totalRevenue = totalsByMarket.reduce((sum, m) => sum + m.total, 0);
                  const percentage = (row.total / totalRevenue) * 100;
                  return { ...row, percentage };
                }), sortConfig?.key || '').map((row, idx) => (
                  <tr key={row.market} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.market}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">${row.total.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
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
        skuLabel: `${item.SKU} (${item.Market})`,
        market: item.Market,
        total: item.Total || 0
      }));

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Sales by Market by SKU ($)</h3>

          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-3">Top 15 SKUs by Sales ($)</h4>
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={topSKUs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <YAxis type="category" dataKey="skuLabel" width={250} tick={{ fontSize: 9 }} interval={0} />
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('market')}
                  >
                    Market {sortConfig?.key === 'market' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('sku')}
                  >
                    SKU {sortConfig?.key === 'sku' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('total')}
                  >
                    Total Sales ($) {sortConfig?.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('percentOfMarket')}
                  >
                    % of Market {sortConfig?.key === 'percentOfMarket' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('percentOfTotal')}
                  >
                    % of Total {sortConfig?.key === 'percentOfTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(topSKUs.map(row => {
                  const marketTotal = filteredData
                    .filter(d => d.Market === row.market)
                    .reduce((sum, item) => sum + (item.Total || 0), 0);
                  const percentOfMarket = marketTotal > 0 ? (row.total / marketTotal) * 100 : 0;

                  const grandTotal = filteredData.reduce((sum, item) => sum + (item.Total || 0), 0);
                  const percentOfTotal = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;

                  return { ...row, percentOfMarket, percentOfTotal };
                }), sortConfig?.key || '').map((row, idx) => (
                  <tr key={`${row.market}-${row.sku}`} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.market}</td>
                    <td className="px-6 py-4 text-gray-900">{row.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">${row.total.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.percentOfMarket.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.percentOfTotal.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPricePerUnitTab = () => {
    const unitsData = data.salesByMarketUnits;
    const dollarsData = data.salesByMarketDollars;

    // Calculate market summary data
    const sortedMarkets = [...unitsData].sort((a, b) => (b.Total || 0) - (a.Total || 0));

    const marketSummary = sortedMarkets.map(marketUnits => {
      const marketDollars = dollarsData.find(d => d.Market === marketUnits.Market);
      const totalUnits = marketUnits.Total || 0;
      const totalRevenue = marketDollars?.Total || 0;
      const avgPricePerUnit = totalUnits > 0 ? totalRevenue / totalUnits : 0;

      return {
        market: marketUnits.Market,
        totalRevenue,
        totalUnits,
        avgPricePerUnit
      };
    });

    const grandTotalRevenue = marketSummary.reduce((sum, m) => sum + m.totalRevenue, 0);
    const grandTotalUnits = marketSummary.reduce((sum, m) => sum + m.totalUnits, 0);

    // Data for scatter plot - Revenue/Unit Ratio
    const scatterData = marketSummary.map(m => {
      const revenuePercent = grandTotalRevenue > 0 ? (m.totalRevenue / grandTotalRevenue) * 100 : 0;
      const unitsPercent = grandTotalUnits > 0 ? (m.totalUnits / grandTotalUnits) * 100 : 0;
      const ratio = unitsPercent > 0 ? revenuePercent / unitsPercent : 0;

      return {
        market: m.market,
        revenuePercent,
        unitsPercent,
        ratio,
        totalRevenue: m.totalRevenue
      };
    });

    // Data for average price per unit bar chart
    const pricePerUnitChartData = marketSummary.map(m => ({
      market: m.market,
      avgPrice: m.avgPricePerUnit
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-amber-800 mb-4">Revenue/Unit Ratio by Market</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 80, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="unitsPercent"
                  name="% of Units"
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  label={{ value: '% of Total Units', position: 'bottom', offset: 40 }}
                />
                <YAxis
                  type="number"
                  dataKey="revenuePercent"
                  name="% of Revenue"
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  label={{ value: '% of Total Revenue', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis type="number" dataKey="totalRevenue" range={[100, 1000]} name="Revenue" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{data.market}</p>
                          <p style={{ fontSize: '14px', margin: '4px 0' }}>Units: {data.unitsPercent.toFixed(1)}%</p>
                          <p style={{ fontSize: '14px', margin: '4px 0' }}>Revenue: {data.revenuePercent.toFixed(1)}%</p>
                          <p style={{ fontSize: '14px', margin: '4px 0', fontWeight: 'bold', color: data.ratio > 1.1 ? '#059669' : data.ratio < 0.9 ? '#dc2626' : '#6b7280' }}>
                            Ratio: {data.ratio.toFixed(2)}x
                          </p>
                          <p style={{ fontSize: '14px', margin: '4px 0', color: '#7c3aed' }}>
                            Total: ${data.totalRevenue.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  data={scatterData}
                  fill="#7c3aed"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = payload.ratio > 1.1 ? '#059669' : payload.ratio < 0.9 ? '#dc2626' : '#7c3aed';
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />
                        <text x={cx} y={cy - 12} textAnchor="middle" fontSize={10} fill="#374151">
                          {payload.market}
                        </text>
                      </g>
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-amber-800 mb-4">Average Price Per Unit by Market</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={pricePerUnitChartData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="market" angle={-45} textAnchor="end" height={100} />
                <YAxis width={80} tickFormatter={(value) => `$${value.toFixed(2)}`} />
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                <Bar dataKey="avgPrice">
                  {pricePerUnitChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Revenue, Units & Pricing Analysis by State</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-100">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('market')}
                  >
                    Market {sortConfig?.key === 'market' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('totalRevenue')}
                  >
                    Total Revenue {sortConfig?.key === 'totalRevenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('revenuePercent')}
                  >
                    % of Total Revenue {sortConfig?.key === 'revenuePercent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('totalUnits')}
                  >
                    Units Sold {sortConfig?.key === 'totalUnits' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('unitsPercent')}
                  >
                    % of Total Units {sortConfig?.key === 'unitsPercent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('ratio')}
                  >
                    Revenue/Unit Ratio {sortConfig?.key === 'ratio' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('avgPricePerUnit')}
                  >
                    Avg $/Unit {sortConfig?.key === 'avgPricePerUnit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(marketSummary.map(row => {
                  const revenuePercent = grandTotalRevenue > 0 ? (row.totalRevenue / grandTotalRevenue) * 100 : 0;
                  const unitsPercent = grandTotalUnits > 0 ? (row.totalUnits / grandTotalUnits) * 100 : 0;
                  const ratio = unitsPercent > 0 ? revenuePercent / unitsPercent : 0;
                  return { ...row, revenuePercent, unitsPercent, ratio };
                }), sortConfig?.key || '').map((row, idx) => (
                  <tr key={row.market} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.market}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">${row.totalRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {row.revenuePercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">{row.totalUnits.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {row.unitsPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.ratio > 1.1 ? 'bg-green-100 text-green-800' :
                        row.ratio < 0.9 ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {row.ratio.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-purple-700">
                      ${row.avgPricePerUnit.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-amber-50 font-bold">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">TOTAL</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">${grandTotalRevenue.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">100%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">{grandTotalUnits.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">100%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">1.00x</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-purple-700">
                    ${grandTotalUnits > 0 ? (grandTotalRevenue / grandTotalUnits).toFixed(2) : '0.00'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to calculate recent sales (configurable months)
  const calculateRecentSales = (item: any): number => {
    const recentMonths = ALL_MONTHS.slice(-recentMonthsCount);
    return recentMonths.reduce((sum, month) => sum + (item[month] || 0), 0);
  };

  // 1. SKU Performance Matrix - Sales Volume vs Inventory Turnover
  const renderPerformanceMatrixTab = () => {
    // Helper function to calculate 2025-only sales
    const calculate2025Sales = (item: any): number => {
      return MONTHS_2025.reduce((sum, month) => sum + (item[month] || 0), 0);
    };

    // Helper function to calculate market-relative thresholds for 2025 data only (UNITS)
    const calculateMarketThresholds2025 = (market: string) => {
      const marketSkus = data.salesByMarketSKUUnits.filter(sku => sku.Market === market);
      const salesList2025 = marketSkus.map(sku => calculate2025Sales(sku));

      const count = salesList2025.length;
      const sum = salesList2025.reduce((a, b) => a + b, 0);
      const mean = sum / count;

      const squaredDiffs = salesList2025.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
      const stdDev = Math.sqrt(variance);

      return {
        market,
        mean,
        stdDev,
        strong: mean + (0.5 * stdDev),
        aboveAverage: mean,
        average: mean - (0.5 * stdDev),
        belowAverage: mean - (0.5 * stdDev),
        weak: mean - (1 * stdDev)
      };
    };

    // Helper function to calculate market-relative REVENUE thresholds for 2025 data only
    const calculateMarketRevenueThresholds2025 = (market: string) => {
      const marketSkus = data.salesByMarketSKUDollars.filter(sku => sku.Market === market);
      const revenueList2025 = marketSkus.map(sku => calculate2025Sales(sku));

      const count = revenueList2025.length;
      const sum = revenueList2025.reduce((a, b) => a + b, 0);
      const mean = sum / count;

      const squaredDiffs = revenueList2025.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
      const stdDev = Math.sqrt(variance);

      return {
        market,
        mean,
        stdDev,
        strong: mean + (0.5 * stdDev),
        aboveAverage: mean,
        average: mean - (0.5 * stdDev),
        belowAverage: mean - (0.5 * stdDev),
        weak: mean - (1 * stdDev)
      };
    };

    const skuData = data.salesByMarketSKUUnits.map(sku => {
      const inventory = sku.Inventory || 0;
      const monthsOnHand = sku['Months of Inventory'] || 0;
      // Use 2025 sales only for performance matrix
      const recentSales = calculate2025Sales(sku);
      const totalSold = sku.Total || 0;

      // Calculate actual sales rate (units per month in 2025)
      const salesRate = MONTHS_2025.length > 0 ? recentSales / MONTHS_2025.length : 0;

      // Calculate inventory turnover rate for legacy compatibility
      const turnoverRate = monthsOnHand > 0 ? 12 / monthsOnHand : 0;

      // Get dollar value from 2025 only
      const dollarData = data.salesByMarketSKUDollars.find(d => d.SKU === sku.SKU && d.Market === sku.Market);
      const revenue = dollarData ? calculate2025Sales(dollarData) : 0;

      // Calculate revenue-based metrics
      const revenueRate = MONTHS_2025.length > 0 ? revenue / MONTHS_2025.length : 0; // $/month
      const revenuePerUnit = recentSales > 0 ? revenue / recentSales : 0; // $/unit (margin indicator)

      // Get market-relative thresholds based on 2025 REVENUE data
      const revenueThresholds = calculateMarketRevenueThresholds2025(sku.Market);

      // Calculate sales consistency: how many months in 2025 had sales > 0
      const monthsWithSales = MONTHS_2025.filter(month => (sku[month] || 0) > 0).length;
      const salesConsistency = MONTHS_2025.length > 0 ? monthsWithSales / MONTHS_2025.length : 0;

      // Calculate if SKU is declining or stable/growing (using REVENUE, not units)
      // Compare first half vs second half of 2025
      const halfPoint = Math.floor(MONTHS_2025.length / 2);
      let firstHalfRevenue = 0;
      let secondHalfRevenue = 0;
      if (dollarData) {
        firstHalfRevenue = MONTHS_2025.slice(0, halfPoint).reduce((sum, m) => sum + (dollarData[m] || 0), 0);
        secondHalfRevenue = MONTHS_2025.slice(halfPoint).reduce((sum, m) => sum + (dollarData[m] || 0), 0);
      }
      const isGrowing = secondHalfRevenue >= firstHalfRevenue; // Stable or growing revenue

      // Improved categorization considering REVENUE rate, consistency, and trends
      let category: string;

      // Market-relative REVENUE rate threshold (mean revenue rate for the market)
      const marketRevenueRate = MONTHS_2025.length > 0 ? revenueThresholds.mean / MONTHS_2025.length : 0;
      const highRevenue = revenue > revenueThresholds.strong; // Strong revenue generation
      const fastRevenueRate = revenueRate > marketRevenueRate; // Generates $ faster than market average
      const consistent = salesConsistency >= 0.6; // Sold in 60%+ of months

      if (highRevenue && fastRevenueRate && consistent) {
        category = 'Star'; // High revenue + fast rate + consistent = best performers
      } else if (highRevenue && !fastRevenueRate && consistent) {
        category = 'Cash Cow'; // High revenue but slower rate - still profitable
      } else if (!highRevenue && fastRevenueRate && consistent) {
        category = 'Question Mark'; // Lower revenue but generates $ quickly and consistently
      } else if (!highRevenue && consistent && isGrowing) {
        category = 'Steady Low Performer'; // Consistent + growing revenue niche product
      } else {
        category = 'Dog'; // Sporadic, declining revenue, or inconsistent - discontinuation candidate
      }

      return {
        sku: sku.SKU,
        market: sku.Market,
        totalSold,
        recentSales,
        salesRate, // Average units sold per month
        revenue, // Total 2025 revenue
        revenueRate, // Revenue per month ($/month) - PRIMARY METRIC
        revenuePerUnit, // Revenue per unit ($/unit) - margin indicator
        inventory,
        monthsOnHand,
        turnoverRate,
        salesConsistency, // 0-1, percentage of months with sales
        isGrowing, // true if second half revenue >= first half revenue
        category
      };
    });

    // Cap turnover rate at 50x for visualization (anything higher makes chart unreadable)
    const cappedData = skuData.map(d => ({
      ...d,
      turnoverRate: Math.min(d.turnoverRate, 50) // Cap at 50x for chart readability
    }));

    // Filter by market
    let filteredData = selectedMarket === 'All'
      ? cappedData
      : cappedData.filter(d => d.market === selectedMarket);

    // Debug logging for NM market
    if (selectedMarket === 'NM') {
      console.log('NM SKUs after market filter:', filteredData.length);
      console.log('NM SKUs data:', filteredData.map(d => ({ sku: d.sku, inventory: d.inventory, revenue: d.revenue })));
    }

    // Apply minimum inventory threshold (user-controlled filter for deprecated items)
    const afterInventoryThreshold = filteredData.filter(d => d.inventory >= minInventoryThreshold);
    if (selectedMarket === 'NM') {
      console.log('NM SKUs after inventory threshold filter:', afterInventoryThreshold.length);
    }
    filteredData = afterInventoryThreshold;

    // Remove entries with 0 inventory (these are definitely discontinued/out of stock)
    filteredData = filteredData.filter(d => d.inventory > 0);
    if (selectedMarket === 'NM') {
      console.log('NM SKUs after zero inventory filter:', filteredData.length);
    }

    // Category counts
    const categoryCounts = {
      'Star': filteredData.filter(d => d.category === 'Star').length,
      'Cash Cow': filteredData.filter(d => d.category === 'Cash Cow').length,
      'Question Mark': filteredData.filter(d => d.category === 'Question Mark').length,
      'Steady Low Performer': filteredData.filter(d => d.category === 'Steady Low Performer').length,
      'Dog': filteredData.filter(d => d.category === 'Dog').length
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">SKU Performance Matrix - Revenue Analysis</h3>
          <p className="text-sm text-gray-600 mb-4">
            Analyze SKUs by revenue generation rate and total revenue. Each SKU is weighted by its actual dollar return per unit. High revenue rate + high total revenue = Stars ⭐
          </p>

          {/* Data Recency Banner */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">2025 Revenue Data Only</p>
                <p className="text-xs text-blue-700 mt-1">Performance Matrix analyzes only 2025 revenue data (January - October 2025) to focus on current financial performance. Categories are based on revenue rate, not just unit volume.</p>
              </div>
            </div>
          </div>

          {/* Key Definitions */}
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm font-bold text-amber-900 mb-2">Understanding the Metrics:</p>
            <div className="space-y-2 text-xs text-gray-700">
              <div>
                <span className="font-semibold text-amber-800">Revenue Rate (X-axis):</span> Average revenue generated per month in 2025.
                <br />
                <span className="italic">Formula: Total 2025 Revenue ÷ 10 months</span>
                <br />
                <span className="text-gray-600">This measures how fast a SKU generates money. Compared to market average revenue rate. High-margin products naturally score higher.</span>
              </div>
              <div className="pt-2 border-t border-amber-200">
                <span className="font-semibold text-amber-800">Total Revenue (Y-axis):</span> Total dollars generated in 2025.
                <br />
                <span className="text-gray-600">Evaluated relative to market's 2025 revenue patterns. Higher = stronger financial impact in that market.</span>
              </div>
              <div className="pt-2 border-t border-amber-200">
                <span className="font-semibold text-amber-800">Revenue per Unit:</span> Average dollars per unit sold (shown in tooltip).
                <br />
                <span className="text-gray-600">Margin indicator - helps distinguish high-value SKUs from high-volume low-margin items. Formula: Total Revenue ÷ Total Units.</span>
              </div>
              <div className="pt-2 border-t border-amber-200">
                <span className="font-semibold text-amber-800">Filtering:</span>
                <br />
                <span className="text-gray-600">
                  • Automatically excludes SKUs with 0 inventory (discontinued/out-of-stock)<br />
                  • Use "Min Inventory Threshold" slider below to filter out deprecated SKUs with low remaining stock<br />
                  • All active SKUs with inventory are shown - no artificial sales/revenue minimums applied
                </span>
              </div>
              <div className="pt-2 border-t border-amber-200">
                <span className="font-semibold text-amber-800">Categories (based on revenue rate, total revenue, consistency & trend):</span>
                <br />
                <span className="text-gray-600">
                  ⭐ <strong>Stars</strong>: High revenue + fast rate + consistent = best financial performers.<br />
                  💰 <strong>Cash Cows</strong>: High revenue + slower rate + consistent = reliable profit.<br />
                  ❓ <strong>Question Marks</strong>: Lower revenue + fast rate + consistent = efficient emerging products.<br />
                  📊 <strong>Steady Low</strong>: Consistent + growing revenue = stable niche products.<br />
                  🐕 <strong>Dogs</strong>: Sporadic, declining revenue, or inconsistent = discontinuation candidates.
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Recent Sales Timeframe:</label>
              <select
                value={recentMonthsCount}
                onChange={(e) => setRecentMonthsCount(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={9}>Last 9 months</option>
                <option value={12}>Last 12 months</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Inventory Threshold:</label>
              <input
                type="number"
                value={minInventoryThreshold}
                onChange={(e) => setMinInventoryThreshold(Number(e.target.value))}
                min="0"
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-gray-500 mt-1">Hide SKUs with inventory below this amount (useful for filtering deprecated items)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Months:</label>
              <select
                multiple
                value={selectedMonths}
                onChange={(e) => setSelectedMonths(Array.from(e.target.selectedOptions, option => option.value))}
                size={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 80, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="revenueRate"
                name="Revenue Rate ($/month)"
                tickFormatter={(value) => `$${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`}
                label={{ value: 'Revenue Rate ($/month)', position: 'bottom', offset: 40 }}
              />
              <YAxis
                type="number"
                dataKey="revenue"
                name="Total 2025 Revenue"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                label={{ value: '2025 Revenue ($)', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="revenuePerUnit" range={[50, 800]} name="Revenue/Unit" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{data.sku}</p>
                        <p style={{ fontSize: '12px', margin: '4px 0' }}>Market: {data.market}</p>
                        <p style={{ fontSize: '12px', margin: '4px 0', fontWeight: 'bold', color: '#2563eb' }}>Revenue Rate: ${data.revenueRate.toLocaleString(undefined, {maximumFractionDigits: 0})}/month</p>
                        <p style={{ fontSize: '12px', margin: '4px 0' }}>2025 Revenue: ${data.revenue.toLocaleString()}</p>
                        <p style={{ fontSize: '12px', margin: '4px 0', fontWeight: 'bold', color: '#059669' }}>Revenue/Unit: ${data.revenuePerUnit.toFixed(2)}</p>
                        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '8px' }}>
                          <p style={{ fontSize: '12px', margin: '4px 0' }}>Sales Rate: {data.salesRate.toFixed(1)} units/month</p>
                          <p style={{ fontSize: '12px', margin: '4px 0' }}>2025 Units: {data.recentSales.toLocaleString()}</p>
                          <p style={{ fontSize: '12px', margin: '4px 0', color: '#6b7280' }}>Inventory: {data.inventory.toLocaleString()} units ({data.monthsOnHand.toFixed(1)} months)</p>
                        </div>
                        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '8px' }}>
                          <p style={{ fontSize: '12px', margin: '4px 0', color: data.salesConsistency >= 0.7 ? '#059669' : data.salesConsistency >= 0.4 ? '#d97706' : '#dc2626' }}>
                            Consistency: {(data.salesConsistency * 100).toFixed(0)}% ({Math.round(data.salesConsistency * MONTHS_2025.length)}/{MONTHS_2025.length} months)
                          </p>
                          <p style={{ fontSize: '12px', margin: '4px 0', color: data.isGrowing ? '#059669' : '#dc2626' }}>
                            Trend: {data.isGrowing ? '📈 Stable/Growing' : '📉 Declining'}
                          </p>
                        </div>
                        <p style={{ fontSize: '12px', margin: '8px 0 4px 0', fontWeight: 'bold', color:
                          data.category === 'Star' ? '#059669' :
                          data.category === 'Cash Cow' ? '#2563eb' :
                          data.category === 'Question Mark' ? '#d97706' :
                          data.category === 'Steady Low Performer' ? '#6366f1' : '#dc2626'
                        }}>
                          Category: {data.category}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                data={filteredData}
                fill="#7c3aed"
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  const colors = {
                    'Star': '#059669',
                    'Cash Cow': '#2563eb',
                    'Question Mark': '#d97706',
                    'Steady Low Performer': '#6366f1',
                    'Dog': '#dc2626'
                  };
                  return (
                    <circle cx={cx} cy={cy} r={5} fill={colors[payload.category as keyof typeof colors]} stroke="#fff" strokeWidth={2} />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex flex-col">
                <p className="text-sm text-green-700 font-medium">⭐ Stars</p>
                <p className="text-2xl font-bold text-green-900 my-2">{categoryCounts['Star']}</p>
                <p className="text-xs text-green-600">High Revenue + Fast Rate</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex flex-col">
                <p className="text-sm text-blue-700 font-medium">💰 Cash Cows</p>
                <p className="text-2xl font-bold text-blue-900 my-2">{categoryCounts['Cash Cow']}</p>
                <p className="text-xs text-blue-600">High Revenue + Steady</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex flex-col">
                <p className="text-sm text-yellow-700 font-medium">❓ Question Marks</p>
                <p className="text-2xl font-bold text-yellow-900 my-2">{categoryCounts['Question Mark']}</p>
                <p className="text-xs text-yellow-600">Fast Rate + Emerging</p>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex flex-col">
                <p className="text-sm text-indigo-700 font-medium">📊 Steady Low</p>
                <p className="text-2xl font-bold text-indigo-900 my-2">{categoryCounts['Steady Low Performer']}</p>
                <p className="text-xs text-indigo-600">Growing Niche Revenue</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex flex-col">
                <p className="text-sm text-red-700 font-medium">🐕 Dogs</p>
                <p className="text-2xl font-bold text-red-900 my-2">{categoryCounts['Dog']}</p>
                <p className="text-xs text-red-600">Declining Revenue</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. Inventory Health Score
  const renderInventoryHealthTab = () => {
    const skuData = data.salesByMarketSKUUnits.map(sku => {
      const inventory = sku.Inventory || 0;
      const monthsOnHand = sku['Months of Inventory'] || 0;
      const recentSales = calculateRecentSales(sku);
      const totalSold = sku.Total || 0;

      // Health score logic
      let healthStatus = 'Healthy';
      let healthColor = 'green';
      let recommendation = 'Optimal stock levels';

      if (monthsOnHand > 4) {
        healthStatus = 'Overstocked';
        healthColor = 'red';
        recommendation = 'Reduce inventory - capital tied up';
      } else if (monthsOnHand > 2) {
        healthStatus = 'Moderately High';
        healthColor = 'yellow';
        recommendation = 'Monitor closely - may be overstocked';
      } else if (monthsOnHand < 1 && recentSales > 50) { // Use recent sales
        healthStatus = 'Understocked';
        healthColor = 'orange';
        recommendation = 'Increase stock - risk of stockout';
      } else if (inventory < 0) {
        healthStatus = 'Backorder';
        healthColor = 'purple';
        recommendation = 'Negative inventory - fulfill pending orders';
      }

      return {
        sku: sku.SKU,
        market: sku.Market,
        inventory,
        monthsOnHand,
        recentSales,
        totalSold,
        healthStatus,
        healthColor,
        recommendation
      };
    });

    const filteredData = selectedMarket === 'All'
      ? skuData
      : skuData.filter(d => d.Market === selectedMarket);

    const sortedData = [...filteredData].sort((a, b) => {
      const priority = { 'Backorder': 0, 'Understocked': 1, 'Overstocked': 2, 'Moderately High': 3, 'Healthy': 4 };
      return priority[a.healthStatus as keyof typeof priority] - priority[b.healthStatus as keyof typeof priority];
    });

    const healthCounts = {
      'Overstocked': filteredData.filter(d => d.healthStatus === 'Overstocked').length,
      'Moderately High': filteredData.filter(d => d.healthStatus === 'Moderately High').length,
      'Healthy': filteredData.filter(d => d.healthStatus === 'Healthy').length,
      'Understocked': filteredData.filter(d => d.healthStatus === 'Understocked').length,
      'Backorder': filteredData.filter(d => d.healthStatus === 'Backorder').length
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Inventory Health Score</h3>
          <p className="text-sm text-gray-600 mb-4">
            Color-coded inventory status with automated alerts and recommendations
          </p>

          {/* Data Recency Banner */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Recent Data Analysis</p>
                <p className="text-xs text-blue-700 mt-1">Health assessments based on last {recentMonthsCount} months ({ALL_MONTHS.slice(-recentMonthsCount)[0]} - {ALL_MONTHS.slice(-recentMonthsCount)[recentMonthsCount - 1]}) sales performance.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium">Overstocked (&gt;4mo)</p>
              <p className="text-2xl font-bold text-red-900">{healthCounts['Overstocked']}</p>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-700 font-medium">Mod. High (2-4mo)</p>
              <p className="text-2xl font-bold text-yellow-900">{healthCounts['Moderately High']}</p>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700 font-medium">Healthy</p>
              <p className="text-2xl font-bold text-green-900">{healthCounts['Healthy']}</p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-700 font-medium">Understocked</p>
              <p className="text-2xl font-bold text-orange-900">{healthCounts['Understocked']}</p>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-700 font-medium">Backorder</p>
              <p className="text-2xl font-bold text-purple-900">{healthCounts['Backorder']}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-100">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('market')}
                  >
                    Market {sortConfig?.key === 'market' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('sku')}
                  >
                    SKU {sortConfig?.key === 'sku' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('inventory')}
                  >
                    Inventory {sortConfig?.key === 'inventory' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('monthsOnHand')}
                  >
                    Months on Hand {sortConfig?.key === 'monthsOnHand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('recentSales')}
                  >
                    Recent Sales ({recentMonthsCount}mo) {sortConfig?.key === 'recentSales' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-center text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('healthStatus')}
                  >
                    Status {sortConfig?.key === 'healthStatus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Recommendation</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(sortedData, sortConfig?.key || '').slice(0, 50).map((row, idx) => (
                  <tr key={`${row.market}-${row.sku}`} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.market}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{row.inventory.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{row.monthsOnHand.toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-700">{row.recentSales.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        row.healthColor === 'red' ? 'bg-red-100 text-red-800' :
                        row.healthColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        row.healthColor === 'green' ? 'bg-green-100 text-green-800' :
                        row.healthColor === 'orange' ? 'bg-orange-100 text-orange-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {row.healthStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{row.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-4">Showing top 50 SKUs sorted by priority (critical issues first)</p>
        </div>
      </div>
    );
  };

  // 3. Product Portfolio Analysis
  const renderPortfolioAnalysisTab = () => {
    // Filter by market first
    const filteredUnits = selectedMarket === 'All'
      ? data.salesByMarketSKUUnits
      : data.salesByMarketSKUUnits.filter(d => d.Market === selectedMarket);

    const filteredDollars = selectedMarket === 'All'
      ? data.salesByMarketSKUDollars
      : data.salesByMarketSKUDollars.filter(d => d.Market === selectedMarket);

    // Aggregate SKU sales data with market tracking
    const skuTotals: { [key: string]: { units: number; revenue: number; markets: { [market: string]: number } } } = {};

    filteredUnits.forEach(sku => {
      if (!skuTotals[sku.SKU]) {
        skuTotals[sku.SKU] = { units: 0, revenue: 0, markets: {} };
      }
      // Sum only selected months
      const monthSales = selectedMonths.reduce((sum, month) => sum + (sku[month] || 0), 0);
      skuTotals[sku.SKU].units += monthSales;

      // Track market-level sales
      if (!skuTotals[sku.SKU].markets[sku.Market]) {
        skuTotals[sku.SKU].markets[sku.Market] = 0;
      }
      skuTotals[sku.SKU].markets[sku.Market] += monthSales;
    });

    filteredDollars.forEach(sku => {
      if (!skuTotals[sku.SKU]) {
        skuTotals[sku.SKU] = { units: 0, revenue: 0, markets: {} };
      }
      // Sum only selected months
      const monthRevenue = selectedMonths.reduce((sum, month) => sum + (sku[month] || 0), 0);
      skuTotals[sku.SKU].revenue += monthRevenue;
    });

    const portfolioData = Object.entries(skuTotals)
      // Filter out SKUs with no sales in selected period
      .filter(([sku, data]) => data.revenue > 0 || data.units > 0)
      .map(([sku, data]) => {
        // Find primary market (highest sales)
        const primaryMarket = Object.entries(data.markets)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

        // Get market count (only markets with actual sales in selected period)
        const activeMarkets = Object.entries(data.markets).filter(([market, sales]) => sales > 0);
        const marketCount = activeMarkets.length;

        // Create display label
        const skuLabel = marketCount > 1
          ? `${sku} (${primaryMarket} +${marketCount - 1})`
          : `${sku} (${primaryMarket})`;

        return {
          sku,
          skuLabel,
          primaryMarket,
          marketCount,
          markets: data.markets,
          units: data.units,
          revenue: data.revenue
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate 80/20 analysis
    const totalRevenue = portfolioData.reduce((sum, item) => sum + item.revenue, 0);
    let cumulativeRevenue = 0;
    let count80 = 0;

    for (const item of portfolioData) {
      cumulativeRevenue += item.revenue;
      count80++;
      if (cumulativeRevenue >= totalRevenue * 0.8) break;
    }

    const percentSKUs80 = (count80 / portfolioData.length) * 100;

    // Top 20 SKUs
    const top20 = portfolioData.slice(0, 20);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Product Portfolio Analysis</h3>
          <p className="text-sm text-gray-600 mb-4">
            Revenue concentration and product line performance across all markets
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
              <p className="text-sm text-blue-700 font-medium mb-2">Active SKUs</p>
              <p className="text-4xl font-bold text-blue-900">{portfolioData.length}</p>
              <p className="text-xs text-blue-600 mt-1">
                {selectedMarket === 'All' ? 'across all markets' : `in ${selectedMarket}`} | selected period
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
              <p className="text-sm text-green-700 font-medium mb-2">80% Revenue Driven By</p>
              <p className="text-4xl font-bold text-green-900">{count80} SKUs</p>
              <p className="text-xs text-green-600 mt-1">({percentSKUs80.toFixed(1)}% of active portfolio)</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
              <p className="text-sm text-purple-700 font-medium mb-2">
                {selectedMarket === 'All' ? 'Total Portfolio Revenue' : `${selectedMarket} Revenue`}
              </p>
              <p className="text-4xl font-bold text-purple-900">${(totalRevenue / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-purple-600 mt-1">selected period</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Top 20 SKUs by Revenue</h4>
              <ResponsiveContainer width="100%" height={600}>
                <BarChart data={top20} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="skuLabel" width={250} tick={{ fontSize: 8 }} interval={0} />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const marketList = Object.entries(data.markets)
                          .sort((a: any, b: any) => b[1] - a[1])
                          .map(([market, sales]: any) => `${market}: ${sales.toLocaleString()} units`)
                          .join(', ');
                        return (
                          <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                            <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{data.sku}</p>
                            <p style={{ fontSize: '12px', margin: '4px 0' }}>Revenue: ${data.revenue.toLocaleString()}</p>
                            <p style={{ fontSize: '12px', margin: '4px 0' }}>Units: {data.units.toLocaleString()}</p>
                            <p style={{ fontSize: '12px', margin: '4px 0' }}>Markets: {data.marketCount}</p>
                            <p style={{ fontSize: '10px', margin: '4px 0', color: '#6b7280' }}>{marketList}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Revenue Distribution (Top 15)</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={top20.slice(0, 15)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="revenue"
                    nameKey="skuLabel"
                  >
                    {top20.slice(0, 15).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => {
                      const marketList = Object.entries(props.payload.markets)
                        .sort((a: any, b: any) => b[1] - a[1])
                        .map(([market, sales]: any) => `${market}: ${sales.toLocaleString()} units`)
                        .join(', ');
                      return [
                        <div key="tooltip">
                          <div>${value.toLocaleString()}</div>
                          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{marketList}</div>
                        </div>,
                        props.payload.sku
                      ];
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    formatter={(value, entry: any) => {
                      const skuLabel = entry.payload.skuLabel;
                      const shortLabel = skuLabel.length > 30 ? skuLabel.substring(0, 30) + '...' : skuLabel;
                      return <span style={{ fontSize: '8px' }}>{shortLabel}</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Revenue Concentration</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Top 5 SKUs</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-purple-700">
                        ${top20.slice(0, 5).reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-purple-600 ml-2">
                        ({((top20.slice(0, 5).reduce((sum, s) => sum + s.revenue, 0) / totalRevenue) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Top 10 SKUs</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-purple-700">
                        ${top20.slice(0, 10).reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-purple-600 ml-2">
                        ({((top20.slice(0, 10).reduce((sum, s) => sum + s.revenue, 0) / totalRevenue) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Top 20 SKUs</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-purple-700">
                        ${top20.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-purple-600 ml-2">
                        ({((top20.reduce((sum, s) => sum + s.revenue, 0) / totalRevenue) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. Opportunity Dashboard
  const renderOpportunitiesTab = () => {
    // Filter by market first
    const filteredUnits = selectedMarket === 'All'
      ? data.salesByMarketSKUUnits
      : data.salesByMarketSKUUnits.filter(d => d.Market === selectedMarket);

    // Identify opportunities
    const opportunities: Array<{
      type: 'Overstocked' | 'Understocked' | 'High Potential' | 'Expand Market';
      sku: string;
      market: string;
      description: string;
      impact: 'High' | 'Medium' | 'Low';
      metrics: string;
    }> = [];

    // Overstocked items
    filteredUnits.forEach(sku => {
      const monthsOnHand = sku['Months of Inventory'] || 0;
      const inventory = sku.Inventory || 0;

      if (monthsOnHand > 4) {
        // Get dollar value to calculate real impact
        const dollarData = data.salesByMarketSKUDollars.find(d => d.SKU === sku.SKU && d.Market === sku.Market);
        const recentRevenue = dollarData ? calculateRecentSales(dollarData) : 0;
        const recentUnits = calculateRecentSales(sku);
        const pricePerUnit = recentUnits > 0 ? recentRevenue / recentUnits : 0;
        const inventoryValue = inventory * pricePerUnit;

        // Impact based on both months on hand AND total value at risk
        // High: >6 months AND >$5000 value OR >$10000 value regardless
        // Medium: >6 months AND >$1000 value OR >$5000 value
        // Low: Everything else
        let impact: 'High' | 'Medium' | 'Low' = 'Low';

        if ((monthsOnHand > 6 && inventoryValue > 5000) || inventoryValue > 10000) {
          impact = 'High';
        } else if ((monthsOnHand > 6 && inventoryValue > 1000) || inventoryValue > 5000) {
          impact = 'Medium';
        }

        opportunities.push({
          type: 'Overstocked',
          sku: sku.SKU,
          market: sku.Market,
          description: `High inventory levels (${monthsOnHand.toFixed(1)} months, ~$${inventoryValue.toLocaleString(undefined, {maximumFractionDigits: 0})} tied up). Consider promotion or reduce future orders.`,
          impact,
          metrics: `${inventory.toLocaleString()} units, ${monthsOnHand.toFixed(1)} months, ~$${inventoryValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`
        });
      }
    });

    // Understocked items (high RECENT sales relative to market, low inventory)
    filteredUnits.forEach(sku => {
      const monthsOnHand = sku['Months of Inventory'] || 0;
      const recentSales = calculateRecentSales(sku);
      const thresholds = calculateMarketThresholds(sku.Market);

      // Understocked if inventory is low AND sales are above market average (top 40%)
      if (monthsOnHand < 1 && monthsOnHand > 0 && recentSales > thresholds.understockedThreshold) {
        // Get dollar value to calculate potential lost revenue
        const dollarData = data.salesByMarketSKUDollars.find(d => d.SKU === sku.SKU && d.Market === sku.Market);
        const recentRevenue = dollarData ? calculateRecentSales(dollarData) : 0;
        const pricePerUnit = recentSales > 0 ? recentRevenue / recentSales : 0;
        const potentialLostRevenue = recentSales * pricePerUnit * 0.5; // Assume 50% of sales could be lost due to stockout

        const performanceLevel = recentSales > thresholds.strong ? 'strong' : 'above-average';

        // Impact based on potential lost revenue
        // High: >$5000 potential lost revenue
        // Medium: >$2000 potential lost revenue
        // Low: Everything else
        let impact: 'High' | 'Medium' | 'Low' = 'Low';

        if (potentialLostRevenue > 5000) {
          impact = 'High';
        } else if (potentialLostRevenue > 2000) {
          impact = 'Medium';
        }

        opportunities.push({
          type: 'Understocked',
          sku: sku.SKU,
          market: sku.Market,
          description: `${performanceLevel === 'strong' ? 'Strong' : 'Above-average'} recent sales (${recentSales.toLocaleString()} units, ${((recentSales / thresholds.mean) * 100).toFixed(0)}% of ${sku.Market} avg) but low inventory (<1 month). Risk of stockout (~$${potentialLostRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})} potential lost revenue).`,
          impact,
          metrics: `${sku.Inventory?.toLocaleString() || 0} units, ${monthsOnHand.toFixed(1)} months, ~$${potentialLostRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})} at risk`
        });
      }
    });

    // High potential SKUs (good turnover, strong RECENT sales relative to market)
    filteredUnits.forEach(sku => {
      const monthsOnHand = sku['Months of Inventory'] || 0;
      const recentSales = calculateRecentSales(sku);
      const turnoverRate = monthsOnHand > 0 ? 12 / monthsOnHand : 0;
      const thresholds = calculateMarketThresholds(sku.Market);

      // High potential if turnover is good AND sales are in top 25% for the market
      if (turnoverRate > 6 && recentSales > thresholds.highPotential) {
        // Get dollar value to calculate potential revenue opportunity
        const dollarData = data.salesByMarketSKUDollars.find(d => d.SKU === sku.SKU && d.Market === sku.Market);
        const recentRevenue = dollarData ? calculateRecentSales(dollarData) : 0;

        // Impact based on actual revenue generated (these are proven performers)
        // High: >$10,000 revenue in recent period
        // Medium: >$5,000 revenue
        // Low: Everything else
        let impact: 'High' | 'Medium' | 'Low' = 'Low';

        if (recentRevenue > 10000) {
          impact = 'High';
        } else if (recentRevenue > 5000) {
          impact = 'Medium';
        }

        opportunities.push({
          type: 'High Potential',
          sku: sku.SKU,
          market: sku.Market,
          description: `Excellent turnover (${turnoverRate.toFixed(1)}x/year) and strong sales for ${sku.Market} (${recentSales.toLocaleString()} units, ${((recentSales / thresholds.mean) * 100).toFixed(0)}% of market avg, $${recentRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})} revenue). Top performer - consider expanding presence.`,
          impact,
          metrics: `${recentSales.toLocaleString()} units, ${turnoverRate.toFixed(1)}x turnover, $${recentRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}`
        });
      }
    });

    // Growing trend opportunities - identify SKUs with positive sales momentum
    filteredUnits.forEach(sku => {
      const recentMonths = ALL_MONTHS.slice(-recentMonthsCount);

      // Need at least 3 months of data to identify a trend
      if (recentMonths.length < 3) return;

      // Split into first half and second half of the recent period
      const halfPoint = Math.floor(recentMonths.length / 2);
      const firstHalfMonths = recentMonths.slice(0, halfPoint);
      const secondHalfMonths = recentMonths.slice(halfPoint);

      // Calculate average sales for each half
      const firstHalfAvg = firstHalfMonths.reduce((sum, month) => sum + (sku[month] || 0), 0) / firstHalfMonths.length;
      const secondHalfAvg = secondHalfMonths.reduce((sum, month) => sum + (sku[month] || 0), 0) / secondHalfMonths.length;

      // Calculate absolute growth (units added per month)
      const absoluteGrowth = secondHalfAvg - firstHalfAvg;

      // Calculate growth rate (percentage)
      const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

      // Get market thresholds for context
      const thresholds = calculateMarketThresholds(sku.Market);
      const marketMonthlyAvg = thresholds.mean / (recentMonthsCount / 2); // Convert to monthly average

      // Opportunity criteria (must meet ALL):
      // 1. Growth rate > 25% (showing momentum)
      // 2. Absolute growth > 50 units/month (meaningful increase)
      // 3. Recent average > 100 units/month OR > 50% of market average (meaningful volume)
      const hasMeaningfulVolume = secondHalfAvg > 100 || secondHalfAvg > (marketMonthlyAvg * 0.5);

      if (growthRate > 25 && absoluteGrowth > 50 && hasMeaningfulVolume) {
        // Get dollar value to calculate revenue growth potential
        const dollarData = data.salesByMarketSKUDollars.find(d => d.SKU === sku.SKU && d.Market === sku.Market);

        // Calculate revenue for both halves
        const firstHalfRevenue = dollarData
          ? firstHalfMonths.reduce((sum, month) => sum + (dollarData[month] || 0), 0) / firstHalfMonths.length
          : 0;
        const secondHalfRevenue = dollarData
          ? secondHalfMonths.reduce((sum, month) => sum + (dollarData[month] || 0), 0) / secondHalfMonths.length
          : 0;

        const revenueGrowth = secondHalfRevenue - firstHalfRevenue;

        // Impact based on revenue growth and current revenue
        // High: >$1000/month revenue growth OR current revenue >$3000/month
        // Medium: >$500/month revenue growth OR current revenue >$1500/month
        // Low: Everything else
        let impact: 'High' | 'Medium' | 'Low' = 'Low';

        if (revenueGrowth > 1000 || secondHalfRevenue > 3000) {
          impact = 'High';
        } else if (revenueGrowth > 500 || secondHalfRevenue > 1500) {
          impact = 'Medium';
        }

        opportunities.push({
          type: 'Expand Market',
          sku: sku.SKU,
          market: sku.Market,
          description: `Strong upward trend: ${growthRate.toFixed(0)}% growth (${firstHalfAvg.toFixed(0)} → ${secondHalfAvg.toFixed(0)} units/month, +${absoluteGrowth.toFixed(0)} units/month). Revenue growing +$${revenueGrowth.toLocaleString(undefined, {maximumFractionDigits: 0})}/month. Gaining momentum - consider increasing inventory and marketing.`,
          impact,
          metrics: `+${absoluteGrowth.toFixed(0)} units/month (${growthRate.toFixed(0)}% growth), +$${revenueGrowth.toLocaleString(undefined, {maximumFractionDigits: 0})}/month`
        });
      }
    });

    // Filter by opportunity type
    let filteredOpportunities = selectedOpportunityType === 'All'
      ? opportunities
      : opportunities.filter(o => o.type === selectedOpportunityType);

    // Filter by impact level
    filteredOpportunities = selectedImpactLevel === 'All'
      ? filteredOpportunities
      : filteredOpportunities.filter(o => o.impact === selectedImpactLevel);

    // Sort by impact
    const sortedOpportunities = filteredOpportunities
      .sort((a, b) => {
        const impactOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      });

    const totalFiltered = sortedOpportunities.length;
    const displayedOpportunities = sortedOpportunities.slice(0, 100);

    const opportunityCounts = {
      'Overstocked': opportunities.filter(o => o.type === 'Overstocked').length,
      'Understocked': opportunities.filter(o => o.type === 'Understocked').length,
      'High Potential': opportunities.filter(o => o.type === 'High Potential').length,
      'Expand Market': opportunities.filter(o => o.type === 'Expand Market').length
    };

    const impactCounts = {
      'High': opportunities.filter(o => o.impact === 'High').length,
      'Medium': opportunities.filter(o => o.impact === 'Medium').length,
      'Low': opportunities.filter(o => o.impact === 'Low').length
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Opportunity Dashboard</h3>
          <p className="text-sm text-gray-600 mb-4">
            Automated insights and actionable recommendations based on sales and inventory data
          </p>

          {/* Data Recency Banner */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Recent Data Analysis</p>
                <p className="text-xs text-blue-700 mt-1">Opportunities identified based on last {recentMonthsCount} months ({ALL_MONTHS.slice(-recentMonthsCount)[0]} - {ALL_MONTHS.slice(-recentMonthsCount)[recentMonthsCount - 1]}) for current, actionable insights.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Opportunity Type:</label>
              <select
                value={selectedOpportunityType}
                onChange={(e) => setSelectedOpportunityType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                <option value="All">All Types</option>
                <option value="Overstocked">🔴 Overstocked</option>
                <option value="Understocked">⚠️ Understocked</option>
                <option value="High Potential">⭐ High Potential</option>
                <option value="Expand Market">📈 Growing Trend</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Impact Level:</label>
              <select
                value={selectedImpactLevel}
                onChange={(e) => setSelectedImpactLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                <option value="All">All Levels</option>
                <option value="High">🔴 High Impact</option>
                <option value="Medium">🟡 Medium Impact</option>
                <option value="Low">🟢 Low Impact</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recent Sales Timeframe:</label>
              <select
                value={recentMonthsCount}
                onChange={(e) => setRecentMonthsCount(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={9}>Last 9 months</option>
                <option value={12}>Last 12 months</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">By Opportunity Type</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">🔴 Overstocked</p>
                <p className="text-3xl font-bold text-red-900">{opportunityCounts['Overstocked']}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-700 font-medium">⚠️ Understocked</p>
                <p className="text-3xl font-bold text-orange-900">{opportunityCounts['Understocked']}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">⭐ High Potential</p>
                <p className="text-3xl font-bold text-green-900">{opportunityCounts['High Potential']}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 font-medium">📈 Growing Trend</p>
                <p className="text-3xl font-bold text-blue-900">{opportunityCounts['Expand Market']}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">By Impact Level</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-700 font-medium">🔴 High Impact</p>
                <p className="text-3xl font-bold text-purple-900">{impactCounts['High']}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700 font-medium">🟡 Medium Impact</p>
                <p className="text-3xl font-bold text-yellow-900">{impactCounts['Medium']}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium">🟢 Low Impact</p>
                <p className="text-3xl font-bold text-gray-900">{impactCounts['Low']}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-100">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('type')}
                  >
                    Type {sortConfig?.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('market')}
                  >
                    Market {sortConfig?.key === 'market' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('sku')}
                  >
                    SKU {sortConfig?.key === 'sku' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Metrics</th>
                  <th
                    className="px-6 py-3 text-center text-xs font-medium text-amber-900 uppercase cursor-pointer hover:bg-amber-200"
                    onClick={() => handleSort('impact')}
                  >
                    Impact {sortConfig?.key === 'impact' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(displayedOpportunities, sortConfig?.key || '').map((opp, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        opp.type === 'Overstocked' ? 'bg-red-100 text-red-800' :
                        opp.type === 'Understocked' ? 'bg-orange-100 text-orange-800' :
                        opp.type === 'High Potential' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {opp.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{opp.market}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{opp.sku}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">{opp.description}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{opp.metrics}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                        opp.impact === 'High' ? 'bg-purple-100 text-purple-800' :
                        opp.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {opp.impact}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Showing {displayedOpportunities.length} of {totalFiltered} opportunities
            {totalFiltered > 100 && <span className="font-semibold text-amber-700"> (limited to 100 results)</span>}
          </p>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'market-units', label: 'Market Sales (Units)', icon: '📊' },
    { id: 'sku-units', label: 'SKU Sales (Units)', icon: '📦' },
    { id: 'market-dollars', label: 'Market Sales ($)', icon: '💰' },
    { id: 'sku-dollars', label: 'SKU Sales ($)', icon: '💵' },
    { id: 'price-per-unit', label: 'Avg Price/Unit', icon: '💲' },
    { id: 'performance-matrix', label: 'SKU Performance Matrix', icon: '🎯' },
    { id: 'inventory-health', label: 'Inventory Health', icon: '🏥' },
    { id: 'portfolio-analysis', label: 'Product Portfolio', icon: '📈' },
    { id: 'opportunities', label: 'Opportunities', icon: '💡' }
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
              setSelectedMonths(ALL_MONTHS);
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

        {/* Global Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-amber-800 mb-4">Global Filters (Apply to All Tabs)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {skus.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Months:</label>
              <select
                multiple
                value={selectedMonths}
                onChange={(e) => setSelectedMonths(Array.from(e.target.selectedOptions, option => option.value))}
                size={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple months</p>
            </div>
          </div>
        </div>

        <div className="transition-all duration-300">
          {activeTab === 'market-units' && renderMarketUnitsTab()}
          {activeTab === 'sku-units' && renderSKUUnitsTab()}
          {activeTab === 'market-dollars' && renderMarketDollarsTab()}
          {activeTab === 'sku-dollars' && renderSKUDollarsTab()}
          {activeTab === 'price-per-unit' && renderPricePerUnitTab()}
          {activeTab === 'performance-matrix' && renderPerformanceMatrixTab()}
          {activeTab === 'inventory-health' && renderInventoryHealthTab()}
          {activeTab === 'portfolio-analysis' && renderPortfolioAnalysisTab()}
          {activeTab === 'opportunities' && renderOpportunitiesTab()}
        </div>
      </div>
    </div>
  );
}

export default App;