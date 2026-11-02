export interface ImportReport {
  filename: string;
  fileSizeBytes: number;
  totalBlocks: number;
  questionCount: number;
  optionCount: number;
  sectionCount: number;
  imageCount: number;
  mathCount: number;
  shapeCount: number;
  unclassifiedCount: number;
  legacyHindiFonts: string[];
  warnings: string[];
  durationMs: number;
}

export function createInitialReport(filename: string, fileSizeBytes: number): ImportReport {
  return {
    filename,
    fileSizeBytes,
    totalBlocks: 0,
    questionCount: 0,
    optionCount: 0,
    sectionCount: 0,
    imageCount: 0,
    mathCount: 0,
    shapeCount: 0,
    unclassifiedCount: 0,
    legacyHindiFonts: [],
    warnings: [],
    durationMs: 0
  };
}

