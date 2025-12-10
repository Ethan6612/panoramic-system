/**
 * Node.js脚本：读取图片EXIF信息
 * 使用exifr库（更适合Node.js环境）
 * 运行: node scripts/readImageExif.js
 */

const fs = require("fs");
const path = require("path");
const exifr = require("exifr");

// 图片目录
const imagesDir = path.join(__dirname, "../src/assets/images");

// 读取所有实例的图片信息
async function readAllImages() {
	const instances = ["instance1", "instance2"];
	const result = [];

	for (const instance of instances) {
		const instancePath = path.join(imagesDir, instance);
		const files = fs.readdirSync(instancePath);

		// 查找QJ开头的全景图
		const panoramaFile = files.find((f) => f.startsWith("QJ") && f.endsWith(".jpg"));
		if (!panoramaFile) continue;

		const panoramaPath = path.join(instancePath, panoramaFile);

		try {
			// 读取全景图的EXIF信息
			const exifData = await exifr.parse(panoramaPath, {
				gps: true,
				exif: true,
				iptc: true,
			});

			// 读取directory文件夹中的预览图片
			const directoryPath = path.join(instancePath, "directory");
			let previewImages = [];
			if (fs.existsSync(directoryPath)) {
				const dirFiles = fs
					.readdirSync(directoryPath)
					.filter((f) => f.endsWith(".jpeg") || f.endsWith(".jpg"))
					.slice(0, 10); // 只取前10张作为预览

				previewImages = dirFiles.map((file) => file);
			}

			// 格式化日期时间
			const formatDateTime = (dateStr) => {
				if (!dateStr) return "未知";
				try {
					// 处理不同的日期格式
					if (dateStr.includes(":")) {
						return dateStr.replace(/:/g, "-").substring(0, 10);
					}
					return dateStr.substring(0, 10);
				} catch (e) {
					return dateStr;
				}
			};

			const dateTime = exifData?.CreateDate || exifData?.DateTimeOriginal || exifData?.DateTime;
			const formattedDate = formatDateTime(dateTime);

			const locationData = {
				id: instance === "instance1" ? 1 : 2,
				name: exifData?.ImageDescription || `全景地点 ${instance === "instance1" ? "一" : "二"}`,
				longitude: exifData?.longitude || (instance === "instance1" ? 116.509638 : 114.422439),
				latitude: exifData?.latitude || (instance === "instance1" ? 23.166025 : 23.174899),
				rating: 4.5,
				category: "全景景点",
				images: previewImages.map((file) => `@/assets/images/${instance}/directory/${file}`),
				description: `拍摄时间: ${formattedDate}`,
				address: exifData?.GPSLocation || `坐标: ${exifData?.longitude?.toFixed(6)}, ${exifData?.latitude?.toFixed(6)}`,
				panoramaImage: `@/assets/images/${instance}/${panoramaFile}`,
				thumbnail: previewImages[0] ? `@/assets/images/${instance}/directory/${previewImages[0]}` : `@/assets/images/${instance}/${panoramaFile}`,
				timestamp: formattedDate,
			};

			result.push(locationData);
			console.log(`✅ 读取 ${instance}:`, {
				name: locationData.name,
				coordinates: [locationData.longitude, locationData.latitude],
				panorama: panoramaFile,
			});
		} catch (error) {
			console.error(`❌ 读取 ${instance} 失败:`, error.message);
		}
	}

	return result;
}

// 生成配置数据
readAllImages()
	.then((data) => {
		const outputPath = path.join(__dirname, "../src/config/imageLocations.json");
		fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
		console.log(`\n✅ 配置数据已保存到: ${outputPath}`);
		console.log(`共 ${data.length} 个地点`);
	})
	.catch((error) => {
		console.error("❌ 处理失败:", error);
		process.exit(1);
	});
