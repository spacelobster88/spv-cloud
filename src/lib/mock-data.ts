import { Vehicle, FilterOptions } from './types';

const vehicleTypes = [
  '洒水车', '垃圾车', '压缩式垃圾车', '吸污车', '扫路车',
  '冷藏车', '厢式运输车', '随车起重运输车', '混凝土搅拌运输车',
  '油罐车', '化工液体运输车', '粉粒物料运输车', '平板运输车',
  '自卸车', '半挂车', '清障车', '高空作业车', '消防车',
  '爆破器材运输车', '气瓶运输车', '畜禽运输车', 'LED广告车',
];

const brands = [
  '东风', '解放', '福田', '重汽', '陕汽', '江淮', '柳汽',
  '大运', '北奔', '华菱', '红岩', '三一', '徐工', '中联',
];

const chassisBrands = [
  '东风', '解放', '福田', '重汽', '陕汽', '江淮', '五十铃',
  '庆铃', '凯马', '飞碟', '跃进', '时风',
];

const manufacturers = [
  '湖北程力专用汽车有限公司', '随州王力汽车装备制造有限公司',
  '中国重汽集团济南专用车有限公司', '湖北楚胜汽车有限公司',
  '厦门金龙联合汽车工业有限公司', '北汽福田汽车股份有限公司',
  '一汽解放青岛汽车有限公司', '东风商用车有限公司',
  '郑州宏马专用汽车有限公司', '湖北江南专用特种汽车有限公司',
  '湖北新楚风汽车股份有限公司', '河南新飞专用汽车有限公司',
];

const emissionStandards = ['国三', '国四', '国五', '国六', '国六b'];
const fuelTypes = ['柴油', '汽油', '天然气', 'LNG', 'CNG', '纯电动', '混合动力'];
const tireSpecs = [
  '7.00-16', '7.00R16', '7.50R16', '8.25R16', '8.25R20',
  '9.00R20', '10.00R20', '11.00R20', '11R22.5', '12R22.5', '12.00R20',
  '215/75R17.5', '235/75R17.5', '275/70R22.5', '295/80R22.5',
];

const engines = [
  'YC4S150-68 玉柴 110kW', 'YC4EG200-50 玉柴 147kW',
  'ISB170 50 康明斯 125kW', 'ISB190 50 康明斯 140kW',
  'ISB210 50 康明斯 155kW', 'WP3.7Q130E61 潍柴 96kW',
  'WP4.1Q150E61 潍柴 110kW', 'WP6.180E51 潍柴 132kW',
  'WP7.270E51 潍柴 199kW', 'WP10.310E61 潍柴 228kW',
  'D28D1-6DA 云内 96kW', 'YN38CRE1 云内 105kW',
  'MC07.33-60 曼技术 243kW', 'MC11.44-60 曼技术 324kW',
];

const cities = [
  '随州市', '十堰市', '武汉市', '济南市', '长沙市',
  '郑州市', '合肥市', '厦门市', '青岛市', '北京市',
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateVehicle(index: number): Vehicle {
  const brand = randomPick(brands);
  const chassisBrand = randomPick(chassisBrands);
  const vType = randomPick(vehicleTypes);
  const engineInfo = randomPick(engines);
  const powerMatch = engineInfo.match(/(\d+)kW/);
  const power = powerMatch ? parseInt(powerMatch[1]) : 110;
  const axle = randomPick([2, 2, 2, 3, 3, 4]);
  const totalMass = axle === 2 ? randomRange(3500, 18000) : axle === 3 ? randomRange(16000, 25000) : randomRange(25000, 31000);
  const overallLength = axle === 2 ? randomRange(5000, 10000) : axle === 3 ? randomRange(8500, 12000) : randomRange(10000, 13000);
  const overallWidth = randomRange(2200, 2550);
  const overallHeight = randomRange(2600, 3980);
  const boxLength = Math.floor(overallLength * 0.55);
  const boxWidth = overallWidth - randomRange(100, 200);
  const boxHeight = overallHeight - randomRange(800, 1500);

  const modelPrefix = brand === '东风' ? 'DFH' : brand === '解放' ? 'CA' : brand === '福田' ? 'BJ' : brand === '重汽' ? 'ZZ' : brand === '陕汽' ? 'SX' : 'CLW';
  const batchNum = randomPick(['388', '389', '390', '391', '392']);

  return {
    id: `SPV${String(index + 1).padStart(6, '0')}`,
    vehicleType: vType,
    modelNumber: `${modelPrefix}5${axle === 2 ? '08' : axle === 3 ? '16' : '25'}${randomRange(10, 99)}${String.fromCharCode(65 + randomRange(0, 25))}${String.fromCharCode(65 + randomRange(0, 25))}${randomRange(1, 9)}`,
    chassisModel: `${modelPrefix}1${axle === 2 ? '08' : axle === 3 ? '16' : '25'}${randomRange(10, 99)}${String.fromCharCode(65 + randomRange(0, 25))}`,
    brand,
    manufacturer: randomPick(manufacturers),
    chassisManufacturer: `${chassisBrand}汽车有限公司`,
    chassisBrand,
    productionAddress: `湖北省${randomPick(cities)}`,
    axleCount: axle,
    engine: engineInfo,
    tireCount: axle === 2 ? 6 : axle === 3 ? 10 : 12,
    wheelbase: axle === 2 ? randomRange(3300, 5600) : axle === 3 ? randomRange(4500, 6800) : randomRange(5000, 7500),
    power,
    tireSpec: randomPick(tireSpecs),
    emissionStandard: randomPick(emissionStandards),
    volume: parseFloat((randomRange(3, 25) + Math.random()).toFixed(1)),
    batch: batchNum,
    fuelType: randomPick(fuelTypes),
    totalMass,
    overallLength,
    boxLength,
    ratedMass: Math.floor(totalMass * (0.4 + Math.random() * 0.2)),
    overallWidth,
    boxWidth,
    curbWeight: Math.floor(totalMass * (0.3 + Math.random() * 0.15)),
    overallHeight,
    boxHeight,
    imageUrl: `/images/vehicle-placeholder.svg`,
    announcement: `ZB${batchNum}${randomRange(1000, 9999)}`,
    taxExempt: Math.random() > 0.3,
    fuelAnnouncement: Math.random() > 0.2,
    ecoAnnouncement: Math.random() > 0.25,
    description: `${brand}${vType}，${engineInfo.split(' ')[2]}发动机，${randomPick(emissionStandards)}排放`,
    price: `${randomRange(8, 68)}.${randomRange(0, 9)}万`,
    announcementDate: `2025-${String(randomRange(1, 12)).padStart(2, '0')}-${String(randomRange(1, 28)).padStart(2, '0')}`,
  };
}

// Generate 200 mock vehicles with deterministic seed
const seededRandom = (() => {
  let seed = 42;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
})();

// Override Math.random temporarily for deterministic data
const origRandom = Math.random;
Math.random = seededRandom;
export const mockVehicles: Vehicle[] = Array.from({ length: 200 }, (_, i) => generateVehicle(i));
Math.random = origRandom;

export const filterOptions: FilterOptions = {
  vehicleTypes,
  brands,
  chassisBrands,
  manufacturers,
  emissionStandards,
  fuelTypes,
  axleCounts: [2, 3, 4],
  tireSpecs,
};
