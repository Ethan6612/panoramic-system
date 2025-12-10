<template>
	<div class="government-map">
		<!-- 地图工具栏 -->
		<el-card class="map-toolbar">
			<div class="toolbar-content">
				<div class="toolbar-left">
					<el-button type="primary" @click="refreshTasks">
						<el-icon><Refresh /></el-icon>
						刷新任务
					</el-button>
					<el-button @click="fitAllMarkers">
						<el-icon><FullScreen /></el-icon>
						适应所有标记
					</el-button>
					<el-select v-model="filterStatus" placeholder="筛选状态" style="width: 150px; margin-left: 10px" clearable @change="applyFilters">
						<el-option label="全部" value="" />
						<el-option label="待处理" value="pending" />
						<el-option label="进行中" value="in_progress" />
						<el-option label="已完成" value="completed" />
					</el-select>
					<el-select v-model="filterPriority" placeholder="筛选优先级" style="width: 150px; margin-left: 10px" clearable @change="applyFilters">
						<el-option label="全部" value="" />
						<el-option label="紧急" value="urgent" />
						<el-option label="高" value="high" />
						<el-option label="中" value="medium" />
						<el-option label="低" value="low" />
					</el-select>
				</div>
				<div class="toolbar-right">
					<el-input
						v-model="searchKeyword"
						placeholder="搜索任务编号或标题"
						style="width: 250px"
						clearable
						@keyup.enter="applyFilters"
						@clear="applyFilters">
						<template #prefix>
							<el-icon><Search /></el-icon>
						</template>
					</el-input>
				</div>
			</div>
		</el-card>

		<!-- 地图容器 -->
		<el-card class="map-card">
			<div ref="mapContainer" class="map-container"></div>
		</el-card>

		<!-- 任务详情对话框 -->
		<el-dialog v-model="detailDialogVisible" :title="`任务详情 - ${currentTask?.task_code || ''}`" width="800px">
			<div v-if="currentTask" class="task-detail">
				<el-descriptions :column="2" border>
					<el-descriptions-item label="任务编号">{{ currentTask.task_code }}</el-descriptions-item>
					<el-descriptions-item label="任务标题">{{ currentTask.title }}</el-descriptions-item>
					<el-descriptions-item label="任务类型">
						<el-tag :type="getTaskTypeTagType(currentTask.task_type)">
							{{ getTaskTypeText(currentTask.task_type) }}
						</el-tag>
					</el-descriptions-item>
					<el-descriptions-item label="优先级">
						<el-tag :type="getPriorityTagType(currentTask.priority)">
							{{ getPriorityText(currentTask.priority) }}
						</el-tag>
					</el-descriptions-item>
					<el-descriptions-item label="状态">
						<el-tag :type="getStatusTagType(currentTask.status)">
							{{ getStatusText(currentTask.status) }}
						</el-tag>
					</el-descriptions-item>
					<el-descriptions-item label="执行人">
						{{ currentTask.assigned_to?.name || "未指派" }}
					</el-descriptions-item>
					<el-descriptions-item label="创建人">{{ currentTask.created_by?.name }}</el-descriptions-item>
					<el-descriptions-item label="创建时间">{{ currentTask.created_at }}</el-descriptions-item>
					<el-descriptions-item label="截止时间">{{ currentTask.deadline }}</el-descriptions-item>
					<el-descriptions-item label="完成时间" :span="2">
						{{ currentTask.completion_time || "未完成" }}
					</el-descriptions-item>
					<el-descriptions-item label="详细地址" :span="2">{{ currentTask.address }}</el-descriptions-item>
					<el-descriptions-item label="坐标" :span="2"> {{ currentTask.longitude }}, {{ currentTask.latitude }} </el-descriptions-item>
					<el-descriptions-item label="任务描述" :span="2">
						<div style="white-space: pre-wrap">{{ currentTask.description }}</div>
					</el-descriptions-item>
				</el-descriptions>
			</div>
			<template #footer>
				<el-button @click="detailDialogVisible = false">关闭</el-button>
				<el-button type="primary" @click="goToTaskDetail">查看完整详情</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Refresh, FullScreen, Search } from "@element-plus/icons-vue";
import AMapLoader from "@amap/amap-jsapi-loader";
import request from "@/api/request";

const router = useRouter();
const mapContainer = ref<HTMLElement | null>(null);
let map: any = null;
const markers: any[] = [];
const infoWindows: any[] = [];

// 任务列表
const tasks = ref<any[]>([]);
const filteredTasks = ref<any[]>([]);

// 筛选条件
const filterStatus = ref("");
const filterPriority = ref("");
const searchKeyword = ref("");

// 详情对话框
const detailDialogVisible = ref(false);
const currentTask = ref<any>(null);

// 工具函数
const getTaskTypeText = (type: string) => {
	const map: Record<string, string> = {
		inspection: "常规检查",
		enforcement: "执法行动",
		special: "专项治理",
		complaint: "投诉处理",
		other: "其他",
	};
	return map[type] || type;
};

const getPriorityText = (priority: string) => {
	const map: Record<string, string> = {
		urgent: "紧急",
		high: "高",
		medium: "中",
		low: "低",
	};
	return map[priority] || priority;
};

const getStatusText = (status: string) => {
	const map: Record<string, string> = {
		pending: "待处理",
		assigned: "已指派",
		in_progress: "进行中",
		completed: "已完成",
	};
	return map[status] || status;
};

const getTaskTypeTagType = (type: string) => {
	const map: Record<string, string> = {
		inspection: "primary",
		enforcement: "danger",
		special: "warning",
		complaint: "info",
		other: "",
	};
	return map[type] || "";
};

const getPriorityTagType = (priority: string) => {
	const map: Record<string, string> = {
		urgent: "danger",
		high: "warning",
		medium: "primary",
		low: "info",
	};
	return map[priority] || "";
};

const getStatusTagType = (status: string) => {
	const map: Record<string, string> = {
		pending: "info",
		assigned: "warning",
		in_progress: "warning",
		completed: "success",
	};
	return map[status] || "";
};

// 获取标记图标颜色
const getMarkerIcon = (task: any) => {
	let color = "#409eff"; // 默认蓝色
	if (task.status === "completed") {
		color = "#67c23a"; // 绿色 - 已完成
	} else if (task.status === "in_progress") {
		color = "#e6a23c"; // 橙色 - 进行中
	} else if (task.priority === "urgent") {
		color = "#f56c6c"; // 红色 - 紧急
	} else if (task.priority === "high") {
		color = "#e6a23c"; // 橙色 - 高优先级
	}
	return color;
};

// 加载任务列表
const loadTasks = async () => {
	try {
		const response = await request.get("/api/government/tasks", {
			params: {
				page: 1,
				pageSize: 1000, // 获取所有任务
			},
			headers: {
				token: localStorage.getItem("token") || localStorage.getItem("govToken") || "",
			},
		});
		const responseData = response as any;
		if (responseData && responseData.code === "200" && responseData.data) {
			tasks.value = responseData.data.list || [];
			applyFilters();
		}
	} catch (error) {
		console.error("加载任务列表失败:", error);
		ElMessage.error("加载任务列表失败");
	}
};

// 应用筛选
const applyFilters = () => {
	let filtered = [...tasks.value];

	// 状态筛选
	if (filterStatus.value) {
		filtered = filtered.filter((task) => task.status === filterStatus.value);
	}

	// 优先级筛选
	if (filterPriority.value) {
		filtered = filtered.filter((task) => task.priority === filterPriority.value);
	}

	// 关键词搜索
	if (searchKeyword.value) {
		const keyword = searchKeyword.value.toLowerCase();
		filtered = filtered.filter((task) => task.task_code?.toLowerCase().includes(keyword) || task.title?.toLowerCase().includes(keyword));
	}

	// 只显示有经纬度的任务
	filtered = filtered.filter((task) => task.longitude && task.latitude);

	filteredTasks.value = filtered;
	updateMarkers();
};

// 更新地图标记
const updateMarkers = () => {
	if (!map || !mapContainer.value) return;

	// 清除所有现有标记
	clearMarkers();

	// 添加新标记
	filteredTasks.value.forEach((task) => {
		if (!task.longitude || !task.latitude) return;

		const marker = new (window as any).AMap.Marker({
			position: [task.longitude, task.latitude],
			map: map,
			title: task.title,
			icon: new (window as any).AMap.Icon({
				size: new (window as any).AMap.Size(32, 32),
				image: `data:image/svg+xml;base64,${getMarkerIconSVG(getMarkerIcon(task))}`,
				imageSize: new (window as any).AMap.Size(32, 32),
			}),
		});

		// 创建信息窗口内容
		const infoWindow = new (window as any).AMap.InfoWindow({
			content: createInfoWindowContent(task),
			offset: new (window as any).AMap.Pixel(0, -32),
			closeWhenClickMap: true,
		});

		// 点击标记显示详情
		marker.on("click", () => {
			// 关闭其他信息窗口
			infoWindows.forEach((iw) => iw.close());
			infoWindow.open(map, marker.getPosition());
			currentTask.value = task;
		});

		markers.push(marker);
		infoWindows.push(infoWindow);
	});

	// 如果有标记，调整地图视野
	if (filteredTasks.value.length > 0) {
		fitAllMarkers();
	}
};

// 生成标记图标 SVG
const getMarkerIconSVG = (color: string) => {
	const svg = `
		<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
			<circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
			<circle cx="16" cy="16" r="6" fill="white"/>
		</svg>
	`;
	return btoa(unescape(encodeURIComponent(svg)));
};

// 创建信息窗口内容
const createInfoWindowContent = (task: any) => {
	const content = document.createElement("div");
	content.style.padding = "10px";
	content.style.minWidth = "200px";

	content.innerHTML = `
		<h3 style="margin: 0 0 10px 0; font-size: 16px; color: #303133;">${task.title || "无标题"}</h3>
		<p style="margin: 5px 0; font-size: 12px; color: #606266;">
			<strong>任务编号：</strong>${task.task_code || "无"}
		</p>
		<p style="margin: 5px 0; font-size: 12px; color: #606266;">
			<strong>状态：</strong>
			<span style="color: ${getStatusTagType(task.status) === "success" ? "#67c23a" : getStatusTagType(task.status) === "warning" ? "#e6a23c" : "#909399"}">
				${getStatusText(task.status)}
			</span>
		</p>
		<p style="margin: 5px 0; font-size: 12px; color: #606266;">
			<strong>优先级：</strong>
			<span style="color: ${
				getPriorityTagType(task.priority) === "danger" ? "#f56c6c" : getPriorityTagType(task.priority) === "warning" ? "#e6a23c" : "#409eff"
			}">
				${getPriorityText(task.priority)}
			</span>
		</p>
		<p style="margin: 5px 0; font-size: 12px; color: #606266;">
			<strong>地址：</strong>${task.address || "无地址"}
		</p>
		<button 
			id="detail-btn-${task.id}"
			style="margin-top: 10px; padding: 5px 15px; background: #409eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
		>
			查看详情
		</button>
	`;

	// 添加点击事件
	const btn = content.querySelector(`#detail-btn-${task.id}`);
	if (btn) {
		btn.addEventListener("click", () => {
			currentTask.value = task;
			detailDialogVisible.value = true;
		});
	}

	return content;
};

// 清除所有标记
const clearMarkers = () => {
	if (!map) return;

	markers.forEach((marker) => {
		try {
			if (marker) {
				marker.setMap(null);
			}
		} catch (error) {
			console.warn("移除标记失败:", error);
		}
	});

	infoWindows.forEach((iw) => {
		try {
			if (iw) {
				iw.close();
			}
		} catch (error) {
			console.warn("关闭信息窗口失败:", error);
		}
	});

	markers.length = 0;
	infoWindows.length = 0;
};

// 适应所有标记
const fitAllMarkers = () => {
	if (!map || filteredTasks.value.length === 0) return;

	const positions = filteredTasks.value.filter((task) => task.longitude && task.latitude).map((task) => [task.longitude, task.latitude]);

	if (positions.length === 0) return;

	if (positions.length === 1) {
		map.setCenter(positions[0]);
		map.setZoom(15);
	} else {
		map.setFitView(
			positions.map((pos) => new (window as any).AMap.Marker({ position: pos })),
			false,
			[50, 50, 50, 50]
		);
	}
};

// 刷新任务
const refreshTasks = () => {
	loadTasks();
	ElMessage.success("任务列表已刷新");
};

// 初始化地图
const initMap = async () => {
	if (!mapContainer.value) return;

	const apiKey = process.env.VUE_APP_AMAP_KEY;
	const securityCode = process.env.VUE_APP_AMAP_SECURITY_CODE;

	if (!apiKey || !securityCode) {
		ElMessage.error("地图配置错误");
		return;
	}

	(window as any)._AMapSecurityConfig = { securityJsCode: securityCode };

	try {
		const AMap = await AMapLoader.load({
			key: apiKey,
			version: "2.0",
		});

		map = new AMap.Map(mapContainer.value, {
			zoom: 13,
			center: [113.386913, 22.530342], // 中山市坐标
		});

		// 加载任务并显示标记
		await loadTasks();
	} catch (error) {
		console.error("地图加载失败:", error);
		ElMessage.error("地图加载失败");
	}
};

// 跳转到任务详情
const goToTaskDetail = () => {
	if (currentTask.value) {
		router.push({ path: "/government/tasks", query: { taskId: currentTask.value.id } });
		detailDialogVisible.value = false;
	}
};

onMounted(() => {
	initMap();
});

onUnmounted(() => {
	// 先清除标记（此时 map 还存在）
	clearMarkers();

	// 然后销毁地图
	if (map) {
		try {
			map.destroy();
		} catch (error) {
			console.warn("销毁地图失败:", error);
		}
		map = null;
	}
});
</script>

<style scoped>
.government-map {
	height: calc(100vh - 120px);
	display: flex;
	flex-direction: column;
}

.government-map .map-toolbar {
	margin-bottom: 20px;
}

.government-map .map-toolbar .toolbar-content {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.government-map .map-toolbar .toolbar-left {
	display: flex;
	align-items: center;
}

.government-map .map-card {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.government-map .map-container {
	width: 100%;
	height: 100%;
	min-height: 600px;
	border-radius: 4px;
	overflow: hidden;
}

.government-map .task-detail {
	max-height: 70vh;
	overflow-y: auto;
	padding-right: 10px;
}

/* 自定义滚动条 */
.government-map .task-detail::-webkit-scrollbar {
	width: 6px;
}

.government-map .task-detail::-webkit-scrollbar-track {
	background: #f1f1f1;
	border-radius: 3px;
}

.government-map .task-detail::-webkit-scrollbar-thumb {
	background: #c1c1c1;
	border-radius: 3px;
}

.government-map .task-detail::-webkit-scrollbar-thumb:hover {
	background: #a8a8a8;
}
</style>
