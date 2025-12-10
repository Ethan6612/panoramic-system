<template>
	<div class="system-monitor">
		<!-- 选项卡 -->
		<el-tabs v-model="activeTab" @tab-change="handleTabChange">
			<!-- 性能监控页 -->
			<el-tab-pane label="性能监控" name="performance">
				<el-card>
					<template #header>
						<div class="card-header">
							<span>性能监控</span>
							<div>
								<el-select v-model="timeRange" style="width: 150px" @change="loadPerformanceData">
									<el-option label="最近1小时" value="1h" />
									<el-option label="今日" value="today" />
									<el-option label="本周" value="week" />
								</el-select>
								<el-button text @click="loadPerformanceData" style="margin-left: 10px">
									<el-icon><Refresh /></el-icon>
									刷新
								</el-button>
							</div>
						</div>
					</template>
					<div class="performance-charts">
						<el-row :gutter="20">
							<el-col :span="12">
								<div class="chart-container">
									<div class="chart-title">CPU/内存使用率趋势</div>
									<div class="chart-placeholder">
										<div class="chart-mock">
											<div
												v-for="(item, index) in performanceData.slice(0, 10)"
												:key="index"
												class="chart-bar"
												:style="{
													height: `${item.cpu}%`,
													backgroundColor: item.cpu > 80 ? '#f56c6c' : item.cpu > 60 ? '#e6a23c' : '#67c23a',
												}"
											/>
										</div>
										<div class="chart-labels">
											<span>CPU</span>
											<span>内存</span>
										</div>
									</div>
								</div>
							</el-col>
							<el-col :span="12">
								<div class="chart-container">
									<div class="chart-title">磁盘IOPS与容量</div>
									<div class="chart-placeholder">
										<div class="chart-mock">
											<div
												v-for="(item, index) in performanceData.slice(0, 10)"
												:key="index"
												class="chart-bar"
												:style="{
													height: `${item.diskIOPS / 10}%`,
													backgroundColor: '#409eff',
												}"
											/>
										</div>
										<div class="chart-labels">
											<span>IOPS</span>
											<span>容量</span>
										</div>
									</div>
								</div>
							</el-col>
						</el-row>
						<el-row :gutter="20" style="margin-top: 20px">
							<el-col :span="24">
								<div class="chart-container">
									<div class="chart-title">API接口平均响应时间</div>
									<div class="chart-placeholder">
										<div class="chart-line-mock">
											<div
												v-for="(item, index) in performanceData"
												:key="index"
												class="chart-point"
												:style="{
													left: `${(index / (performanceData.length - 1)) * 100}%`,
													bottom: `${(item.apiResponseTime / 500) * 100}%`,
												}"
											/>
										</div>
										<div class="chart-labels">
											<span>响应时间(ms)</span>
										</div>
									</div>
								</div>
							</el-col>
						</el-row>
					</div>
				</el-card>
			</el-tab-pane>

			<!-- 服务状态页 -->
			<el-tab-pane label="服务状态" name="services">
				<el-card>
					<template #header>
						<div class="card-header">
							<span>服务状态</span>
							<el-button text @click="loadServiceData">
								<el-icon><Refresh /></el-icon>
								刷新
							</el-button>
						</div>
					</template>
					<el-row :gutter="20">
						<el-col
							v-for="service in serviceData"
							:key="service.name"
							:span="8"
							style="margin-bottom: 20px"
						>
							<el-card
								class="service-card"
								:class="{
									'status-normal': service.status === 'normal',
									'status-warning': service.status === 'warning',
									'status-error': service.status === 'error',
								}"
								@click="handleViewServiceLog(service)"
							>
								<div class="service-content">
									<div class="service-header">
										<div class="service-name">{{ service.name }}</div>
										<el-tag
											:type="
												service.status === 'normal'
													? 'success'
													: service.status === 'warning'
													? 'warning'
													: 'danger'
											"
										>
											{{ service.statusText }}
										</el-tag>
									</div>
									<div class="service-info">
										<div class="service-item">
											<span class="service-label">运行时间:</span>
											<span class="service-value">{{ service.uptime }}</span>
										</div>
										<div class="service-item">
											<span class="service-label">最后检查:</span>
											<span class="service-value">{{ service.lastCheck }}</span>
										</div>
									</div>
								</div>
							</el-card>
						</el-col>
					</el-row>
				</el-card>
			</el-tab-pane>

			<!-- 操作审计页 -->
			<el-tab-pane label="操作审计" name="logs">
				<el-card>
					<template #header>
						<div class="card-header">
							<span>操作审计</span>
							<div>
								<el-input
									v-model="logSearchKeyword"
									placeholder="搜索操作者"
									style="width: 200px; margin-right: 10px"
									clearable
									@keyup.enter="loadLogData"
								>
									<template #prefix>
										<el-icon><Search /></el-icon>
									</template>
								</el-input>
								<el-select
									v-model="logActionType"
									placeholder="操作类型"
									style="width: 150px; margin-right: 10px"
									clearable
									@change="loadLogData"
								>
									<el-option label="登录" value="登录" />
									<el-option label="权限修改" value="权限修改" />
									<el-option label="数据发布" value="数据发布" />
									<el-option label="数据删除" value="数据删除" />
									<el-option label="用户创建" value="用户创建" />
									<el-option label="用户禁用" value="用户禁用" />
								</el-select>
								<el-button text @click="loadLogData">
									<el-icon><Refresh /></el-icon>
									刷新
								</el-button>
							</div>
						</div>
					</template>
					<el-table v-loading="logLoading" :data="logData" stripe>
						<el-table-column prop="operator" label="操作者" width="120" />
						<el-table-column prop="action" label="操作类型" width="120" />
						<el-table-column prop="target" label="操作对象" min-width="150" />
						<el-table-column prop="time" label="操作时间" width="180" />
						<el-table-column prop="ip" label="IP地址" width="150" />
						<el-table-column label="结果" width="100">
							<template #default="{ row }">
								<el-tag :type="row.result === '成功' ? 'success' : 'danger'">
									{{ row.result }}
								</el-tag>
							</template>
						</el-table-column>
					</el-table>
					<div class="pagination">
						<el-pagination
							v-model:current-page="logCurrentPage"
							v-model:page-size="logPageSize"
							:page-sizes="[10, 20, 50, 100]"
							:total="logTotal"
							layout="total, sizes, prev, pager, next, jumper"
							@size-change="loadLogData"
							@current-change="loadLogData"
						/>
					</div>
				</el-card>
			</el-tab-pane>
		</el-tabs>

		<!-- 服务日志对话框 -->
		<el-dialog v-model="serviceLogDialogVisible" :title="`${selectedService?.name} - 运行日志`" width="80%">
			<div class="service-log-content">
				<el-scrollbar height="400px">
					<div v-for="(log, index) in serviceLogs" :key="index" class="log-item">
						<span class="log-time">{{ log.time }}</span>
						<span class="log-level" :class="`log-${log.level}`">{{ log.level }}</span>
						<span class="log-message">{{ log.message }}</span>
					</div>
				</el-scrollbar>
			</div>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Refresh, Search } from "@element-plus/icons-vue";
import request from "@/api/request";

const activeTab = ref("performance");
const timeRange = ref("1h");
const performanceData = ref<any[]>([]);

const serviceData = ref<any[]>([]);

const logLoading = ref(false);
const logData = ref<any[]>([]);
const logCurrentPage = ref(1);
const logPageSize = ref(10);
const logTotal = ref(0);
const logSearchKeyword = ref("");
const logActionType = ref("");

const serviceLogDialogVisible = ref(false);
const selectedService = ref<any>(null);
const serviceLogs = ref([
	{ time: "2025-01-15 10:30:00", level: "INFO", message: "服务启动成功" },
	{ time: "2025-01-15 10:29:55", level: "INFO", message: "正在初始化..." },
	{ time: "2025-01-15 10:29:50", level: "WARN", message: "检测到配置变更" },
]);

const loadPerformanceData = async () => {
	try {
		const response = await request.get("/api/manager/monitor/performance", {
			params: {
				timeRange: timeRange.value,
			},
		});
		if (response.code === "200" && response.data) {
			performanceData.value = response.data;
		}
	} catch (error) {
		ElMessage.error("加载性能数据失败");
	}
};

const loadServiceData = async () => {
	try {
		const response = await request.get("/api/manager/monitor/services");
		if (response.code === "200" && response.data) {
			serviceData.value = response.data;
		}
	} catch (error) {
		ElMessage.error("加载服务状态失败");
	}
};

const loadLogData = async () => {
  logLoading.value = true;
  try {
    const response = await request.get("/api/manager/monitor/logs", {
      params: {
        page: logCurrentPage.value,
        pageSize: logPageSize.value,
        operator: logSearchKeyword.value,
        actionType: logActionType.value, // 参数名保持一致
      },
    });
    if (response.code === "200" && response.data) {
      logData.value = response.data.list;
      logTotal.value = response.data.total;
    }
  } catch (error) {
    ElMessage.error("加载操作日志失败");
  } finally {
    logLoading.value = false;
  }
};

const handleTabChange = (tab: string) => {
	if (tab === "performance") {
		loadPerformanceData();
	} else if (tab === "services") {
		loadServiceData();
	} else if (tab === "logs") {
		loadLogData();
	}
};

const handleViewServiceLog = (service: any) => {
	selectedService.value = service;
	serviceLogDialogVisible.value = true;
};

onMounted(() => {
	loadPerformanceData();
	loadServiceData();
});
</script>

<style scoped>
.system-monitor .card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.system-monitor .performance-charts .chart-container {
	background-color: #fff;
	padding: 20px;
	border-radius: 4px;
	margin-bottom: 20px;
}

.system-monitor .performance-charts .chart-container .chart-title {
	font-size: 16px;
	font-weight: 600;
	margin-bottom: 15px;
	color: #303133;
}

.system-monitor .performance-charts .chart-container .chart-placeholder {
	height: 300px;
	position: relative;
	border: 1px solid #e4e7ed;
	border-radius: 4px;
	padding: 20px;
	background-color: #fafafa;
}

.system-monitor .performance-charts .chart-container .chart-placeholder .chart-mock {
	display: flex;
	align-items: flex-end;
	justify-content: space-around;
	height: 200px;
	margin-bottom: 20px;
}

.system-monitor .performance-charts .chart-container .chart-placeholder .chart-mock .chart-bar {
	width: 30px;
	min-height: 10px;
	border-radius: 2px 2px 0 0;
	transition: all 0.3s;
}

.system-monitor .performance-charts .chart-container .chart-placeholder .chart-line-mock {
	position: relative;
	height: 200px;
	width: 100%;
}

.system-monitor .performance-charts .chart-container .chart-placeholder .chart-line-mock .chart-point {
	position: absolute;
	width: 8px;
	height: 8px;
	background-color: #409eff;
	border-radius: 50%;
	transform: translate(-50%, 50%);
}

.system-monitor .performance-charts .chart-container .chart-placeholder .chart-labels {
	display: flex;
	justify-content: space-between;
	font-size: 12px;
	color: #909399;
}

.system-monitor .service-card {
	cursor: pointer;
	transition: all 0.3s;
}

.system-monitor .service-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.system-monitor .service-card.status-normal {
	border-left: 4px solid #67c23a;
}

.system-monitor .service-card.status-warning {
	border-left: 4px solid #e6a23c;
}

.system-monitor .service-card.status-error {
	border-left: 4px solid #f56c6c;
}

.system-monitor .service-card .service-content .service-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 15px;
}

.system-monitor .service-card .service-content .service-header .service-name {
	font-size: 16px;
	font-weight: 600;
	color: #303133;
}

.system-monitor .service-card .service-content .service-info .service-item {
	display: flex;
	justify-content: space-between;
	margin-bottom: 8px;
	font-size: 14px;
}

.system-monitor .service-card .service-content .service-info .service-item .service-label {
	color: #909399;
}

.system-monitor .service-card .service-content .service-info .service-item .service-value {
	color: #303133;
	font-weight: 500;
}

.system-monitor .pagination {
	margin-top: 20px;
	display: flex;
	justify-content: flex-end;
}

.system-monitor .service-log-content .log-item {
	display: flex;
	padding: 8px 0;
	border-bottom: 1px solid #f0f0f0;
	font-size: 14px;
}

.system-monitor .service-log-content .log-item .log-time {
	width: 180px;
	color: #909399;
}

.system-monitor .service-log-content .log-item .log-level {
	width: 60px;
	font-weight: 600;
	margin: 0 10px;
}

.system-monitor .service-log-content .log-item .log-level.log-INFO {
	color: #409eff;
}

.system-monitor .service-log-content .log-item .log-level.log-WARN {
	color: #e6a23c;
}

.system-monitor .service-log-content .log-item .log-level.log-ERROR {
	color: #f56c6c;
}

.system-monitor .service-log-content .log-item .log-message {
	flex: 1;
	color: #303133;
}
</style>

