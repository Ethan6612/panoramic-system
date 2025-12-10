/**
 * 脚本：根据全景图EXIF信息生成真实的时光机配置
 * 每个地点只有一个时间点（基于全景图的拍摄时间）
 */

const fs = require("fs");
const path = require("path");
const exifr = require("exifr");

// 图片目录
const imagesDir = path.join(__dirname, "../src/assets/images");

// 真实的地点基础信息
const locationConfigs = {
	instance1: {
		id: 1,
		name: "全景地点 一",
		longitude: 116.50963805551456,
		latitude: 23.166024722276127,
		rating: 4.5,
		category: "全景景点",
		directoryImages: [
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
			"DJI_20250625094926_0026_W.jpeg",
		],
	},
	instance2: {
		id: 2,
		name: "全景地点 二",
		longitude: 114.42243888889561,
		latitude: 23.174899444439262,
		rating: 4.5,
		category: "全景景点",
		directoryImages: [
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
			"DJI_20250319101938_0026_W.jpeg",
		],
	},
	instance3: {
		id: 3,
		name: "全景地点 三",
		longitude: 118.23456789012345,
		latitude: 24.567890123456789,
		rating: 4.2,
		category: "城市景观",
		directoryImages: [
			"PANO_0001.JPG",
			"PANO_0002.JPG",
			"PANO_0003.JPG",
			"PANO_0004.JPG",
			"PANO_0005.JPG",
			"PANO_0006.JPG",
			"PANO_0007.JPG",
			"PANO_0008.JPG",
			"PANO_0009.JPG",
			"PANO_0010.JPG",
			"PANO_0011.JPG",
			"PANO_0012.JPG",
			"PANO_0013.JPG",
			"PANO_0014.JPG",
			"PANO_0015.JPG",
			"PANO_0016.JPG",
			"PANO_0017.JPG",
			"PANO_0018.JPG",
			"PANO_0019.JPG",
			"PANO_0020.JPG",
			"PANO_0021.JPG",
			"PANO_0022.JPG",
			"PANO_0023.JPG",
			"PANO_0024.JPG",
			"PANO_0025.JPG",
		],
	},
	instance4: {
		id: 4,
		name: "全景地点 四",
		longitude: 120.87654321098765,
		latitude: 31.123456789012345,
		rating: 4.8,
		category: "自然风光",
		directoryImages: [
			"DJI_20250803092339_0001_V.jpeg",
			"DJI_20250803092342_0002_V.jpeg",
			"DJI_20250803092344_0003_V.jpeg",
			"DJI_20250803092345_0004_V.jpeg",
			"DJI_20250803092348_0005_V.jpeg",
			"DJI_20250803092350_0006_V.jpeg",
			"DJI_20250803092352_0007_V.jpeg",
			"DJI_20250803092355_0008_V.jpeg",
			"DJI_20250803092357_0009_V.jpeg",
			"DJI_20250803092359_0010_V.jpeg",
			"DJI_20250803092402_0011_V.jpeg",
			"DJI_20250803092404_0012_V.jpeg",
			"DJI_20250803092406_0013_V.jpeg",
			"DJI_20250803092409_0014_V.jpeg",
			"DJI_20250803092411_0015_V.jpeg",
			"DJI_20250803092413_0016_V.jpeg",
			"DJI_20250803092416_0017_V.jpeg",
			"DJI_20250803092418_0018_V.jpeg",
			"DJI_20250803092419_0019_V.jpeg",
			"DJI_20250803092423_0020_V.jpeg",
			"DJI_20250803092425_0021_V.jpeg",
			"DJI_20250803092426_0022_V.jpeg",
			"DJI_20250803092430_0023_V.jpeg",
			"DJI_20250803092431_0024_V.jpeg",
			"DJI_20250803092433_0025_V.jpeg",
		],
	},
	instance5: {
		id: 5,
		name: "全景地点 五",
		longitude: 113.34567890123456,
		latitude: 23.678901234567890,
		rating: 4.0,
		category: "历史文化",
		directoryImages: [
			"PANO0001.JPG",
			"PANO0002.JPG",
			"PANO0003.JPG",
			"PANO0004.JPG",
			"PANO0005.JPG",
			"PANO0006.JPG",
			"PANO0007.JPG",
			"PANO0008.JPG",
			"PANO0009.JPG",
			"PANO0010.JPG",
			"PANO0011.JPG",
			"PANO0012.JPG",
			"PANO0013.JPG",
			"PANO0014.JPG",
			"PANO0015.JPG",
			"PANO0016.JPG",
			"PANO0017.JPG",
			"PANO0018.JPG",
			"PANO0019.JPG",
			"PANO0020.JPG",
			"PANO0021.JPG",
			"PANO0022.JPG",
			"PANO0023.JPG",
			"PANO0024.JPG",
			"PANO0025.JPG",
		],
	},
  
};

// 读取全景图的EXIF信息
async function readPanoramaExif(instancePath) {
	try {
		const files = fs.readdirSync(instancePath);
		// 查找QJ开头的全景图
		const panoramaFile = files.find((f) => f.startsWith("QJ") && f.endsWith(".jpg"));

		if (!panoramaFile) {
			console.log(`  ⚠️  未找到全景图文件`);
			return null;
		}

		const panoramaPath = path.join(instancePath, panoramaFile);
		const exifData = await exifr.parse(panoramaPath, {
			gps: true,
			exif: true,
			iptc: true,
		});

		// 格式化日期时间
		const formatDateTime = (dateStr) => {
			if (!dateStr) return null;
			try {
				if (dateStr instanceof Date) {
					return dateStr;
				}
				// 处理不同的日期格式
				if (typeof dateStr === "string") {
					// EXIF格式通常为 "YYYY:MM:DD HH:MM:SS"
					if (dateStr.includes(":")) {
						return new Date(dateStr.replace(/:/g, "-"));
					}
					return new Date(dateStr);
				}
				return null;
			} catch (e) {
				return null;
			}
		};

		const dateTime = formatDateTime(exifData?.CreateDate || exifData?.DateTimeOriginal || exifData?.DateTime);

		return {
			filename: panoramaFile,
			timestamp: dateTime,
			exifData: exifData,
		};
	} catch (error) {
		console.error(`  ❌ 读取EXIF失败:`, error.message);
		return null;
	}
}

// 生成配置数据
async function generateTimeMachineConfig() {
	const result = [];

	for (const [instance, config] of Object.entries(locationConfigs)) {
		console.log(`\n📍 处理 ${instance}...`);

		const instancePath = path.join(imagesDir, instance);

		// 读取全景图的EXIF信息
		const panoramaInfo = await readPanoramaExif(instancePath);

		if (!panoramaInfo) {
			console.log(`  ⚠️  跳过 ${instance}，无法读取全景图信息`);
			continue;
		}

		const { filename: panoramaFile, timestamp } = panoramaInfo;

		if (!timestamp) {
			console.log(`  ⚠️  ${instance} 没有有效的拍摄时间`);
			continue;
		}

		// 格式化时间
		const year = timestamp.getFullYear();
		const month = timestamp.getMonth() + 1;
		const day = timestamp.getDate();

		// 生成时间段信息（每个地点只有一个时间段）
		const periodId = `${year}-${String(month).padStart(2, "0")}`;
		const label = `${year}年${month}月`;

		// 生成时间戳
		const timestampIso = timestamp.toISOString();

		// 收集directory下的所有图片作为预览图片
		const imagePaths = config.directoryImages.map((img) => `/src/assets/images/${instance}/directory/${img}`);

		console.log(`  📅 全景图: ${panoramaFile}`);
		console.log(`  📅 拍摄时间: ${timestamp.toLocaleString()}`);
		console.log(`  🖼️  预览图片: ${imagePaths.length}张`);

		const timePeriods = [
			{
				id: periodId,
				label: label,
				timestamp: timestampIso,
				images: imagePaths,
				description: `拍摄时间: ${year}年${month}月${day}日`,
				address: `坐标: ${config.longitude.toFixed(6)}, ${config.latitude.toFixed(6)}`,
				panoramaImage: `/src/assets/images/${instance}/${panoramaFile}`,
				thumbnail: imagePaths[0] || `/src/assets/images/${instance}/${panoramaFile}`,
			},
		];

		result.push({
			id: config.id,
			name: config.name,
			longitude: config.longitude,
			latitude: config.latitude,
			rating: config.rating,
			category: config.category,
			timePeriods: timePeriods,
		});

		console.log(`  ✅ ${instance} 处理完成`);
	}

	return result;
}

// 保存新配置
async function saveNewConfig() {
	console.log("🔄 开始生成真实的时光机配置...");

	try {
		const realData = await generateTimeMachineConfig();
		const outputPath = path.join(__dirname, "../src/config/imageLocations.json");

		// 备份原文件
		const backupPath = path.join(__dirname, "../src/config/imageLocations_backup.json");
		if (fs.existsSync(outputPath)) {
			fs.copyFileSync(outputPath, backupPath);
			console.log(`💾 已备份原文件到: ${backupPath}`);
		}

		// 写入新配置
		fs.writeFileSync(outputPath, JSON.stringify(realData, null, 2), "utf-8");

		console.log(`\n✅ 新的配置已保存到: ${outputPath}`);
		console.log("\n📊 数据摘要:");

		let totalPeriods = 0;
		let totalImages = 0;

		realData.forEach((location) => {
			const periodCount = location.timePeriods.length;
			const imageCount = location.timePeriods.reduce((sum, period) => sum + period.images.length, 0);
			totalPeriods += periodCount;
			totalImages += imageCount;

			const period = location.timePeriods[0];
			console.log(`  📍 ${location.name}: ${period.label} - ${imageCount}张预览图片`);
		});

		console.log(`\n总计: ${realData.length}个地点, ${totalPeriods}个时间点, ${totalImages}张预览图片`);
	} catch (error) {
		console.error("❌ 生成配置失败:", error.message);
		process.exit(1);
	}
}

// 运行脚本
saveNewConfig();
