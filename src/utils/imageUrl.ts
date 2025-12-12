/**
 * 构建图片完整URL
 * 统一处理开发环境和生产环境的图片路径问题
 * @param imagePath 图片路径或ID
 * @returns 完整的图片URL，如果无法处理则返回null
 */
export function buildImageUrl(imagePath: string | number | null | undefined): string | null {
	if (!imagePath && imagePath !== 0) return null;

	// 获取后端API基础URL
	const apiBaseUrl = process.env.NODE_ENV === "production" ? process.env.VUE_APP_API_BASE_URL || "http://8.148.228.10:8000" : "";

	// 如果已经是完整URL（http或https开头）
	if (typeof imagePath === "string" && imagePath.startsWith("http")) {
		// 如果是外部占位图URL且有CORS问题，返回null
		if (imagePath.includes("placeholder.im") || imagePath.includes("via.placeholder.com")) {
			console.warn("检测到可能被CORS阻止的外部图片URL:", imagePath);
			return null;
		}
		return imagePath;
	}

	// 处理图片ID（数字或纯数字字符串）
	if (typeof imagePath === "number" || (typeof imagePath === "string" && /^\d+$/.test(imagePath))) {
		const path = `/api/images/${imagePath}`;
		return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
	}

	// 处理相对路径（以/api/开头）
	if (typeof imagePath === "string" && imagePath.startsWith("/api/")) {
		return apiBaseUrl ? `${apiBaseUrl}${imagePath}` : imagePath;
	}

	// 处理其他以/开头的相对路径
	if (typeof imagePath === "string" && imagePath.startsWith("/")) {
		return apiBaseUrl ? `${apiBaseUrl}${imagePath}` : imagePath;
	}

	// 无法识别的格式
	console.warn("无法识别的图片路径格式:", imagePath);
	return null;
}

/**
 * 加载图片URL（兼容旧接口，返回字符串，失败时返回占位图）
 * @param imagePath 图片路径或ID
 * @param placeholder 占位图URL（可选）
 * @returns 图片URL或占位图URL
 */
export function loadImage(imagePath: string | number | null | undefined, placeholder?: string): string {
	const url = buildImageUrl(imagePath);
	if (url) {
		return url;
	}
	// 返回默认占位图或自定义占位图
	return placeholder || "https://placeholder.im/400x300/connecting/3f51b5/ffffff";
}
