<template>
	<div class="system-monitor">
		<!-- 选项卡 -->
		<el-tabs v-model="activeTab" @tab-change="handleTabChange">
			<!-- 性能监控页 -->
			<el-tab-pane label="性能监控" name="performance">
				<div v-if="isPerformanceTabActive" class="performance-tab-content">
					<el-card>
						<template #header>
							<div class="card-header">
								<span>系统性能监控</span>
								<div>
									<el-button type="primary" text @click="showSystemInfoDialog">
										<el-icon><Cpu /></el-icon>
										系统详情
									</el-button>
									<el-select v-model="timeRange" style="width: 150px; margin-left: 10px" @change="loadRealPerformanceData">
										<el-option label="最近1小时" value="1h" />
										<el-option label="最近24小时" value="24h" />
										<el-option label="最近7天" value="7d" />
										<el-option label="最近30天" value="30d" />
									</el-select>
									<el-button type="primary" @click="reloadPerformanceData" style="margin-left: 10px">
										<el-icon><Refresh /></el-icon>
										刷新
									</el-button>
								</div>
							</div>
						</template>
						
						<!-- 实时指标卡片 -->
						<div class="real-time-metrics">
							<el-row :gutter="20">
								<el-col :span="6">
									<el-card class="metric-card" shadow="hover">
										<div class="metric-content">
											<div class="metric-icon cpu">
												<el-icon><Cpu /></el-icon>
											</div>
											<div class="metric-info">
												<div class="metric-title">CPU使用率</div>
												<div class="metric-value" :class="getUsageClass(realTimeData.cpuUsage)">
													{{ realTimeData.cpuUsage }}%
												</div>
												<div class="metric-trend">
													<span :class="realTimeData.cpuTrend >= 0 ? 'trend-up' : 'trend-down'">
														<el-icon v-if="realTimeData.cpuTrend >= 0"><Top /></el-icon>
														<el-icon v-else><Bottom /></el-icon>
														{{ Math.abs(realTimeData.cpuTrend) }}%
													</span>
													较上次
												</div>
											</div>
										</div>
									</el-card>
								</el-col>
								<el-col :span="6">
									<el-card class="metric-card" shadow="hover">
										<div class="metric-content">
											<div class="metric-icon memory">
												<el-icon><Memory /></el-icon>
											</div>
											<div class="metric-info">
												<div class="metric-title">内存使用率</div>
												<div class="metric-value" :class="getUsageClass(realTimeData.memoryUsage)">
													{{ realTimeData.memoryUsage }}%
												</div>
												<div class="metric-trend">
													<span :class="realTimeData.memoryTrend >= 0 ? 'trend-up' : 'trend-down'">
														<el-icon v-if="realTimeData.memoryTrend >= 0"><Top /></el-icon>
														<el-icon v-else><Bottom /></el-icon>
														{{ Math.abs(realTimeData.memoryTrend) }}%
													</span>
													较上次
												</div>
											</div>
										</div>
									</el-card>
								</el-col>
								<el-col :span="6">
									<el-card class="metric-card" shadow="hover">
										<div class="metric-content">
											<div class="metric-icon disk">
												<el-icon><HardDisk /></el-icon>
											</div>
											<div class="metric-info">
												<div class="metric-title">磁盘使用率</div>
												<div class="metric-value" :class="getUsageClass(realTimeData.diskUsage)">
													{{ realTimeData.diskUsage }}%
												</div>
												<div class="metric-trend">
													<span :class="realTimeData.diskTrend >= 0 ? 'trend-up' : 'trend-down'">
														<el-icon v-if="realTimeData.diskTrend >= 0"><Top /></el-icon>
														<el-icon v-else><Bottom /></el-icon>
														{{ Math.abs(realTimeData.diskTrend) }}%
													</span>
													较上次
												</div>
											</div>
										</div>
									</el-card>
								</el-col>
								<el-col :span="6">
									<el-card class="metric-card" shadow="hover">
										<div class="metric-content">
											<div class="metric-icon network">
												<el-icon><Network /></el-icon>
											</div>
											<div class="metric-info">
												<div class="metric-title">API响应时间</div>
												<div class="metric-value" :class="getResponseTimeClass(realTimeData.apiResponseTime)">
													{{ realTimeData.apiResponseTime }}ms
												</div>
												<div class="metric-trend">
													<span :class="realTimeData.apiTrend >= 0 ? 'trend-up' : 'trend-down'">
														<el-icon v-if="realTimeData.apiTrend >= 0"><Top /></el-icon>
														<el-icon v-else><Bottom /></el-icon>
														{{ Math.abs(realTimeData.apiTrend) }}ms
													</span>
													较上次
												</div>
											</div>
										</div>
									</el-card>
								</el-col>
							</el-row>
						</div>

						<!-- 性能图表 -->
						<div class="performance-charts">
							<el-row :gutter="20">
								<el-col :span="12">
									<div class="chart-container">
										<div class="chart-title">CPU/内存使用率趋势</div>
										<div id="cpuMemoryChart" class="chart" style="height: 300px;"></div>
									</div>
								</el-col>
								<el-col :span="12">
									<div class="chart-container">
										<div class="chart-title">磁盘使用率与IOPS</div>
										<div id="diskChart" class="chart" style="height: 300px;"></div>
									</div>
								</el-col>
							</el-row>
							<el-row :gutter="20" style="margin-top: 20px">
								<el-col :span="12">
									<div class="chart-container">
										<div class="chart-title">网络流量</div>
										<div id="networkChart" class="chart" style="height: 300px;"></div>
									</div>
								</el-col>
								<el-col :span="12">
									<div class="chart-container">
										<div class="chart-title">API响应时间分布</div>
										<div id="apiChart" class="chart" style="height: 300px;"></div>
									</div>
								</el-col>
							</el-row>
						</div>
					</el-card>
				</div>
			</el-tab-pane>

			<!-- 服务状态页 -->
			<el-tab-pane label="服务状态" name="services">
				<el-card>
					<template #header>
						<div class="card-header">
							<span>服务状态监控</span>
							<el-button type="primary" @click="loadServiceData">
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
									'status-running': service.status === 'running',
									'status-warning': service.status === 'warning',
									'status-stopped': service.status === 'stopped',
								}"
								shadow="hover"
							>
								<div class="service-content">
									<div class="service-header">
										<div class="service-name">{{ service.name }}</div>
										<div class="service-actions">
											<el-tag
												:type="
													service.status === 'running'
														? 'success'
														: service.status === 'warning'
														? 'warning'
														: 'danger'
												"
											>
												{{ 
													service.status === 'running' ? '运行中' :
													service.status === 'warning' ? '警告' :
													'已停止'
												}}
											</el-tag>
											<div class="action-buttons">
												<el-button v-if="service.status === 'running'" size="small" @click.stop="restartService(service.name)" type="warning">
													重启
												</el-button>
												<el-button v-if="service.status === 'running'" size="small" @click.stop="stopService(service.name)" type="danger">
													停止
												</el-button>
												<el-button v-if="service.status === 'stopped'" size="small" @click.stop="startService(service.name)" type="success">
													启动
												</el-button>
											</div>
										</div>
									</div>
									<div class="service-info">
										<div class="service-item">
											<span class="service-label">进程ID:</span>
											<span class="service-value">{{ service.pid || 'N/A' }}</span>
										</div>
										<div class="service-item">
											<span class="service-label">CPU使用:</span>
											<span class="service-value" :class="getUsageClass(service.cpu)">
												{{ service.cpu || 0 }}%
											</span>
										</div>
										<div class="service-item">
											<span class="service-label">内存使用:</span>
											<span class="service-value">{{ formatMemory(service.memory) }}</span>
										</div>
										<div class="service-item">
											<span class="service-label">运行时间:</span>
											<span class="service-value">{{ service.uptime }}</span>
										</div>
										<div class="service-item">
											<span class="service-label">最后检查:</span>
											<span class="service-value">{{ formatTime(service.lastCheck) }}</span>
										</div>
										<div class="service-item" v-if="service.description">
											<span class="service-label">描述:</span>
											<span class="service-value description">{{ service.description }}</span>
										</div>
									</div>
									<div class="service-footer" @click="handleViewServiceLog(service)">
										<el-button text type="primary" size="small">
											查看日志
										</el-button>
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
									<el-option label="登录" value="login" />
									<el-option label="权限修改" value="permission_change" />
									<el-option label="数据发布" value="data_publish" />
									<el-option label="数据删除" value="data_delete" />
									<el-option label="用户创建" value="user_create" />
									<el-option label="用户禁用" value="user_disable" />
									<el-option label="配置修改" value="config_change" />
								</el-select>
								<el-date-picker
									v-model="logDateRange"
									type="daterange"
									range-separator="至"
									start-placeholder="开始日期"
									end-placeholder="结束日期"
									style="width: 240px; margin-right: 10px"
									@change="loadLogData"
								/>
								<el-button type="primary" @click="loadLogData">
									<el-icon><Refresh /></el-icon>
									刷新
								</el-button>
							</div>
						</div>
					</template>
					<el-table v-loading="logLoading" :data="logData" stripe>
						<el-table-column prop="operator" label="操作者" width="120" />
						<el-table-column prop="action" label="操作类型" width="120">
							<template #default="{ row }">
								{{ getActionLabel(row.action) }}
							</template>
						</el-table-column>
						<el-table-column prop="target" label="操作对象" min-width="150" />
						<el-table-column prop="details" label="操作详情" min-width="200" />
						<el-table-column prop="time" label="操作时间" width="180">
							<template #default="{ row }">
								{{ formatTime(row.time) }}
							</template>
						</el-table-column>
						<el-table-column prop="ip" label="IP地址" width="150" />
						<el-table-column label="结果" width="100">
							<template #default="{ row }">
								<el-tag :type="row.result === '成功' ? 'success' : 'danger'">
									{{ row.result === '成功' ? '成功' : '失败' }}
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

		<!-- 系统信息对话框 -->
		<el-dialog v-model="showSystemInfo" title="系统详细信息" width="90%" top="5vh">
			<div v-if="systemInfo" class="system-info-content">
				<el-scrollbar height="70vh">
					<el-tabs type="border-card">
						<el-tab-pane label="系统概览">
							<div class="system-overview">
								<el-descriptions title="系统信息" :column="2" border>
									<el-descriptions-item label="操作系统">{{ systemInfo.system_info?.platform || '未知' }}</el-descriptions-item>
									<el-descriptions-item label="系统版本">{{ systemInfo.system_info?.platform_version || '未知' }}</el-descriptions-item>
									<el-descriptions-item label="主机名">{{ systemInfo.system_info?.hostname || '未知' }}</el-descriptions-item>
									<el-descriptions-item label="处理器">{{ systemInfo.system_info?.processor || '未知' }}</el-descriptions-item>
									<el-descriptions-item label="架构">{{ systemInfo.system_info?.architecture || '未知' }}</el-descriptions-item>
									<el-descriptions-item label="Python版本">{{ systemInfo.system_info?.python_version || '未知' }}</el-descriptions-item>
								</el-descriptions>
								
								<el-descriptions title="实时指标" :column="3" border style="margin-top: 20px">
									<el-descriptions-item label="CPU使用率">
										<el-tag :type="getUsageClass(systemInfo.metrics?.cpu_usage || 0)">
											{{ (systemInfo.metrics?.cpu_usage || 0).toFixed(1) }}%
										</el-tag>
									</el-descriptions-item>
									<el-descriptions-item label="内存使用率">
										<el-tag :type="getUsageClass(systemInfo.metrics?.memory_usage || 0)">
											{{ (systemInfo.metrics?.memory_usage || 0).toFixed(1) }}%
										</el-tag>
									</el-descriptions-item>
									<el-descriptions-item label="磁盘使用率">
										<el-tag :type="getUsageClass(systemInfo.metrics?.disk_usage || 0)">
											{{ (systemInfo.metrics?.disk_usage || 0).toFixed(1) }}%
										</el-tag>
									</el-descriptions-item>
									<el-descriptions-item label="系统负载">
										<el-tag>{{ systemInfo.metrics?.system_load?.toFixed(2) || '0.00' }}</el-tag>
									</el-descriptions-item>
									<el-descriptions-item label="进程数">
										<el-tag>{{ systemInfo.metrics?.process_count || 0 }}</el-tag>
									</el-descriptions-item>
									<el-descriptions-item label="运行时间">
										<el-tag>{{ systemInfo.metrics?.uptime || '0' }}</el-tag>
									</el-descriptions-item>
								</el-descriptions>
							</div>
						</el-tab-pane>
						
						<el-tab-pane label="内存信息">
							<div class="memory-info">
								<el-descriptions title="内存使用情况" :column="2" border>
									<el-descriptions-item label="总内存">
										{{ (systemInfo.memory?.total || 0).toFixed(2) }} GB
									</el-descriptions-item>
									<el-descriptions-item label="已使用">
										{{ (systemInfo.memory?.used || 0).toFixed(2) }} GB
									</el-descriptions-item>
									<el-descriptions-item label="可用内存">
										{{ (systemInfo.memory?.available || 0).toFixed(2) }} GB
									</el-descriptions-item>
									<el-descriptions-item label="空闲内存">
										{{ (systemInfo.memory?.free || 0).toFixed(2) }} GB
									</el-descriptions-item>
									<el-descriptions-item label="使用率">
										<el-progress 
											:text-inside="true" 
											:stroke-width="20" 
											:percentage="systemInfo.memory?.percent || 0"
											:status="getProgressStatus(systemInfo.memory?.percent || 0)"
											style="width: 200px"
										/>
									</el-descriptions-item>
								</el-descriptions>
								
								<el-descriptions title="交换分区" :column="2" border style="margin-top: 20px">
									<el-descriptions-item label="总交换空间">
										{{ (systemInfo.memory?.swap_total || 0).toFixed(2) }} GB
									</el-descriptions-item>
									<el-descriptions-item label="已使用交换">
										{{ (systemInfo.memory?.swap_used || 0).toFixed(2) }} GB
									</el-descriptions-item>
									<el-descriptions-item label="空闲交换">
										{{ (systemInfo.memory?.swap_free || 0).toFixed(2) }} GB
									</el-descriptions-item>
									<el-descriptions-item label="交换使用率">
										<el-progress 
											v-if="systemInfo.memory?.swap_total > 0"
											:text-inside="true" 
											:stroke-width="20" 
											:percentage="systemInfo.memory?.swap_percent || 0"
											:status="getProgressStatus(systemInfo.memory?.swap_percent || 0)"
											style="width: 200px"
										/>
										<span v-else>未启用</span>
									</el-descriptions-item>
								</el-descriptions>
							</div>
						</el-tab-pane>
						
						<el-tab-pane label="磁盘信息">
							<div class="disk-info">
								<el-table :data="systemInfo.disks" stripe style="width: 100%">
									<el-table-column prop="device" label="设备" width="120" />
									<el-table-column prop="mountpoint" label="挂载点" width="150" />
									<el-table-column prop="fstype" label="文件系统" width="100" />
									<el-table-column prop="total" label="总容量(GB)" width="120">
										<template #default="{ row }">
											{{ row.total.toFixed(2) }}
										</template>
									</el-table-column>
									<el-table-column prop="used" label="已用(GB)" width="120">
										<template #default="{ row }">
											{{ row.used.toFixed(2) }}
										</template>
									</el-table-column>
									<el-table-column prop="free" label="可用(GB)" width="120">
										<template #default="{ row }">
											{{ row.free.toFixed(2) }}
										</template>
									</el-table-column>
									<el-table-column prop="percent" label="使用率" width="200">
										<template #default="{ row }">
											<el-progress 
												:text-inside="true" 
												:stroke-width="20" 
												:percentage="row.percent"
												:status="getProgressStatus(row.percent)"
											/>
										</template>
									</el-table-column>
								</el-table>
							</div>
						</el-tab-pane>
						
						<el-tab-pane label="CPU信息">
							<div class="cpu-info">
								<el-descriptions title="CPU信息" :column="2" border>
									<el-descriptions-item label="物理核心">
										{{ systemInfo.cpu?.physical_cores || 0 }}
									</el-descriptions-item>
									<el-descriptions-item label="逻辑核心">
										{{ systemInfo.cpu?.total_cores || 0 }}
									</el-descriptions-item>
									<el-descriptions-item label="频率">
										{{ (systemInfo.cpu?.cpu_freq || 0).toFixed(2) }} MHz
									</el-descriptions-item>
								</el-descriptions>
								
								<div v-if="systemInfo.cpu?.cpu_per_core" style="margin-top: 20px">
									<h4>各核心使用率</h4>
									<el-row :gutter="20">
										<el-col 
											v-for="(usage, index) in systemInfo.cpu.cpu_per_core" 
											:key="index" 
											:span="6"
											style="margin-bottom: 15px"
										>
											<el-card shadow="hover">
												<div style="text-align: center;">
													<div>核心 {{ index + 1 }}</div>
													<el-progress 
														type="circle" 
														:percentage="usage.toFixed(1)" 
														:width="80"
														:status="getProgressStatus(usage)"
													/>
												</div>
											</el-card>
										</el-col>
									</el-row>
								</div>
							</div>
						</el-tab-pane>
						
						<el-tab-pane label="网络信息">
							<div class="network-info">
								<el-descriptions title="网络接口" :column="1" border>
									<el-descriptions-item 
										v-for="(iface, index) in systemInfo.network?.interfaces || []" 
										:key="index"
										:label="iface.interface"
									>
										<div>IP: {{ iface.ip_address }}</div>
										<div v-if="iface.netmask">子网掩码: {{ iface.netmask }}</div>
										<div v-if="iface.broadcast">广播地址: {{ iface.broadcast }}</div>
									</el-descriptions-item>
								</el-descriptions>
								
								<el-descriptions title="网络统计" :column="2" border style="margin-top: 20px">
									<el-descriptions-item label="连接数">
										{{ systemInfo.network?.connections || 0 }}
									</el-descriptions-item>
									<el-descriptions-item label="上行流量">
										{{ (systemInfo.metrics?.network_upload || 0).toFixed(2) }} MB
									</el-descriptions-item>
									<el-descriptions-item label="下行流量">
										{{ (systemInfo.metrics?.network_download || 0).toFixed(2) }} MB
									</el-descriptions-item>
								</el-descriptions>
							</div>
						</el-tab-pane>
						
						<el-tab-pane label="进程信息">
							<div class="process-info">
								<el-table :data="systemInfo.top_processes" stripe style="width: 100%">
									<el-table-column prop="pid" label="PID" width="80" />
									<el-table-column prop="name" label="进程名" width="150" />
									<el-table-column prop="cpu_percent" label="CPU%" width="120">
										<template #default="{ row }">
											<el-tag :type="getUsageClass(row.cpu_percent)" size="small">
												{{ (row.cpu_percent || 0).toFixed(1) }}%
											</el-tag>
										</template>
									</el-table-column>
									<el-table-column prop="memory_percent" label="内存%" width="120">
										<template #default="{ row }">
											<el-tag :type="getUsageClass(row.memory_percent)" size="small">
												{{ (row.memory_percent || 0).toFixed(1) }}%
											</el-tag>
										</template>
									</el-table-column>
									<el-table-column prop="status" label="状态" width="100">
										<template #default="{ row }">
											<el-tag :type="row.status === 'running' ? 'success' : 'warning'" size="small">
												{{ row.status || '未知' }}
											</el-tag>
										</template>
									</el-table-column>
								</el-table>
							</div>
						</el-tab-pane>
					</el-tabs>
				</el-scrollbar>
			</div>
		</el-dialog>

		<!-- 服务日志对话框 -->
		<el-dialog v-model="serviceLogDialogVisible" :title="`${selectedService?.name} - 运行日志`" width="80%">
			<div class="service-log-content">
				<div class="log-toolbar">
					<el-select v-model="logLevelFilter" placeholder="日志级别" style="width: 120px" @change="filterServiceLogs">
						<el-option label="全部" value="all" />
						<el-option label="INFO" value="info" />
						<el-option label="WARN" value="warn" />
						<el-option label="ERROR" value="error" />
					</el-select>
					<el-button type="primary" @click="loadServiceLogs(selectedService)">
						<el-icon><Refresh /></el-icon>
						刷新日志
					</el-button>
				</div>
				<el-scrollbar height="400px">
					<div v-for="(log, index) in filteredServiceLogs" :key="index" class="log-item">
						<span class="log-time">{{ formatTime(log.time) }}</span>
						<span class="log-level" :class="`log-${log.level.toLowerCase()}`">{{ log.level }}</span>
						<span class="log-message">{{ log.message }}</span>
					</div>
				</el-scrollbar>
			</div>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from "vue";
import * as echarts from "echarts";
import { ElMessage } from "element-plus";
import { Refresh, Search, Top, Bottom, Cpu, Memory, HardDisk, Network } from "@element-plus/icons-vue";
import request from "@/api/request";

// 图表实例
let cpuMemoryChart: echarts.ECharts | null = null;
let diskChart: echarts.ECharts | null = null;
let networkChart: echarts.ECharts | null = null;
let apiChart: echarts.ECharts | null = null;

const activeTab = ref("performance");
const isPerformanceTabActive = ref(true);
const timeRange = ref("1h");

// 实时数据
const realTimeData = ref({
	cpuUsage: 0,
	cpuTrend: 0,
	memoryUsage: 0,
	memoryTrend: 0,
	diskUsage: 0,
	diskTrend: 0,
	apiResponseTime: 0,
	apiTrend: 0
});

// 系统信息
const systemInfo = ref<any>(null);
const showSystemInfo = ref(false);

// 性能历史数据
const performanceHistory = ref<any[]>([]);

// 服务数据
const serviceData = ref<any[]>([]);

// 日志相关
const logLoading = ref(false);
const logData = ref<any[]>([]);
const logCurrentPage = ref(1);
const logPageSize = ref(10);
const logTotal = ref(0);
const logSearchKeyword = ref("");
const logActionType = ref("");
const logDateRange = ref<[Date, Date] | null>(null);

// 服务日志相关
const serviceLogDialogVisible = ref(false);
const selectedService = ref<any>(null);
const serviceLogs = ref<any[]>([]);
const logLevelFilter = ref("all");

// 过滤后的服务日志
const filteredServiceLogs = computed(() => {
	if (logLevelFilter.value === "all") return serviceLogs.value;
	return serviceLogs.value.filter(log => log.level.toLowerCase() === logLevelFilter.value);
});

// 操作类型映射
const actionLabels = {
	login: "登录",
	permission_change: "权限修改",
	data_publish: "数据发布",
	data_delete: "数据删除",
	user_create: "用户创建",
	user_disable: "用户禁用",
	config_change: "配置修改"
};

// 监听activeTab变化
watch(activeTab, (newTab) => {
	isPerformanceTabActive.value = (newTab === "performance");
	if (newTab === "performance") {
		// 延迟初始化图表，确保DOM已经渲染
		setTimeout(() => {
			initCharts();
			loadRealPerformanceData();
		}, 100);
	}
});

// 初始化图表
const initCharts = () => {
	try {
		console.log('开始初始化图表...');
		
		// 销毁已有的图表实例
		destroyCharts();
		
		// 直接获取DOM元素
		const cpuMemoryChartDom = document.getElementById('cpuMemoryChart');
		const diskChartDom = document.getElementById('diskChart');
		const networkChartDom = document.getElementById('networkChart');
		const apiChartDom = document.getElementById('apiChart');
		
		if (!cpuMemoryChartDom || !diskChartDom || !networkChartDom || !apiChartDom) {
			console.error('图表DOM元素未找到，将重试');
			setTimeout(initCharts, 100);
			return;
		}
		
		// 初始化图表实例
		cpuMemoryChart = echarts.init(cpuMemoryChartDom);
		diskChart = echarts.init(diskChartDom);
		networkChart = echarts.init(networkChartDom);
		apiChart = echarts.init(apiChartDom);
		
		console.log('图表实例创建成功');
		
		// 设置基本的图表选项
		setBasicChartOptions();
		
		// 监听窗口大小变化
		window.addEventListener('resize', handleResize);
		
		console.log('图表初始化完成');
		
	} catch (error) {
		console.error('初始化图表失败:', error);
		ElMessage.error('图表初始化失败');
	}
};

// 设置基本的图表选项
const setBasicChartOptions = () => {
	if (!cpuMemoryChart || !diskChart || !networkChart || !apiChart) return;
	
	// 最简单的选项
	const baseOption = {
		tooltip: {
			trigger: 'axis',
			formatter: function(params: any) {
				let result = params[0].axisValue + '<br/>';
				params.forEach((item: any) => {
					const value = item.value || 0;
					const unit = item.seriesName.includes('使用率') ? '%' : 
								item.seriesName.includes('流量') ? 'MB/s' : 
								item.seriesName.includes('响应时间') ? 'ms' : '';
					result += `${item.marker} ${item.seriesName}: ${value.toFixed(2)}${unit}<br/>`;
				});
				return result;
			}
		},
		grid: {
			left: '3%',
			right: '4%',
			bottom: '15%',
			top: '15%',
			containLabel: true
		},
		xAxis: {
			type: 'category',
			boundaryGap: false,
			data: []
		},
		yAxis: {
			type: 'value'
		}
	};
	
	// CPU/内存图表
	cpuMemoryChart.setOption({
		...baseOption,
		title: {
			text: 'CPU & 内存使用率',
			left: 'center',
			textStyle: {
				fontSize: 14,
				fontWeight: 'normal'
			}
		},
		legend: {
			data: ['CPU使用率', '内存使用率'],
			bottom: 0
		},
		yAxis: {
			type: 'value',
			min: 0,
			max: 100,
			axisLabel: {
				formatter: '{value}%'
			},
			splitLine: {
				show: true,
				lineStyle: {
					type: 'dashed'
				}
			}
		},
		series: [
			{
				name: 'CPU使用率',
				type: 'line',
				data: [],
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: {
					width: 2
				},
				areaStyle: {
					opacity: 0.1
				}
			},
			{
				name: '内存使用率',
				type: 'line',
				data: [],
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: {
					width: 2
				},
				areaStyle: {
					opacity: 0.1
				}
			}
		]
	});
	
	// 磁盘图表
	diskChart.setOption({
		...baseOption,
		title: {
			text: '磁盘使用率 & IOPS',
			left: 'center',
			textStyle: {
				fontSize: 14,
				fontWeight: 'normal'
			}
		},
		legend: {
			data: ['磁盘使用率', '磁盘IOPS'],
			bottom: 0
		},
		yAxis: [
			{
				type: 'value',
				name: '使用率',
				min: 0,
				max: 100,
				axisLabel: {
					formatter: '{value}%'
				},
				splitLine: {
					show: true,
					lineStyle: {
						type: 'dashed'
					}
				}
			},
			{
				type: 'value',
				name: 'IOPS',
				min: 0,
				position: 'right',
				splitLine: {
					show: false
				}
			}
		],
		series: [
			{
				name: '磁盘使用率',
				type: 'line',
				data: [],
				yAxisIndex: 0,
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: {
					width: 2,
					color: '#5470c6'
				},
				areaStyle: {
					opacity: 0.1,
					color: '#5470c6'
				}
			},
			{
				name: '磁盘IOPS',
				type: 'line',
				data: [],
				yAxisIndex: 1,
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: {
					width: 2,
					color: '#91cc75'
				}
			}
		]
	});
	
	// 网络图表
	networkChart.setOption({
		...baseOption,
		title: {
			text: '网络流量',
			left: 'center',
			textStyle: {
				fontSize: 14,
				fontWeight: 'normal'
			}
		},
		legend: {
			data: ['上行流量', '下行流量'],
			bottom: 0
		},
		yAxis: {
			type: 'value',
			name: '流量(MB/s)',
			min: 0,
			splitLine: {
				show: true,
				lineStyle: {
					type: 'dashed'
				}
			}
		},
		series: [
			{
				name: '上行流量',
				type: 'line',
				data: [],
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: {
					width: 2,
					color: '#fac858'
				},
				areaStyle: {
					opacity: 0.1,
					color: '#fac858'
				}
			},
			{
				name: '下行流量',
				type: 'line',
				data: [],
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: {
					width: 2,
					color: '#ee6666'
				},
				areaStyle: {
					opacity: 0.1,
					color: '#ee6666'
				}
			}
		]
	});
	
	// API图表
	apiChart.setOption({
		...baseOption,
		title: {
			text: 'API响应时间',
			left: 'center',
			textStyle: {
				fontSize: 14,
				fontWeight: 'normal'
			}
		},
		legend: {
			data: ['API响应时间'],
			bottom: 0
		},
		yAxis: {
			type: 'value',
			name: '响应时间(ms)',
			min: 0,
			splitLine: {
				show: true,
				lineStyle: {
					type: 'dashed'
				}
			}
		},
		series: [
			{
				name: 'API响应时间',
				type: 'line',
				data: [],
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: {
					width: 2,
					color: '#73c0de'
				},
				areaStyle: {
					opacity: 0.1,
					color: '#73c0de'
				}
			}
		]
	});
};

// 销毁图表实例
const destroyCharts = () => {
	// 移除事件监听器
	window.removeEventListener('resize', handleResize);
	
	// 安全地销毁图表
	const charts = [cpuMemoryChart, diskChart, networkChart, apiChart];
	charts.forEach(chart => {
		if (chart) {
			try {
				chart.dispose();
			} catch (e) {
				console.warn('销毁图表失败:', e);
			}
		}
	});
	
	cpuMemoryChart = null;
	diskChart = null;
	networkChart = null;
	apiChart = null;
	
	console.log('图表已销毁');
};

// 处理窗口大小变化
const handleResize = () => {
	const charts = [cpuMemoryChart, diskChart, networkChart, apiChart];
	charts.forEach(chart => {
		if (chart) {
			try {
				chart.resize();
			} catch (e) {
				console.warn('调整图表大小失败:', e);
			}
		}
	});
};

// 更新图表数据
const updateCharts = (data: any[]) => {
	if (!cpuMemoryChart || !diskChart || !networkChart || !apiChart) {
		console.warn('图表未初始化，跳过更新');
		return;
	}
	
	try {
		console.log('更新图表数据，长度:', data.length);
		
		// 确保数据是数组
		const formattedData = Array.isArray(data) ? data : [];
		
		if (formattedData.length === 0) {
			console.warn('没有数据可更新');
			return;
		}
		
		// 提取时间戳
		const timestamps = formattedData.map(item => {
			const timeStr = item.time || item.timestamp;
			if (!timeStr) return '';
			
			try {
				const date = new Date(timeStr);
				if (isNaN(date.getTime())) return timeStr;
				
				// 根据时间范围显示不同的时间格式
				if (timeRange.value === "1h") {
					return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
				} else if (timeRange.value === "24h") {
					return `${date.getHours().toString().padStart(2, '0')}:00`;
				} else {
					return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
				}
			} catch (e) {
				return timeStr;
			}
		}).filter(Boolean);
		
		// 提取数据
		const cpuData = formattedData.map(item => item.cpu || item.cpuUsage || 0);
		const memoryData = formattedData.map(item => item.memory || item.memoryUsage || 0);
		const diskData = formattedData.map(item => item.disk || item.diskUsage || 0);
		const iopsData = formattedData.map(item => item.diskIOPS || 0);
		const apiData = formattedData.map(item => item.apiResponseTime || 0);
		
		// 提取网络数据
		const uploadData = formattedData.map(item => item.networkUpload || 0);
		const downloadData = formattedData.map(item => item.networkDownload || 0);
		
		// 更新CPU/内存图表
		cpuMemoryChart.setOption({
			xAxis: {
				data: timestamps
			},
			series: [
				{ data: cpuData },
				{ data: memoryData }
			]
		});
		
		// 更新磁盘图表
		diskChart.setOption({
			xAxis: {
				data: timestamps
			},
			series: [
				{ data: diskData },
				{ data: iopsData }
			]
		});
		
		// 更新网络图表
		networkChart.setOption({
			xAxis: {
				data: timestamps
			},
			series: [
				{ data: uploadData },
				{ data: downloadData }
			]
		});
		
		// 更新API图表
		apiChart.setOption({
			xAxis: {
				data: timestamps
			},
			series: [
				{ data: apiData }
			]
		});
		
		console.log('图表数据更新完成');
		
	} catch (error) {
		console.error('更新图表失败:', error);
	}
};

// 加载实际性能数据
const loadRealPerformanceData = async () => {
	try {
		console.log('加载实际性能数据...');
		
		const response = await request.get("/api/manager/monitor/performance", {
			params: { timeRange: timeRange.value }
		});
		
		console.log('性能API响应:', response);
		
		if (response.code === "200" && response.data) {
			const rawData = response.data;
			performanceHistory.value = rawData;
			
			// 查找最新的实时数据
			let latestRealTime = null;
			for (let i = rawData.length - 1; i >= 0; i--) {
				if (rawData[i].realTime) {
					latestRealTime = rawData[i].realTime;
					break;
				}
			}
			
			// 如果没有找到实时数据，使用最后一条数据计算
			if (!latestRealTime && rawData.length > 1) {
				const latest = rawData[rawData.length - 1];
				const previous = rawData[rawData.length - 2];
				
				latestRealTime = {
					cpuUsage: latest.cpu || 0,
					cpuTrend: (latest.cpu || 0) - (previous.cpu || 0),
					memoryUsage: latest.memory || 0,
					memoryTrend: (latest.memory || 0) - (previous.memory || 0),
					diskUsage: latest.disk || 0,
					diskTrend: (latest.disk || 0) - (previous.disk || 0),
					apiResponseTime: latest.apiResponseTime || 0,
					apiTrend: (latest.apiResponseTime || 0) - (previous.apiResponseTime || 0)
				};
			} else if (!latestRealTime && rawData.length === 1) {
				const latest = rawData[0];
				latestRealTime = {
					cpuUsage: latest.cpu || 0,
					cpuTrend: 0,
					memoryUsage: latest.memory || 0,
					memoryTrend: 0,
					diskUsage: latest.disk || 0,
					diskTrend: 0,
					apiResponseTime: latest.apiResponseTime || 0,
					apiTrend: 0
				};
			}
			
			if (latestRealTime) {
				realTimeData.value = {
					cpuUsage: parseFloat((latestRealTime.cpuUsage || 0).toFixed(1)),
					cpuTrend: parseFloat((latestRealTime.cpuTrend || 0).toFixed(1)),
					memoryUsage: parseFloat((latestRealTime.memoryUsage || 0).toFixed(1)),
					memoryTrend: parseFloat((latestRealTime.memoryTrend || 0).toFixed(1)),
					diskUsage: parseFloat((latestRealTime.diskUsage || 0).toFixed(1)),
					diskTrend: parseFloat((latestRealTime.diskTrend || 0).toFixed(1)),
					apiResponseTime: Math.round(latestRealTime.apiResponseTime || 0),
					apiTrend: Math.round(latestRealTime.apiTrend || 0)
				};
				
				console.log('实时数据:', realTimeData.value);
			}
			
			// 更新图表（只使用历史数据，排除实时数据对象）
			const chartData = rawData.filter(item => !item.realTime);
			updateCharts(chartData);
			
			// 延迟调整图表大小
			setTimeout(() => {
				handleResize();
			}, 300);
			
		} else {
			console.error('API返回错误:', response);
			ElMessage.error(`加载失败: ${response?.msg || '未知错误'}`);
			// 尝试加载系统信息
			loadSystemInfo();
		}
	} catch (error) {
		console.error("加载性能数据失败:", error);
		ElMessage.error("加载性能数据失败");
		// 尝试加载系统信息
		loadSystemInfo();
	}
};

// 加载系统详细信息
const loadSystemInfo = async () => {
	try {
		const response = await request.get("/api/manager/monitor/system/info");
		if (response.code === "200" && response.data) {
			systemInfo.value = response.data;
			console.log('系统信息:', systemInfo.value);
			
			// 使用系统信息更新实时数据
			const metrics = systemInfo.value.metrics || {};
			realTimeData.value = {
				cpuUsage: parseFloat((metrics.cpu_usage || 0).toFixed(1)),
				cpuTrend: 0,
				memoryUsage: parseFloat((metrics.memory_usage || 0).toFixed(1)),
				memoryTrend: 0,
				diskUsage: parseFloat((metrics.disk_usage || 0).toFixed(1)),
				diskTrend: 0,
				apiResponseTime: Math.round(metrics.api_response_time || 0),
				apiTrend: 0
			};
			
			// 生成模拟历史数据
			generateRealisticDataFromSystemInfo();
		}
	} catch (error) {
		console.error("加载系统信息失败:", error);
		generateMockData();
	}
};

// 根据系统信息生成真实的数据
const generateRealisticDataFromSystemInfo = () => {
	console.log('根据系统信息生成数据');
	
	const now = Date.now();
	const mockHistory = [];
	
	// 获取当前系统指标
	const metrics = systemInfo.value?.metrics || {};
	const baseCpu = metrics.cpu_usage || 20;
	const baseMemory = metrics.memory_usage || 50;
	const baseDisk = metrics.disk_usage || 70;
	
	// 生成60个数据点
	for (let i = 0; i < 60; i++) {
		const time = new Date(now - (59 - i) * 60000).toISOString();
		
		// 基于当前系统指标生成波动数据
		const cpu = Math.max(0, Math.min(100, baseCpu + Math.sin(i / 10) * 10 + Math.random() * 5 - 2.5));
		const memory = Math.max(0, Math.min(100, baseMemory + Math.cos(i / 8) * 15 + Math.random() * 4 - 2));
		const disk = Math.max(0, Math.min(100, baseDisk + Math.sin(i / 15) * 5 + Math.random() * 2 - 1));
		
		mockHistory.push({
			time: time,
			cpu: cpu,
			memory: memory,
			disk: disk,
			diskIOPS: Math.max(0, Math.min(1000, 200 + Math.sin(i / 5) * 150 + Math.random() * 50 - 25)),
			apiResponseTime: Math.max(0, Math.min(500, 80 + Math.sin(i / 4) * 40 + Math.random() * 20 - 10)),
			networkUpload: Math.max(0, Math.min(10, 0.5 + Math.sin(i / 3) * 0.3 + Math.random() * 0.2 - 0.1)),
			networkDownload: Math.max(0, Math.min(20, 2 + Math.cos(i / 3) * 1 + Math.random() * 0.5 - 0.25))
		});
	}
	
	performanceHistory.value = mockHistory;
	
	// 计算实时数据
	if (mockHistory.length > 1) {
		const latest = mockHistory[mockHistory.length - 1];
		const previous = mockHistory[mockHistory.length - 2];
		
		realTimeData.value = {
			cpuUsage: parseFloat(latest.cpu.toFixed(1)),
			cpuTrend: parseFloat((latest.cpu - previous.cpu).toFixed(1)),
			memoryUsage: parseFloat(latest.memory.toFixed(1)),
			memoryTrend: parseFloat((latest.memory - previous.memory).toFixed(1)),
			diskUsage: parseFloat(latest.disk.toFixed(1)),
			diskTrend: parseFloat((latest.disk - previous.disk).toFixed(1)),
			apiResponseTime: Math.round(latest.apiResponseTime),
			apiTrend: Math.round(latest.apiResponseTime - previous.apiResponseTime)
		};
	}
	
	// 更新图表
	updateCharts(mockHistory);
	
	ElMessage.info('使用基于系统信息的模拟数据');
};

// 生成模拟数据（备用）
const generateMockData = () => {
	console.log('生成模拟数据');
	
	const now = Date.now();
	const mockHistory = [];
	
	// 生成60个数据点
	for (let i = 0; i < 60; i++) {
		const time = new Date(now - (59 - i) * 60000).toISOString();
		const baseCpu = 20 + Math.sin(i / 10) * 10;
		const baseMemory = 40 + Math.cos(i / 8) * 20;
		const baseDisk = 70 + Math.sin(i / 15) * 10;
		
		mockHistory.push({
			time: time,
			cpu: Math.max(0, Math.min(100, baseCpu + Math.random() * 10 - 5)),
			memory: Math.max(0, Math.min(100, baseMemory + Math.random() * 8 - 4)),
			disk: Math.max(0, Math.min(100, baseDisk + Math.random() * 5 - 2.5)),
			diskIOPS: Math.max(0, Math.min(1000, 300 + Math.sin(i / 5) * 200 + Math.random() * 100 - 50)),
			apiResponseTime: Math.max(0, Math.min(500, 100 + Math.sin(i / 4) * 50 + Math.random() * 30 - 15)),
			networkUpload: Math.max(0, Math.min(10, 0.5 + Math.sin(i / 3) * 0.3 + Math.random() * 0.2 - 0.1)),
			networkDownload: Math.max(0, Math.min(20, 2 + Math.cos(i / 3) * 1 + Math.random() * 0.5 - 0.25))
		});
	}
	
	performanceHistory.value = mockHistory;
	
	// 计算实时数据
	if (mockHistory.length > 1) {
		const latest = mockHistory[mockHistory.length - 1];
		const previous = mockHistory[mockHistory.length - 2];
		
		realTimeData.value = {
			cpuUsage: parseFloat(latest.cpu.toFixed(1)),
			cpuTrend: parseFloat((latest.cpu - previous.cpu).toFixed(1)),
			memoryUsage: parseFloat(latest.memory.toFixed(1)),
			memoryTrend: parseFloat((latest.memory - previous.memory).toFixed(1)),
			diskUsage: parseFloat(latest.disk.toFixed(1)),
			diskTrend: parseFloat((latest.disk - previous.disk).toFixed(1)),
			apiResponseTime: Math.round(latest.apiResponseTime),
			apiTrend: Math.round(latest.apiResponseTime - previous.apiResponseTime)
		};
	}
	
	// 更新图表
	updateCharts(mockHistory);
	
	ElMessage.info('使用模拟数据');
};

// 重新加载性能数据
const reloadPerformanceData = () => {
	loadRealPerformanceData();
};

// 加载服务数据
const loadServiceData = async () => {
	try {
		const response = await request.get("/api/manager/monitor/services");
		if (response.code === "200" && response.data) {
			serviceData.value = response.data;
		}
	} catch (error) {
		console.error("加载服务状态失败:", error);
		ElMessage.error("加载服务状态失败");
		serviceData.value = getMockServiceData();
	}
};

// 加载服务日志
const loadServiceLogs = async (service: any) => {
	if (!service) return;
	
	try {
		const response = await request.get("/api/manager/monitor/service-logs", {
			params: {
				serviceName: service.name,
				limit: 100
			}
		});
		
		if (response.code === "200" && response.data) {
			serviceLogs.value = response.data;
		}
	} catch (error) {
		console.error("加载服务日志失败:", error);
		serviceLogs.value = getMockLogData();
	}
};

// 获取使用率样式类
const getUsageClass = (value: number) => {
  if (value >= 80) return 'danger';
  if (value >= 60) return 'warning';
  return 'normal';
};

// 获取响应时间样式类
const getResponseTimeClass = (value: number) => {
  if (value >= 300) return 'danger';
  if (value >= 150) return 'warning';
  return 'normal';
};

// 获取进度条状态
const getProgressStatus = (value: number) => {
  if (value >= 90) return 'exception';
  if (value >= 70) return 'warning';
  return 'success';
};

// 加载操作日志
const loadLogData = async () => {
	logLoading.value = true;
	try {
		const params: any = {
			page: logCurrentPage.value,
			pageSize: logPageSize.value,
			operator: logSearchKeyword.value,
			actionType: logActionType.value
		};
		
		if (logDateRange.value) {
			params.startTime = logDateRange.value[0].getTime();
			params.endTime = logDateRange.value[1].getTime();
		}
		
		const response = await request.get("/api/manager/monitor/logs", { params });
		if (response.code === "200" && response.data) {
			logData.value = response.data.list;
			logTotal.value = response.data.total;
		}
	} catch (error) {
		console.error("加载操作日志失败:", error);
		logData.value = getMockAuditLogs();
		logTotal.value = 150;
	} finally {
		logLoading.value = false;
	}
};

// 标签切换
const handleTabChange = (tab: string) => {
	console.log('切换到标签:', tab);
	
	if (tab === "performance") {
		// 确保DOM已经更新
		nextTick(() => {
			setTimeout(() => {
				initCharts();
				if (performanceHistory.value.length === 0) {
					loadRealPerformanceData();
				} else {
					updateCharts(performanceHistory.value);
				}
			}, 50);
		});
	} else if (tab === "services") {
		if (serviceData.value.length === 0) {
			loadServiceData();
		}
	} else if (tab === "logs") {
		if (logData.value.length === 0) {
			loadLogData();
		}
	}
};

// 查看服务日志
const handleViewServiceLog = async (service: any) => {
	selectedService.value = service;
	await loadServiceLogs(service);
	serviceLogDialogVisible.value = true;
};

// 过滤服务日志
const filterServiceLogs = () => {
	// 通过计算属性自动过滤
};

// 获取操作标签
const getActionLabel = (action: string) => {
	return actionLabels[action as keyof typeof actionLabels] || action;
};

// 格式化内存大小
const formatMemory = (bytes: number) => {
	if (!bytes) return "0 B";
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// 格式化时间
const formatTime = (timestamp: any) => {
	if (!timestamp) return '';
	let date: Date;
	
	if (typeof timestamp === 'string') {
		date = new Date(timestamp);
	} else if (typeof timestamp === 'number') {
		date = new Date(timestamp);
	} else if (timestamp instanceof Date) {
		date = timestamp;
	} else {
		return '';
	}
	
	if (isNaN(date.getTime())) return '';
	
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// 获取模拟服务数据
const getMockServiceData = () => {
	const now = Date.now();
	return [
		{
			name: 'Web服务器',
			status: 'running',
			pid: 12345,
			cpu: 15.2,
			memory: 256 * 1024 * 1024,
			uptime: '7天3小时',
			lastCheck: now
		},
		{
			name: '数据库服务',
			status: 'running',
			pid: 12346,
			cpu: 32.1,
			memory: 1024 * 1024 * 1024,
			uptime: '15天2小时',
			lastCheck: now
		},
		{
			name: '缓存服务',
			status: 'warning',
			pid: 12347,
			cpu: 85.3,
			memory: 512 * 1024 * 1024,
			uptime: '3天8小时',
			lastCheck: now
		}
	];
};

// 获取模拟日志数据
const getMockLogData = () => {
	const now = Date.now();
	return Array.from({ length: 10 }, (_, i) => ({
		time: now - i * 60000,
		level: ['INFO', 'WARN', 'ERROR'][i % 3],
		message: `日志消息 ${i}`
	}));
};

// 获取模拟操作日志
const getMockAuditLogs = () => {
	const now = Date.now();
	return Array.from({ length: 10 }, (_, i) => ({
		id: i + 1,
		operator: ['admin', 'user1', 'user2'][i % 3],
		action: ['login', 'data_publish', 'config_change'][i % 3],
		target: `目标${i}`,
		details: `操作详情 ${i}`,
		time: now - i * 3600000,
		ip: `192.168.1.${(i % 254) + 1}`,
		result: i % 5 === 0 ? '失败' : '成功'
	}));
};

// 显示系统信息对话框
const showSystemInfoDialog = async () => {
	try {
		const response = await request.get("/api/manager/monitor/system/info");
		if (response.code === "200" && response.data) {
			systemInfo.value = response.data;
			showSystemInfo.value = true;
		} else {
			ElMessage.error("获取系统信息失败");
		}
	} catch (error) {
		console.error("获取系统信息失败:", error);
		ElMessage.error("获取系统信息失败");
	}
};

// 重启服务
const restartService = async (serviceName: string) => {
	try {
		const response = await request.post(`/api/manager/monitor/services/${serviceName}/restart`);
		if (response.code === "200") {
			ElMessage.success(`服务 ${serviceName} 重启成功`);
			loadServiceData();
		} else {
			ElMessage.error(response.msg || "重启服务失败");
		}
	} catch (error) {
		console.error("重启服务失败:", error);
		ElMessage.error("重启服务失败");
	}
};

// 停止服务
const stopService = async (serviceName: string) => {
	try {
		const response = await request.post(`/api/manager/monitor/services/${serviceName}/stop`);
		if (response.code === "200") {
			ElMessage.success(`服务 ${serviceName} 已停止`);
			loadServiceData();
		} else {
			ElMessage.error(response.msg || "停止服务失败");
		}
	} catch (error) {
		console.error("停止服务失败:", error);
		ElMessage.error("停止服务失败");
	}
};

// 启动服务
const startService = async (serviceName: string) => {
	try {
		const response = await request.post(`/api/manager/monitor/services/${serviceName}/start`);
		if (response.code === "200") {
			ElMessage.success(`服务 ${serviceName} 启动成功`);
			loadServiceData();
		} else {
			ElMessage.error(response.msg || "启动服务失败");
		}
	} catch (error) {
		console.error("启动服务失败:", error);
		ElMessage.error("启动服务失败");
	}
};

// 轮询更新
let pollInterval: number;
const startPolling = () => {
	pollInterval = setInterval(() => {
		if (activeTab.value === 'performance') {
			loadRealPerformanceData();
		} else if (activeTab.value === 'services') {
			loadServiceData();
		}
	}, 30000); // 30秒轮询一次
};

// 清理轮询
const stopPolling = () => {
	if (pollInterval) {
		clearInterval(pollInterval);
	}
};

onMounted(() => {
	console.log('组件已挂载，当前标签:', activeTab.value);
	
	if (activeTab.value === "performance") {
		// 延迟初始化，确保DOM已经渲染
		setTimeout(() => {
			initCharts();
			loadRealPerformanceData();
		}, 300);
	}
	
	startPolling();
});

onUnmounted(() => {
	stopPolling();
	destroyCharts();
});

</script>

<style scoped>
.system-monitor {
	padding: 20px;
	height: 100%;
	overflow-y: auto;
}

.system-monitor .card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.system-monitor .real-time-metrics {
	margin-bottom: 20px;
}

.system-monitor .real-time-metrics .metric-card {
	height: 120px;
	transition: all 0.3s;
}

.system-monitor .real-time-metrics .metric-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.system-monitor .real-time-metrics .metric-card .metric-content {
	height: 100%;
	display: flex;
	align-items: center;
}

.system-monitor .real-time-metrics .metric-card .metric-icon {
	width: 60px;
	height: 60px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 15px;
	font-size: 28px;
}

.system-monitor .real-time-metrics .metric-card .metric-icon.cpu {
	background-color: #e6f7ff;
	color: #1890ff;
}

.system-monitor .real-time-metrics .metric-card .metric-icon.memory {
	background-color: #f6ffed;
	color: #52c41a;
}

.system-monitor .real-time-metrics .metric-card .metric-icon.disk {
	background-color: #fff7e6;
	color: #fa8c16;
}

.system-monitor .real-time-metrics .metric-card .metric-icon.network {
	background-color: #f9f0ff;
	color: #722ed1;
}

.system-monitor .real-time-metrics .metric-card .metric-info {
	flex: 1;
}

.system-monitor .real-time-metrics .metric-card .metric-title {
	font-size: 14px;
	color: #909399;
	margin-bottom: 8px;
}

.system-monitor .real-time-metrics .metric-card .metric-value {
	font-size: 28px;
	font-weight: bold;
	margin-bottom: 8px;
}

.system-monitor .real-time-metrics .metric-card .metric-value.normal {
	color: #52c41a;
}

.system-monitor .real-time-metrics .metric-card .metric-value.warning {
	color: #fa8c16;
}

.system-monitor .real-time-metrics .metric-card .metric-value.danger {
	color: #f5222d;
}

.system-monitor .real-time-metrics .metric-card .metric-trend {
	font-size: 12px;
	color: #909399;
}

.system-monitor .real-time-metrics .metric-card .metric-trend .trend-up {
	color: #f56c6c;
}

.system-monitor .real-time-metrics .metric-card .metric-trend .trend-down {
	color: #67c23a;
}

.system-monitor .performance-charts .chart-container {
	background-color: #fff;
	padding: 20px;
	border-radius: 4px;
	margin-bottom: 20px;
	box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
	min-height: 350px;
}

.system-monitor .performance-charts .chart-container .chart-title {
	font-size: 16px;
	font-weight: 600;
	margin-bottom: 15px;
	color: #303133;
}

.system-monitor .performance-charts .chart-container .chart {
	width: 100%;
	min-height: 300px;
}

/* 确保图表容器有尺寸 */
#cpuMemoryChart, #diskChart, #networkChart, #apiChart {
	width: 100% !important;
	height: 300px !important;
	min-height: 300px !important;
}

.system-monitor .service-card {
	cursor: pointer;
	transition: all 0.3s;
	height: 100%;
}

.system-monitor .service-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.system-monitor .service-card.status-running {
	border-left: 4px solid #67c23a;
}

.system-monitor .service-card.status-warning {
	border-left: 4px solid #e6a23c;
}

.system-monitor .service-card.status-stopped {
	border-left: 4px solid #f56c6c;
}

.system-monitor .service-card .service-content .service-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 15px;
}

.system-monitor .service-card .service-content .service-header .service-name {
	font-size: 16px;
	font-weight: 600;
	color: #303133;
}

.system-monitor .service-card .service-content .service-header .service-actions {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 5px;
}

.system-monitor .service-card .service-content .service-header .service-actions .action-buttons {
	display: flex;
	gap: 5px;
}

.system-monitor .service-card .service-content .service-info .service-item {
	display: flex;
	justify-content: space-between;
	margin-bottom: 8px;
	font-size: 14px;
}

.system-monitor .service-card .service-content .service-info .service-item .service-label {
	color: #909399;
	flex-shrink: 0;
}

.system-monitor .service-card .service-content .service-info .service-item .service-value {
	color: #303133;
	font-weight: 500;
	flex: 1;
	text-align: right;
	margin-left: 10px;
}

.system-monitor .service-card .service-content .service-info .service-item .service-value.normal {
	color: #52c41a;
}

.system-monitor .service-card .service-content .service-info .service-item .service-value.warning {
	color: #fa8c16;
}

.system-monitor .service-card .service-content .service-info .service-item .service-value.danger {
	color: #f5222d;
}

.system-monitor .service-card .service-content .service-info .service-item .service-value.description {
	font-size: 12px;
	color: #666;
	font-weight: normal;
	text-align: left;
}

.system-monitor .service-card .service-content .service-footer {
	margin-top: 15px;
	padding-top: 15px;
	border-top: 1px solid #f0f0f0;
	display: flex;
	justify-content: center;
}

.system-monitor .pagination {
	margin-top: 20px;
	display: flex;
	justify-content: flex-end;
}

.system-monitor .system-info-content {
	padding: 10px;
}

.system-monitor .system-info-content .el-descriptions {
	margin-bottom: 20px;
}

.system-monitor .system-info-content h4 {
	margin: 15px 0;
	color: #303133;
	font-size: 16px;
}

.system-monitor .service-log-content .log-toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 15px;
}

.system-monitor .service-log-content .log-item {
	display: flex;
	padding: 8px 0;
	border-bottom: 1px solid #f0f0f0;
	font-size: 14px;
	font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.system-monitor .service-log-content .log-item .log-time {
	width: 180px;
	color: #909399;
	flex-shrink: 0;
}

.system-monitor .service-log-content .log-item .log-level {
	width: 60px;
	font-weight: 600;
	margin: 0 10px;
	flex-shrink: 0;
}

.system-monitor .service-log-content .log-item .log-level.log-info {
	color: #409eff;
}

.system-monitor .service-log-content .log-item .log-level.log-warn {
	color: #e6a23c;
}

.system-monitor .service-log-content .log-item .log-level.log-error {
	color: #f56c6c;
}

.system-monitor .service-log-content .log-item .log-message {
	flex: 1;
	color: #303133;
	word-break: break-all;
}

/* 响应式调整 */
@media (max-width: 1200px) {
	.system-monitor .real-time-metrics .el-col {
		margin-bottom: 15px;
	}
	
	.system-monitor .performance-charts .el-col {
		width: 100%;
	}
	
	.system-monitor .service-card .el-col {
		width: 50%;
	}
}

@media (max-width: 768px) {
	.system-monitor {
		padding: 10px;
	}
	
	.system-monitor .real-time-metrics .el-col {
		width: 100%;
	}
	
	.system-monitor .service-card .el-col {
		width: 100%;
	}
	
	.system-monitor .card-header {
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
	}
	
	.system-monitor .card-header > div {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 10px;
	}
}
</style>