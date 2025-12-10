<template>
	<div class="manager-dashboard">
		<!-- 数据资产总览卡片 -->
		<el-row :gutter="20" class="stats-row">
			<el-col :span="6">
				<el-card class="stat-card">
					<div class="stat-content">
						<div class="stat-icon" style="background-color: #409eff">
							<el-icon><Picture /></el-icon>
						</div>
						<div class="stat-info">
							<div class="stat-value">{{ stats.totalPanoramas }}</div>
							<div class="stat-label">全景图数据总量</div>
						</div>
					</div>
				</el-card>
			</el-col>
			<el-col :span="6">
				<el-card class="stat-card">
					<div class="stat-content">
						<div class="stat-icon" style="background-color: #e6a23c">
							<el-icon><Clock /></el-icon>
						</div>
						<div class="stat-info">
							<div class="stat-value">{{ stats.pendingReview }}</div>
							<div class="stat-label">待审核数据条数</div>
						</div>
					</div>
				</el-card>
			</el-col>
			<el-col :span="6">
				<el-card class="stat-card">
					<div class="stat-content">
						<div class="stat-icon" style="background-color: #67c23a">
							<el-icon><TrendCharts /></el-icon>
						</div>
						<div class="stat-info">
							<div class="stat-value">{{ stats.weeklyNew }}</div>
							<div class="stat-label">本周新增数据</div>
						</div>
					</div>
				</el-card>
			</el-col>
			<el-col :span="6">
				<el-card class="stat-card">
					<div class="stat-content">
						<div class="stat-icon" style="background-color: #f56c6c">
							<el-icon><User /></el-icon>
						</div>
						<div class="stat-info">
							<div class="stat-value">{{ stats.onlineUsers }}</div>
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
							<el-button text @click="refreshStats">
								<el-icon><Refresh /></el-icon>
								刷新
							</el-button>
						</div>
					</template>
					<div class="health-metrics">
						<div class="metric-item">
							<div class="metric-label">CPU使用率</div>
							<el-progress
								:percentage="stats.systemHealth.cpu"
								:color="getHealthColor(stats.systemHealth.cpu)"
								:stroke-width="20"
							/>
							<div class="metric-value">{{ stats.systemHealth.cpu }}%</div>
						</div>
						<div class="metric-item">
							<div class="metric-label">内存使用率</div>
							<el-progress
								:percentage="stats.systemHealth.memory"
								:color="getHealthColor(stats.systemHealth.memory)"
								:stroke-width="20"
							/>
							<div class="metric-value">{{ stats.systemHealth.memory }}%</div>
						</div>
						<div class="metric-item">
							<div class="metric-label">磁盘使用率</div>
							<el-progress
								:percentage="stats.systemHealth.disk"
								:color="getHealthColor(stats.systemHealth.disk)"
								:stroke-width="20"
							/>
							<div class="metric-value">{{ stats.systemHealth.disk }}%</div>
						</div>
					</div>
				</el-card>
			</el-col>
			<el-col :span="12">
				<el-card class="chart-card">
					<template #header>
						<div class="card-header">
							<span>用户访问统计</span>
						</div>
					</template>
					<div class="user-stats">
						<div class="user-stat-item">
							<div class="user-stat-value">{{ stats.onlineUsers }}</div>
							<div class="user-stat-label">当前在线用户</div>
						</div>
						<div class="user-stat-item">
							<div class="user-stat-value">{{ stats.todayActiveUsers }}</div>
							<div class="user-stat-label">今日活跃用户</div>
						</div>
					</div>
				</el-card>
			</el-col>
		</el-row>

		<!-- 快速操作区 -->
		<el-card class="quick-actions-card">
			<template #header>
				<div class="card-header">
					<span>快速操作</span>
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

const router = useRouter();
const stats = ref({
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

const loadStats = async () => {
	try {
		const response = await request.get("/api/manager/dashboard/stats");
		if (response.code === "200" && response.data) {
			stats.value = response.data;
		}
	} catch (error) {
		console.error("加载统计数据失败:", error);
	}
};

const refreshStats = () => {
	loadStats();
	ElMessage.success("数据已刷新");
};

const getHealthColor = (value: number) => {
	if (value >= 90) return "#f56c6c";
	if (value >= 70) return "#e6a23c";
	return "#67c23a";
};

const goToUpload = () => {
	router.push("/manager/data");
	ElMessage.info("请使用数据更新管理页面的上传功能");
};

const goToReview = () => {
	router.push({ path: "/manager/data", query: { status: "pending" } });
};

const goToUsers = () => {
	router.push("/manager/users");
};

onMounted(() => {
	loadStats();
	// 每30秒自动刷新
	refreshTimer = setInterval(loadStats, 30000);
});

onUnmounted(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer);
	}
});
</script>

<style scoped>
.manager-dashboard .stats-row {
	margin-bottom: 20px;
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
}

.manager-dashboard .stat-card .stat-content .stat-info {
	flex: 1;
}

.manager-dashboard .stat-card .stat-content .stat-info .stat-value {
	font-size: 28px;
	font-weight: 600;
	color: #303133;
	margin-bottom: 5px;
}

.manager-dashboard .stat-card .stat-content .stat-info .stat-label {
	font-size: 14px;
	color: #909399;
}

.manager-dashboard .charts-row {
	margin-bottom: 20px;
}

.manager-dashboard .chart-card .card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.manager-dashboard .chart-card .health-metrics .metric-item {
	margin-bottom: 20px;
}

.manager-dashboard .chart-card .health-metrics .metric-item:last-child {
	margin-bottom: 0;
}

.manager-dashboard .chart-card .health-metrics .metric-item .metric-label {
	font-size: 14px;
	color: #606266;
	margin-bottom: 8px;
}

.manager-dashboard .chart-card .health-metrics .metric-item .metric-value {
	font-size: 16px;
	font-weight: 600;
	color: #303133;
	margin-top: 8px;
	text-align: right;
}

.manager-dashboard .chart-card .user-stats {
	display: flex;
	justify-content: space-around;
	padding: 20px 0;
}

.manager-dashboard .chart-card .user-stats .user-stat-item {
	text-align: center;
}

.manager-dashboard .chart-card .user-stats .user-stat-item .user-stat-value {
	font-size: 36px;
	font-weight: 600;
	color: #409eff;
	margin-bottom: 10px;
}

.manager-dashboard .chart-card .user-stats .user-stat-item .user-stat-label {
	font-size: 14px;
	color: #909399;
}

.manager-dashboard .quick-actions-card .quick-actions {
	display: flex;
	gap: 20px;
	justify-content: center;
}
</style>

