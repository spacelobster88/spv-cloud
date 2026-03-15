'use client';

import { useState } from 'react';

interface FreightCalculatorProps {
  onClose: () => void;
}

const vehicleTypes = [
  { label: '小型平板车 (2-5吨)', rate: 0.45, base: 500 },
  { label: '中型厢式车 (5-10吨)', rate: 0.38, base: 800 },
  { label: '大型低平板 (10-20吨)', rate: 0.32, base: 1200 },
  { label: '重型特种车 (20吨以上)', rate: 0.28, base: 2000 },
];

const cities = ['北京', '上海', '广州', '武汉', '成都', '重庆', '长沙', '郑州', '济南', '杭州', '南京', '西安', '随州', '十堰', '程力'];

// Simplified distance matrix (km) — dummy values
const distanceMap: Record<string, Record<string, number>> = {};
const cityDistances = [0, 1200, 1900, 900, 1800, 1700, 1100, 700, 500, 1300, 1000, 1100, 800, 950, 820];
cities.forEach((from, i) => {
  distanceMap[from] = {};
  cities.forEach((to, j) => {
    distanceMap[from][to] = Math.abs(cityDistances[i] - cityDistances[j]) || (i === j ? 0 : 600);
  });
});

export default function FreightCalculator({ onClose }: FreightCalculatorProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('');
  const [vehicleIdx, setVehicleIdx] = useState(0);
  const [result, setResult] = useState<null | { cost: number; distance: number }>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    if (!origin || !destination || !w || w <= 0) return;

    const vehicle = vehicleTypes[vehicleIdx];
    const distance = distanceMap[origin]?.[destination] ?? 800;
    const distanceFactor = distance / 100;
    const cost = vehicle.base + w * vehicle.rate * distanceFactor * 100;
    setResult({ cost: Math.round(cost), distance });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-[#1B2B4B]">运费计算器</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出发地</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CA0] focus:border-transparent"
              >
                <option value="">请选择</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目的地</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CA0] focus:border-transparent"
              >
                <option value="">请选择</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">货物重量（吨）</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="请输入货物重量"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CA0] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">车型选择</label>
            <select
              value={vehicleIdx}
              onChange={(e) => setVehicleIdx(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CA0] focus:border-transparent"
            >
              {vehicleTypes.map((v, i) => (
                <option key={i} value={i}>{v.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={calculate}
            className="w-full bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white font-semibold py-3 rounded-lg transition-colors"
          >
            计算运费
          </button>

          {result && (
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-[#1B2B4B]">估算结果</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">运输路线</span>
                  <p className="font-medium">{origin} → {destination}</p>
                </div>
                <div>
                  <span className="text-gray-500">预估距离</span>
                  <p className="font-medium">{result.distance} 公里</p>
                </div>
                <div>
                  <span className="text-gray-500">货物重量</span>
                  <p className="font-medium">{weight} 吨</p>
                </div>
                <div>
                  <span className="text-gray-500">选用车型</span>
                  <p className="font-medium">{vehicleTypes[vehicleIdx].label.split('(')[0].trim()}</p>
                </div>
              </div>
              <div className="border-t pt-3 mt-3">
                <span className="text-gray-500 text-sm">预估运费</span>
                <p className="text-3xl font-bold text-[#2D8CA0]">¥{result.cost.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">* 实际运费以承运商报价为准，本结果仅供参考</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
