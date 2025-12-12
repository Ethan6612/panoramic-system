<template>
	<div class="location-info-panel">
		<div class="panel-header">
			<h3 class="location-name">{{ location.name }}</h3>
			<el-icon class="close-icon" @click="handleClose">
				<Close />
			</el-icon>
		</div>

		<div class="panel-content" v-loading="loading">
			<!-- 评分 -->
			<div class="rating-section">
				<el-rate v-model="rating" disabled show-score text-color="#ff9900" score-template="{value} 分" />
			</div>

			<!-- 分类标签 -->
			<div class="category-section">
				<el-tag type="info" size="small">{{ location.category }}</el-tag>
			</div>

			<!-- 图片展示 -->
			<div class="images-section" v-if="previewImages.length > 0">
				<div class="images-title">地点预览图</div>
				<div class="images-grid">
					<div v-for="(image, index) in previewImages" :key="index" class="image-item" @click="showImagePreview(image, index)">
						<el-image :src="loadImage(image)" fit="cover" lazy class="location-image" />
					</div>
				</div>
			</div>

			<!-- 无图片提示 -->
			<div class="no-images" v-else>
				<el-empty description="暂无预览图片" :image-size="100" />
			</div>

			<!-- 文字介绍 -->
			<div class="description-section" v-if="location.description">
				<div class="description-title">地点介绍</div>
				<div class="description-content">{{ location.description }}</div>
			</div>

			<!-- 统计信息 -->
			<div class="stats-section" v-if="panoramaCount > 0">
				<el-descriptions :column="1" size="small" border>
					<el-descriptions-item label="全景图数量">
						<el-tag type="success" size="small">{{ panoramaCount }} 个</el-tag>
					</el-descriptions-item>
					<el-descriptions-item label="创建时间">
						{{ formatDate(location?.panorama?.shoot_time) }}
					</el-descriptions-item>
					<el-descriptions-item label="坐标位置"> {{ location.longitude.toFixed(6) }}, {{ location.latitude.toFixed(6) }} </el-descriptions-item>
				</el-descriptions>
			</div>
		</div>

		<!-- 图片预览对话框 -->
		<el-dialog v-model="imagePreviewVisible" :title="`${location.name} - 图片预览`" width="80%" center>
			<el-carousel :initial-index="previewIndex" height="500px" v-if="previewImages.length > 0">
				<el-carousel-item v-for="(image, index) in previewImages" :key="index">
					<el-image :src="loadImage(image)" fit="contain" style="width: 100%; height: 100%" />
				</el-carousel-item>
			</el-carousel>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { Close } from "@element-plus/icons-vue";
import request from "@/api/request";
import { LocationData } from "@/types/panorama";



interface Props {
	location: LocationData;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	close: [];
	goHere: [location: LocationData];
	startFromHere: [location: LocationData];
}>();

// 响应式数据
const rating = computed(() => props.location.rating || 0);
const loading = ref(false);
const previewImages = ref<string[]>([]);
const panoramaCount = ref(0);
const imagePreviewVisible = ref(false);
const previewIndex = ref(0);

// 图片加载函数
const loadImage = (path: string | number) => {
	if (typeof path === "number" || (typeof path === "string" && /^\d+$/.test(path))) {
		// 如果是数字或纯数字字符串，认为是图片ID
		return `/api/images/${path}`;
	}
	if (typeof path === "string") {
		// 如果是完整URL
		if (path.startsWith("http") || path.startsWith("/api/images/")) {
			return path;
		}
		// 如果是相对路径
		if (path.startsWith("/")) {
			return path;
		}
	}
	// 默认占位图
	return "https://placeholder.im/400x300/connecting/3f51b5/ffffff";
};

// 格式化日期
const formatDate = (dateString?: string) => {
	if (!dateString) return "未知";
	const date = new Date(dateString);
	return date.toLocaleDateString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

// 加载地点的预览图片
const loadLocationPreviewImages = async () => {
	if (!props.location.id) return;

	loading.value = true;
	try {
		// 使用正确的接口获取地点详情（包含预览图片）
		const response = await request.get(`/api/panorama/locations/${props.location.id}`);
		if (response.code === "200" && response.data) {
			const locationData = response.data;

			// 从返回的数据中提取预览图片
			if (locationData.preview_images && Array.isArray(locationData.preview_images)) {
				previewImages.value = locationData.preview_images;
			}

			// 获取全景图数量
			panoramaCount.value = locationData.panorama ? 1 : 0;
		} else if (props.location.preview_images && props.location.preview_images.length > 0) {
			// 如果后端接口不可用，使用props中的图片数据
			previewImages.value = props.location.preview_images;
			panoramaCount.value = props.location.panorama ? 1 : 0;
		}
	} catch (error) {
		console.error("加载预览图片失败:", error);
		// 回退到props中的图片数据
		if (props.location.preview_images && props.location.preview_images.length > 0) {
			previewImages.value = props.location.preview_images;
		}
		panoramaCount.value = props.location.panorama ? 1 : 0;
	} finally {
		loading.value = false;
	}
};

// 显示图片预览
const showImagePreview = (image: string, index: number) => {
	previewIndex.value = index;
	imagePreviewVisible.value = true;
};

const handleClose = () => {
	emit("close");
};

// 监听location变化
watch(
	() => props.location,
	(newLocation) => {
		if (newLocation && newLocation.id) {
			loadLocationPreviewImages();
		}
	},
	{ immediate: true }
);

// 组件挂载时加载数据
onMounted(() => {
	if (props.location && props.location.id) {
		loadLocationPreviewImages();
	}
});
</script>

<style scoped>
.location-info-panel {
	position: absolute;
	right: 0;
	top: 60px;
	width: 380px;
	height: calc(100vh - 60px);
	background: white;
	box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
	z-index: 999;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.panel-header {
	padding: 20px;
	border-bottom: 1px solid #eee;
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #f8f9fa;
}

.location-name {
	margin: 0;
	font-size: 18px;
	font-weight: 600;
	color: #333;
	flex: 1;
}

.close-icon {
	cursor: pointer;
	font-size: 20px;
	color: #999;
	transition: color 0.2s;
}

.close-icon:hover {
	color: #333;
}

.panel-content {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
}

.rating-section {
	margin-bottom: 15px;
}

.category-section {
	margin-bottom: 15px;
}

.images-section {
	margin-bottom: 20px;
}

.images-title {
	font-size: 16px;
	font-weight: 600;
	margin-bottom: 10px;
	color: #333;
}

.images-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px;
}

.image-item {
	cursor: pointer;
	border-radius: 8px;
	overflow: hidden;
	transition: transform 0.2s;
}

.image-item:hover {
	transform: scale(1.05);
}

.location-image {
	width: 100%;
	height: 120px;
	border-radius: 8px;
}

.no-images {
	margin: 20px 0;
	text-align: center;
}

.description-section {
	margin-bottom: 20px;
}

.description-title {
	font-size: 16px;
	font-weight: 600;
	margin-bottom: 10px;
	color: #333;
}

.description-content {
	font-size: 14px;
	line-height: 1.6;
	color: #666;
	text-align: left;
	word-wrap: break-word;
	word-break: break-all;
	white-space: pre-wrap;
}

.address-section {
	display: flex;
	align-items: center;
	padding: 10px;
	background: #f8f9fa;
	border-radius: 8px;
	font-size: 14px;
	color: #666;
	margin-bottom: 20px;
}

.address-section .el-icon {
	margin-right: 8px;
	color: #409eff;
}

.stats-section {
	margin-top: 20px;
	padding-top: 20px;
	border-top: 1px solid #eee;
}
</style>
