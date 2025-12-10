<template>
	<div class="panorama-view-container">
		<!-- 左上角返回按钮 -->
		<div class="back-button" @click="goBack">
			<el-icon><ArrowLeft /></el-icon>
			<span>返回</span>
		</div>

		<!-- 全景图容器 -->
		<div ref="panoRef" class="panorama-container" @click="togglePreviewPanel"></div>

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
						:title="getPreviewImageTitle(index)">
					</div>
				</div>
				<div class="preview-tips" v-if="currentTimePeriod.images.length > 0">
					<el-icon><InfoFilled /></el-icon>
					<span>点击预览图查看详情，当前全景图共有 {{ currentTimePeriod.images.length }} 张预览图</span>
				</div>
			</div>

			<!-- 时光机功能 -->
			<div class="time-machine" :class="{ changing: isChangingPeriod }" v-if="locationData?.timePeriods?.length > 1">
				<div class="time-machine-title">时光机</div>
				<div class="time-tabs">
					<div
						v-for="period in locationData.timePeriods"
						:key="period.id"
						class="time-tab"
						:class="{ active: selectedTimePeriod === period.id }"
						@click="onTimePeriodChange(period.id)">
						{{ period.label }}
						<span class="preview-count" v-if="period.images?.length">({{ period.images.length }})</span>
					</div>
				</div>
				<div class="time-machine-info" v-if="currentTimePeriod">
					<span class="info-item">
						<el-icon><Calendar /></el-icon>
						拍摄时间: {{ formatTime(currentTimePeriod.timestamp) }}
					</span>
					<span class="info-item" v-if="currentTimePeriod.panoramaId">
						<el-icon><Picture /></el-icon>
						全景图ID: {{ currentTimePeriod.panoramaId }}
					</span>
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
			<div class="function-item" @click="zoomIn" title="放大">
				<el-icon><ZoomIn /></el-icon>
				<span>放大</span>
			</div>
			<div class="function-item" @click="zoomOut" title="缩小">
				<el-icon><ZoomOut /></el-icon>
				<span>缩小</span>
			</div>
			<div class="function-item" @click="togglePreviewPanel" title="切换预览面板">
				<el-icon v-if="showPreviewPanel"><Hide /></el-icon>
				<el-icon v-else><View /></el-icon>
				<span>{{ showPreviewPanel ? '隐藏' : '显示' }}</span>
			</div>
			<div class="function-item" @click="openSearch" title="搜索">
				<el-icon><Search /></el-icon>
				<span>搜索</span>
			</div>
			<div class="function-item" @click="loadMorePreviews" title="加载更多预览图" v-if="currentTimePeriod?.panoramaId">
				<el-icon><Plus /></el-icon>
				<span>更多</span>
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
					<p v-if="selectedImageInfo.previewIndex !== undefined">
						<strong>预览图序号:</strong> {{ selectedImageInfo.previewIndex + 1 }}
					</p>
					<p v-if="selectedImageInfo.description">
						<strong>描述:</strong> {{ selectedImageInfo.description }}
					</p>
				</div>
			</div>
			<template #footer>
				<el-button @click="showImageDialog = false">关闭</el-button>
				<el-button type="primary" @click="downloadImage" v-if="selectedImage">
					下载图片
				</el-button>
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
import { 
	ArrowLeft, Refresh, ZoomIn, ZoomOut, Search, 
	Location, Hide, View, Loading, InfoFilled,
	Calendar, Picture, Plus
} from "@element-plus/icons-vue";
import { ElMessage, ElLoading } from "element-plus";
import { Viewer } from "photo-sphere-viewer";
import "photo-sphere-viewer/dist/photo-sphere-viewer.css";
import request from "@/api/request";

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

// 构建图片URL - 优先使用本地图片
const buildImageUrl = (imagePath) => {
	console.log('构建图片URL，原始路径:', imagePath);
	
	if (!imagePath) return null;
	
	// 如果已经是完整URL，检查是否为外部URL
	if (imagePath.startsWith('http')) {
		// 如果是外部URL且有CORS问题，返回null
		if (imagePath.includes('placeholder.im') || imagePath.includes('via.placeholder.com')) {
			console.warn('检测到可能被CORS阻止的外部图片URL:', imagePath);
			return null;
		}
		return imagePath;
	}
	
	// 如果是相对路径（以/api/开头），直接返回（代理会处理）
	if (imagePath.startsWith('/api/')) {
		console.log('返回API路径:', imagePath);
		return imagePath;
	}
	
	// 如果是图片ID，构建相对路径
	if (/^\d+$/.test(imagePath)) {
		const url = `/api/images/${imagePath}`;
		console.log('从ID构建URL:', imagePath, '=>', url);
		return url;
	}
	
	console.warn('无法识别的图片路径格式:', imagePath);
	return null;
};

// 获取有效的图片URL
const getValidImageUrl = async (imageUrl) => {
	if (!imageUrl) {
		console.log('图片URL为空，返回null');
		return null;
	}
	
	const fullUrl = buildImageUrl(imageUrl);
	
	if (!fullUrl) {
		console.log('构建的URL无效，返回null');
		return null;
	}
	
	// 对于本地API图片，直接返回
	return fullUrl;
};

// 图片验证函数
const validateImageUrl = async (url) => {
	if (!url) return false;
	
	console.log('验证图片URL:', url);
	
	try {
		// 对于所有URL都使用Image对象来验证
		return await new Promise((resolve) => {
			const img = new Image();
			
			img.onload = () => {
				console.log('图片验证成功:', url);
				resolve(true);
			};
			
			img.onerror = () => {
				console.log('图片验证失败:', url);
				resolve(false);
			};
			
			img.src = url;
			
			// 设置超时
			setTimeout(() => {
				console.log('图片验证超时:', url);
				resolve(false);
			}, 5000);
		});
	} catch (error) {
		console.error('图片验证异常:', error);
		return false;
	}
};

// 图片预加载函数
const preloadImages = async (urls) => {
	const promises = urls.map(url => {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve({ url, status: 'loaded' });
			img.onerror = () => resolve({ url, status: 'error' });
			img.src = url;
		});
	});
	
	return Promise.all(promises);
};

// 获取全景图的预览图片
const getPanoramaPreviews = async (panoramaId) => {
	try {
		console.log('获取全景图预览图片，panoramaId:', panoramaId);
		const response = await request.get(`/api/panorama/${panoramaId}/previews`);
		
		if (response.code === "200" && response.data) {
			console.log('获取到的预览图片:', response.data);
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
						panoramaId: currentTimePeriod.value?.panoramaId
					};
					// 缓存信息
					previewImageInfoMap.value[cacheKey] = info;
					return info;
				}
			} catch (apiError) {
				console.log('图片信息API不可用，返回基本信息');
			}
			
			// 如果API不可用，返回基本信息
			const basicInfo = {
				filename: `preview_${imageId}_${index + 1}.jpg`,
				fileSize: 0,
				imageType: 'preview',
				createdAt: new Date().toLocaleString(),
				previewIndex: index,
				panoramaId: currentTimePeriod.value?.panoramaId,
				description: `全景图预览图片 ${index + 1}`
			};
			previewImageInfoMap.value[cacheKey] = basicInfo;
			return basicInfo;
		}
		
		// 如果不是本地图片，返回基本信息
		return {
			filename: imageUrl.split('/').pop() || 'preview_image.jpg',
			fileSize: 0,
			imageType: 'preview',
			createdAt: new Date().toLocaleString(),
			previewIndex: index,
			panoramaId: currentTimePeriod.value?.panoramaId,
			description: `预览图片 ${index + 1}`
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
		console.log('开始加载地点数据，ID:', id);
		
		// 获取地点基本信息
		const locationsResponse = await request.get("/api/panorama/locations");
		// 获取全景图数据
		const panoramasResponse = await request.get("/api/panorama/panoramas");
		// 获取时间机器数据
		const timeMachineResponse = await request.get(`/api/panorama/timemachine/${id}`);
		
		console.log('API响应:', {
			locations: locationsResponse,
			panoramas: panoramasResponse, 
			timeMachine: timeMachineResponse
		});
		
		if (locationsResponse.code === "200" && panoramasResponse.code === "200" && timeMachineResponse.code === "200") {
			const locations = locationsResponse.data || [];
			const panoramas = panoramasResponse.data || [];
			const timeMachineData = timeMachineResponse.data || [];
			
			console.log('解析的数据:', { 
				locations: locations.length, 
				panoramas: panoramas.length, 
				timeMachineData: timeMachineData.length 
			});
			
			// 找到当前地点
			const currentLocation = locations.find(loc => loc.id === parseInt(id) || loc.location_id === parseInt(id));
			if (!currentLocation) {
				console.error('未找到地点:', id);
				ElMessage.error("未找到对应的地点数据");
				return null;
			}

			console.log('当前地点:', currentLocation);

			// 处理时间机器数据 - 每个时间机器数据对应一个全景图及其预览图片
			const timePeriods = [];
			
			// 如果没有时间机器数据，从全景图数据创建时间段
			if (timeMachineData.length === 0) {
				console.log('没有时间机器数据，从全景图创建');
				// 修复：正确过滤相关全景图
				const locationPanoramas = panoramas.filter(p => {
					// 检查多种可能的字段名
					return p.locationId === parseInt(id) || 
						p.location_id === parseInt(id) ||
						(p.location && p.location.id === parseInt(id));
				});
				console.log('相关全景图:', locationPanoramas);
				
				if (locationPanoramas.length === 0) {
					console.log('没有找到相关全景图，检查地点是否有 panorama 字段');
					
					// 如果地点本身有 panorama 数据
					if (currentLocation.panorama) {
						console.log('地点有 panorama 数据:', currentLocation.panorama);
						const panoramaData = currentLocation.panorama;
						const panoramaImage = buildImageUrl(panoramaData.panorama_image || panoramaData.panoramaImage);
						const thumbnail = buildImageUrl(panoramaData.thumbnail);
						
						// 获取预览图片
						let previewImages = currentLocation.preview_images || currentLocation.previewImages || [];
						
						// 处理预览图片URL
						const validPreviewImages = previewImages.map(img => buildImageUrl(img)).filter(img => img !== null);
						
						// 获取第一个可用的图片作为全景图
						const validPanoramaImage = panoramaImage || thumbnail || (validPreviewImages.length > 0 ? validPreviewImages[0] : null);
						
						if (validPanoramaImage) {
							timePeriods.push({
								id: 'location_panorama',
								label: '地点全景图',
								panoramaId: panoramaData.id || null,
								timestamp: panoramaData.shoot_time || new Date().toISOString(),
								images: validPreviewImages,
								description: panoramaData.description || currentLocation.description,
								address: panoramaData.locationName || currentLocation.address,
								panoramaImage: validPanoramaImage,
								thumbnail: thumbnail || validPanoramaImage
							});
						}
					}
				} else {
					for (const panorama of locationPanoramas) {
						console.log('处理全景图:', panorama);
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
						const validPreviewImages = previewImages.map(img => buildImageUrl(img)).filter(img => img !== null);
						
						// 获取第一个可用的图片作为全景图
						const validPanoramaImage = panoramaImage || thumbnail || (validPreviewImages.length > 0 ? validPreviewImages[0] : null);
						
						timePeriods.push({
							id: `panorama_${panorama.id}`,
							label: `全景图 ${panorama.id}`,
							panoramaId: panorama.id,
							timestamp: panorama.timestamp || panorama.shoot_time || new Date().toISOString(),
							images: validPreviewImages,
							description: panorama.description || currentLocation.description,
							address: panorama.locationName || currentLocation.address,
							panoramaImage: validPanoramaImage,
							thumbnail: thumbnail
						});
					}
				}
			} else {
				// 有时间机器数据
				for (const tmd of timeMachineData) {
					console.log('处理时间机器数据:', tmd);
					
					// 全景图
					const panoramaImage = buildImageUrl(tmd.panoramaImage || tmd.panorama_image);
					// 缩略图
					const thumbnail = buildImageUrl(tmd.thumbnail);
					
					// 预览图片 - 直接从时间机器数据中获取
					let previewImages = tmd.images || [];
					
					// 如果没有预览图片，尝试获取全景图的预览图片
					if (previewImages.length === 0 && tmd.panoramaId) {
						previewImages = await getPanoramaPreviews(tmd.panoramaId);
						console.log(`获取全景图 ${tmd.panoramaId} 的预览图片:`, previewImages);
					}
					
					// 处理预览图片URL
					const validPreviewImages = previewImages.map(img => buildImageUrl(img)).filter(img => img !== null);
					
					// 获取第一个可用的图片作为全景图
					const validPanoramaImage = panoramaImage || thumbnail || (validPreviewImages.length > 0 ? validPreviewImages[0] : null);
					
					timePeriods.push({
						id: tmd.id || tmd.time_machine_id,
						label: tmd.label,
						panoramaId: tmd.panoramaId,
						timestamp: `${tmd.year}-${tmd.month.toString().padStart(2, '0')}-01`,
						images: validPreviewImages,
						description: tmd.description,
						address: tmd.address,
						panoramaImage: validPanoramaImage,
						thumbnail: thumbnail
					});
				}
			}

			// 如果没有时间段数据，创建一个默认的
			if (timePeriods.length === 0) {
				console.log('没有时间段数据，创建默认');
				
				// 尝试从地点信息中获取图片
				let panoramaImage = null;
				let thumbnail = null;
				
				// 如果地点有全景图信息
				if (currentLocation.panorama) {
					panoramaImage = buildImageUrl(currentLocation.panorama.panorama_image || currentLocation.panorama.panoramaImage);
					thumbnail = buildImageUrl(currentLocation.panorama.thumbnail);
				}
				
				// 使用地点信息中的预览图片
				const previewImages = currentLocation.preview_images || currentLocation.previewImages || [];
				const validPreviewImages = previewImages.map(img => buildImageUrl(img)).filter(img => img !== null);
				
				// 如果没有可用的图片，创建一个占位提示
				if (!panoramaImage && !thumbnail && validPreviewImages.length === 0) {
					timePeriods.push({
						id: 'no_data',
						label: '暂无数据',
						panoramaId: null,
						timestamp: new Date().toISOString(),
						images: [],
						description: currentLocation.description || '该地点暂无全景图数据',
						address: currentLocation.address,
						panoramaImage: null,
						thumbnail: null
					});
				} else {
					// 使用第一个可用的图片作为全景图
					const firstImage = panoramaImage || thumbnail || (validPreviewImages.length > 0 ? validPreviewImages[0] : null);
					
					timePeriods.push({
						id: 'default',
						label: '默认视图',
						panoramaId: null,
						timestamp: new Date().toISOString(),
						images: validPreviewImages,
						description: currentLocation.description,
						address: currentLocation.address,
						panoramaImage: firstImage,
						thumbnail: thumbnail || firstImage
					});
				}
			}

			console.log('最终时间段数据:', timePeriods);
			
			// 构建返回数据
			const result = {
				...currentLocation,
				timePeriods,
				// 确保重要字段存在
				name: currentLocation.name || '未知地点',
				description: currentLocation.description || '',
				address: currentLocation.address || ''
			};
			
			console.log('返回的地点数据:', result);
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
	const canvas = document.createElement('canvas');
	canvas.width = 2048;
	canvas.height = 1024;
	const ctx = canvas.getContext('2d');
	
	// 创建渐变背景
	const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
	gradient.addColorStop(0, '#1a237e');
	gradient.addColorStop(1, '#283593');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// 添加文字
	ctx.fillStyle = 'white';
	ctx.font = 'bold 80px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(text || '暂无全景图', canvas.width / 2, canvas.height / 2);
	
	return canvas.toDataURL('image/jpeg');
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
					viewer.value.setPanorama(thumbnailUrl, {
						caption: `${locationData.value.name} - 缩略图视图`
					}).then(() => {
						ElMessage.warning("正在使用缩略图模式");
					}).catch(thumbError => {
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
				viewer.value.setPanorama(firstPreview, {
					caption: `${locationData.value.name} - 预览图模式`
				}).then(() => {
					ElMessage.warning("正在使用预览图模式");
				}).catch(previewError => {
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
		console.log('创建新的viewer显示占位符');
		// 创建简单的占位符viewer
		const placeholderUrl = createPlaceholderImage(locationData.value?.name || '暂无数据');
		
		if (panoRef.value) {
			try {
				const tempViewer = new Viewer({
					container: panoRef.value,
					panorama: placeholderUrl,
					size: { width: "100%", height: "100%" },
					caption: `${locationData.value?.name || '未知地点'} - 暂无全景图数据`
				});
				
				ElMessage.warning("该地点暂无全景图数据");
				
				// 立即销毁这个临时viewer
				setTimeout(() => {
					try {
						tempViewer.destroy();
					} catch (e) {
						console.warn('销毁临时viewer失败:', e);
					}
				}, 100);
			} catch (error) {
				console.error('创建占位符viewer失败:', error);
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
							地点: ${locationData.value?.name || '未知'}
						</p>
					</div>
				`;
			}
		}
		return;
	}
	
	// 如果viewer已存在，更新图片
	const placeholderUrl = createPlaceholderImage(locationData.value?.name || '暂无数据');
	
	try {
		viewer.value.setPanorama(placeholderUrl, {
			caption: `${locationData.value?.name || '未知地点'} - 暂无全景图数据`
		}).then(() => {
			ElMessage.warning("该地点暂无全景图数据");
		}).catch(finalError => {
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
							地点: ${locationData.value?.name || '未知'}
						</p>
					</div>
				`;
			}
		});
	} catch (error) {
		console.error('设置占位符时发生错误:', error);
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

	// 默认选择最新的时间段
	if (data.timePeriods && data.timePeriods.length > 0) {
		selectedTimePeriod.value = data.timePeriods[0].id;
		currentTimePeriod.value = data.timePeriods[0];
	}

	// 预加载图片
	imageLoading.value = true;
	try {
		const allImageUrls = [];
		data.timePeriods?.forEach(period => {
			if (period.panoramaImage) allImageUrls.push(period.panoramaImage);
			if (period.thumbnail) allImageUrls.push(period.thumbnail);
			period.images?.forEach(img => allImageUrls.push(img));
		});
		
		const uniqueUrls = [...new Set(allImageUrls.filter(url => url))];
		const results = await preloadImages(uniqueUrls);
		
		const failedUrls = results.filter(r => r.status === 'error').map(r => r.url);
		if (failedUrls.length > 0) {
			console.warn('以下图片预加载失败:', failedUrls);
		}
	} catch (error) {
		console.error('图片预加载失败:', error);
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
				text: '正在加载全景图...',
				background: 'rgba(0, 0, 0, 0.7)'
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
					console.log('全景图URL无效，尝试使用缩略图');
					const thumbnailUrl = await getValidImageUrl(currentTimePeriod.value.thumbnail);
					if (thumbnailUrl) {
						const thumbIsValid = await validateImageUrl(thumbnailUrl);
						if (thumbIsValid) {
							panoramaUrl = thumbnailUrl;
							ElMessage.warning('正在使用缩略图作为全景图');
						}
					}
				}
				
				// 如果仍然没有URL，显示错误
				if (!panoramaUrl) {
					throw new Error("没有可用的全景图");
				}
				
				console.log('加载全景图URL:', panoramaUrl);
				
				// v4.x 配置选项（简化版，避免不兼容问题）
				const v4Options = {
					container: panoRef.value,
					panorama: panoramaUrl,
					size: { width: "100%", height: "100%" },
					caption: `地点: ${locationData.value?.name || '未知'} | ${currentTimePeriod.value?.label || '默认'}`,
					
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
					navbar: [
						'zoom',
						'move',
						'download',
						'caption',
						'fullscreen'
					],
				};
				
				console.log('初始化 v4.x viewer，选项:', v4Options);
				
				// 清理旧的 viewer 和事件监听器
				cleanup();
				
				// 初始化 viewer
				viewer.value = new Viewer(v4Options);
				
				// 定义事件处理函数
				const onReady = () => {
					loadingInstance.close();
					ElMessage.success("全景图加载完成");
					console.log('Viewer 就绪');
				};
				
				const onLoadError = (e) => {
					loadingInstance.close();
					console.error("全景图加载错误:", e);
					ElMessage.error("全景图加载失败");
					
					// 尝试使用备用图片
					tryUseFallbackImage();
				};
				
				const onClick = (e, data) => {
					console.log('点击全景图:', data);
				};
				
				// 存储事件监听器的引用
				viewerEvents.value = [
					['ready', onReady],
					['load-error', onLoadError],
					['click', onClick]
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
			console.log(`时间段 ${period.label} 没有预览图片，尝试获取...`);
			const previews = await getPanoramaPreviews(period.panoramaId);
			if (previews.length > 0) {
				period.images = previews.map(img => buildImageUrl(img)).filter(img => img !== null);
				console.log(`获取到 ${previews.length} 张预览图片`);
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
			console.log('全景图URL无效，尝试使用缩略图');
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
					text: '正在切换全景图...',
					background: 'rgba(0, 0, 0, 0.7)'
				});

				await viewer.value.setPanorama(panoramaUrl, {
					transition: true,
					transitionDuration: 1000,
					caption: `地点: ${locationData.value.name} | ${period.label}`
				});

				loadingInstance.close();
				ElMessage.success(`已切换到 ${period.label}`);

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

// 加载更多预览图
const loadMorePreviews = async () => {
	if (!currentTimePeriod.value?.panoramaId) {
		ElMessage.warning("当前没有全景图信息");
		return;
	}
	
	try {
		const loading = ElLoading.service({
			lock: true,
			text: '正在加载更多预览图...',
			background: 'rgba(0, 0, 0, 0.7)'
		});
		
		const previews = await getPanoramaPreviews(currentTimePeriod.value.panoramaId);
		
		if (previews.length > 0) {
			const validPreviews = previews.map(img => buildImageUrl(img)).filter(img => img !== null);
			
			// 过滤掉已经存在的图片
			const existingUrls = new Set(currentTimePeriod.value.images || []);
			const newPreviews = validPreviews.filter(url => !existingUrls.has(url));
			
			if (newPreviews.length > 0) {
				currentTimePeriod.value.images = [...(currentTimePeriod.value.images || []), ...newPreviews];
				ElMessage.success(`新增 ${newPreviews.length} 张预览图`);
			} else {
				ElMessage.info("没有新的预览图");
			}
		} else {
			ElMessage.warning("没有找到更多预览图");
		}
		
		loading.close();
	} catch (error) {
		console.error("加载更多预览图失败:", error);
		ElMessage.error("加载预览图失败");
	}
};

// 获取预览图片标题
const getPreviewImageTitle = (index) => {
	if (!currentTimePeriod.value?.panoramaId) return `预览图 ${index + 1}`;
	return `全景图 ${currentTimePeriod.value.panoramaId} - 预览图 ${index + 1}`;
};

// 格式化时间
const formatTime = (timestamp) => {
	if (!timestamp) return '未知时间';
	try {
		const date = new Date(timestamp);
		return date.toLocaleDateString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	} catch (e) {
		return timestamp;
	}
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
	
	const link = document.createElement('a');
	link.href = selectedImage.value;
	link.download = selectedImageInfo.value?.filename || `preview_${Date.now()}.jpg`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	
	ElMessage.success("图片下载开始");
};

// 切换预览面板显示/隐藏
const togglePreviewPanel = () => {
	showPreviewPanel.value = !showPreviewPanel.value;
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
			speed: '10rpm'
		});
		
		// 重置缩放
		if (viewer.value.setZoomLevel) {
			viewer.value.setZoomLevel(50);
		}
		
		ElMessage.success("视图已重置");
	}
};

// 放大 - v4.x 版本
const zoomIn = () => {
	if (viewer.value) {
		if (viewer.value.zoomIn) {
			viewer.value.zoomIn(10);
		} else if (viewer.value.setZoomLevel) {
			const currentZoom = viewer.value.getZoomLevel();
			viewer.value.setZoomLevel(currentZoom + 10);
		}
	}
};

// 缩小 - v4.x 版本
const zoomOut = () => {
	if (viewer.value) {
		if (viewer.value.zoomOut) {
			viewer.value.zoomOut(10);
		} else if (viewer.value.setZoomLevel) {
			const currentZoom = viewer.value.getZoomLevel();
			viewer.value.setZoomLevel(currentZoom - 10);
		}
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
	if (!bytes) return '未知';
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 组件卸载时清理资源 - v4.x 版本
const cleanup = () => {
	if (viewer.value) {
		try {
			console.log('开始销毁 v4.x 全景图查看器...');
			
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
					console.warn('停止自动旋转失败:', e);
				}
			}
			
			// 清空容器内容
			if (panoRef.value && viewer.value.container) {
				try {
					// 先移除事件监听器
					const container = viewer.value.container;
					container.innerHTML = '';
				} catch (e) {
					console.warn('清空容器失败:', e);
				}
			}
			
			// 销毁查看器
			setTimeout(() => {
				try {
					viewer.value.destroy();
					console.log('v4.x 全景图查看器销毁成功');
				} catch (destroyError) {
					console.warn('destroy方法失败，尝试手动清理:', destroyError);
					
					// 手动清理关键属性
					if (viewer.value) {
						// 移除关键事件处理器
						const keysToClear = [
							'container', 'renderer', 'tooltip', 'navbar', 'loader', 
							'events', 'observer', 'autorotate'
						];
						
						keysToClear.forEach(key => {
							if (viewer.value[key]) {
								try {
									if (typeof viewer.value[key].destroy === 'function') {
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
	console.log('路由离开，清理全景图资源');
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
			console.log('路由参数变化，重新初始化全景图');
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
	console.log('全景图组件挂载');
	initPanorama();
});

// 组件卸载时清理
onUnmounted(() => {
	console.log('全景图组件卸载，执行清理');
	cleanup();
	// 强制清理可能的残留元素
	if (panoRef.value) {
		panoRef.value.innerHTML = '';
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

.preview-image::after {
	content: '';
	position: absolute;
	top: 5px;
	right: 5px;
	width: 20px;
	height: 20px;
	background: rgba(0, 0, 0, 0.5);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	color: white;
	font-weight: bold;
}

.preview-image:nth-child(1)::after { content: '1'; }
.preview-image:nth-child(2)::after { content: '2'; }
.preview-image:nth-child(3)::after { content: '3'; }
.preview-image:nth-child(4)::after { content: '4'; }
.preview-image:nth-child(5)::after { content: '5'; }
.preview-image:nth-child(6)::after { content: '6'; }
.preview-image:nth-child(7)::after { content: '7'; }
.preview-image:nth-child(8)::after { content: '8'; }
.preview-image:nth-child(9)::after { content: '9'; }
.preview-image:nth-child(10)::after { content: '10'; }

.time-machine {
	margin-top: 20px;
	transition: all 0.3s ease;
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
}

.time-tabs {
	display: flex;
	gap: 8px;
	overflow-x: auto;
	padding: 5px 0;
	margin-bottom: 10px;
}

.time-tab {
	padding: 8px 16px;
	cursor: pointer;
	transition: all 0.3s ease;
	white-space: nowrap;
	font-size: 14px;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 20px;
	border: 1px solid rgba(255, 255, 255, 0.2);
	display: flex;
	align-items: center;
	gap: 5px;
}

.time-tab:hover {
	background: rgba(255, 255, 255, 0.2);
	transform: translateY(-1px);
}

.time-tab.active {
	background: rgba(64, 158, 255, 0.3);
	color: white;
	border-color: #409eff;
}

.preview-count {
	font-size: 12px;
	opacity: 0.7;
}

.time-machine-info {
	display: flex;
	gap: 20px;
	font-size: 12px;
	opacity: 0.8;
	margin-top: 10px;
}

.info-item {
	display: flex;
	align-items: center;
	gap: 5px;
}

.function-bar {
	position: absolute;
	bottom: 20px;
	right: 20px;
	display: flex;
	flex-direction: column;
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
	background: rgba(0, 0, 0, 0.7);
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
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
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