import { Vehicle, SearchFilters } from './types';
import { mockVehicles } from './mock-data';

export function searchVehicles(filters: SearchFilters): {
  vehicles: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;

  let results = [...mockVehicles];

  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    results = results.filter(v =>
      v.modelNumber.toLowerCase().includes(kw) ||
      v.brand.toLowerCase().includes(kw) ||
      v.vehicleType.toLowerCase().includes(kw) ||
      v.manufacturer.toLowerCase().includes(kw) ||
      v.description.toLowerCase().includes(kw)
    );
  }

  if (filters.vehicleType) results = results.filter(v => v.vehicleType === filters.vehicleType);
  if (filters.brand) results = results.filter(v => v.brand === filters.brand);
  if (filters.chassisBrand) results = results.filter(v => v.chassisBrand === filters.chassisBrand);
  if (filters.manufacturer) results = results.filter(v => v.manufacturer === filters.manufacturer);
  if (filters.emissionStandard) results = results.filter(v => v.emissionStandard === filters.emissionStandard);
  if (filters.fuelType) results = results.filter(v => v.fuelType === filters.fuelType);
  if (filters.axleCount) results = results.filter(v => v.axleCount === filters.axleCount);
  if (filters.tireSpec) results = results.filter(v => v.tireSpec === filters.tireSpec);
  if (filters.modelNumber) results = results.filter(v => v.modelNumber.includes(filters.modelNumber!));
  if (filters.chassisModel) results = results.filter(v => v.chassisModel.includes(filters.chassisModel!));
  if (filters.chassisManufacturer) results = results.filter(v => v.chassisManufacturer.includes(filters.chassisManufacturer!));
  if (filters.batch) results = results.filter(v => v.batch === filters.batch);

  if (filters.powerMin) results = results.filter(v => v.power >= filters.powerMin!);
  if (filters.powerMax) results = results.filter(v => v.power <= filters.powerMax!);
  if (filters.totalMassMin) results = results.filter(v => v.totalMass >= filters.totalMassMin!);
  if (filters.totalMassMax) results = results.filter(v => v.totalMass <= filters.totalMassMax!);
  if (filters.overallLengthMin) results = results.filter(v => v.overallLength >= filters.overallLengthMin!);
  if (filters.overallLengthMax) results = results.filter(v => v.overallLength <= filters.overallLengthMax!);
  if (filters.wheelbaseMin) results = results.filter(v => v.wheelbase >= filters.wheelbaseMin!);
  if (filters.wheelbaseMax) results = results.filter(v => v.wheelbase <= filters.wheelbaseMax!);
  if (filters.volumeMin) results = results.filter(v => v.volume >= filters.volumeMin!);
  if (filters.volumeMax) results = results.filter(v => v.volume <= filters.volumeMax!);

  if (filters.taxExempt) results = results.filter(v => v.taxExempt);
  if (filters.fuelAnnouncement) results = results.filter(v => v.fuelAnnouncement);
  if (filters.ecoAnnouncement) results = results.filter(v => v.ecoAnnouncement);

  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paged = results.slice(start, start + pageSize);

  return { vehicles: paged, total, page, pageSize, totalPages };
}

export function getVehicleById(id: string): Vehicle | undefined {
  return mockVehicles.find(v => v.id === id);
}

export function getSimilarVehicles(vehicle: Vehicle, limit = 6): Vehicle[] {
  return mockVehicles
    .filter(v => v.id !== vehicle.id && (v.vehicleType === vehicle.vehicleType || v.brand === vehicle.brand))
    .slice(0, limit);
}
