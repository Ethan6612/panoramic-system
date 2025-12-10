import { loadImage } from "./imageLoader";

export interface ImageInfo {
	path: string;
	filename: string;
	shotTime: Date;
	formattedTime: string;
}

/**
 * 从DJI文件名中解析拍摄时间
 * 文件名格式：DJI_YYYYMMDDHHMMSS_XXXX_W.jpeg
 */
export function parseDjiShotTime(filename: string): Date | null {
	const match = filename.match(/^DJI_(\d{8})(\d{6})_\d+_W\.(jpe?g)$/i);
	if (!match) return null;

	const [, datePart, timePart] = match;
	const year = parseInt(datePart.substring(0, 4));
	const month = parseInt(datePart.substring(4, 6)) - 1; // 月份从0开始
	const day = parseInt(datePart.substring(6, 8));
	const hour = parseInt(timePart.substring(0, 2));
	const minute = parseInt(timePart.substring(2, 4));
	const second = parseInt(timePart.substring(4, 6));

	return new Date(year, month, day, hour, minute, second);
}

/**
 * 格式化拍摄时间
 */
export function formatShotTime(date: Date): string {
	return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * 动态获取指定实例目录下的所有图片
 * @param instance 实例名称，如"instance1"
 * @param basePath 基础路径，默认从assets/images开始
 * @returns 按拍摄时间排序的图片信息数组
 */
export function getDynamicImages(instance: string, basePath: string = "/src/assets/images"): ImageInfo[] {
	const imagesDir = `${basePath}/${instance}/directory`;
	
	// 由于是在浏览器环境，我们无法直接读取文件系统
	// 这里使用静态映射的方式，但可以根据文件名动态解析时间
	const staticMapping: Record<string, string[]> = {
		"instance1": [
			"DJI_20250625094822_0001_W.jpeg",
			"DJI_20250625094824_0002_W.jpeg",
			"DJI_20250625094826_0003_W.jpeg",
			"DJI_20250625094828_0004_W.jpeg",
			"DJI_20250625094831_0005_W.jpeg",
			"DJI_20250625094833_0006_W.jpeg",
			"DJI_20250625094836_0007_W.jpeg",
			"DJI_20250625094838_0008_W.jpeg",
			"DJI_20250625094841_0009_W.jpeg",
			"DJI_20250625094844_0010_W.jpeg",
			"DJI_20250625094847_0011_W.jpeg",
			"DJI_20250625094849_0012_W.jpeg",
			"DJI_20250625094852_0013_W.jpeg",
			"DJI_20250625094854_0014_W.jpeg",
			"DJI_20250625094856_0015_W.jpeg",
			"DJI_20250625094859_0016_W.jpeg",
			"DJI_20250625094901_0017_W.jpeg",
			"DJI_20250625094905_0018_W.jpeg",
			"DJI_20250625094907_0019_W.jpeg",
			"DJI_20250625094910_0020_W.jpeg",
			"DJI_20250625094913_0021_W.jpeg",
			"DJI_20250625094915_0022_W.jpeg",
			"DJI_20250625094917_0023_W.jpeg",
			"DJI_20250625094920_0024_W.jpeg",
			"DJI_20250625094922_0025_W.jpeg",
			"DJI_20250625094926_0026_W.jpeg"
		],
		"instance2": [
			"DJI_20250319101836_0001_W.jpeg",
			"DJI_20250319101836_0002_W.jpeg",
			"DJI_20250319101839_0003_W.jpeg",
			"DJI_20250319101841_0004_W.jpeg",
			"DJI_20250319101844_0005_W.jpeg",
			"DJI_20250319101846_0006_W.jpeg",
			"DJI_20250319101849_0007_W.jpeg",
			"DJI_20250319101851_0008_W.jpeg",
			"DJI_20250319101854_0009_W.jpeg",
			"DJI_20250319101857_0010_W.jpeg",
			"DJI_20250319101859_0011_W.jpeg",
			"DJI_20250319101902_0012_W.jpeg",
			"DJI_20250319101904_0013_W.jpeg",
			"DJI_20250319101907_0014_W.jpeg",
			"DJI_20250319101909_0015_W.jpeg",
			"DJI_20250319101912_0016_W.jpeg",
			"DJI_20250319101914_0017_W.jpeg",
			"DJI_20250319101917_0018_W.jpeg",
			"DJI_20250319101919_0019_W.jpeg",
			"DJI_20250319101922_0020_W.jpeg",
			"DJI_20250319101925_0021_W.jpeg",
			"DJI_20250319101927_0022_W.jpeg",
			"DJI_20250319101930_0023_W.jpeg",
			"DJI_20250319101932_0024_W.jpeg",
			"DJI_20250319101935_0025_W.jpeg",
			"DJI_20250319101938_0026_W.jpeg"
		]
	};

	const files = staticMapping[instance] || [];
	
	const imageInfos: ImageInfo[] = files
		.filter(filename => {
			const shotTime = parseDjiShotTime(filename);
			return shotTime !== null; // 只保留能解析出时间的文件
		})
		.map(filename => {
			const shotTime = parseDjiShotTime(filename)!;
			return {
				path: `${imagesDir}/${filename}`,
				filename,
				shotTime,
				formattedTime: formatShotTime(shotTime)
			};
		})
		.sort((a, b) => a.shotTime.getTime() - b.shotTime.getTime()); // 按拍摄时间排序

	return imageInfos;
}

/**
 * 获取实例的第一个拍摄时间（最早时间）
 */
export function getInstanceFirstShotTime(instance: string): Date | null {
	const images = getDynamicImages(instance);
	return images.length > 0 ? images[0].shotTime : null;
}

/**
 * 获取实例的最后拍摄时间（最晚时间）
 */
export function getInstanceLastShotTime(instance: string): Date | null {
	const images = getDynamicImages(instance);
	return images.length > 0 ? images[images.length - 1].shotTime : null;
}

/**
 * 按时间段分组图片
 * @param instance 实例名称
 * @param groupBy 分组方式：'day' | 'month' | 'year'
 */
export function groupImagesByTime(instance: string, groupBy: 'day' | 'month' | 'year' = 'day'): Record<string, ImageInfo[]> {
	const images = getDynamicImages(instance);
	const groups: Record<string, ImageInfo[]> = {};

	for (const image of images) {
		let key: string;
		switch (groupBy) {
			case 'day':
				key = image.shotTime.toISOString().split('T')[0]; // YYYY-MM-DD
				break;
			case 'month':
				key = `${image.shotTime.getFullYear()}-${String(image.shotTime.getMonth() + 1).padStart(2, '0')}`;
				break;
			case 'year':
				key = String(image.shotTime.getFullYear());
				break;
			default:
				key = image.shotTime.toISOString().split('T')[0];
		}

		if (!groups[key]) {
			groups[key] = [];
		}
		groups[key].push(image);
	}

	return groups;
}