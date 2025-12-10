import EXIF from "exif-js";

export interface ExifData {
	gps?: {
		latitude: number;
		longitude: number;
	};
	dateTime?: string;
	make?: string;
	model?: string;
	width?: number;
	height?: number;
}

/**
 * 从图片文件读取EXIF信息
 */
export function readExifFromFile(file: File): Promise<ExifData> {
	return new Promise((resolve, reject) => {
		EXIF.getData(file as any, function (this: any) {
			try {
				const exifData: ExifData = {};

				// 读取GPS信息
				const lat = EXIF.getTag(this, "GPSLatitude");
				const latRef = EXIF.getTag(this, "GPSLatitudeRef");
				const lon = EXIF.getTag(this, "GPSLongitude");
				const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

				if (lat && lon) {
					const latitude = convertDMSToDD(lat, latRef);
					const longitude = convertDMSToDD(lon, lonRef);

					exifData.gps = { latitude, longitude };
				}

				// 读取拍摄时间
				const dateTime = EXIF.getTag(this, "DateTime");
				if (dateTime) {
					exifData.dateTime = dateTime;
				}

				// 读取相机信息
				exifData.make = EXIF.getTag(this, "Make") || undefined;
				exifData.model = EXIF.getTag(this, "Model") || undefined;

				// 读取图片尺寸
				exifData.width = this.width;
				exifData.height = this.height;

				resolve(exifData);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * 从图片URL读取EXIF信息
 */
export function readExifFromUrl(url: string): Promise<ExifData> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = function () {
			EXIF.getData(img as any, function (this: any) {
				try {
					const exifData: ExifData = {};

					const lat = EXIF.getTag(this, "GPSLatitude");
					const latRef = EXIF.getTag(this, "GPSLatitudeRef");
					const lon = EXIF.getTag(this, "GPSLongitude");
					const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

					if (lat && lon) {
						const latitude = convertDMSToDD(lat, latRef);
						const longitude = convertDMSToDD(lon, lonRef);
						exifData.gps = { latitude, longitude };
					}

					const dateTime = EXIF.getTag(this, "DateTime");
					if (dateTime) {
						exifData.dateTime = dateTime;
					}

					exifData.make = EXIF.getTag(this, "Make") || undefined;
					exifData.model = EXIF.getTag(this, "Model") || undefined;
					exifData.width = this.width;
					exifData.height = this.height;

					resolve(exifData);
				} catch (error) {
					reject(error);
				}
			});
		};
		img.onerror = reject;
		img.src = url;
	});
}

/**
 * 将度分秒格式转换为十进制度数
 */
function convertDMSToDD(dms: number[], ref: string): number {
	let dd = dms[0] + dms[1] / 60 + dms[2] / (60 * 60);
	if (ref === "S" || ref === "W") {
		dd = dd * -1;
	}
	return dd;
}
