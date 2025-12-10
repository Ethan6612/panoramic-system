/**
 * 图片路径加载工具
 * 将@/路径转换为正确的导入方式
 */

/**
 * 加载图片路径（用于动态路径）
 * @param path 图片路径，支持@/开头的路径
 * @returns 实际可用的图片路径
 */
export function loadImage(path: string): string {
	if (!path) return "";

	// 如果已经是完整URL，直接返回
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}

	// 处理@/路径
	if (path.startsWith("@/")) {
		try {
			// 在Vue中，@/路径在模板中可以直接使用
			// 但在JS中需要使用require或import
			// 这里使用require方式（webpack/vue-cli支持）
			const relativePath = path.replace("@/", "");
			// @ts-ignore - webpack require
			return require(`@/${relativePath}`);
		} catch (error) {
			console.warn(`无法加载图片: ${path}`, error);
			// 如果require失败，尝试直接返回路径（可能在运行时由webpack处理）
			return path;
		}
	}

	// 处理/src/路径
	if (path.startsWith("/src/")) {
		try {
			const relativePath = path.replace("/src/", "");
			// @ts-ignore - webpack require
			return require(`@/${relativePath}`);
		} catch (error) {
			console.warn(`无法加载图片: ${path}`, error);
			return path;
		}
	}

	return path;
}

/**
 * 批量加载图片路径
 */
export function loadImages(paths: string[]): string[] {
	return paths.map(loadImage);
}
