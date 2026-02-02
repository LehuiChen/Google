import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Plot from 'react-plotly.js';
import * as XLSX from 'xlsx';
import { 
  Upload, FileText, BarChart2, TrendingUp, Activity, 
  Grid, Layers, AlertCircle, Settings, CheckCircle, Table
} from 'lucide-react';

// --- Types ---

interface EnergyRow {
  System: string;
  [method: string]: string | number;
}

interface BondRow {
  System: string;
  Method: string;
  R1: number;
  R2: number;
  [key: string]: string | number;
}

type PlotTheme = 'plotly_white' | 'plotly_dark' | 'ggplot2' | 'seaborn';

// --- Constants & Styles ---

const TAB_STYLE = "px-4 py-2 font-medium text-sm focus:outline-none border-b-2 transition-colors duration-200";
const ACTIVE_TAB_STYLE = "border-blue-500 text-blue-600 bg-blue-50";
const INACTIVE_TAB_STYLE = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

// --- Helper Functions ---

const generateSampleEnergyData = (): EnergyRow[] => {
  const data: EnergyRow[] = [];
  const methods = ['B3LYP', 'M06-2X', 'wB97XD', 'DLPNO-CCSD(T)'];
  for (let i = 1; i <= 20; i++) {
    const base = 10 + Math.random() * 30;
    const row: any = { System: `TS_${String(i).padStart(2, '0')}` };
    row['DLPNO-CCSD(T)'] = Number(base.toFixed(2));
    row['wB97XD'] = Number((base + (Math.random() - 0.5) * 1.6).toFixed(2));
    row['M06-2X'] = Number((base + (Math.random() - 0.5) * 2.4).toFixed(2));
    row['B3LYP'] = Number((base + (Math.random() - 0.5) * 4.0 - 1.5).toFixed(2));
    data.push(row);
  }
  return data;
};

const generateSampleBondData = (): BondRow[] => {
  const data: BondRow[] = [];
  const systems = Array.from({ length: 10 }, (_, i) => `TS_${String(i + 1).padStart(2, '0')}`);
  const methods = ['B3LYP', 'M06-2X', 'wB97XD'];
  
  systems.forEach(sys => {
    const r1Base = 1.9 + Math.random() * 0.4;
    const r2Base = 1.9 + Math.random() * 0.4;
    
    methods.forEach(method => {
      data.push({
        System: sys,
        Method: method,
        R1: Number((r1Base + (Math.random() - 0.5) * 0.1).toFixed(3)),
        R2: Number((r2Base + (Math.random() - 0.5) * 0.1).toFixed(3))
      });
    });
  });
  return data;
};

// --- Components ---

const FileUploader = ({ 
  label, 
  accept, 
  onUpload, 
  dataLoaded 
}: { 
  label: string; 
  accept: string; 
  onUpload: (file: File) => void;
  dataLoaded: boolean;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dataLoaded ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
        <input 
          type="file" 
          accept={accept} 
          onChange={handleChange} 
          className="hidden" 
          id={`file-${label}`}
        />
        <label htmlFor={`file-${label}`} className="cursor-pointer flex flex-col items-center justify-center">
          {dataLoaded ? (
            <>
              <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
              <span className="text-sm text-green-700 font-medium">数据已加载</span>
              <span className="text-xs text-green-600 mt-1">点击替换文件</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">点击上传 .xlsx 文件</span>
            </>
          )}
        </label>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  // State
  const [energyData, setEnergyData] = useState<EnergyRow[] | null>(null);
  const [bondData, setBondData] = useState<BondRow[] | null>(null);
  const [activeTab, setActiveTab] = useState<string>('box');
  const [theme, setTheme] = useState<PlotTheme>('plotly_white');
  const [markerSize, setMarkerSize] = useState<number>(10);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Settings State
  const [benchmarkMethod, setBenchmarkMethod] = useState<string>('');
  const [trendBenchmark, setTrendBenchmark] = useState<string>('');
  const [corrBenchmark, setCorrBenchmark] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('All');

  // Load Excel
  const handleFileUpload = async (file: File, type: 'energy' | 'bond') => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      if (jsonData.length === 0) throw new Error("文件内容为空");

      if (type === 'energy') {
        const row = jsonData[0] as any;
        if (!row['System']) throw new Error("缺少 'System' 列");
        setEnergyData(jsonData as EnergyRow[]);
        // Set default benchmarks
        const methods = Object.keys(row).filter(k => k !== 'System');
        if (methods.length > 0) {
          setBenchmarkMethod(methods[methods.length - 1]); // Default to last column often accurate
          setTrendBenchmark(methods[methods.length - 1]);
          setCorrBenchmark(methods[methods.length - 1]);
        }
      } else {
        const row = jsonData[0] as any;
        if (!row['System'] || !row['Method'] || row['R1'] === undefined || row['R2'] === undefined) {
          throw new Error("数据格式错误。需要列: System, Method, R1, R2");
        }
        setBondData(jsonData as BondRow[]);
      }
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "文件解析失败");
    }
  };

  const loadSampleData = () => {
    const eData = generateSampleEnergyData();
    setEnergyData(eData);
    const methods = Object.keys(eData[0]).filter(k => k !== 'System');
    setBenchmarkMethod(methods[0]);
    setTrendBenchmark(methods[0]);
    setCorrBenchmark(methods[0]);
    
    setBondData(generateSampleBondData());
    setErrorMsg(null);
  };

  // --- Plot Generators ---

  const renderBoxPlot = () => {
    if (!energyData || !benchmarkMethod) return null;
    
    const methods = Object.keys(energyData[0]).filter(k => k !== 'System' && k !== benchmarkMethod);
    const traces: any[] = [];
    
    methods.forEach(m => {
      const errors = energyData.map(row => Math.abs(Number(row[m]) - Number(row[benchmarkMethod])));
      traces.push({
        y: errors,
        type: 'box',
        name: m,
        boxpoints: 'all',
        jitter: 0.3,
        pointpos: -1.8
      });
    });

    return (
      <div className="h-full w-full">
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm font-medium">基准方法 (Benchmark):</label>
          <select 
            value={benchmarkMethod} 
            onChange={e => setBenchmarkMethod(e.target.value)}
            className="border rounded p-1 text-sm bg-white"
          >
            {Object.keys(energyData[0]).filter(k => k !== 'System').map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <Plot
          data={traces}
          layout={{
            title: { text: `相对于 ${benchmarkMethod} 的绝对误差分布` },
            template: theme as any,
            yaxis: { title: { text: 'Absolute Error (kcal/mol)' } },
            shapes: [{
              type: 'line', x0: 0, x1: 1, xref: 'paper',
              y0: 1.0, y1: 1.0,
              line: { color: 'red', width: 2, dash: 'dash' }
            }],
            autosize: true
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '500px' }}
        />
        <p className="text-xs text-gray-500 mt-2 text-center">* 红色虚线表示化学精度 (1.0 kcal/mol)</p>
      </div>
    );
  };

  const renderTrendPlot = () => {
    if (!energyData || !trendBenchmark) return null;

    // Sort data
    const sortedData = [...energyData].sort((a, b) => Number(a[trendBenchmark]) - Number(b[trendBenchmark]));
    const methods = Object.keys(energyData[0]).filter(k => k !== 'System');
    const systems = sortedData.map(d => d.System);

    const traces = methods.map(m => ({
      x: systems,
      y: sortedData.map(d => Number(d[m])),
      type: 'scatter',
      mode: 'lines+markers',
      name: m,
      marker: { size: Math.max(4, markerSize - 4) }
    }));

    return (
      <div className="h-full w-full">
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm font-medium">排序基准 (Sort by):</label>
          <select 
            value={trendBenchmark} 
            onChange={e => setTrendBenchmark(e.target.value)}
            className="border rounded p-1 text-sm bg-white"
          >
            {methods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <Plot
          data={traces as any}
          layout={{
            title: { text: `能垒趋势 (按 ${trendBenchmark} 排序)` },
            template: theme as any,
            xaxis: { title: { text: 'System' } },
            yaxis: { title: { text: 'Energy' } },
            autosize: true
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '500px' }}
        />
      </div>
    );
  };

  const renderCorrelationPlot = () => {
    if (!energyData || !corrBenchmark) return null;

    const methods = Object.keys(energyData[0]).filter(k => k !== 'System' && k !== corrBenchmark);
    const traces = methods.map(m => ({
      x: energyData.map(d => Number(d[corrBenchmark])),
      y: energyData.map(d => Number(d[m])),
      mode: 'markers',
      type: 'scatter',
      name: m,
      text: energyData.map(d => d.System),
      marker: { size: markerSize, opacity: 0.7 }
    }));

    // Diagonal line range
    const allVals = energyData.flatMap(d => Object.values(d).filter(v => typeof v === 'number') as number[]);
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);

    return (
      <div className="h-full w-full">
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm font-medium">X轴基准 (X-Axis):</label>
          <select 
            value={corrBenchmark} 
            onChange={e => setCorrBenchmark(e.target.value)}
            className="border rounded p-1 text-sm bg-white"
          >
            {Object.keys(energyData[0]).filter(k => k !== 'System').map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <Plot
          data={traces as any}
          layout={{
            title: { text: `相关性分析 (vs ${corrBenchmark})` },
            template: theme as any,
            xaxis: { title: { text: `${corrBenchmark} Energy` } },
            yaxis: { title: { text: 'Other Methods Energy' } },
            shapes: [{
              type: 'line', x0: min, x1: max, y0: min, y1: max,
              line: { color: 'gray', dash: 'dash' }
            }],
            autosize: true
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '500px' }}
        />
      </div>
    );
  };

  const renderGroupedBar = () => {
    if (!energyData) return null;
    
    const systems = ['All', ...energyData.map(d => d.System)];
    const methods = Object.keys(energyData[0]).filter(k => k !== 'System');
    
    let plotData = energyData;
    if (selectedSystem !== 'All') {
      plotData = energyData.filter(d => d.System === selectedSystem);
    }

    const traces = methods.map(m => ({
      x: plotData.map(d => d.System),
      y: plotData.map(d => Number(d[m])),
      name: m,
      type: 'bar'
    }));

    return (
      <div className="h-full w-full">
         <div className="mb-4 flex items-center gap-2">
          <label className="text-sm font-medium">展示体系 (Filter System):</label>
          <select 
            value={selectedSystem} 
            onChange={e => setSelectedSystem(e.target.value)}
            className="border rounded p-1 text-sm bg-white"
          >
            {systems.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <Plot
          data={traces as any}
          layout={{
            title: { text: '不同体系下的方法能垒对比' },
            template: theme as any,
            barmode: 'group',
            xaxis: { title: { text: 'System' } },
            yaxis: { title: { text: 'Energy' } },
            autosize: true
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '500px' }}
        />
      </div>
    );
  };

  const renderSyncPlot = () => {
    if (!bondData) return null;

    // We need to group by method to have different colors
    const methods = Array.from(new Set(bondData.map(d => d.Method)));
    const traces = methods.map(m => {
      const subset = bondData.filter(d => d.Method === m);
      return {
        x: subset.map(d => d.R1),
        y: subset.map(d => d.R2),
        mode: 'markers',
        type: 'scatter',
        name: m,
        text: subset.map(d => d.System),
        marker: { size: markerSize }
      };
    });

    const allR = bondData.flatMap(d => [d.R1, d.R2]);
    const min = Math.min(...allR) * 0.95;
    const max = Math.max(...allR) * 1.05;

    return (
      <div className="h-full w-full">
        <Plot
          data={traces as any}
          layout={{
            title: { text: '几何结构同步性 (R1 vs R2)' },
            template: theme as any,
            xaxis: { title: { text: 'Bond Length R1 (Å)' }, range: [min, max] },
            yaxis: { title: { text: 'Bond Length R2 (Å)' }, range: [min, max], scaleanchor: 'x' },
            shapes: [{
              type: 'line', x0: min, x1: max, y0: min, y1: max,
              line: { color: 'gray', dash: 'dash' }
            }],
            autosize: true
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '500px' }}
        />
      </div>
    );
  };

  const renderHeatmap = () => {
    if (!bondData) return null;

    const systems = Array.from(new Set(bondData.map(d => d.System)));
    const methods = Array.from(new Set(bondData.map(d => d.Method)));
    
    // Create matrix
    const zData: number[][] = [];
    systems.forEach(sys => {
      const row: number[] = [];
      methods.forEach(met => {
        const item = bondData.find(d => d.System === sys && d.Method === met);
        if (item) {
          row.push(Math.abs(item.R1 - item.R2));
        } else {
          row.push(0);
        }
      });
      zData.push(row);
    });

    return (
      <div className="h-full w-full">
        <Plot
          data={[{
            z: zData,
            x: methods,
            y: systems,
            type: 'heatmap',
            colorscale: 'Reds',
            text: zData.map(row => row.map(v => v.toFixed(3))) as any,
            texttemplate: "%{text}",
            showscale: true
          }]}
          layout={{
            title: { text: '异步性热图 (|R1 - R2|)' },
            template: theme as any,
            xaxis: { title: { text: 'Method' } },
            yaxis: { title: { text: 'System' }, autorange: 'reversed' },
            autosize: true
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '500px' }}
        />
      </div>
    );
  };

  // --- Render ---

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white shadow-lg flex-shrink-0 flex flex-col h-screen overflow-y-auto z-10">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            CC Data Visualizer
          </h1>
          <p className="text-xs text-gray-500 mt-1">计算化学多维可视化分析</p>
        </div>

        <div className="p-6 flex-1">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{errorMsg}</span>
            </div>
          )}

          <div className="mb-6">
             <button 
              onClick={loadSampleData}
              className="w-full py-2 px-4 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> 使用示例数据演示
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">数据导入</h3>
              <FileUploader 
                label="能垒数据 (格式 A)" 
                accept=".xlsx" 
                onUpload={(f) => handleFileUpload(f, 'energy')} 
                dataLoaded={!!energyData}
              />
              <FileUploader 
                label="键长数据 (格式 B)" 
                accept=".xlsx" 
                onUpload={(f) => handleFileUpload(f, 'bond')} 
                dataLoaded={!!bondData}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings className="w-3 h-3" /> 全局设置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">配色主题</label>
                  <select 
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as PlotTheme)}
                    className="w-full border rounded-md p-2 text-sm bg-gray-50"
                  >
                    <option value="plotly_white">Light (默认)</option>
                    <option value="plotly_dark">Dark</option>
                    <option value="ggplot2">GGPlot2</option>
                    <option value="seaborn">Seaborn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">点大小: {markerSize}</label>
                  <input 
                    type="range" 
                    min="5" max="20" 
                    value={markerSize}
                    onChange={(e) => setMarkerSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t text-center text-xs text-gray-400">
          v1.0.0 | React + Plotly
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800">可视化分析看板</h2>
          </div>
          <div className="text-sm text-gray-500">
            {energyData ? `Energy: ${energyData.length} Systems` : 'No Energy Data'} | {bondData ? `Bond: ${bondData.length / (new Set(bondData.map(d=>d.Method)).size || 1)} Systems` : 'No Bond Data'}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {!energyData && !bondData ? (
            <div className="max-w-4xl mx-auto mt-10">
              <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">欢迎使用计算化学数据可视化工具</h3>
                <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                  请在左侧上传 Excel 数据文件，或点击“使用示例数据”快速开始。支持能垒误差分析、几何结构同步性分析等多种图表。
                </p>
                
                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Table className="w-4 h-4 text-blue-500"/> 格式 A: 能垒数据
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">宽表格式，第一列为 System，后续列为各方法数值。</p>
                    <code className="block bg-gray-800 text-gray-100 p-2 rounded text-xs">
                      System, M062X, B3LYP, CCSD(T)<br/>
                      TS01, 23.5, 21.2, 24.1<br/>
                      TS02, 15.6, 14.8, 15.9
                    </code>
                  </div>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Grid className="w-4 h-4 text-green-500"/> 格式 B: 键长数据
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">长表格式，必须包含 R1, R2 列。</p>
                    <code className="block bg-gray-800 text-gray-100 p-2 rounded text-xs">
                      System, Method, R1, R2<br/>
                      TS01, M062X, 2.15, 1.98<br/>
                      TS01, B3LYP, 2.18, 1.95
                    </code>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
              {/* Tabs */}
              <div className="flex border-b overflow-x-auto">
                {[
                  { id: 'box', label: '误差分布箱线图', icon: Layers, req: 'energy' },
                  { id: 'trend', label: '排序趋势图', icon: TrendingUp, req: 'energy' },
                  { id: 'corr', label: '相关性散点图', icon: Activity, req: 'energy' },
                  { id: 'bar', label: '分组柱状图', icon: BarChart2, req: 'energy' },
                  { id: 'sync', label: '键长同步性', icon: Grid, req: 'bond' },
                  { id: 'heat', label: '异步性热图', icon: Layers, req: 'bond' },
                ].map(tab => {
                  const hasData = tab.req === 'energy' ? !!energyData : !!bondData;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      disabled={!hasData}
                      className={`${TAB_STYLE} ${activeTab === tab.id ? ACTIVE_TAB_STYLE : INACTIVE_TAB_STYLE} flex items-center gap-2 whitespace-nowrap ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Chart Content */}
              <div className="p-6 flex-1 relative">
                {activeTab === 'box' && renderBoxPlot()}
                {activeTab === 'trend' && renderTrendPlot()}
                {activeTab === 'corr' && renderCorrelationPlot()}
                {activeTab === 'bar' && renderGroupedBar()}
                {activeTab === 'sync' && renderSyncPlot()}
                {activeTab === 'heat' && renderHeatmap()}
              </div>
            </div>
          )}
          
          {/* Data Preview */}
          {(energyData || bondData) && (
             <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                 <h3 className="font-semibold text-gray-700">数据预览</h3>
               </div>
               <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x border-gray-200">
                 <div className="p-6">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">能垒数据 (Top 5 Rows)</h4>
                    {energyData ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(energyData[0]).slice(0, 5).map(k => <th key={k} className="py-2 px-1">{k}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {energyData.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                {Object.values(row).slice(0, 5).map((v, j) => <td key={j} className="py-2 px-1 font-mono text-gray-600">{v}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">未加载</p>}
                 </div>
                 <div className="p-6">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-3">键长数据 (Top 5 Rows)</h4>
                    {bondData ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs text-left">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(bondData[0]).slice(0, 5).map(k => <th key={k} className="py-2 px-1">{k}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {bondData.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                {Object.values(row).slice(0, 5).map((v, j) => <td key={j} className="py-2 px-1 font-mono text-gray-600">{v}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="text-sm text-gray-400 italic">未加载</p>}
                 </div>
               </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);