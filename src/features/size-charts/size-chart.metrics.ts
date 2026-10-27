export const SIZE_CHART_MEASUREMENTS = [
  { field: "chest", label: "Lingkar dada (cm)" },
  { field: "shoulder", label: "Lebar bahu (cm)" },
  { field: "sleeveLength", label: "Panjang lengan (cm)" },
  { field: "length", label: "Panjang badan (cm)" },
  { field: "upperArm", label: "Lingkar lengan atas (cm)" },
  { field: "elbow", label: "Siku (cm)" },
  { field: "lowerArm", label: "Lingkar lengan bawah (cm)" },
  { field: "height", label: "Rekomendasi tinggi (cm)" },
] as const;

export const SIZE_CHART_EDITOR_METRICS = [
  ...SIZE_CHART_MEASUREMENTS,
  { field: "weightMin", label: "Rekomendasi berat minimum (kg)" },
  { field: "weightMax", label: "Rekomendasi berat maksimum (kg)" },
] as const;
