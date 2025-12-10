import axios from 'axios';

export interface GCJ02 {
  lng: number;
  lat: number;
}

/**
 * 将 WGS84（GPS）坐标转换为高德（GCJ-02）坐标
 * @param lon WGS84 经度
 * @param lat WGS84 纬度
 * @returns Promise<{lng, lat}>
 */
export async function convertWGS84ToAMap(
  lon: number,
  lat: number
): Promise<GCJ02> {
  const key = process.env.VUE_APP_AMAP_KEY;
  if (!key) {
    throw new Error('请在环境变量中配置 VUE_APP_AMAP_KEY');
  }

  const resp = await axios.get<{
    status: string;
    info: string;
    locations: string;
  }>(
    'https://restapi.amap.com/v3/assistant/coordinate/convert',
    {
      params: {
        key,
        locations: `${lon},${lat}`,
        coordsys: 'gps', // gps 表示 WGS84→GCJ-02
      },
      timeout: 5000,
    }
  );

  if (resp.data.status !== '1') {
    throw new Error(`高德坐标转换失败：${resp.data.info}`);
  }

  const [lng, la] = resp.data.locations
    .split(',')
    .map((v) => parseFloat(v));
  return { lng, lat: la };
}


// ———— GCJ-02 坐标转换相关函数 ————
const a = 6378245.0
const ee = 0.00669342162296594323

function transformLat(x: number, y: number) {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
  ret += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3
  ret += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3
  return ret
}

function transformLon(x: number, y: number) {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
  ret += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3
  ret += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3
  return ret
}

export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  const dLat = transformLat(lng - 105, lat - 35)
  const dLon = transformLon(lng - 105, lat - 35)
  const radLat = lat / 180 * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  const adjLat = (dLat * 180) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI)
  const adjLon = (dLon * 180) / (a / sqrtMagic * Math.cos(radLat) * Math.PI)
  return [lng + adjLon, lat + adjLat]
}