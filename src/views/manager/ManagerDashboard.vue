<template>
	<div class="manager-dashboard">
		<!-- 数据资产总览卡片 -->
		<el-row :gutter="20" class="stats-row">
			<el-col :span="6">
				<el-card class="stat-card" :class="{ 'is-loading': loading }">
					<div class="stat-content">
						<div class="stat-icon" style="background-color: #409eff">
							<el-icon><Picture /></el-icon>
						</div>
						<div class="stat-info">
							<div class="stat-value">
								<span v-if="!loading">{{ stats.totalPanoramas }}</span>
								<el-skeleton v-else :rows="1" animated class="stat-skeleton" />
							</div>
							<div class="stat-label">全景图数据总量</div>
						</div>
					</div>
				</el-card>
			</el-col>
			<el-col :span="6">
				<el-card class="stat-card" :class="{ 'is-loading': loading }">
					<div class="stat-content">
						<div class="stat-icon" style="background-color: #e6a23c">
							<el-icon><Clock /></el-icon>
						</div>
						<div class="stat-info">
							<div class="stat-value">
								<span v-if="!loading">{{ stats.pendingReview }}</span>
								<el-skeleton v-else :rows="1" animated class="stat-skeleton" />
							</div>
							<div class="stat-label">待审核数据条数</div>
						</div>
					</div>
				</el-card>
			</el-col>
			<el-col :span="6">
				<el-card class="stat-card" :class="{ 'is-loading': loading }">
					<div class="stat-content">
						<div class="stat-icon" style="background-color: #67c23a">
							<el-icon><TrendCharts /></el-icon>
						</div>
						<div class="stat-info">
							<div class="stat-value">
								<span v-if="!loading">{{ stats.weeklyNew }}</span>
								<el-skeleton v-else :rows="1" animated class="stat-skeleton" />
							</div>
							<div class="stat-label">本周新增数据</div>
						</div>
					</div>
				</el-card>
			</el-col>
			<el-col :span="6">
				<el-card class="stat-card" :class="{ 'is-loading': loading }">
					<div class="stat-content">
						<div class="stat-icon" style="background-color: #f56c6c">
							<el-icon><User /></el-icon>
						</div>
						<div class="stat-info">
							<div class="stat-value">
								<span v-if="!loading">{{ stats.onlineUsers }}</span>
								<el-skeleton v-else :rows="1" animated class="stat-skeleton" />
							</div>
							<div class="stat-label">当前在线用户数</div>
						</div>
					</div>
				</el-card>
			</el-col>
		</el-row>

		<!-- 系统实时健康卡和用户访问统计 -->
		<el-row :gutter="20" class="charts-row">
			<el-col :span="12">
				<el-card class="chart-card">
					<template #header>
						<div class="card-header">
							<span>系统实时健康</span>
							<el-button 
								text 
								@click="refreshStats" 
								:loading="refreshing"
								:disabled="refreshing"
							>
								<el-icon><Refresh /></el-icon>
								{{ refreshing ? '刷新中...' : '刷新' }}
							</el-button>
						</div>
					</template>
					<div class="health-metrics" v-loading="loading" element-loading-background="rgba(255, 255, 255, 0.5)">
						<div class="metric-item">
							<div class="metric-label">
								<span>CPU使用率</span>
								<el-tag 
									:type="getHealthTagType(stats.systemHealth.cpu)" 
									size="small" 
									effect="light" 
									v-if="stats.systemHealth.cpu > 0 && !loading"
								>
									{{ getHealthStatusText(stats.systemHealth.cpu) }}
								</el-tag>
							</div>
							<el-progress
								:percentage="stats.systemHealth.cpu"
								:color="getHealthColor(stats.systemHealth.cpu)"
								:stroke-width="20"
								:status="getHealthStatus(stats.systemHealth.cpu)"
								:indeterminate="loading"
							/>
							<div class="metric-value" v-if="!loading">{{ stats.systemHealth.cpu }}%</div>
							<div class="metric-value" v-else>--%</div>
						</div>
						<div class="metric-item">
							<div class="metric-label">
								<span>内存使用率</span>
								<el-tag 
									:type="getHealthTagType(stats.systemHealth.memory)" 
									size="small" 
									effect="light" 
									v-if="stats.systemHealth.memory > 0 && !loading"
								>
									{{ getHealthStatusText(stats.systemHealth.memory) }}
								</el-tag>
							</div>
							<el-progress
								:percentage="stats.systemHealth.memory"
								:color="getHealthColor(stats.systemHealth.memory)"
								:stroke-width="20"
								:status="getHealthStatus(stats.systemHealth.memory)"
								:indeterminate="loading"
							/>
							<div class="metric-value" v-if="!loading">{{ stats.systemHealth.memory }}%</div>
							<div class="metric-value" v-else>--%</div>
						</div>
						<div class="metric-item">
							<div class="metric-label">
								<span>磁盘使用率</span>
								<el-tag 
									:type="getHealthTagType(stats.systemHealth.disk)" 
									size="small" 
									effect="light" 
									v-if="stats.systemHealth.disk > 0 && !loading"
								>
									{{ getHealthStatusText(stats.systemHealth.disk) }}
								</el-tag>
							</div>
							<el-progress
								:percentage="stats.systemHealth.disk"
								:color="getHealthColor(stats.systemHealth.disk)"
								:stroke-width="20"
								:status="getHealthStatus(stats.systemHealth.disk)"
								:indeterminate="loading"
							/>
							<div class="metric-value" v-if="!loading">{{ stats.systemHealth.disk }}%</div>
							<div class="metric-value" v-else>--%</div>
						</div>
						
						<!-- 更新时间显示 -->
						<div class="update-time" v-if="lastUpdateTime">
							<el-text type="info" size="small">最后更新: {{ lastUpdateTime }}</el-text>
						</div>
					</div>
				</el-card>
			</el-col>
			<el-col :span="12">
				<el-card class="chart-card">
					<template #header>
						<div class="card-header">
							<span>用户访问统计</span>
							<el-tag type="info" size="small">实时</el-tag>
						</div>
					</template>
					<div class="user-stats" v-loading="loading" element-loading-background="rgba(255, 255, 255, 0.5)">
						<div class="user-stat-item">
							<div class="user-stat-value" v-if="!loading">{{ stats.onlineUsers }}</div>
							<el-skeleton v-else :rows="1" animated class="stat-skeleton-large" />
							<div class="user-stat-label">当前在线用户</div>
							<div class="user-stat-trend" v-if="stats.onlineUsers > 0 && !loading">
								<el-icon><UserFilled /></el-icon>
							</div>
						</div>
						<div class="user-stat-item">
							<div class="user-stat-value" v-if="!loading">{{ stats.todayActiveUsers }}</div>
							<el-skeleton v-else :rows="1" animated class="stat-skeleton-large" />
							<div class="user-stat-label">今日活跃用户</div>
							<div class="user-stat-trend" v-if="stats.todayActiveUsers > 0 && !loading">
								<el-icon><TrendCharts /></el-icon>
							</div>
						</div>
					</div>
					
					<!-- 地点统计信息 -->
					<div class="location-stats" v-if="stats.locationsWithPanorama !== undefined && !loading">
						<el-divider />
						<div class="location-stat-item">
							<span class="location-stat-label">已关联全景图的地点</span>
							<span class="location-stat-value">{{ stats.locationsWithPanorama }}</span>
						</div>
						<div class="location-stat-item">
							<span class="location-stat-label">总地点数</span>
							<span class="location-stat-value">{{ stats.totalLocations || 0 }}</span>
						</div>
						<div class="location-stat-item">
							<span class="location-stat-label">关联率</span>
							<span class="location-stat-value">
								{{ stats.totalLocations ? ((stats.locationsWithPanorama / stats.totalLocations) * 100).toFixed(1) : 0 }}%
							</span>
						</div>
					</div>
					<div v-else-if="loading" class="location-stats-skeleton">
						<el-skeleton :rows="3" animated />
					</div>
				</el-card>
			</el-col>
		</el-row>

		<!-- 快速操作区 -->
		<el-card class="quick-actions-card">
			<template #header>
				<div class="card-header">
					<span>快速操作</span>
					<el-tag type="success" size="small">快捷入口</el-tag>
				</div>
			</template>
			<div class="quick-actions">
				<el-button type="primary" size="large" @click="goToUpload">
					<el-icon><Upload /></el-icon>
					快速上传数据
				</el-button>
				<el-button type="warning" size="large" @click="goToReview">
					<el-icon><DocumentChecked /></el-icon>
					审核队列
					<el-badge v-if="stats.pendingReview > 0" :value="stats.pendingReview" class="review-badge" />
				</el-button>
				<el-button type="success" size="large" @click="goToUsers">
					<el-icon><UserFilled /></el-icon>
					管理用户
				</el-button>
			</div>
		</el-card>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
	Picture,
	Clock,
	TrendCharts,
	User,
	Refresh,
	Upload,
	DocumentChecked,
	UserFilled,
} from "@element-plus/icons-vue";
import request from "@/api/request";
import dayjs from "dayjs";

const router = useRouter();
const loading = ref(false);
const refreshing = ref(false);
const lastUpdateTime = ref<string>("");

// 统计数据接口定义
interface SystemHealth {
	cpu: number;
	memory: number;
	disk: number;
}

interface DashboardStats {
	totalPanoramas: number;
	pendingReview: number;
	weeklyNew: number;
	onlineUsers: number;
	todayActiveUsers: number;
	locationsWithPanorama?: number;
	totalLocations?: number;
	systemHealth: SystemHealth;
}

const stats = ref<DashboardStats>({
	totalPanoramas: 0,
	pendingReview: 0,
	weeklyNew: 0,
	onlineUsers: 0,
	todayActiveUsers: 0,
	systemHealth: {
		cpu: 0,
		memory: 0,
		disk: 0,
	},
});

let refreshTimer: any = null;

// 获取健康状态颜色
const getHealthColor = (value: number) => {
	if (value >= 90) return "#f56c6c";
	if (value >= 70) return "#e6a23c";
	return "#67c23a";
};

// 获取健康状态类型
const getHealthStatus = (value: number): "success" | "warning" | "exception" => {
	if (value >= 90) return "exception";
	if (value >= 70) return "warning";
	return "success";
};

// 获取健康标签类型
const getHealthTagType = (value: number): "danger" | "warning" | "success" => {
	if (value >= 90) return "danger";
	if (value >= 70) return "warning";
	return "success";
};

// 获取健康状态文本
const getHealthStatusText = (value: number): string => {
	if (value >= 90) return "严重";
	if (value >= 70) return "警告";
	return "良好";
};

// 加载统计数据
const loadStats = async (isManualRefresh = false) => {
	if (isManualRefresh) {
		refreshing.value = true;
	} else {
		loading.value = true;
	}
	
	try {
		const response = await request.get("/api/manager/dashboard/stats");
		if (response.code === "200" && response.data) {
			stats.value = response.data;
			lastUpdateTime.value = dayjs().format("HH:mm:ss");
			
			// 只在手动刷新或首次加载时显示提示
			if (isManualRefresh) {
				ElMessage.success("数据已刷新");
			} else {
				// 根据系统健康状态显示提示（只在首次加载时）
				const health = response.data.systemHealth;
				if (health.cpu > 90) {
					ElMessage.warning("CPU使用率过高，请关注系统状态！");
				}
				if (health.memory > 90) {
					ElMessage.warning("内存使用率过高，请关注系统状态！");
				}
				if (health.disk > 90) {
					ElMessage.warning("磁盘使用率过高，请及时清理！");
				}
				
				// 如果有待审核数据，显示提示
				if (response.data.pendingReview > 0) {
					ElMessage.info(`有 ${response.data.pendingReview} 条数据待审核`);
				}
			}
		}
	} catch (error) {
		console.error("加载统计数据失败:", error);
		if (isManualRefresh) {
			ElMessage.error("刷新失败，请稍后重试");
		}
	} finally {
		if (isManualRefresh) {
			refreshing.value = false;
		} else {
			loading.value = false;
		}
	}
};

// 刷新统计数据
const refreshStats = () => {
	loadStats(true);
};

// 跳转到上传页面
const goToUpload = () => {
	router.push("/manager/data");
	ElMessage.info("请使用数据更新管理页面的上传功能");
};

// 跳转到审核队列
const goToReview = () => {
	router.push({ path: "/manager/data", query: { status: "pending" } });
};

// 跳转到用户管理
const goToUsers = () => {
	router.push("/manager/users");
};

onMounted(() => {
	loadStats();
	// 每30秒自动刷新，但不显示加载动画
	refreshTimer = setInterval(() => {
		loadStats(false);
	}, 30000);
});

onUnmounted(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer);
	}
});
</script>

<style scoped>
.manager-dashboard {
	position: relative;
	min-height: 400px;
}

.manager-dashboard .stats-row {
	margin-bottom: 20px;
}

.manager-dashboard .stat-card {
	transition: all 0.3s ease;
}

.manager-dashboard .stat-card:hover {
	transform: translateY(-5px);
	box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.manager-dashboard .stat-card.is-loading {
	opacity: 0.8;
}

.manager-dashboard .stat-card .stat-content {
	display: flex;
	align-items: center;
}

.manager-dashboard .stat-card .stat-content .stat-icon {
	width: 60px;
	height: 60px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 15px;
	color: #fff;
	font-size: 24px;
	transition: all 0.3s ease;
}

.manager-dashboard .stat-card:hover .stat-icon {
	transform: scale(1.1);
}

.manager-dashboard .stat-card .stat-content .stat-info {
	flex: 1;
}

.manager-dashboard .stat-card .stat-content .stat-info .stat-value {
	font-size: 28px;
	font-weight: 600;
	color: #303133;
	margin-bottom: 5px;
	min-height: 42px;
}

.manager-dashboard .stat-card .stat-content .stat-info .stat-label {
	font-size: 14px;
	color: #909399;
}

.manager-dashboard .stat-skeleton {
	width: 80px;
	height: 28px;
}

.manager-dashboard .stat-skeleton-large {
	width: 60px;
	height: 36px;
	margin: 0 auto;
}

.manager-dashboard .charts-row {
	margin-bottom: 20px;
}

.manager-dashboard .chart-card {
	height: 100%;
}

.manager-dashboard .chart-card .card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.manager-dashboard .chart-card .health-metrics {
	min-height: 200px;
	padding: 10px;
}

.manager-dashboard .chart-card .health-metrics .metric-item {
	margin-bottom: 20px;
	padding: 10px;
	border-radius: 4px;
	transition: background-color 0.3s ease;
}

.manager-dashboard .chart-card .health-metrics .metric-item:hover {
	background-color: #f5f7fa;
}

.manager-dashboard .chart-card .health-metrics .metric-item:last-child {
	margin-bottom: 0;
}

.manager-dashboard .chart-card .health-metrics .metric-item .metric-label {
	font-size: 14px;
	color: #606266;
	margin-bottom: 8px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.manager-dashboard .chart-card .health-metrics .metric-item .metric-value {
	font-size: 16px;
	font-weight: 600;
	color: #303133;
	margin-top: 8px;
	text-align: right;
	min-height: 24px;
}

.manager-dashboard .chart-card .health-metrics .update-time {
	margin-top: 15px;
	text-align: right;
}

.manager-dashboard .chart-card .user-stats {
	display: flex;
	justify-content: space-around;
	padding: 20px 0;
	min-height: 150px;
}

.manager-dashboard .chart-card .user-stats .user-stat-item {
	text-align: center;
	position: relative;
	padding: 15px;
	border-radius: 8px;
	transition: all 0.3s ease;
	flex: 1;
	margin: 0 10px;
}

.manager-dashboard .chart-card .user-stats .user-stat-item:hover {
	background-color: #f5f7fa;
	transform: translateY(-3px);
}

.manager-dashboard .chart-card .user-stats .user-stat-item .user-stat-value {
	font-size: 36px;
	font-weight: 600;
	color: #409eff;
	margin-bottom: 10px;
	min-height: 54px;
}

.manager-dashboard .chart-card .user-stats .user-stat-item .user-stat-label {
	font-size: 14px;
	color: #909399;
}

.manager-dashboard .chart-card .user-stats .user-stat-item .user-stat-trend {
	position: absolute;
	top: 5px;
	right: 5px;
	color: #67c23a;
}

.manager-dashboard .chart-card .location-stats {
	padding: 10px 0;
}

.manager-dashboard .chart-card .location-stats .location-stat-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 15px;
	border-radius: 4px;
	transition: background-color 0.3s ease;
}

.manager-dashboard .chart-card .location-stats .location-stat-item:hover {
	background-color: #f5f7fa;
}

.manager-dashboard .chart-card .location-stats .location-stat-item .location-stat-label {
	font-size: 14px;
	color: #606266;
}

.manager-dashboard .chart-card .location-stats .location-stat-item .location-stat-value {
	font-size: 16px;
	font-weight: 600;
	color: #67c23a;
}

.manager-dashboard .chart-card .location-stats-skeleton {
	padding: 20px;
}

.manager-dashboard .quick-actions-card {
	margin-top: 20px;
}

.manager-dashboard .quick-actions-card .quick-actions {
	display: flex;
	gap: 20px;
	justify-content: center;
	flex-wrap: wrap;
}

.manager-dashboard .quick-actions-card .quick-actions .el-button {
	min-width: 160px;
	transition: all 0.3s ease;
}

.manager-dashboard .quick-actions-card .quick-actions .el-button:hover {
	transform: translateY(-3px);
	box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.manager-dashboard .quick-actions-card .quick-actions .review-badge {
	margin-left: 5px;
}

/* 响应式布局 */
@media (max-width: 768px) {
	.manager-dashboard .stats-row .el-col {
		margin-bottom: 20px;
	}
	
	.manager-dashboard .quick-actions-card .quick-actions {
		flex-direction: column;
		align-items: stretch;
	}
	
	.manager-dashboard .quick-actions-card .quick-actions .el-button {
		width: 100%;
	}
}
</style>