/**
 * AIS Behavioral Template Extractor
 * 
 * Streams the large CSV and extracts statistical distributions by vessel type.
 * Outputs a compact JSON template used by the simulator at runtime.
 * 
 * Run with: tsx server/scripts/extract_behavior.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// --- Type Definitions ---
interface VesselTypeStat {
  count: number;
  speeds: number[];
  headings: number[];
  lengths: number[];
  widths: number[];
  drafts: number[];
  stoppedCount: number;
  slowCount: number;
  moderateCount: number;
  fastCount: number;
}

interface BehaviourTemplate {
  generatedAt: string;
  totalRecords: number;
  vesselTypeFrequency: Record<string, number>;
  vesselTypeStats: Record<string, {
    speedMean: number;
    speedStd: number;
    headingMean: number;
    headingStd: number;
    lengthMean: number;
    widthMean: number;
    draftMean: number;
    stoppedFraction: number;
    slowFraction: number;
    moderateFraction: number;
    fastFraction: number;
  }>;
}

// Numeric VesselType codes from dataset
const VESSEL_TYPE_MAP: Record<number, string> = {
  30: 'fishing',
  31: 'tug',
  32: 'tug',
  33: 'dredger',
  36: 'sailing',
  37: 'pleasure',
  52: 'tug',
  60: 'passenger',
  70: 'cargo',
  71: 'cargo',
  72: 'cargo',
  79: 'cargo',
  80: 'tanker',
  81: 'tanker',
  89: 'tanker',
  90: 'military',
};

function getVesselCategory(typeCode: number): string {
  if (typeCode >= 70 && typeCode <= 79) return 'cargo';
  if (typeCode >= 80 && typeCode <= 89) return 'tanker';
  if (typeCode >= 60 && typeCode <= 69) return 'passenger';
  if (typeCode === 30) return 'fishing';
  if (typeCode === 52 || typeCode === 31 || typeCode === 32) return 'tug';
  if (typeCode >= 90) return 'military';
  return VESSEL_TYPE_MAP[typeCode] || 'cargo';
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[], m?: number): number {
  if (arr.length < 2) return 0;
  const mu = m ?? mean(arr);
  const variance = arr.reduce((s, v) => s + (v - mu) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

async function extractBehavior() {
  const csvPath = path.resolve('c:/New folder/processed_AIS_dataset.csv');
  const outputPath = path.resolve('server/data/behavior_template.json');

  console.log(`Reading: ${csvPath}`);
  console.log('Streaming and extracting behavioural statistics...\n');

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const stats: Record<string, VesselTypeStat> = {};
  let totalRecords = 0;
  let isHeader = true;

  // Column indices from header
  let colSOG = -1, colCOG = -1, colHeading = -1, colVesselType = -1;
  let colLength = -1, colWidth = -1, colDraft = -1, colSpeedCat = -1;

  for await (const line of rl) {
    if (isHeader) {
      const cols = line.split(',');
      colSOG = cols.indexOf('SOG');
      colCOG = cols.indexOf('COG');
      colHeading = cols.indexOf('Heading');
      colVesselType = cols.indexOf('VesselType');
      colLength = cols.indexOf('Length');
      colWidth = cols.indexOf('Width');
      colDraft = cols.indexOf('Draft');
      colSpeedCat = cols.indexOf('Speed_Category');
      isHeader = false;
      continue;
    }

    const cols = line.split(',');
    if (cols.length < 10) continue;

    const typeCode = parseFloat(cols[colVesselType]);
    if (isNaN(typeCode)) continue;

    const category = getVesselCategory(typeCode);
    const sog = parseFloat(cols[colSOG]);
    const heading = parseFloat(cols[colHeading]);
    const length = parseFloat(cols[colLength]);
    const width = parseFloat(cols[colWidth]);
    const draft = parseFloat(cols[colDraft]);
    const speedCat = cols[colSpeedCat]?.trim();

    if (!stats[category]) {
      stats[category] = {
        count: 0, speeds: [], headings: [], lengths: [], widths: [], drafts: [],
        stoppedCount: 0, slowCount: 0, moderateCount: 0, fastCount: 0
      };
    }

    const s = stats[category];
    s.count++;
    totalRecords++;

    if (!isNaN(sog) && sog >= 0 && sog < 50) s.speeds.push(sog);
    if (!isNaN(heading) && heading >= 0 && heading <= 360) s.headings.push(heading);
    if (!isNaN(length) && length > 0) s.lengths.push(length);
    if (!isNaN(width) && width > 0) s.widths.push(width);
    if (!isNaN(draft) && draft > 0) s.drafts.push(draft);

    if (speedCat === 'Stopped') s.stoppedCount++;
    else if (speedCat === 'Slow') s.slowCount++;
    else if (speedCat === 'Moderate') s.moderateCount++;
    else if (speedCat === 'Fast') s.fastCount++;

    // Log progress every 100k records
    if (totalRecords % 100000 === 0) {
      process.stdout.write(`\r  Processed ${(totalRecords / 1000000).toFixed(2)}M records...`);
    }
  }

  console.log(`\n\nDone. Total records: ${totalRecords.toLocaleString()}`);

  // Build output template
  const vesselTypeFrequency: Record<string, number> = {};
  const vesselTypeStats: BehaviourTemplate['vesselTypeStats'] = {};

  for (const [category, s] of Object.entries(stats)) {
    vesselTypeFrequency[category] = s.count / totalRecords;
    const speedMean = mean(s.speeds);
    const headingMean = mean(s.headings);
    vesselTypeStats[category] = {
      speedMean,
      speedStd: std(s.speeds, speedMean),
      headingMean,
      headingStd: std(s.headings, headingMean),
      lengthMean: mean(s.lengths),
      widthMean: mean(s.widths),
      draftMean: mean(s.drafts),
      stoppedFraction: s.stoppedCount / s.count,
      slowFraction: s.slowCount / s.count,
      moderateFraction: s.moderateCount / s.count,
      fastFraction: s.fastCount / s.count,
    };
  }

  const template: BehaviourTemplate = {
    generatedAt: new Date().toISOString(),
    totalRecords,
    vesselTypeFrequency,
    vesselTypeStats,
  };

  fs.writeFileSync(outputPath, JSON.stringify(template, null, 2));
  console.log(`\nTemplate written to: ${outputPath}`);
  console.log('\nVessel Type Distribution:');
  for (const [type, freq] of Object.entries(vesselTypeFrequency)) {
    const stats_v = vesselTypeStats[type];
    console.log(`  ${type.padEnd(12)}: ${(freq * 100).toFixed(1)}%  | Speed: ${stats_v.speedMean.toFixed(1)} ± ${stats_v.speedStd.toFixed(1)} kn | Len: ${stats_v.lengthMean.toFixed(0)}m`);
  }
}

extractBehavior().catch(console.error);
