// Only these fields may cross a farm boundary. Coordinates represent a 1-degree cell.
const publicDiseaseAlert = (report) => {
  const latitude = report.location?.latitude, longitude = report.location?.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {
    isPublic: true,
    diseaseType: report.diseaseType || 'unknown',
    diseaseName: report.diseaseName || 'Disease alert',
    severity: report.severity || 'medium',
    color: report.color || '#e74c3c',
    status: report.status || 'active',
    reportDate: report.reportDate || report.createdAt || null,
    location: { latitude: Math.min(89.5, Math.floor(latitude) + 0.5), longitude: Math.min(179.5, Math.floor(longitude) + 0.5), address: 'Regional alert — approximate location (1° area)' },
  };
};
module.exports = { publicDiseaseAlert };
