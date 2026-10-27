import type { SizeChartStandard } from "./size-chart.types";

/** Transcribed from the Sasienala Basic size chart supplied by Ofissio on 27 October 2026. */
export const SASIENALA_BASIC_STANDARD: SizeChartStandard = {
  id: "sasienala-sn-basic",
  name: "Kemeja Wanita SN (Sasienala) Basic",
  description: "Standar Sasienala Basic sesuai tabel resmi. Ukuran pakaian dalam cm; berat badan hanya rekomendasi pemilihan ukuran.",
  categorySlugs: [],
  productSlugs: [
    "kemeja-kantor-wanita-sn-basic-brown-series",
    "kemeja-kantor-wanita-sn-basic-green-series",
    "kemeja-kantor-wanita-sn-basic-additional-series",
    "kemeja-kantor-wanita-sn-basic-monochrome-series",
    "sn-basic-shirt-blue-series",
  ],
  verified: true,
  isFallback: false,
  rows: [
    { size: "XS", chest: 92, shoulder: 36, sleeveLength: 51, length: 68, upperArm: 35, elbow: 28, lowerArm: 22, height: 0, weightMin: 35, weightMax: 45 },
    { size: "S", chest: 96, shoulder: 38, sleeveLength: 54, length: 70, upperArm: 36, elbow: 29, lowerArm: 23, height: 0, weightMin: 45, weightMax: 52 },
    { size: "M", chest: 100, shoulder: 39, sleeveLength: 54, length: 72, upperArm: 39, elbow: 30, lowerArm: 24, height: 0, weightMin: 52, weightMax: 58 },
    { size: "L", chest: 108, shoulder: 41, sleeveLength: 54, length: 74, upperArm: 40, elbow: 31, lowerArm: 26, height: 0, weightMin: 58, weightMax: 65 },
    { size: "XL", chest: 110, shoulder: 42, sleeveLength: 55, length: 75, upperArm: 42, elbow: 33, lowerArm: 27, height: 0, weightMin: 65, weightMax: 70 },
    { size: "2XL", chest: 116, shoulder: 45, sleeveLength: 55, length: 75, upperArm: 44, elbow: 35, lowerArm: 28, height: 0, weightMin: 70, weightMax: 77 },
    { size: "3XL", chest: 120, shoulder: 47, sleeveLength: 56, length: 77, upperArm: 46, elbow: 37, lowerArm: 29, height: 0, weightMin: 77, weightMax: 85 },
  ],
};
