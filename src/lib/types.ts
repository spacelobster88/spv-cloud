export interface Vehicle {
  id: string;
  vehicleType: string;       // 车辆类型
  modelNumber: string;        // 整车型号
  chassisModel: string;       // 底盘型号
  brand: string;              // 产品商标
  manufacturer: string;       // 企业名称
  chassisManufacturer: string; // 底盘厂家
  chassisBrand: string;       // 底盘商标
  productionAddress: string;  // 生产地址
  axleCount: number;          // 轴数
  engine: string;             // 发动机
  tireCount: number;          // 轮胎数
  wheelbase: number;          // 轴距 (mm)
  power: number;              // 功率 (kW)
  tireSpec: string;           // 轮胎规格
  emissionStandard: string;   // 排放标准
  volume: number;             // 容积 (m³)
  batch: string;              // 批次
  fuelType: string;           // 燃油种类
  totalMass: number;          // 总质量 (kg)
  overallLength: number;      // 整车长度 (mm)
  boxLength: number;          // 厢体长度 (mm)
  ratedMass: number;          // 额定质量 (kg)
  overallWidth: number;       // 整车宽度 (mm)
  boxWidth: number;           // 厢体宽度 (mm)
  curbWeight: number;         // 整备质量 (kg)
  overallHeight: number;      // 整车高度 (mm)
  boxHeight: number;          // 厢体高度 (mm)
  imageUrl: string;           // 图片
  announcement: string;       // 公告号
  taxExempt: boolean;         // 免征公告
  fuelAnnouncement: boolean;  // 燃油公告
  ecoAnnouncement: boolean;   // 环保公告
  description: string;        // 备注
  price?: string;             // 参考价格
  announcementDate: string;   // 公告日期
}

export interface FilterOptions {
  vehicleTypes: string[];
  brands: string[];
  chassisBrands: string[];
  manufacturers: string[];
  emissionStandards: string[];
  fuelTypes: string[];
  axleCounts: number[];
  tireSpecs: string[];
}

export interface SearchFilters {
  vehicleType?: string;
  modelNumber?: string;
  chassisModel?: string;
  brand?: string;
  manufacturer?: string;
  chassisManufacturer?: string;
  chassisBrand?: string;
  emissionStandard?: string;
  fuelType?: string;
  axleCount?: number;
  tireSpec?: string;
  powerMin?: number;
  powerMax?: number;
  totalMassMin?: number;
  totalMassMax?: number;
  overallLengthMin?: number;
  overallLengthMax?: number;
  wheelbaseMin?: number;
  wheelbaseMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  batch?: string;
  keyword?: string;
  taxExempt?: boolean;
  fuelAnnouncement?: boolean;
  ecoAnnouncement?: boolean;
  page?: number;
  pageSize?: number;
}
