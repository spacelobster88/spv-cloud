'use client';

import { useState } from 'react';

interface PurchaseCalculatorProps {
  onClose: () => void;
}

export default function PurchaseCalculator({ onClose }: PurchaseCalculatorProps) {
  const [price, setPrice] = useState('');
  const [downPercent, setDownPercent] = useState('30');
  const [years, setYears] = useState('3');
  const [rate, setRate] = useState('4.5');
  const [result, setResult] = useState<null | {
    downPayment: number;
    loanAmount: number;
    monthlyPayment: number;
    totalInterest: number;
    purchaseTax: number;
    insurance: number;
    totalCost: number;
  }>(null);

  const calculate = () => {
    const p = parseFloat(price);
    const dp = parseFloat(downPercent);
    const y = parseFloat(years);
    const r = parseFloat(rate);
    if (!p || !dp || !y || !r || p <= 0) return;

    const priceYuan = p * 10000; // convert 万元 to 元
    const downPayment = priceYuan * (dp / 100);
    const loanAmount = priceYuan - downPayment;
    const monthlyRate = r / 100 / 12;
    const months = y * 12;

    // PMT formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    let monthlyPayment: number;
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / months;
    } else {
      const factor = Math.pow(1 + monthlyRate, months);
      monthlyPayment = loanAmount * (monthlyRate * factor) / (factor - 1);
    }

    const totalPayments = monthlyPayment * months;
    const totalInterest = totalPayments - loanAmount;

    // Purchase tax: ~8.85% of pre-tax price (price / 1.13 * 10%)
    const purchaseTax = priceYuan / 1.13 * 0.10;
    // Insurance estimate: ~3% of vehicle price first year
    const insurance = priceYuan * 0.03;

    const totalCost = priceYuan + totalInterest + purchaseTax + insurance;

    setResult({
      downPayment: Math.round(downPayment),
      loanAmount: Math.round(loanAmount),
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest),
      purchaseTax: Math.round(purchaseTax),
      insurance: Math.round(insurance),
      totalCost: Math.round(totalCost),
    });
  };

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-[#1B2B4B]">购车计算器</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">车辆价格（万元）</label>
            <input
              type="number"
              min="1"
              step="0.1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="请输入车辆价格"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CA0] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">首付比例（%）</label>
              <select
                value={downPercent}
                onChange={(e) => setDownPercent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CA0] focus:border-transparent"
              >
                {[20, 30, 40, 50, 60, 70, 80].map((v) => (
                  <option key={v} value={v}>{v}%</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">贷款期限（年）</label>
              <select
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CA0] focus:border-transparent"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>{v}年</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">利率（%）</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8CA0] focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={calculate}
            className="w-full bg-[#2D8CA0] hover:bg-[#3AAFC9] text-white font-semibold py-3 rounded-lg transition-colors"
          >
            计算费用
          </button>

          {result && (
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-[#1B2B4B]">费用明细</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">首付金额</span>
                  <span className="font-medium">¥{fmt(result.downPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">贷款金额</span>
                  <span className="font-medium">¥{fmt(result.loanAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">月供</span>
                  <span className="font-semibold text-[#2D8CA0] text-lg">¥{result.monthlyPayment.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">总利息</span>
                  <span className="font-medium">¥{fmt(result.totalInterest)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-500">购置税（约）</span>
                  <span className="font-medium">¥{fmt(result.purchaseTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">首年保险（约）</span>
                  <span className="font-medium">¥{fmt(result.insurance)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between items-end">
                  <span className="text-gray-700 font-medium">购车总成本</span>
                  <span className="text-2xl font-bold text-[#1B2B4B]">¥{fmt(result.totalCost)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-2">* 购置税按不含增值税价格的10%估算，保险按车价3%估算，实际以当地政策为准</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
