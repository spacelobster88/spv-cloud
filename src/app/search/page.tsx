import { searchVehicles } from '@/lib/search';
import { filterOptions } from '@/lib/mock-data';
import { SearchFilters } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const vt = params.vehicleType || '';
  const brand = params.brand || '';
  const title = [brand, vt, '公告查询'].filter(Boolean).join(' - ') + ' | SPV行业数据平台';
  return {
    title,
    description: `查询${brand} ${vt}公告产品数据，支持多条件筛选`,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const filters: SearchFilters = {
    keyword: params.keyword,
    vehicleType: params.vehicleType,
    brand: params.brand,
    chassisBrand: params.chassisBrand,
    manufacturer: params.manufacturer,
    emissionStandard: params.emissionStandard,
    fuelType: params.fuelType,
    axleCount: params.axleCount ? parseInt(params.axleCount) : undefined,
    tireSpec: params.tireSpec,
    modelNumber: params.modelNumber,
    chassisModel: params.chassisModel,
    batch: params.batch,
    powerMin: params.powerMin ? parseInt(params.powerMin) : undefined,
    powerMax: params.powerMax ? parseInt(params.powerMax) : undefined,
    totalMassMin: params.totalMassMin ? parseInt(params.totalMassMin) : undefined,
    totalMassMax: params.totalMassMax ? parseInt(params.totalMassMax) : undefined,
    wheelbaseMin: params.wheelbaseMin ? parseInt(params.wheelbaseMin) : undefined,
    wheelbaseMax: params.wheelbaseMax ? parseInt(params.wheelbaseMax) : undefined,
    volumeMin: params.volumeMin ? parseFloat(params.volumeMin) : undefined,
    volumeMax: params.volumeMax ? parseFloat(params.volumeMax) : undefined,
    taxExempt: params.taxExempt === 'true',
    fuelAnnouncement: params.fuelAnnouncement === 'true',
    ecoAnnouncement: params.ecoAnnouncement === 'true',
    page: params.page ? parseInt(params.page) : 1,
    pageSize: 20,
  };

  const result = searchVehicles(filters);

  // Build query string helper for pagination
  function buildQuery(overrides: Record<string, string>) {
    const merged = { ...params, ...overrides };
    const qs = Object.entries(merged)
      .filter(([, v]) => v && v !== 'false' && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&');
    return `/search?${qs}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">首页</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">公告产品查询</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter Panel */}
        <aside className="lg:w-80 flex-shrink-0">
          <form action="/search" method="get">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-[var(--color-primary)] text-white px-4 py-3 font-semibold">
                多条件组合查询
              </div>

              <div className="p-4 space-y-4 text-sm">
                {/* Keyword */}
                <FilterInput name="keyword" label="关键词" placeholder="型号/品牌/类型" defaultValue={params.keyword} />

                {/* Selects */}
                <FilterSelect name="vehicleType" label="车辆类型" options={filterOptions.vehicleTypes} value={params.vehicleType} />
                <FilterSelect name="brand" label="产品商标" options={filterOptions.brands} value={params.brand} />
                <FilterSelect name="chassisBrand" label="底盘商标" options={filterOptions.chassisBrands} value={params.chassisBrand} />
                <FilterSelect name="manufacturer" label="企业名称" options={filterOptions.manufacturers} value={params.manufacturer} />
                <FilterSelect name="emissionStandard" label="排放标准" options={filterOptions.emissionStandards} value={params.emissionStandard} />
                <FilterSelect name="fuelType" label="燃油种类" options={filterOptions.fuelTypes} value={params.fuelType} />
                <FilterSelect name="axleCount" label="轴数" options={filterOptions.axleCounts.map(String)} value={params.axleCount} />

                {/* Text inputs */}
                <FilterInput name="modelNumber" label="整车型号" placeholder="如 DFH5..." defaultValue={params.modelNumber} />
                <FilterInput name="chassisModel" label="底盘型号" placeholder="底盘型号" defaultValue={params.chassisModel} />
                <FilterInput name="batch" label="批次" placeholder="如 390" defaultValue={params.batch} />

                {/* Ranges */}
                <div className="border-t pt-3">
                  <div className="text-gray-600 font-medium mb-2">参数范围</div>
                  <FilterRange label="功率(kW)" nameMin="powerMin" nameMax="powerMax" valMin={params.powerMin} valMax={params.powerMax} />
                  <FilterRange label="总质量(kg)" nameMin="totalMassMin" nameMax="totalMassMax" valMin={params.totalMassMin} valMax={params.totalMassMax} />
                  <FilterRange label="轴距(mm)" nameMin="wheelbaseMin" nameMax="wheelbaseMax" valMin={params.wheelbaseMin} valMax={params.wheelbaseMax} />
                  <FilterRange label="容积(m³)" nameMin="volumeMin" nameMax="volumeMax" valMin={params.volumeMin} valMax={params.volumeMax} />
                </div>

                {/* Checkboxes */}
                <div className="border-t pt-3 flex flex-wrap gap-4">
                  <FilterCheckbox name="taxExempt" label="免征公告" checked={params.taxExempt === 'true'} />
                  <FilterCheckbox name="fuelAnnouncement" label="燃油公告" checked={params.fuelAnnouncement === 'true'} />
                  <FilterCheckbox name="ecoAnnouncement" label="环保公告" checked={params.ecoAnnouncement === 'true'} />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[var(--color-accent)] text-white py-2 rounded hover:bg-[var(--color-accent-light)] transition-colors font-medium">
                    查询
                  </button>
                  <a href="/search" className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 transition-colors text-center font-medium">
                    清空条件
                  </a>
                </div>
              </div>
            </div>
          </form>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Result header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共找到 <span className="text-[var(--color-accent)] font-bold text-base">{result.total}</span> 条记录
              {params.keyword && <span className="ml-2">关键词：<span className="text-orange-500">{params.keyword}</span></span>}
            </div>
            <div className="text-sm text-gray-500">
              第 {result.page}/{result.totalPages} 页
            </div>
          </div>

          {/* Vehicle list */}
          {result.vehicles.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-lg mb-2">未找到匹配的车型</div>
              <div className="text-sm">请尝试修改筛选条件</div>
            </div>
          ) : (
            <div className="space-y-4">
              {result.vehicles.map(v => (
                <Link
                  key={v.id}
                  href={`/vehicle/${v.id}`}
                  className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:border-[var(--color-accent)] hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row p-4 gap-4">
                    {/* Image */}
                    <div className="sm:w-48 flex-shrink-0">
                      <Image
                        src={v.imageUrl}
                        alt={v.modelNumber}
                        width={192}
                        height={144}
                        className="w-full h-36 object-contain bg-gray-50 rounded"
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-[var(--color-primary)] text-base">
                          {v.brand} {v.vehicleType}
                          <span className="text-gray-500 font-normal text-sm ml-2">{v.modelNumber}</span>
                        </h3>
                        {v.price && (
                          <span className="text-orange-500 font-bold text-lg whitespace-nowrap ml-4">{v.price}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm text-gray-600">
                        <ParamItem label="底盘" value={`${v.chassisBrand} ${v.chassisModel}`} />
                        <ParamItem label="发动机" value={v.engine.split(' ')[2] || v.engine} />
                        <ParamItem label="排放" value={v.emissionStandard} />
                        <ParamItem label="总质量" value={`${v.totalMass}kg`} />
                        <ParamItem label="功率" value={`${v.power}kW`} />
                        <ParamItem label="轴距" value={`${v.wheelbase}mm`} />
                        <ParamItem label="尺寸" value={`${v.overallLength}×${v.overallWidth}×${v.overallHeight}mm`} />
                        <ParamItem label="燃油" value={v.fuelType} />
                        <ParamItem label="批次" value={v.batch} />
                      </div>
                      <div className="flex gap-2 mt-2">
                        {v.taxExempt && <Tag text="免征" color="green" />}
                        {v.fuelAnnouncement && <Tag text="燃油" color="blue" />}
                        {v.ecoAnnouncement && <Tag text="环保" color="emerald" />}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {result.page > 1 && (
                <Link href={buildQuery({ page: String(result.page - 1) })} className="px-3 py-2 bg-white border rounded hover:bg-gray-50 text-sm">
                  上一页
                </Link>
              )}
              {Array.from({ length: Math.min(result.totalPages, 10) }, (_, i) => {
                const p = i + 1;
                return (
                  <Link
                    key={p}
                    href={buildQuery({ page: String(p) })}
                    className={`px-3 py-2 border rounded text-sm ${
                      p === result.page ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
              {result.page < result.totalPages && (
                <Link href={buildQuery({ page: String(result.page + 1) })} className="px-3 py-2 bg-white border rounded hover:bg-gray-50 text-sm">
                  下一页
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterInput({ name, label, placeholder, defaultValue }: {
  name: string; label: string; placeholder: string; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue || ''}
        className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 text-sm"
      />
    </div>
  );
}

function FilterSelect({ name, label, options, value }: {
  name: string; label: string; options: string[]; value?: string;
}) {
  return (
    <div>
      <label className="block text-gray-600 mb-1">{label}</label>
      <select
        name={name}
        defaultValue={value || ''}
        className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 text-sm bg-white"
      >
        <option value="">全部</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function FilterRange({ label, nameMin, nameMax, valMin, valMax }: {
  label: string; nameMin: string; nameMax: string; valMin?: string; valMax?: string;
}) {
  return (
    <div className="mb-2">
      <label className="block text-gray-500 mb-1 text-xs">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          name={nameMin}
          placeholder="最小"
          defaultValue={valMin || ''}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
        />
        <span className="text-gray-400">~</span>
        <input
          type="number"
          name={nameMax}
          placeholder="最大"
          defaultValue={valMax || ''}
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}

function FilterCheckbox({ name, label, checked }: {
  name: string; label: string; checked: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer">
      <input type="checkbox" name={name} value="true" defaultChecked={checked} className="rounded" />
      <span>{label}</span>
    </label>
  );
}

function ParamItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="truncate">
      <span className="text-gray-400">{label}：</span>{value}
    </div>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colorMap[color] || 'bg-gray-100 text-gray-600'}`}>
      {text}
    </span>
  );
}
