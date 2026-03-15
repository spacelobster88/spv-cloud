import { getVehicleById, getSimilarVehicles } from '@/lib/search';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface VehiclePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VehiclePageProps) {
  const { id } = await params;
  const vehicle = getVehicleById(id);
  if (!vehicle) return { title: '车型未找到' };
  return {
    title: `${vehicle.brand} ${vehicle.vehicleType} ${vehicle.modelNumber} - SPV行业数据平台`,
    description: `${vehicle.brand} ${vehicle.vehicleType}，${vehicle.engine}，${vehicle.emissionStandard}排放，总质量${vehicle.totalMass}kg`,
    keywords: `${vehicle.brand},${vehicle.vehicleType},${vehicle.modelNumber},专用车公告`,
  };
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { id } = await params;
  const vehicle = getVehicleById(id);
  if (!vehicle) notFound();

  const similar = getSimilarVehicles(vehicle);

  const specGroups = [
    {
      title: '基本信息',
      items: [
        ['公告号', vehicle.announcement],
        ['整车型号', vehicle.modelNumber],
        ['产品商标', vehicle.brand],
        ['车辆类型', vehicle.vehicleType],
        ['企业名称', vehicle.manufacturer],
        ['生产地址', vehicle.productionAddress],
        ['公告批次', vehicle.batch],
        ['公告日期', vehicle.announcementDate],
      ],
    },
    {
      title: '底盘信息',
      items: [
        ['底盘型号', vehicle.chassisModel],
        ['底盘商标', vehicle.chassisBrand],
        ['底盘厂家', vehicle.chassisManufacturer],
      ],
    },
    {
      title: '动力系统',
      items: [
        ['发动机', vehicle.engine],
        ['功率', `${vehicle.power} kW`],
        ['排放标准', vehicle.emissionStandard],
        ['燃油种类', vehicle.fuelType],
      ],
    },
    {
      title: '整车参数',
      items: [
        ['总质量', `${vehicle.totalMass} kg`],
        ['额定质量', `${vehicle.ratedMass} kg`],
        ['整备质量', `${vehicle.curbWeight} kg`],
        ['轴数', `${vehicle.axleCount}`],
        ['轮胎数', `${vehicle.tireCount}`],
        ['轮胎规格', vehicle.tireSpec],
        ['轴距', `${vehicle.wheelbase} mm`],
      ],
    },
    {
      title: '外廓尺寸',
      items: [
        ['整车长度', `${vehicle.overallLength} mm`],
        ['整车宽度', `${vehicle.overallWidth} mm`],
        ['整车高度', `${vehicle.overallHeight} mm`],
        ['厢体长度', `${vehicle.boxLength} mm`],
        ['厢体宽度', `${vehicle.boxWidth} mm`],
        ['厢体高度', `${vehicle.boxHeight} mm`],
        ['容积', `${vehicle.volume} m³`],
      ],
    },
    {
      title: '公告状态',
      items: [
        ['免征公告', vehicle.taxExempt ? '是' : '否'],
        ['燃油公告', vehicle.fuelAnnouncement ? '是' : '否'],
        ['环保公告', vehicle.ecoAnnouncement ? '是' : '否'],
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/search" className="hover:text-blue-600">公告查询</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">{vehicle.brand} {vehicle.vehicleType}</span>
      </div>

      {/* Main content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white px-6 py-4">
          <h1 className="text-xl font-bold">{vehicle.brand} {vehicle.vehicleType}</h1>
          <p className="text-[var(--color-text-light)] text-sm mt-1">型号：{vehicle.modelNumber} | 公告号：{vehicle.announcement}</p>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Image */}
          <div className="lg:w-96 p-6 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100">
            <Image
              src={vehicle.imageUrl}
              alt={`${vehicle.brand} ${vehicle.vehicleType}`}
              width={384}
              height={288}
              className="w-full h-72 object-contain bg-gray-50 rounded-lg"
            />
            {vehicle.price && (
              <div className="mt-4 text-center">
                <span className="text-gray-500 text-sm">参考价格</span>
                <div className="text-orange-500 text-3xl font-bold">{vehicle.price}</div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              {vehicle.taxExempt && <StatusBadge text="免征公告" color="green" />}
              {vehicle.fuelAnnouncement && <StatusBadge text="燃油公告" color="blue" />}
              {vehicle.ecoAnnouncement && <StatusBadge text="环保公告" color="emerald" />}
            </div>
          </div>

          {/* Quick specs */}
          <div className="flex-1 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">核心参数</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <QuickSpec label="发动机" value={vehicle.engine.split(' ')[2] || vehicle.engine} />
              <QuickSpec label="功率" value={`${vehicle.power} kW`} />
              <QuickSpec label="排放标准" value={vehicle.emissionStandard} />
              <QuickSpec label="总质量" value={`${vehicle.totalMass} kg`} />
              <QuickSpec label="额定质量" value={`${vehicle.ratedMass} kg`} />
              <QuickSpec label="轴距" value={`${vehicle.wheelbase} mm`} />
              <QuickSpec label="整车尺寸" value={`${vehicle.overallLength}×${vehicle.overallWidth}×${vehicle.overallHeight}`} />
              <QuickSpec label="厢体尺寸" value={`${vehicle.boxLength}×${vehicle.boxWidth}×${vehicle.boxHeight}`} />
              <QuickSpec label="容积" value={`${vehicle.volume} m³`} />
              <QuickSpec label="燃油种类" value={vehicle.fuelType} />
              <QuickSpec label="轮胎" value={`${vehicle.tireCount}个 ${vehicle.tireSpec}`} />
              <QuickSpec label="底盘" value={`${vehicle.chassisBrand} ${vehicle.chassisModel}`} />
            </div>
            {vehicle.description && (
              <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-gray-700">
                <span className="font-medium text-yellow-700">备注：</span>{vehicle.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed spec tables */}
      <div className="mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">详细参数表</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {specGroups.map(group => (
            <div key={group.title} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700">{group.title}</h3>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {group.items.map(([label, value], i) => (
                    <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 text-gray-500 w-32 border-r border-gray-100">{label}</td>
                      <td className="px-4 py-2.5 text-gray-800 font-medium">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Similar vehicles */}
      {similar.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">相似车型推荐</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {similar.map(v => (
              <Link
                key={v.id}
                href={`/vehicle/${v.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-[var(--color-accent)] hover:shadow-md transition-all overflow-hidden"
              >
                <Image
                  src={v.imageUrl}
                  alt={v.modelNumber}
                  width={200}
                  height={150}
                  className="w-full h-28 object-contain bg-gray-50"
                />
                <div className="p-3">
                  <div className="font-semibold text-sm text-gray-800 truncate">{v.brand} {v.vehicleType}</div>
                  <div className="text-xs text-gray-500 truncate mt-1">{v.modelNumber}</div>
                  {v.price && <div className="text-orange-500 font-bold text-sm mt-1">{v.price}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-800 truncate">{value}</div>
    </div>
  );
}

function StatusBadge({ text, color }: { text: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full border ${colorMap[color]}`}>
      {text}
    </span>
  );
}
