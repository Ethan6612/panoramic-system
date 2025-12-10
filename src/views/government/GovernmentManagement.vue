<!-- GovernmentManagement.vue -->
<template>
	<div class="government-management">
		<!-- 操作工具栏 -->
		<el-card class="toolbar-card">
			<div class="toolbar">
				<div class="toolbar-left">
					<el-button type="primary" @click="handleCreateTask">
						<el-icon><Plus /></el-icon>
						发布执法任务
					</el-button>
					<el-button type="warning" @click="showTaskStatistics = true">
						<el-icon><PieChart /></el-icon>
						任务统计
					</el-button>
				</div>
				<div class="toolbar-right">
					<el-input
						v-model="searchKeyword"
						placeholder="搜索任务名称、编号或描述"
						style="width: 300px"
						clearable
						@keyup.enter="loadTasks"
						@clear="loadTasks">
						<template #prefix>
							<el-icon><Search /></el-icon>
						</template>
					</el-input>
				</div>
			</div>
		</el-card>

		<!-- 任务列表 -->
		<el-card class="table-card">
			<el-tabs v-model="activeTab" @tab-change="handleTabChange">
				<el-tab-pane label="全部任务" name="all"></el-tab-pane>
				<el-tab-pane label="待处理" name="pending"></el-tab-pane>
				<el-tab-pane label="进行中" name="in_progress"></el-tab-pane>
				<el-tab-pane label="已完成" name="completed"></el-tab-pane>
			</el-tabs>

			<el-table v-loading="loading" :data="tableData" stripe>
				<el-table-column prop="task_code" label="任务编号" width="150" />
				<el-table-column prop="title" label="任务标题" min-width="180" />
				<el-table-column label="任务类型" width="120">
					<template #default="{ row }">
						<el-tag :type="row.task_type === 'inspection' ? 'primary' : row.task_type === 'enforcement' ? 'danger' : 'warning'">
							{{ getTaskTypeText(row.task_type) }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="优先级" width="100">
					<template #default="{ row }">
						<el-tag
							:type="row.priority === 'urgent' ? 'danger' : row.priority === 'high' ? 'warning' : row.priority === 'medium' ? 'primary' : 'info'">
							{{ getPriorityText(row.priority) }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="状态" width="100">
					<template #default="{ row }">
						<el-tag :type="row.status === 'pending' ? 'info' : row.status === 'in_progress' ? 'warning' : 'success'">
							{{ getStatusText(row.status) }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="assigned_to.name" label="执行人" width="120" />
				<el-table-column prop="address" label="地点" min-width="150" />
				<el-table-column prop="deadline" label="截止时间" width="150" />
				<el-table-column label="操作" width="250" fixed="right">
					<template #default="{ row }">
						<el-button link type="primary" size="small" @click="handleViewDetail(row)"> 查看详情 </el-button>
						<el-button link type="warning" size="small" @click="handleAssignTask(row)" v-if="row.status === 'pending'"> 指派 </el-button>
						<el-button link type="success" size="small" @click="handleUpdateStatus(row)" v-if="row.status !== 'completed'"> 更新状态 </el-button>
						<el-button link type="info" size="small" @click="handleShowOnMap(row)"> 地图定位 </el-button>
					</template>
				</el-table-column>
			</el-table>

			<!-- 分页 -->
			<div class="pagination">
				<el-pagination
					v-model:current-page="currentPage"
					v-model:page-size="pageSize"
					:page-sizes="[10, 20, 50, 100]"
					:total="total"
					layout="total, sizes, prev, pager, next, jumper"
					@size-change="loadTasks"
					@current-change="loadTasks" />
			</div>
		</el-card>

		<!-- 任务发布对话框 -->
		<el-dialog v-model="taskDialogVisible" title="发布执法任务" width="800px" @closed="resetTaskForm">
			<el-form :model="taskForm" :rules="taskRules" ref="taskFormRef" label-width="100px">
				<el-row :gutter="20">
					<el-col :span="12">
						<el-form-item label="任务标题" prop="title" required>
							<el-input v-model="taskForm.title" placeholder="请输入任务标题" />
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="任务类型" prop="task_type" required>
							<el-select v-model="taskForm.task_type" placeholder="选择任务类型" style="width: 100%">
								<el-option label="常规检查" value="inspection" />
								<el-option label="执法行动" value="enforcement" />
								<el-option label="专项治理" value="special" />
								<el-option label="投诉处理" value="complaint" />
								<el-option label="其他" value="other" />
							</el-select>
						</el-form-item>
					</el-col>
				</el-row>

				<el-row :gutter="20">
					<el-col :span="12">
						<el-form-item label="优先级" prop="priority" required>
							<el-select v-model="taskForm.priority" placeholder="选择优先级" style="width: 100%">
								<el-option label="紧急" value="urgent" />
								<el-option label="高" value="high" />
								<el-option label="中" value="medium" />
								<el-option label="低" value="low" />
							</el-select>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="截止时间" prop="deadline" required>
							<el-date-picker
								v-model="taskForm.deadline"
								type="datetime"
								placeholder="选择截止时间"
								style="width: 100%"
								value-format="YYYY-MM-DD HH:mm:ss" />
						</el-form-item>
					</el-col>
				</el-row>

				<el-form-item label="地点标注" required>
					<div class="map-selector">
						<div class="map-info">
							<el-button type="primary" size="small" @click="showMapPicker = true">
								<el-icon><MapLocation /></el-icon>
								在地图上选择位置
							</el-button>
							<div v-if="taskForm.longitude && taskForm.latitude" class="location-info">
								<span>已选择位置：{{ taskForm.address || "未获取地址" }}</span>
								<br />
								<span class="coordinate">坐标：{{ taskForm.longitude.toFixed(6) }}, {{ taskForm.latitude.toFixed(6) }}</span>
							</div>
						</div>
					</div>
				</el-form-item>

				<el-form-item label="详细地址" prop="address">
					<el-input v-model="taskForm.address" type="textarea" :rows="2" placeholder="请输入详细地址" />
				</el-form-item>

				<el-form-item label="任务描述" prop="description" required>
					<el-input v-model="taskForm.description" type="textarea" :rows="3" placeholder="请输入任务详细描述" />
				</el-form-item>

				<el-form-item label="指派给">
					<el-select v-model="taskForm.assigned_to" placeholder="选择执行人" style="width: 100%">
						<el-option v-for="user in governmentUsers" :key="user.id" :label="`${user.username} - ${user.department}`" :value="user.id" />
					</el-select>
				</el-form-item>

				<el-form-item label="附件">
					<el-upload
						v-model:file-list="attachmentFiles"
						action="/api/images/upload"
						:headers="uploadHeaders"
						:on-success="handleUploadSuccess"
						:on-error="handleUploadError"
						:before-upload="beforeUpload"
						multiple
						list-type="picture-card"
						:limit="5">
						<el-icon><Plus /></el-icon>
					</el-upload>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="taskDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleConfirmTask" :loading="taskLoading"> 发布任务 </el-button>
			</template>
		</el-dialog>

		<!-- 地图选择器对话框 -->
		<el-dialog v-model="showMapPicker" title="选择位置" width="90%" top="5vh" @closed="handleMapPickerClose">
			<div class="map-picker-container">
				<div class="map-wrapper">
					<div ref="mapPickerContainer" class="map-picker"></div>
				</div>
				<div class="map-controls">
					<el-button type="primary" @click="confirmMapSelection">
						<el-icon><Check /></el-icon>
						确认选择当前位置
					</el-button>
					<el-button @click="showMapPicker = false"> 取消 </el-button>
				</div>
			</div>
		</el-dialog>

		<!-- 任务详情对话框 -->
		<el-dialog v-model="detailDialogVisible" title="任务详情" width="1000px">
			<div v-if="currentTask" class="task-detail">
				<el-descriptions :column="2" border>
					<el-descriptions-item label="任务编号">{{ currentTask.task_code }}</el-descriptions-item>
					<el-descriptions-item label="任务标题">{{ currentTask.title }}</el-descriptions-item>
					<el-descriptions-item label="任务类型">
						<el-tag :type="currentTask.task_type === 'inspection' ? 'primary' : 'danger'">
							{{ getTaskTypeText(currentTask.task_type) }}
						</el-tag>
					</el-descriptions-item>
					<el-descriptions-item label="优先级">
						<el-tag :type="currentTask.priority === 'urgent' ? 'danger' : 'warning'">
							{{ getPriorityText(currentTask.priority) }}
						</el-tag>
					</el-descriptions-item>
					<el-descriptions-item label="状态">
						<el-tag :type="currentTask.status === 'pending' ? 'info' : 'success'">
							{{ getStatusText(currentTask.status) }}
						</el-tag>
					</el-descriptions-item>
					<el-descriptions-item label="执行人">
						{{ currentTask.assigned_to?.name || "未指派" }}
					</el-descriptions-item>
					<el-descriptions-item label="创建人">{{ currentTask.created_by?.name }}</el-descriptions-item>
					<el-descriptions-item label="创建时间">{{ currentTask.created_at }}</el-descriptions-item>
					<el-descriptions-item label="截止时间">{{ currentTask.deadline }}</el-descriptions-item>
					<el-descriptions-item label="完成时间" :span="2">{{ currentTask.completion_time || "未完成" }}</el-descriptions-item>
					<el-descriptions-item label="详细地址" :span="2">{{ currentTask.address }}</el-descriptions-item>
					<el-descriptions-item label="任务描述" :span="2">
						<div style="white-space: pre-wrap">{{ currentTask.description }}</div>
					</el-descriptions-item>
				</el-descriptions>

				<!-- 附件 -->
				<div v-if="currentTask.attachments && currentTask.attachments.length > 0" class="task-attachments">
					<h4>附件</h4>
					<div class="attachment-list">
						<div v-for="(url, index) in currentTask.attachments" :key="index" class="attachment-item">
							<img :src="url" alt="附件" @click="previewImage(url)" />
						</div>
					</div>
				</div>

				<!-- 任务历史 -->
				<div class="task-history">
					<h4>任务历史</h4>
					<el-timeline>
						<el-timeline-item
							v-for="history in currentTask.history"
							:key="history.id"
							:timestamp="history.performed_at"
							:type="history.action === 'create' ? 'primary' : 'success'">
							{{ history.performed_by }}：{{ history.description }}
						</el-timeline-item>
					</el-timeline>
				</div>

				<!-- 评论 -->
				<div class="task-comments">
					<h4>评论与进展</h4>
					<div class="comment-list">
						<div v-for="comment in currentTask.comments" :key="comment.id" class="comment-item">
							<div class="comment-header">
								<span class="comment-author">{{ comment.created_by }}</span>
								<span class="comment-time">{{ comment.created_at }}</span>
								<el-tag size="small" :type="comment.comment_type === 'progress' ? 'success' : 'info'">
									{{ comment.comment_type === "progress" ? "进展" : "备注" }}
								</el-tag>
							</div>
							<div class="comment-content">{{ comment.content }}</div>
							<div v-if="comment.attachments && comment.attachments.length > 0" class="comment-attachments">
								<div v-for="(url, index) in comment.attachments" :key="index" class="comment-attachment">
									<img :src="url" alt="评论附件" @click="previewImage(url)" />
								</div>
							</div>
						</div>
					</div>
					<div class="comment-form">
						<el-input v-model="newComment" type="textarea" :rows="2" placeholder="添加评论或进展..." />
						<div class="comment-actions">
							<el-radio-group v-model="commentType">
								<el-radio label="remark">备注</el-radio>
								<el-radio label="progress">进展</el-radio>
							</el-radio-group>
							<el-button type="primary" size="small" @click="addComment" :disabled="!newComment.trim()"> 提交 </el-button>
						</div>
					</div>
				</div>
			</div>
		</el-dialog>

		<!-- 指派对话框 -->
		<el-dialog v-model="assignDialogVisible" title="指派任务" width="500px">
			<el-form :model="assignForm" label-width="80px">
				<el-form-item label="选择执行人" required>
					<el-select v-model="assignForm.assigned_to" placeholder="选择执行人" style="width: 100%">
						<el-option v-for="user in governmentUsers" :key="user.id" :label="`${user.username} - ${user.department}`" :value="user.id" />
					</el-select>
				</el-form-item>
				<el-form-item label="备注">
					<el-input v-model="assignForm.remarks" type="textarea" :rows="3" placeholder="可添加指派说明" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="assignDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleConfirmAssign" :loading="assignLoading"> 确认指派 </el-button>
			</template>
		</el-dialog>

		<!-- 状态更新对话框 -->
		<el-dialog v-model="statusDialogVisible" title="更新任务状态" width="500px">
			<el-form :model="statusForm" label-width="100px">
				<el-form-item label="当前状态">
					<el-tag :type="currentTask?.status === 'pending' ? 'info' : 'warning'">
						{{ getStatusText(currentTask?.status) }}
					</el-tag>
				</el-form-item>
				<el-form-item label="新状态" required>
					<el-select v-model="statusForm.status" placeholder="选择新状态" style="width: 100%">
						<el-option label="待处理" value="pending" />
						<el-option label="已指派" value="assigned" />
						<el-option label="进行中" value="in_progress" />
						<el-option label="已完成" value="completed" />
					</el-select>
				</el-form-item>
				<el-form-item label="备注" v-if="statusForm.status === 'completed'">
					<el-input v-model="statusForm.remarks" type="textarea" :rows="3" placeholder="填写完成说明" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="statusDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleConfirmStatus" :loading="statusLoading"> 更新状态 </el-button>
			</template>
		</el-dialog>

		<!-- 统计图表对话框 -->
		<el-dialog v-model="showTaskStatistics" title="任务统计" width="90%" top="5vh">
			<div class="statistics-content">
				<el-row :gutter="20" class="statistics-cards">
					<el-col :span="6">
						<el-card shadow="hover">
							<div class="stat-card">
								<div class="stat-value">{{ statistics.total || 0 }}</div>
								<div class="stat-label">总任务数</div>
							</div>
						</el-card>
					</el-col>
					<el-col :span="6">
						<el-card shadow="hover">
							<div class="stat-card">
								<div class="stat-value">{{ statistics.pending || 0 }}</div>
								<div class="stat-label">待处理</div>
							</div>
						</el-card>
					</el-col>
					<el-col :span="6">
						<el-card shadow="hover">
							<div class="stat-card">
								<div class="stat-value">{{ statistics.in_progress || 0 }}</div>
								<div class="stat-label">进行中</div>
							</div>
						</el-card>
					</el-col>
					<el-col :span="6">
						<el-card shadow="hover">
							<div class="stat-card">
								<div class="stat-value">{{ statistics.completed || 0 }}</div>
								<div class="stat-label">已完成</div>
							</div>
						</el-card>
					</el-col>
				</el-row>

				<el-row :gutter="20" class="charts-row">
					<el-col :span="12">
						<el-card shadow="hover">
							<h4>任务类型分布</h4>
							<div ref="typeChart" style="width: 100%; height: 300px"></div>
						</el-card>
					</el-col>
					<el-col :span="12">
						<el-card shadow="hover">
							<h4>优先级分布</h4>
							<div ref="priorityChart" style="width: 100%; height: 300px"></div>
						</el-card>
					</el-col>
				</el-row>

				<el-row :gutter="20">
					<el-col :span="24">
						<el-card shadow="hover">
							<h4>任务趋势</h4>
							<div ref="trendChart" style="width: 100%; height: 400px"></div>
						</el-card>
					</el-col>
				</el-row>
			</div>
		</el-dialog>

		<!-- 地图展示对话框 -->
		<el-dialog v-model="showMapViewer" title="任务位置" width="90%" top="5vh">
			<div class="map-viewer-container">
				<div ref="mapViewerContainer" class="map-viewer"></div>
			</div>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules, UploadFile } from "element-plus";
import { Plus, Search, PieChart, MapLocation, Check } from "@element-plus/icons-vue";
import AMapLoader from "@amap/amap-jsapi-loader";
import * as echarts from "echarts";
import request from "@/api/request";

// 地图相关
const mapPickerContainer = ref<HTMLElement | null>(null);
const mapViewerContainer = ref<HTMLElement | null>(null);
let pickerMap: any = null;
let viewerMap: any = null;
let mapMarker: any = null;

// 数据加载状态
const loading = ref(false);
const tableData = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchKeyword = ref("");

// 对话框可见性控制
const taskDialogVisible = ref(false);
const showMapPicker = ref(false);
const detailDialogVisible = ref(false);
const assignDialogVisible = ref(false);
const statusDialogVisible = ref(false);
const showTaskStatistics = ref(false);
const showMapViewer = ref(false);

// 当前操作的任务
const currentTask = ref<any>(null);
const currentTaskForMap = ref<any>(null);

// 表单引用
const taskFormRef = ref<FormInstance>();
const taskLoading = ref(false);
const assignLoading = ref(false);
const statusLoading = ref(false);

// 任务表单
const taskForm = ref({
	title: "",
	task_type: "inspection",
	priority: "medium",
	deadline: "",
	longitude: null as number | null,
	latitude: null as number | null,
	address: "",
	description: "",
	assigned_to: null as number | null,
	attachments: [] as number[],
});

// 指派表单
const assignForm = ref({
	assigned_to: null as number | null,
	remarks: "",
});

// 状态更新表单
const statusForm = ref({
	status: "",
	remarks: "",
});

// 政府用户列表
const governmentUsers = ref<any[]>([]);

// 附件上传
const attachmentFiles = ref<UploadFile[]>([]);
const uploadHeaders = computed(() => ({
	token: localStorage.getItem("token") || "",
}));

// 评论相关
const newComment = ref("");
const commentType = ref("remark");

// 统计图表
const typeChart = ref<HTMLElement | null>(null);
const priorityChart = ref<HTMLElement | null>(null);
const trendChart = ref<HTMLElement | null>(null);
const statistics = ref<any>({});

// 标签页
const activeTab = ref("all");

// 表单验证规则
const taskRules: FormRules = {
	title: [
		{ required: true, message: "请输入任务标题", trigger: "blur" },
		{ min: 3, max: 100, message: "标题长度在 3 到 100 个字符", trigger: "blur" },
	],
	task_type: [{ required: true, message: "请选择任务类型", trigger: "change" }],
	priority: [{ required: true, message: "请选择优先级", trigger: "change" }],
	deadline: [{ required: true, message: "请选择截止时间", trigger: "change" }],
	description: [
		{ required: true, message: "请输入任务描述", trigger: "blur" },
		{ min: 10, message: "描述至少需要 10 个字符", trigger: "blur" },
	],
};

// 获取文本显示函数
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

// 加载任务列表
const loadTasks = async () => {
	loading.value = true;
	try {
		const params: any = {
			page: currentPage.value,
			pageSize: pageSize.value,
		};

		if (searchKeyword.value) {
			params.keyword = searchKeyword.value;
		}

		if (activeTab.value !== "all") {
			params.status = activeTab.value;
		}

		const response = await request.get("/api/government/tasks", {
			params,
			headers: {
				token: localStorage.getItem("token") || "",
			},
		});

		const responseData = response as any;
		if (responseData && responseData.code === "200" && responseData.data) {
			tableData.value = responseData.data.list || [];
			total.value = responseData.data.total || 0;
		} else {
			ElMessage.error(responseData?.msg || "加载任务列表失败");
		}
	} catch (error) {
		console.error("加载任务列表失败:", error);
		ElMessage.error("加载任务列表失败");
	} finally {
		loading.value = false;
	}
};

// 加载政府用户列表
const loadGovernmentUsers = async () => {
	try {
		const response = await request.get("/api/government/users", {
			headers: {
				token: localStorage.getItem("token") || "",
			},
		});

		const responseData = response as any;
		if (responseData && responseData.code === "200") {
			governmentUsers.value = responseData.data || [];
		}
	} catch (error) {
		console.error("加载用户列表失败:", error);
	}
};

// 加载统计数据
const loadStatistics = async () => {
	try {
		const response = await request.get("/api/government/tasks/statistics", {
			params: { period: "month" },
			headers: {
				token: localStorage.getItem("token") || "",
			},
		});

		const responseData = response as any;
		if (responseData && responseData.code === "200") {
			statistics.value = responseData.data || {};
		}
	} catch (error) {
		console.error("加载统计数据失败:", error);
	}
};

// 初始化地图选择器
const initMapPicker = async () => {
	if (!mapPickerContainer.value) return;

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
			plugins: ["AMap.Geocoder"], // 加载地理编码插件
		});

		pickerMap = new AMap.Map(mapPickerContainer.value, {
			zoom: 15,
			center: [113.386913, 22.530342], // 中山市坐标
		});

		// 添加点击事件
		pickerMap.on("click", (e: any) => {
			const lnglat = e.lnglat;

			// 移除之前的标记
			if (mapMarker) {
				mapMarker.setMap(null);
			}

			// 添加新标记
			mapMarker = new AMap.Marker({
				position: [lnglat.lng, lnglat.lat],
				map: pickerMap,
				icon: new AMap.Icon({
					size: new AMap.Size(30, 30),
					image: "//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png",
					imageSize: new AMap.Size(30, 30),
				}),
			});

			// 更新表单坐标
			taskForm.value.longitude = lnglat.lng;
			taskForm.value.latitude = lnglat.lat;

			// 逆地理编码获取地址
			const geocoder = new AMap.Geocoder();
			geocoder.getAddress([lnglat.lng, lnglat.lat], (status: string, result: any) => {
				if (status === "complete" && result.regeocode) {
					taskForm.value.address = result.regeocode.formattedAddress;
				}
			});
		});
	} catch (error) {
		console.error("地图加载失败:", error);
		ElMessage.error("地图加载失败");
	}
};

// 初始化地图查看器
const initMapViewer = async (task: any) => {
	if (!mapViewerContainer.value) return;

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

		// 销毁之前的map
		if (viewerMap) {
			viewerMap.destroy();
		}

		viewerMap = new AMap.Map(mapViewerContainer.value, {
			zoom: 16,
			center: [task.longitude, task.latitude],
		});

		// 添加标记
		const marker = new AMap.Marker({
			position: [task.longitude, task.latitude],
			map: viewerMap,
			icon: new AMap.Icon({
				size: new AMap.Size(40, 40),
				image: "//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png",
				imageSize: new AMap.Size(40, 40),
			}),
		});

		// 添加信息窗口
		const infoWindow = new AMap.InfoWindow({
			content: `
				<div style="padding: 10px;">
					<h3 style="margin: 0 0 10px 0;">${task.title}</h3>
					<p><strong>任务编号：</strong>${task.task_code}</p>
					<p><strong>任务类型：</strong>${getTaskTypeText(task.task_type)}</p>
					<p><strong>优先级：</strong>${getPriorityText(task.priority)}</p>
					<p><strong>状态：</strong>${getStatusText(task.status)}</p>
					<p><strong>地址：</strong>${task.address}</p>
				</div>
			`,
			offset: new AMap.Pixel(0, -40),
		});

		marker.on("click", () => {
			infoWindow.open(viewerMap, marker.getPosition());
		});

		// 立即打开信息窗口
		infoWindow.open(viewerMap, marker.getPosition());
	} catch (error) {
		console.error("地图加载失败:", error);
		ElMessage.error("地图加载失败");
	}
};

// 确认地图选择
const confirmMapSelection = () => {
	if (!taskForm.value.longitude || !taskForm.value.latitude) {
		ElMessage.warning("请在地图上选择位置");
		return;
	}
	showMapPicker.value = false;
};

// 地图选择器关闭处理
const handleMapPickerClose = () => {
	if (pickerMap) {
		pickerMap.destroy();
		pickerMap = null;
	}
	if (mapMarker) {
		mapMarker = null;
	}
};

// 发布任务
const handleCreateTask = () => {
	resetTaskForm();
	taskDialogVisible.value = true;
};

// 重置任务表单
const resetTaskForm = () => {
	taskForm.value = {
		title: "",
		task_type: "inspection",
		priority: "medium",
		deadline: "",
		longitude: null,
		latitude: null,
		address: "",
		description: "",
		assigned_to: null,
		attachments: [],
	};
	attachmentFiles.value = [];
};

// 确认发布任务
const handleConfirmTask = async () => {
	if (!taskFormRef.value) return;

	try {
		const valid = await taskFormRef.value.validate();
		if (!valid) return;

		if (!taskForm.value.longitude || !taskForm.value.latitude) {
			ElMessage.warning("请在地图上选择位置");
			return;
		}

		taskLoading.value = true;

		const payload = {
			...taskForm.value,
			deadline: taskForm.value.deadline,
		};

		const response = await request.post("/api/government/tasks", payload, {
			headers: {
				token: localStorage.getItem("token") || "",
			},
		});

		const responseData = response as any;
		if (responseData && responseData.code === "200") {
			ElMessage.success("任务发布成功");
			taskDialogVisible.value = false;
			loadTasks();
		} else {
			ElMessage.error(responseData?.msg || "任务发布失败");
		}
	} catch (error: any) {
		console.error("发布任务失败:", error);
		ElMessage.error(error.response?.data?.detail || "任务发布失败");
	} finally {
		taskLoading.value = false;
	}
};

// 查看任务详情
const handleViewDetail = async (row: any) => {
	try {
		const response = await request.get(`/api/government/tasks/${row.id}`, {
			headers: {
				token: localStorage.getItem("token") || "",
			},
		});

		const responseData = response as any;
		if (responseData && responseData.code === "200") {
			currentTask.value = responseData.data;
			detailDialogVisible.value = true;
		}
	} catch (error) {
		console.error("获取任务详情失败:", error);
		ElMessage.error("获取任务详情失败");
	}
};

// 指派任务
const handleAssignTask = (row: any) => {
	currentTask.value = row;
	assignForm.value = {
		assigned_to: row.assigned_to?.id || null,
		remarks: "",
	};
	assignDialogVisible.value = true;
};

// 确认指派
const handleConfirmAssign = async () => {
	if (!assignForm.value.assigned_to) {
		ElMessage.warning("请选择执行人");
		return;
	}

	try {
		assignLoading.value = true;

		const payload = {
			assigned_to: assignForm.value.assigned_to,
			remarks: assignForm.value.remarks,
		};

		const response = await request.put(`/api/government/tasks/${currentTask.value.id}`, payload, {
			headers: {
				token: localStorage.getItem("token") || "",
			},
		});

		const responseData = response as any;
		if (responseData && responseData.code === "200") {
			ElMessage.success("任务指派成功");
			assignDialogVisible.value = false;
			loadTasks();
		} else {
			ElMessage.error(responseData?.msg || "任务指派失败");
		}
	} catch (error: any) {
		console.error("指派任务失败:", error);
		ElMessage.error(error.response?.data?.detail || "任务指派失败");
	} finally {
		assignLoading.value = false;
	}
};

// 更新状态
const handleUpdateStatus = (row: any) => {
	currentTask.value = row;
	statusForm.value = {
		status: row.status,
		remarks: "",
	};
	statusDialogVisible.value = true;
};

// 确认更新状态
const handleConfirmStatus = async () => {
	if (!statusForm.value.status) {
		ElMessage.warning("请选择状态");
		return;
	}

	try {
		statusLoading.value = true;

		const payload = {
			status: statusForm.value.status,
			remarks: statusForm.value.remarks,
		};

		const response = await request.put(`/api/government/tasks/${currentTask.value.id}`, payload, {
			headers: {
				token: localStorage.getItem("token") || "",
			},
		});

		const responseData = response as any;
		if (responseData && responseData.code === "200") {
			ElMessage.success("状态更新成功");
			statusDialogVisible.value = false;
			loadTasks();
			if (detailDialogVisible.value) {
				await handleViewDetail(currentTask.value);
			}
		} else {
			ElMessage.error(responseData?.msg || "状态更新失败");
		}
	} catch (error: any) {
		console.error("更新状态失败:", error);
		ElMessage.error(error.response?.data?.detail || "状态更新失败");
	} finally {
		statusLoading.value = false;
	}
};

// 地图定位
const handleShowOnMap = (row: any) => {
	currentTaskForMap.value = row;
	showMapViewer.value = true;
	nextTick(() => {
		initMapViewer(row);
	});
};

// 添加评论
const addComment = async () => {
	if (!newComment.value.trim()) return;

	try {
		const payload = {
			content: newComment.value,
			comment_type: commentType.value,
			attachments: [],
		};

		const response = await request.post(`/api/government/tasks/${currentTask.value.id}/comments`, payload, {
			headers: {
				token: localStorage.getItem("token") || "",
			},
		});

		const responseData = response as any;
		if (responseData && responseData.code === "200") {
			ElMessage.success("评论添加成功");
			newComment.value = "";
			// 重新加载任务详情
			await handleViewDetail(currentTask.value);
		} else {
			ElMessage.error(responseData?.msg || "添加评论失败");
		}
	} catch (error: any) {
		console.error("添加评论失败:", error);
		ElMessage.error(error.response?.data?.detail || "添加评论失败");
	}
};

// 图片预览
const previewImage = (url: string) => {
	window.open(url, "_blank");
};

// 文件上传处理
const handleUploadSuccess = (response: any, file: UploadFile) => {
	if (response && response.code === "200") {
		const imageId = response.data.imageId;
		taskForm.value.attachments.push(imageId);
		ElMessage.success(`${file.name} 上传成功`);
	} else {
		ElMessage.error(`${file.name} 上传失败`);
	}
};

const handleUploadError = (error: Error, file: UploadFile) => {
	console.error("上传失败:", error);
	ElMessage.error(`${file.name} 上传失败`);
};

const beforeUpload = (file: File) => {
	const isImage = file.type.startsWith("image/");
	const isLt5M = file.size / 1024 / 1024 < 5;

	if (!isImage) {
		ElMessage.error("只能上传图片文件!");
		return false;
	}
	if (!isLt5M) {
		ElMessage.error("图片大小不能超过5MB!");
		return false;
	}
	return true;
};

// 标签页切换
const handleTabChange = () => {
	currentPage.value = 1;
	loadTasks();
};

// 初始化ECharts图表
const initCharts = () => {
	if (!typeChart.value || !priorityChart.value || !trendChart.value) return;

	// 任务类型分布图
	const typeChartInstance = echarts.init(typeChart.value);
	typeChartInstance.setOption({
		tooltip: {
			trigger: "item",
			formatter: "{a} <br/>{b}: {c} ({d}%)",
		},
		legend: {
			orient: "vertical",
			left: "left",
			data: ["常规检查", "执法行动", "专项治理", "投诉处理", "其他"],
		},
		series: [
			{
				name: "任务类型",
				type: "pie",
				radius: ["50%", "70%"],
				avoidLabelOverlap: false,
				label: {
					show: false,
					position: "center",
				},
				emphasis: {
					label: {
						show: true,
						fontSize: "20",
						fontWeight: "bold",
					},
				},
				labelLine: {
					show: false,
				},
				data: [
					{ value: statistics.value.by_type?.inspection || 0, name: "常规检查" },
					{ value: statistics.value.by_type?.enforcement || 0, name: "执法行动" },
					{ value: statistics.value.by_type?.special || 0, name: "专项治理" },
					{ value: statistics.value.by_type?.complaint || 0, name: "投诉处理" },
					{ value: statistics.value.by_type?.other || 0, name: "其他" },
				],
			},
		],
	});

	// 优先级分布图
	const priorityChartInstance = echarts.init(priorityChart.value);
	priorityChartInstance.setOption({
		tooltip: {
			trigger: "axis",
			axisPointer: {
				type: "shadow",
			},
		},
		xAxis: {
			type: "category",
			data: ["紧急", "高", "中", "低"],
		},
		yAxis: {
			type: "value",
		},
		series: [
			{
				name: "任务数量",
				type: "bar",
				data: [
					statistics.value.by_priority?.urgent || 0,
					statistics.value.by_priority?.high || 0,
					statistics.value.by_priority?.medium || 0,
					statistics.value.by_priority?.low || 0,
				],
				itemStyle: {
					color: function (params: any) {
						const colors = ["#f56c6c", "#e6a23c", "#409eff", "#909399"];
						return colors[params.dataIndex] || "#409eff";
					},
				},
			},
		],
	});

	// 任务趋势图（模拟数据）
	const trendChartInstance = echarts.init(trendChart.value);
	const dates = [];
	const today = new Date();
	for (let i = 6; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		dates.push(`${date.getMonth() + 1}-${date.getDate()}`);
	}

	trendChartInstance.setOption({
		tooltip: {
			trigger: "axis",
		},
		legend: {
			data: ["新增任务", "完成任务"],
		},
		xAxis: {
			type: "category",
			boundaryGap: false,
			data: dates,
		},
		yAxis: {
			type: "value",
		},
		series: [
			{
				name: "新增任务",
				type: "line",
				smooth: true,
				data: [12, 8, 15, 20, 18, 25, 22],
			},
			{
				name: "完成任务",
				type: "line",
				smooth: true,
				data: [8, 12, 10, 15, 20, 18, 25],
			},
		],
	});
};

// 显示统计时初始化图表
watch(showTaskStatistics, async (val) => {
	if (val) {
		await loadStatistics();
		await nextTick();
		initCharts();
	}
});

// 监听地图查看器对话框
watch(showMapViewer, (val) => {
	if (!val && viewerMap) {
		viewerMap.destroy();
		viewerMap = null;
	}
});

// 监听地图选择器对话框
watch(showMapPicker, (val) => {
	if (val) {
		nextTick(() => {
			initMapPicker();
		});
	}
});

// 组件挂载时加载数据
onMounted(() => {
	loadTasks();
	loadGovernmentUsers();
});
</script>

<style scoped>
.government-management .toolbar-card {
	margin-bottom: 20px;
}

.government-management .toolbar-card .toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.government-management .table-card {
	margin-bottom: 20px;
}

.government-management .table-card .pagination {
	margin-top: 20px;
	display: flex;
	justify-content: flex-end;
}

.map-selector {
	border: 1px solid #dcdfe6;
	border-radius: 4px;
	padding: 10px;
}

.map-info {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.location-info {
	padding: 10px;
	background-color: #f5f7fa;
	border-radius: 4px;
	font-size: 14px;
}

.coordinate {
	color: #909399;
	font-size: 12px;
}

.map-picker-container {
	display: flex;
	flex-direction: column;
	height: 70vh;
}

.map-wrapper {
	flex: 1;
	margin-bottom: 20px;
}

.map-picker {
	width: 100%;
	height: 100%;
	border-radius: 4px;
	overflow: hidden;
}

.map-controls {
	display: flex;
	justify-content: center;
	gap: 10px;
	padding: 10px;
}

.map-viewer-container {
	height: 70vh;
}

.map-viewer {
	width: 100%;
	height: 100%;
	border-radius: 4px;
	overflow: hidden;
}

.task-detail {
	max-height: 70vh;
	overflow-y: auto;
	padding-right: 10px;
}

.task-attachments {
	margin-top: 20px;
}

.attachment-list {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin-top: 10px;
}

.attachment-item {
	width: 100px;
	height: 100px;
	border: 1px solid #dcdfe6;
	border-radius: 4px;
	overflow: hidden;
	cursor: pointer;
}

.attachment-item img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.task-history,
.task-comments {
	margin-top: 20px;
}

.comment-item {
	border: 1px solid #ebeef5;
	border-radius: 4px;
	padding: 10px;
	margin-bottom: 10px;
	background-color: #fafafa;
}

.comment-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
}

.comment-author {
	font-weight: bold;
	color: #409eff;
}

.comment-time {
	color: #909399;
	font-size: 12px;
}

.comment-content {
	margin-bottom: 10px;
}

.comment-attachments {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}

.comment-attachment {
	width: 60px;
	height: 60px;
	border: 1px solid #dcdfe6;
	border-radius: 4px;
	overflow: hidden;
	cursor: pointer;
}

.comment-attachment img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.comment-form {
	margin-top: 20px;
}

.comment-actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 10px;
}

.statistics-content {
	padding: 20px;
}

.statistics-cards {
	margin-bottom: 20px;
}

.stat-card {
	text-align: center;
	padding: 20px;
}

.stat-value {
	font-size: 32px;
	font-weight: bold;
	color: #409eff;
	margin-bottom: 10px;
}

.stat-label {
	font-size: 14px;
	color: #909399;
}

.charts-row {
	margin-bottom: 20px;
}

.charts-row h4 {
	margin: 0 0 20px 0;
	text-align: center;
	color: #333;
}

/* 自定义滚动条 */
.task-detail::-webkit-scrollbar {
	width: 6px;
}

.task-detail::-webkit-scrollbar-track {
	background: #f1f1f1;
	border-radius: 3px;
}

.task-detail::-webkit-scrollbar-thumb {
	background: #c1c1c1;
	border-radius: 3px;
}

.task-detail::-webkit-scrollbar-thumb:hover {
	background: #a8a8a8;
}
</style>
