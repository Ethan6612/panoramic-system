<template>
	<div class="panorama-view-container">
		<!-- 左上角返回按钮 -->
		<div class="back-button" @click="goBack">
			<el-icon><ArrowLeft /></el-icon>
			<span>返回</span>
		</div>

		<!-- 全景图容器 -->
		<div ref="panoRef" class="panorama-container" @dblclick="togglePreviewPanel"></div>

		<!-- 半透明预览区域 -->
		<div v-show="showPreviewPanel" class="preview-panel" @click.stop>
			<!-- 地点信息 -->
			<div class="location-info" v-if="locationData">
				<div class="location-name">{{ locationData.name }}</div>
				<div class="location-description">{{ locationData.description }}</div>
				<div class="location-address" v-if="locationData.address">
					<el-icon><Location /></el-icon>
					{{ locationData.address }}
				</div>
			</div>

			<!-- 全景图预览图片 -->
			<div class="preview-images" v-if="currentTimePeriod?.images?.length">
				<div class="preview-title">全景图预览</div>
				<div class="image-gallery" :class="{ changing: isChangingPeriod }">
					<div
						v-for="(image, index) in currentTimePeriod.images"
						:key="index"
						class="preview-image"
						:style="{ backgroundImage: `url(${image})` }"
						@click="viewImageDetail(image)"
						:title="getPreviewImageTitle(index)"></div>
				</div>
				<div class="preview-tips" v-if="currentTimePeriod.images.length > 0">
					<el-icon><InfoFilled /></el-icon>
					<span>点击预览图查看详情，当前全景图共有 {{ currentTimePeriod.images.length }} 张预览图</span>
				</div>
			</div>

			<!-- 时光机功能-->
			<div class="time-machine" :class="{ changing: isChangingPeriod }" v-if="locationData?.timePeriods?.length > 0">
				<div class="time-machine-header">
					<div class="time-machine-title">
						<el-icon><Clock /></el-icon>
						<span>时光机</span>
					</div>
				</div>

				<div class="time-tabs horizontal-scroll">
					<div
						v-for="period in locationData.timePeriods"
						:key="period.id"
						class="time-tab"
						:class="{ active: selectedTimePeriod === period.id }"
						@click="onTimePeriodChange(period.id)"
						:title="formatTimestamp(period.timestamp)">
						<div class="tab-label">{{ period.label }}</div>
					</div>
				</div>
			</div>

			<!-- 无数据提示 -->
			<div class="no-data" v-if="!locationData">
				<el-empty description="暂无数据" />
			</div>
		</div>

		<!-- 右下角功能栏 -->
		<div class="function-bar">
			<div class="function-item" @click="refreshView" title="刷新视图">
				<el-icon><Refresh /></el-icon>
				<span>刷新</span>
			</div>
			<div class="function-item" @click="togglePreviewPanel" title="切换预览面板">
				<el-icon v-if="showPreviewPanel"><Hide /></el-icon>
				<el-icon v-else><View /></el-icon>
				<span>{{ showPreviewPanel ? "隐藏" : "显示" }}</span>
			</div>
			<div class="function-item" @click="openSearch" title="搜索">
				<el-icon><Search /></el-icon>
				<span>搜索</span>
			</div>
		</div>

		<!-- 图片详情对话框 -->
		<el-dialog v-model="showImageDialog" title="图片详情" width="80%" center>
			<div class="image-detail-container">
				<img :src="selectedImage" class="detail-image" />
				<div class="image-info" v-if="selectedImageInfo">
					<p><strong>文件名:</strong> {{ selectedImageInfo.filename }}</p>
					<p><strong>文件大小:</strong> {{ formatFileSize(selectedImageInfo.fileSize) }}</p>
					<p><strong>图片类型:</strong> {{ selectedImageInfo.imageType }}</p>
					<p><strong>上传时间:</strong> {{ selectedImageInfo.createdAt }}</p>
					<p v-if="selectedImageInfo.previewIndex !== undefined"><strong>预览图序号:</strong> {{ selectedImageInfo.previewIndex + 1 }}</p>
					<p v-if="selectedImageInfo.description"><strong>描述:</strong> {{ selectedImageInfo.description }}</p>
				</div>
			</div>
			<template #footer>
				<el-button @click="showImageDialog = false">关闭</el-button>
				<el-button type="primary" @click="downloadImage" v-if="selectedImage"> 下载图片 </el-button>
			</template>
		</el-dialog>

		<!-- 搜索对话框 -->
		<el-dialog v-model="showSearchDialog" title="搜索地点" width="50%" center>
			<el-input v-model="searchKeyword" placeholder="搜索地点、地址或关键词" @keyup.enter="handleSearch">
				<template #prefix>
					<el-icon><Search /></el-icon>
				</template>
			</el-input>
			<template #footer>
				<el-button @click="showSearchDialog = false">取消</el-button>
				<el-button type="primary" @click="handleSearch">搜索</el-button>
			</template>
		</el-dialog>

		<!-- 加载状态 -->
		<div v-if="loading" class="loading-overlay">
			<el-icon class="loading-icon"><Loading /></el-icon>
			<span>加载中...</span>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import { ArrowLeft, Refresh, Search, Location, Hide, View, Loading, InfoFilled, Clock } from "@element-plus/icons-vue";
import { ElMessage, ElLoading } from "element-plus";
import { Viewer } from "photo-sphere-viewer";
import "photo-sphere-viewer/dist/photo-sphere-viewer.css";
import request from "@/api/request";
import { buildImageUrl } from "@/utils/imageUrl";

const route = useRoute();
const router = useRouter();

// 全景图相关
const panoRef = ref(null);
let viewer = ref(null);
let viewerEvents = ref([]); // 存储事件监听器的引用

// 预览面板控制
const showPreviewPanel = ref(true);

// 地点数据
const locationData = ref(null);
const loading = ref(false);
const imageLoading = ref(false);

// 时间段选择相关
const selectedTimePeriod = ref("");
const currentTimePeriod = ref(null);
const isChangingPeriod = ref(false);

// 图片详情对话框
const showImageDialog = ref(false);
const selectedImage = ref("");
const selectedImageInfo = ref(null);
const selectedImageIndex = ref(-1);

// 搜索功能
const showSearchDialog = ref(false);
const searchKeyword = ref("");

// 预览图片信息映射
const previewImageInfoMap = ref({});

// 格式化时间戳 - 核心函数
const formatTimestamp = (timestamp) => {
	if (!timestamp) return "未知时间";

	try {
		// 处理不同格式的时间戳
		let date;

		// 如果是 "2025-12-11 16:00:30" 格式
		if (typeof timestamp === "string" && timestamp.includes(" ")) {
			// 将空格替换为T，使其成为标准ISO格式
			date = new Date(timestamp.replace(" ", "T"));
		}
		// 如果是 ISO 格式 "2025-12-11T16:00:30"
		else if (typeof timestamp === "string" && timestamp.includes("T")) {
			date = new Date(timestamp);
		}
		// 如果是时间戳数字
		else if (typeof timestamp === "number") {
			date = new Date(timestamp);
		}
		// 其他情况
		else {
			date = new Date(timestamp);
		}

		// 检查日期是否有效
		if (isNaN(date.getTime())) {
			console.warn("无效的时间戳:", timestamp);
			return timestamp; // 返回原始值
		}

		// 格式化为中文友好格式
		return date.toLocaleString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
	} catch (e) {
		console.error("格式化时间戳失败:", e, timestamp);
		return timestamp;
	}
};

// 从时间戳生成时间标签（用于时光机标签）
const generateTimeLabel = (timestamp) => {
	if (!timestamp) return "未知时间";

	try {
		let date;

		// 处理 "2025-12-11 16:00:30" 格式
		if (typeof timestamp === "string" && timestamp.includes(" ")) {
			date = new Date(timestamp.replace(" ", "T"));
		} else {
			date = new Date(timestamp);
		}

		if (isNaN(date.getTime())) {
			return "未知时间";
		}

		const year = date.getFullYear();
		const month = date.getMonth() + 1;

		return `${year}年${month}月`;
	} catch (e) {
		console.error("生成时间标签失败:", e);
		return "未知时间";
	}
};

// 使用统一的图片URL构建函数（已从 @/utils/imageUrl 导入）

// 获取有效的图片URL
const getValidImageUrl = async (imageUrl) => {
	if (!imageUrl) {
		return null;
	}

	const fullUrl = buildImageUrl(imageUrl);

	if (!fullUrl) {
		return null;
	}

	// 对于本地API图片，直接返回
	return fullUrl;
};

// 图片验证函数
const validateImageUrl = async (url) => {
	if (!url) return false;

	try {
		// 对于所有URL都使用Image对象来验证
		return await new Promise((resolve) => {
			const img = new Image();

			img.onload = () => {
				resolve(true);
			};

			img.onerror = () => {
				resolve(false);
			};

			img.src = url;

			// 设置超时
			setTimeout(() => {
				resolve(false);
			}, 5000);
		});
	} catch (error) {
		console.error("图片验证异常:", error);
		return false;
	}
};

// 图片预加载函数
const preloadImages = async (urls) => {
	const promises = urls.map((url) => {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve({ url, status: "loaded" });
			img.onerror = () => resolve({ url, status: "error" });
			img.src = url;
		});
	});

	return Promise.all(promises);
};

// 获取全景图的预览图片
const getPanoramaPreviews = async (panoramaId) => {
	try {
		const response = await request.get(`/api/panorama/${panoramaId}/previews`);

		if (response.code === "200" && response.data) {
			return response.data;
		}
		return [];
	} catch (error) {
		console.error("获取预览图片失败:", error);
		// 尝试使用备用API
		try {
			const timeMachineResponse = await request.get(`/api/panorama/timemachine/previews/${panoramaId}`);
			if (timeMachineResponse.code === "200" && timeMachineResponse.data) {
				return timeMachineResponse.data;
			}
		} catch (e) {
			console.error("备用API也失败:", e);
		}
		return [];
	}
};

// 获取预览图片详细信息
const getPreviewImageInfo = async (imageUrl, index) => {
	try {
		// 从URL中提取图片ID
		const match = imageUrl.match(/\/api\/images\/(\d+)/);
		if (match && match[1]) {
			const imageId = match[1];

			// 如果有缓存，直接返回缓存信息
			const cacheKey = `${currentTimePeriod.value?.panoramaId}_${index}`;
			if (previewImageInfoMap.value[cacheKey]) {
				return previewImageInfoMap.value[cacheKey];
			}

			// 调用API获取图片信息
			try {
				const response = await request.get(`/api/images/${imageId}/info`);
				if (response.code === "200" && response.data) {
					const info = {
						...response.data,
						previewIndex: index,
						panoramaId: currentTimePeriod.value?.panoramaId,
					};
					// 缓存信息
					previewImageInfoMap.value[cacheKey] = info;
					return info;
				}
			} catch (error) {
				console.error("获取图片信息失败:", error);
				return null;
			}

			// 如果API不可用，返回基本信息
			const basicInfo = {
				filename: `preview_${imageId}_${index + 1}.jpg`,
				fileSize: 0,
				imageType: "preview",
				createdAt: new Date().toLocaleString(),
				previewIndex: index,
				panoramaId: currentTimePeriod.value?.panoramaId,
				description: `全景图预览图片 ${index + 1}`,
			};
			previewImageInfoMap.value[cacheKey] = basicInfo;
			return basicInfo;
		}

		// 如果不是本地图片，返回基本信息
		return {
			filename: imageUrl.split("/").pop() || "preview_image.jpg",
			fileSize: 0,
			imageType: "preview",
			createdAt: new Date().toLocaleString(),
			previewIndex: index,
			panoramaId: currentTimePeriod.value?.panoramaId,
			description: `预览图片 ${index + 1}`,
		};
	} catch (error) {
		console.error("获取图片信息失败:", error);
		return null;
	}
};

// 根据ID获取地点数据
const getLocationData = async (id) => {
	loading.value = true;
	try {
		// 获取地点基本信息
		const locationsResponse = await request.get("/api/panorama/locations");
		// 获取全景图数据
		const panoramasResponse = await request.get("/api/panorama/panoramas");
		// 获取时间机器数据
		const timeMachineResponse = await request.get(`/api/panorama/timemachine/${id}`);

		if (locationsResponse.code === "200" && panoramasResponse.code === "200" && timeMachineResponse.code === "200") {
			const locations = locationsResponse.data || [];
			const panoramas = panoramasResponse.data || [];
			const timeMachineData = timeMachineResponse.data || [];

			// 找到当前地点
			const currentLocation = locations.find((loc) => loc.id === parseInt(id) || loc.location_id === parseInt(id));
			if (!currentLocation) {
				console.error("未找到地点:", id);
				ElMessage.error("未找到对应的地点数据");
				return null;
			}

			// 获取该地点关联的所有全景图
			const locationPanoramas = panoramas.filter((p) => {
				return p.locationId === parseInt(id) || p.location_id === parseInt(id) || (p.location && p.location.id === parseInt(id));
			});

			// 处理时间机器数据 - 从全景图的 timestamp 字段获取时间
			const timePeriods = [];

			// 优先使用全景图数据构建时间段
			if (locationPanoramas.length > 0) {
				for (const panorama of locationPanoramas) {
					// 获取全景图的 timestamp 字段
					const timestamp = panorama.timestamp || panorama.shootTime || panorama.shoot_time || panorama.createdAt || panorama.created_at;

					const panoramaImage = buildImageUrl(panorama.panoramaImage || panorama.panorama_image);
					const thumbnail = buildImageUrl(panorama.thumbnail);

					// 获取该全景图的预览图片
					let previewImages = panorama.preview_images || panorama.previewImages || [];

					// 如果没有预览图片，使用地点信息中的预览图片
					if (previewImages.length === 0 && currentLocation.images) {
						previewImages = currentLocation.images;
					}

					// 如果还是没有预览图片，使用缩略图作为预览
					if (previewImages.length === 0 && thumbnail) {
						previewImages = [thumbnail];
					}

					// 处理预览图片URL
					const validPreviewImages = previewImages.map((img) => buildImageUrl(img)).filter((img) => img !== null);

					// 获取第一个可用的图片作为全景图
					const validPanoramaImage = panoramaImage || thumbnail || (validPreviewImages.length > 0 ? validPreviewImages[0] : null);

					// 使用 timestamp 生成时间标签
					const timeLabel = generateTimeLabel(timestamp);

					timePeriods.push({
						id: `panorama_${panorama.id}`,
						label: timeLabel,
						panoramaId: panorama.id,
						timestamp: timestamp, // 保存原始 timestamp
						images: validPreviewImages,
						description: panorama.description || currentLocation.description,
						address: panorama.locationName || currentLocation.address,
						panoramaImage: validPanoramaImage,
						thumbnail: thumbnail,
					});
				}
			}
			// 如果没有全景图数据，使用时间机器数据
			else if (timeMachineData.length > 0) {
				for (const tmd of timeMachineData) {
					// 从时间机器数据中获取关联的全景图信息
					let timestamp = tmd.timestamp;

					// 如果时间机器数据有 panoramaId，尝试从全景图中获取 timestamp
					if (tmd.panoramaId) {
						const relatedPanorama = panoramas.find((p) => p.id === tmd.panoramaId);
						if (relatedPanorama && relatedPanorama.timestamp) {
							timestamp = relatedPanorama.timestamp;
						}
					}

					// 全景图
					const panoramaImage = buildImageUrl(tmd.panoramaImage || tmd.panorama_image);
					// 缩略图
					const thumbnail = buildImageUrl(tmd.thumbnail);

					// 预览图片 - 直接从时间机器数据中获取
					let previewImages = tmd.images || [];

					// 如果没有预览图片，尝试获取全景图的预览图片
					if (previewImages.length === 0 && tmd.panoramaId) {
						previewImages = await getPanoramaPreviews(tmd.panoramaId);
					}

					// 处理预览图片URL
					const validPreviewImages = previewImages.map((img) => buildImageUrl(img)).filter((img) => img !== null);

					// 获取第一个可用的图片作为全景图
					const validPanoramaImage = panoramaImage || thumbnail || (validPreviewImages.length > 0 ? validPreviewImages[0] : null);

					// 如果有 year 和 month 字段，构建时间戳
					if (!timestamp && tmd.year && tmd.month) {
						timestamp = `${tmd.year}-${tmd.month.toString().padStart(2, "0")}-01 00:00:00`;
					}

					// 使用 timestamp 生成时间标签，如果没有则使用原始 label
					const timeLabel = timestamp ? generateTimeLabel(timestamp) : tmd.label;

					timePeriods.push({
						id: tmd.id || tmd.time_machine_id,
						label: timeLabel,
						panoramaId: tmd.panoramaId,
						timestamp: timestamp,
						images: validPreviewImages,
						description: tmd.description,
						address: tmd.address,
						panoramaImage: validPanoramaImage,
						thumbnail: thumbnail,
					});
				}
			}

			// 如果没有时间段数据，创建一个默认的
			if (timePeriods.length === 0) {
				// 尝试从地点信息中获取图片
				let panoramaImage = null;
				let thumbnail = null;
				let timestamp = null;

				// 如果地点有全景图信息
				if (currentLocation.panorama) {
					panoramaImage = buildImageUrl(currentLocation.panorama.panorama_image || currentLocation.panorama.panoramaImage);
					thumbnail = buildImageUrl(currentLocation.panorama.thumbnail);
					timestamp = currentLocation.panorama.timestamp || currentLocation.panorama.shootTime;
				}

				// 使用地点信息中的预览图片
				const previewImages = currentLocation.preview_images || currentLocation.previewImages || [];
				const validPreviewImages = previewImages.map((img) => buildImageUrl(img)).filter((img) => img !== null);

				// 如果没有可用的图片，创建一个占位提示
				if (!panoramaImage && !thumbnail && validPreviewImages.length === 0) {
					timePeriods.push({
						id: "no_data",
						label: "暂无数据",
						panoramaId: null,
						timestamp: null,
						images: [],
						description: currentLocation.description || "该地点暂无全景图数据",
						address: currentLocation.address,
						panoramaImage: null,
						thumbnail: null,
					});
				} else {
					// 使用第一个可用的图片作为全景图
					const firstImage = panoramaImage || thumbnail || (validPreviewImages.length > 0 ? validPreviewImages[0] : null);

					timePeriods.push({
						id: "default",
						label: timestamp ? generateTimeLabel(timestamp) : "默认视图",
						panoramaId: null,
						timestamp: timestamp || new Date().toISOString(),
						images: validPreviewImages,
						description: currentLocation.description,
						address: currentLocation.address,
						panoramaImage: firstImage,
						thumbnail: thumbnail || firstImage,
					});
				}
			}

			// 按时间戳排序（最新的在前面）
			timePeriods.sort((a, b) => {
				if (!a.timestamp) return 1;
				if (!b.timestamp) return -1;
				return new Date(b.timestamp.replace(" ", "T")) - new Date(a.timestamp.replace(" ", "T"));
			});

			// 构建返回数据
			const result = {
				...currentLocation,
				timePeriods,
				// 确保重要字段存在
				name: currentLocation.name || "未知地点",
				description: currentLocation.description || "",
				address: currentLocation.address || "",
			};

			return result;
		}
		return null;
	} catch (error) {
		console.error("加载地点数据失败:", error);
		ElMessage.error("加载地点数据失败: " + error.message);
		return null;
	} finally {
		loading.value = false;
	}
};

// 创建纯色占位符图片
const createPlaceholderImage = (text) => {
	const canvas = document.createElement("canvas");
	canvas.width = 2048;
	canvas.height = 1024;
	const ctx = canvas.getContext("2d");

	// 创建渐变背景
	const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	gradient.addColorStop(0, "#1a237e");
	gradient.addColorStop(1, "#283593");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// 添加文字
	ctx.fillStyle = "white";
	ctx.font = "bold 80px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text || "暂无全景图", canvas.width / 2, canvas.height / 2);

	return canvas.toDataURL("image/jpeg");
};

// 尝试使用备用图片
const tryUseFallbackImage = async () => {
	// 尝试使用缩略图
	if (currentTimePeriod.value?.thumbnail) {
		const thumbnailUrl = buildImageUrl(currentTimePeriod.value.thumbnail);
		if (thumbnailUrl) {
			const isValid = await validateImageUrl(thumbnailUrl);
			if (isValid) {
				setTimeout(() => {
					viewer.value
						.setPanorama(thumbnailUrl, {
							caption: `${locationData.value.name} - 缩略图视图`,
						})
						.then(() => {
							ElMessage.warning("正在使用缩略图模式");
						})
						.catch((thumbError) => {
							console.error("缩略图也加载失败:", thumbError);
							showNoImagePlaceholder();
						});
				}, 1000);
				return;
			}
		}
	}

	// 尝试使用预览图
	if (currentTimePeriod.value?.images?.length > 0) {
		const firstPreview = buildImageUrl(currentTimePeriod.value.images[0]);
		if (firstPreview) {
			const isValid = await validateImageUrl(firstPreview);
			if (isValid) {
				viewer.value
					.setPanorama(firstPreview, {
						caption: `${locationData.value.name} - 预览图模式`,
					})
					.then(() => {
						ElMessage.warning("正在使用预览图模式");
					})
					.catch((previewError) => {
						console.error("预览图也加载失败:", previewError);
						showNoImagePlaceholder();
					});
				return;
			}
		}
	}

	// 所有备用方案都失败，显示占位符
	showNoImagePlaceholder();
};

// 显示无图片占位符
const showNoImagePlaceholder = () => {
	if (!viewer.value) {
		console.log("创建新的viewer显示占位符");
		// 创建简单的占位符viewer
		const placeholderUrl = createPlaceholderImage(locationData.value?.name || "暂无数据");

		if (panoRef.value) {
			try {
				const tempViewer = new Viewer({
					container: panoRef.value,
					panorama: placeholderUrl,
					size: { width: "100%", height: "100%" },
					caption: `${locationData.value?.name || "未知地点"} - 暂无全景图数据`,
				});

				ElMessage.warning("该地点暂无全景图数据");

				// 立即销毁这个临时viewer
				setTimeout(() => {
					try {
						tempViewer.destroy();
					} catch (e) {
						console.warn("销毁临时viewer失败:", e);
					}
				}, 100);
			} catch (error) {
				console.error("创建占位符viewer失败:", error);
				// 显示纯文本提示
				panoRef.value.innerHTML = `
					<div style="
						width: 100%;
						height: 100%;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						background: linear-gradient(135deg, #1a237e, #283593);
						color: white;
						text-align: center;
						padding: 20px;
					">
						<h1 style="font-size: 48px; margin-bottom: 20px;">⚠️</h1>
						<h2 style="font-size: 24px; margin-bottom: 10px;">无法加载全景图</h2>
						<p style="font-size: 16px; opacity: 0.8; margin-bottom: 20px;">
							抱歉，无法加载该地点的全景图数据。
						</p>
						<p style="font-size: 14px; opacity: 0.6;">
							地点: ${locationData.value?.name || "未知"}
						</p>
					</div>
				`;
			}
		}
		return;
	}

	// 如果viewer已存在，更新图片
	const placeholderUrl = createPlaceholderImage(locationData.value?.name || "暂无数据");

	try {
		viewer.value
			.setPanorama(placeholderUrl, {
				caption: `${locationData.value?.name || "未知地点"} - 暂无全景图数据`,
			})
			.then(() => {
				ElMessage.warning("该地点暂无全景图数据");
			})
			.catch((finalError) => {
				console.error("占位符加载失败:", finalError);
				// 显示纯文本提示
				if (panoRef.value) {
					panoRef.value.innerHTML = `
					<div style="
						width: 100%;
						height: 100%;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						background: linear-gradient(135deg, #1a237e, #283593);
						color: white;
						text-align: center;
						padding: 20px;
					">
						<h1 style="font-size: 48px; margin-bottom: 20px;">⚠️</h1>
						<h2 style="font-size: 24px; margin-bottom: 10px;">无法加载全景图</h2>
						<p style="font-size: 16px; opacity: 0.8; margin-bottom: 20px;">
							抱歉，无法加载该地点的全景图数据。
						</p>
						<p style="font-size: 14px; opacity: 0.6;">
							地点: ${locationData.value?.name || "未知"}
						</p>
					</div>
				`;
				}
			});
	} catch (error) {
		console.error("设置占位符时发生错误:", error);
	}
};

// 加载地点数据并预加载图片
const loadLocationData = async () => {
	const id = route.params.id;
	const data = await getLocationData(id);

	if (!data) {
		ElMessage.error("未找到对应的全景图数据");
		goBack();
		return;
	}

	locationData.value = data;

	// 默认选择最新的时间段（第一个）
	if (data.timePeriods && data.timePeriods.length > 0) {
		selectedTimePeriod.value = data.timePeriods[0].id;
		currentTimePeriod.value = data.timePeriods[0];
	}

	// 预加载图片
	imageLoading.value = true;
	try {
		const allImageUrls = [];
		data.timePeriods?.forEach((period) => {
			if (period.panoramaImage) allImageUrls.push(period.panoramaImage);
			if (period.thumbnail) allImageUrls.push(period.thumbnail);
			period.images?.forEach((img) => allImageUrls.push(img));
		});

		const uniqueUrls = [...new Set(allImageUrls.filter((url) => url))];
		const results = await preloadImages(uniqueUrls);

		const failedUrls = results.filter((r) => r.status === "error").map((r) => r.url);
		if (failedUrls.length > 0) {
			console.warn("以下图片预加载失败:", failedUrls);
		}
	} catch (error) {
		console.error("图片预加载失败:", error);
	} finally {
		imageLoading.value = false;
	}
};

// 初始化全景图 - v4.x 版本（简化版）
const initPanorama = async () => {
	await loadLocationData();

	// 确保DOM已渲染
	setTimeout(async () => {
		if (panoRef.value && currentTimePeriod.value) {
			// 显示加载状态
			const loadingInstance = ElLoading.service({
				target: panoRef.value,
				text: "正在加载全景图...",
				background: "rgba(0, 0, 0, 0.7)",
			});

			try {
				// 获取有效的全景图URL
				let panoramaUrl = await getValidImageUrl(currentTimePeriod.value.panoramaImage);

				// 验证图片是否可用
				let isValid = false;
				if (panoramaUrl) {
					isValid = await validateImageUrl(panoramaUrl);
				}

				// 如果没有有效的URL，尝试使用缩略图
				if (!panoramaUrl || !isValid) {
					const thumbnailUrl = await getValidImageUrl(currentTimePeriod.value.thumbnail);
					if (thumbnailUrl) {
						const thumbIsValid = await validateImageUrl(thumbnailUrl);
						if (thumbIsValid) {
							panoramaUrl = thumbnailUrl;
							ElMessage.warning("正在使用缩略图作为全景图");
						}
					}
				}

				// 如果仍然没有URL，显示错误
				if (!panoramaUrl) {
					throw new Error("没有可用的全景图");
				}

				// v4.x 配置选项（简化版，避免不兼容问题）
				const v4Options = {
					container: panoRef.value,
					panorama: panoramaUrl,
					size: { width: "100%", height: "100%" },
					caption: `地点: ${locationData.value?.name || "未知"} | ${currentTimePeriod.value?.label || "默认"} | 拍摄时间: ${formatTimestamp(
						currentTimePeriod.value?.timestamp
					)}`,

					// 初始视角 - v4.x 使用 defaultLong/defaultLat
					defaultLong: 0,
					defaultLat: 0,
					defaultZoomLvl: 50,

					// 视野范围
					minFov: 30,
					maxFov: 100,

					// 自动旋转（可选）
					autorotateDelay: 3000,
					autorotateSpeed: "1rpm",

					// 导航栏（简化）
					navbar: ["autorotate", "zoom", "move", "download", "caption", "fullscreen"],
				};

				// 清理旧的 viewer 和事件监听器
				cleanup();

				// 初始化 viewer
				viewer.value = new Viewer(v4Options);

				// 定义事件处理函数
				const onReady = () => {
					loadingInstance.close();
					ElMessage.success("全景图加载完成");
				};

				const onLoadError = (e) => {
					loadingInstance.close();
					console.error("全景图加载错误:", e);
					ElMessage.error("全景图加载失败");

					// 尝试使用备用图片
					tryUseFallbackImage();
				};

				// 存储事件监听器的引用
				viewerEvents.value = [
					["ready", onReady],
					["load-error", onLoadError],
				];

				// 设置事件监听器 - v4.x 使用 on 方法
				viewerEvents.value.forEach(([event, handler]) => {
					viewer.value.on(event, handler);
				});
			} catch (error) {
				loadingInstance.close();
				console.error("初始化全景图查看器失败:", error);
				ElMessage.error("初始化失败：" + error.message);

				// 显示错误提示
				showNoImagePlaceholder();
			}
		}
	}, 100);
};

// 时间段变化处理 - v4.x 版本
const onTimePeriodChange = async (periodId) => {
	if (!locationData.value || !locationData.value.timePeriods || isChangingPeriod.value) return;

	// 找到选择的时间段
	const period = locationData.value.timePeriods.find((p) => p.id === periodId);
	if (!period) return;

	// 设置加载状态
	isChangingPeriod.value = true;

	// 添加过渡效果
	setTimeout(async () => {
		currentTimePeriod.value = period;
		selectedTimePeriod.value = periodId;

		// 如果这个时间段没有预览图片，尝试获取
		if ((!period.images || period.images.length === 0) && period.panoramaId) {
			const previews = await getPanoramaPreviews(period.panoramaId);
			if (previews.length > 0) {
				period.images = previews.map((img) => buildImageUrl(img)).filter((img) => img !== null);
			}
		}

		// 验证全景图 URL 是否有效
		let panoramaUrl = await getValidImageUrl(period.panoramaImage);
		let isValid = false;

		if (panoramaUrl) {
			isValid = await validateImageUrl(panoramaUrl);
		}

		// 如果全景图无效，尝试使用缩略图
		if (!panoramaUrl || !isValid) {
			console.log("全景图URL无效，尝试使用缩略图");
			const thumbnailUrl = await getValidImageUrl(period.thumbnail);
			if (thumbnailUrl) {
				const thumbIsValid = await validateImageUrl(thumbnailUrl);
				if (thumbIsValid) {
					panoramaUrl = thumbnailUrl;
				}
			}
		}

		// 更新全景图
		if (viewer.value && panoramaUrl) {
			try {
				const loadingInstance = ElLoading.service({
					target: panoRef.value,
					text: "正在切换全景图...",
					background: "rgba(0, 0, 0, 0.7)",
				});

				await viewer.value.setPanorama(panoramaUrl, {
					transition: true,
					transitionDuration: 1000,
					caption: `地点: ${locationData.value.name} | ${period.label} | 拍摄时间: ${formatTimestamp(period.timestamp)}`,
				});

				loadingInstance.close();
				ElMessage.success(`已切换到 ${period.label}（${formatTimestamp(period.timestamp)}）`);
			} catch (error) {
				console.error("切换全景图失败:", error);
				ElMessage.error("切换全景图失败");
			}
		}

		// 重置加载状态
		setTimeout(() => {
			isChangingPeriod.value = false;
		}, 500);
	}, 300);
};

// 获取预览图片标题
const getPreviewImageTitle = (index) => {
	if (!currentTimePeriod.value?.panoramaId) return `预览图 ${index + 1}`;
	return `全景图 ${currentTimePeriod.value.panoramaId} - 预览图 ${index + 1}`;
};

// 查看图片详情
const viewImageDetail = async (image) => {
	selectedImage.value = image;
	selectedImageIndex.value = currentTimePeriod.value?.images?.indexOf(image) || -1;

	// 获取图片详细信息
	selectedImageInfo.value = await getPreviewImageInfo(image, selectedImageIndex.value);
	showImageDialog.value = true;
};

// 下载图片
const downloadImage = () => {
	if (!selectedImage.value) return;

	const link = document.createElement("a");
	link.href = selectedImage.value;
	link.download = selectedImageInfo.value?.filename || `preview_${Date.now()}.jpg`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	ElMessage.success("图片下载开始");
};

// 切换预览面板显示/隐藏
const togglePanelCount = ref(0);

const togglePreviewPanel = () => {
  showPreviewPanel.value = !showPreviewPanel.value;

  // 首次切换时显示提示
  if (togglePanelCount.value === 0) {
    ElMessage.info({
      message: '提示：双击全景图区域可切换预览面板',
      duration: 3000,
    });
    togglePanelCount.value++;
  }
};

// 返回上一页
const goBack = () => {
	router.go(-1);
};

// 刷新视图 - v4.x 版本
const refreshView = () => {
	if (viewer.value) {
		// v4.x 方法
		viewer.value.rotate({
			longitude: 0,
			latitude: 0,
			speed: "10rpm",
		});

		// 重置缩放
		if (viewer.value.setZoomLevel) {
			viewer.value.setZoomLevel(50);
		}

		ElMessage.success("视图已重置");
	}
};

// 打开搜索对话框
const openSearch = () => {
	showSearchDialog.value = true;
};

// 处理搜索
const handleSearch = () => {
	if (!searchKeyword.value.trim()) {
		ElMessage.warning("请输入搜索关键词");
		return;
	}

	ElMessage.success({ message: `搜索: ${searchKeyword.value}`, duration: 1500 });
	showSearchDialog.value = false;

	// 跳转到主页面并传递搜索参数
	router.push({
		name: "PanoramaHome",
		query: { search: searchKeyword.value },
	});
};

// 格式化文件大小
const formatFileSize = (bytes) => {
	if (!bytes) return "未知";
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 组件卸载时清理资源 - v4.x 版本
const cleanup = () => {
	if (viewer.value) {
		try {
			console.log("开始销毁 v4.x 全景图查看器...");

			// 先移除事件监听器
			if (viewerEvents.value.length > 0) {
				viewerEvents.value.forEach(([event, handler]) => {
					try {
						viewer.value.off(event, handler);
					} catch (e) {
						console.warn(`移除 ${event} 事件监听器失败:`, e);
					}
				});
				viewerEvents.value = [];
			}

			// 停止自动旋转
			if (viewer.value.autorotate) {
				try {
					viewer.value.stopAutorotate();
				} catch (e) {
					console.warn("停止自动旋转失败:", e);
				}
			}

			// 清空容器内容
			if (panoRef.value && viewer.value.container) {
				try {
					// 先移除事件监听器
					const container = viewer.value.container;
					container.innerHTML = "";
				} catch (e) {
					console.warn("清空容器失败:", e);
				}
			}

			// 销毁查看器
			setTimeout(() => {
				try {
					viewer.value.destroy();
					console.log("v4.x 全景图查看器销毁成功");
				} catch (destroyError) {
					console.warn("destroy方法失败，尝试手动清理:", destroyError);

					// 手动清理关键属性
					if (viewer.value) {
						// 移除关键事件处理器
						const keysToClear = ["container", "renderer", "tooltip", "navbar", "loader", "events", "observer", "autorotate"];

						keysToClear.forEach((key) => {
							if (viewer.value[key]) {
								try {
									if (typeof viewer.value[key].destroy === "function") {
										viewer.value[key].destroy();
									}
									viewer.value[key] = null;
								} catch (e) {
									console.warn(`清理 ${key} 失败:`, e);
								}
							}
						});
					}
				}
			}, 100);
		} catch (e) {
			console.warn("销毁 v4.x 全景图查看器失败:", e);
		} finally {
			// 确保 viewer 引用被清理
			viewer.value = null;
		}
	}
};

// 添加路由离开守卫
onBeforeRouteLeave((to, from, next) => {
	console.log("路由离开，清理全景图资源");
	cleanup();
	// 添加延迟确保清理完成
	setTimeout(() => {
		next();
	}, 50);
});

// 监听路由参数变化
watch(
	() => route.params.id,
	async (newId) => {
		if (newId) {
			console.log("路由参数变化，重新初始化全景图");
			// 先清理旧的 viewer
			cleanup();
			// 清空预览图片缓存
			previewImageInfoMap.value = {};
			// 添加短暂延迟确保 DOM 更新
			setTimeout(async () => {
				await initPanorama();
			}, 150);
		}
	}
);

onMounted(() => {
	console.log("全景图组件挂载");
	initPanorama();
});

// 组件卸载时清理
onUnmounted(() => {
	console.log("全景图组件卸载，执行清理");
	cleanup();
	// 强制清理可能的残留元素
	if (panoRef.value) {
		panoRef.value.innerHTML = "";
	}
});
</script>

<style scoped>
.panorama-view-container {
	position: relative;
	width: 100%;
	height: 100vh;
	overflow: hidden;
	background: #000;
}

.panorama-container {
	width: 100%;
	height: 100%;
}

.back-button {
	position: absolute;
	top: 20px;
	left: 20px;
	display: flex;
	align-items: center;
	gap: 5px;
	padding: 8px 16px;
	background-color: rgba(0, 0, 0, 0.7);
	color: white;
	border-radius: 4px;
	cursor: pointer;
	z-index: 100;
	transition: all 0.3s;
	border: 1px solid rgba(255, 255, 255, 0.2);
}

.back-button:hover {
	background-color: rgba(0, 0, 0, 0.9);
	transform: translateY(-1px);
}

.preview-panel {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	max-height: 50vh;
	background: transparent;
	color: white;
	padding: 20px;
	overflow-y: auto;
	z-index: 50;
	transition: all 0.3s ease;
	backdrop-filter: none;
}

.preview-panel.changing {
	opacity: 1;
}

.location-info {
	margin-bottom: 20px;
	padding-bottom: 15px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.location-name {
	font-size: 20px;
	font-weight: bold;
	margin-bottom: 8px;
	color: #fff;
}

.location-description {
	font-size: 14px;
	opacity: 0.9;
	margin-bottom: 8px;
	line-height: 1.4;
}

.location-address {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	opacity: 0.7;
}

.preview-images {
	margin-bottom: 20px;
}

.preview-title {
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 12px;
	color: #409eff;
}

.preview-tips {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	opacity: 0.7;
	margin-top: 8px;
	color: #e6a23c;
}

.image-gallery {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 10px;
	max-height: 150px;
	overflow-y: auto;
	overflow-x: hidden;
	transition: all 0.3s ease;
	width: 100%;
	padding: 5px;
}

.image-gallery.changing {
	opacity: 0.5;
}

.preview-image {
	width: 100%;
	height: 80px;
	background-size: cover;
	background-position: center;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.3s;
	border: 2px solid transparent;
	position: relative;
}

.preview-image:hover {
	transform: scale(1.05);
	border-color: #409eff;
	box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.time-machine {
	margin-top: 20px;
	transition: all 0.3s ease;
	padding-bottom: 30px;
}

.time-machine.changing {
	opacity: 0.7;
	transform: scale(0.98);
}

.time-machine-title {
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 12px;
	color: #e6a23c;
	display: flex;
	align-items: center;
	gap: 8px;
}

.time-tabs {
	display: flex;
	gap: 10px;
	padding: 8px 0;
	overflow-x: auto;
	scrollbar-width: thin;
}

.time-tabs.horizontal-scroll::-webkit-scrollbar {
	height: 6px;
}
.time-tabs.horizontal-scroll::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.25);
	border-radius: 3px;
}

.time-tab {
	min-width: 120px;
	padding: 10px 14px;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.15);
	border-radius: 10px;
	cursor: pointer;
	transition: all 0.2s ease;
	display: flex;
	flex-direction: column;
	gap: 4px;
	color: #e8ecff;
}

.time-tab .tab-label {
	font-weight: 600;
	font-size: 14px;
	line-height: 1.2;
}
.time-tab .tab-sub {
	font-size: 12px;
	opacity: 0.75;
}

.time-tab:hover {
	transform: translateY(-2px);
	border-color: rgba(64, 158, 255, 0.5);
	box-shadow: 0 6px 18px rgba(64, 158, 255, 0.25);
}

.time-tab.active {
	color: #fff;
	background-color: rgba(64, 158, 255, 0.5);
}

.time-machine.changing .time-tab {
	opacity: 0.6;
	pointer-events: none;
}

.time-label {
	font-weight: 500;
}

.preview-count {
	font-size: 12px;
	opacity: 0.7;
}

.time-machine-info {
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
	font-size: 13px;
	opacity: 0.9;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item {
	display: flex;
	align-items: center;
	gap: 6px;
	background: rgba(255, 255, 255, 0.05);
	padding: 6px 12px;
	border-radius: 6px;
}

.info-item .el-icon {
	color: #409eff;
}

/* 单个时间段信息样式 */
.single-time-info {
	margin-top: 20px;
	background: rgba(0, 0, 0, 0.3);
	border-radius: 12px;
	padding: 15px;
}

.time-info-title {
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 12px;
	color: #67c23a;
	display: flex;
	align-items: center;
	gap: 8px;
}

.time-info-content {
	display: flex;
	flex-wrap: wrap;
	gap: 15px;
}

.function-bar {
	position: absolute;
	top: 20px;
	right: 20px;
	display: flex;
	gap: 10px;
	z-index: 100;
}

.function-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	background: rgba(0, 0, 0, 0.1);
	color: white;
	border-radius: 50%;
	cursor: pointer;
	transition: all 0.3s;
	border: 1px solid rgba(255, 255, 255, 0.2);
	padding: 4px;
}

.function-item:hover {
	background: rgba(0, 0, 0, 0.9);
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.function-item span {
	font-size: 10px;
	margin-top: 2px;
}

.detail-image {
	width: 100%;
	max-height: 60vh;
	object-fit: contain;
	border-radius: 8px;
}

.image-detail-container {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.image-info {
	background: #f5f5f5;
	padding: 15px;
	border-radius: 6px;
}

.image-info p {
	margin: 5px 0;
	font-size: 14px;
}

.loading-overlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.8);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: white;
	z-index: 1000;
}

.loading-icon {
	font-size: 40px;
	margin-bottom: 10px;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.no-data {
	text-align: center;
	padding: 40px 0;
}

/* 滚动条样式 */
.image-gallery::-webkit-scrollbar {
	width: 6px;
	height: 6px;
}

.image-gallery::-webkit-scrollbar-track {
	background: rgba(255, 255, 255, 0.1);
	border-radius: 3px;
}

.image-gallery::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.3);
	border-radius: 3px;
}

.image-gallery::-webkit-scrollbar-thumb:hover {
	background: rgba(255, 255, 255, 0.5);
}

.time-tabs::-webkit-scrollbar {
	height: 4px;
}

.time-tabs::-webkit-scrollbar-track {
	background: rgba(255, 255, 255, 0.1);
	border-radius: 2px;
}

.time-tabs::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.3);
	border-radius: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
	.preview-panel {
		padding: 15px;
		max-height: 60vh;
	}

	.image-gallery {
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		max-height: 120px;
	}

	.preview-image {
		height: 60px;
	}

	.function-bar {
		bottom: 10px;
		right: 10px;
	}

	.function-item {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}

	.time-tab {
		padding: 6px 12px;
		font-size: 12px;
	}

	.location-name {
		font-size: 18px;
	}

	.time-machine-info {
		flex-direction: column;
		gap: 10px;
	}

	.info-item {
		font-size: 12px;
	}
}

@media (max-width: 480px) {
	.back-button {
		top: 10px;
		left: 10px;
		padding: 6px 12px;
		font-size: 14px;
	}

	.preview-panel {
		padding: 10px;
		max-height: 70vh;
	}

	.function-bar {
		flex-direction: row;
		bottom: 10px;
		right: 50%;
		transform: translateX(50%);
		gap: 5px;
	}

	.function-item {
		width: 35px;
		height: 35px;
		border-radius: 50%;
	}

	.function-item span {
		font-size: 10px;
	}
}

/* 自定义热点样式 */
:deep(.psv-marker) {
	cursor: pointer;
}

:deep(.psv-tooltip) {
	background: rgba(0, 0, 0, 0.8);
	color: white;
	border-radius: 4px;
	padding: 8px 12px;
	font-size: 14px;
	max-width: 200px;
}

/* 导航栏样式 */
:deep(.psv-navbar) {
	background: rgba(0, 0, 0, 0.7);
	backdrop-filter: blur(10px);
}

:deep(.psv-button) {
	color: white;
	transition: all 0.3s;
}

:deep(.psv-button:hover) {
	background: rgba(255, 255, 255, 0.1);
}
</style>
