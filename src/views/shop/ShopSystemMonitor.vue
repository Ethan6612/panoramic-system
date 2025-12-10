<template>
	<div class="system-monitor">
		<!-- 选项卡 -->
		<el-tabs v-model="activeTab" @tab-change="handleTabChange">
			<!-- 性能监控页 -->
            <el-tab-pane label="收藏/浏览趋势" name="performance">
				<el-card>
					<template #header>
						<div class="card-header">
                            <span>收藏与浏览趋势</span>
							<div>
								<el-select v-model="timeRange" style="width: 150px" @change="loadPerformanceData">
                                <el-option label="今日" value="today" />
                                <el-option label="近7日" value="7d" />
                                <el-option label="近30日" value="30d" />
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
                                    <div class="chart-title">每日收藏数（柱状）</div>
									<div class="chart-placeholder">
										<div class="chart-mock">
											<div
												v-for="(item, index) in performanceData.slice(0, 10)"
												:key="index"
												class="chart-bar"
                                                :style="{
                                                    height: `${Math.round(((item.favorites || 0) / maxFav) * 100)}%`,
                                                    backgroundColor: '#67c23a',
                                                }"
											/>
										</div>
										<div class="chart-labels">
                                        <span>收藏</span>
										</div>
									</div>
								</div>
							</el-col>
							<el-col :span="12">
								<div class="chart-container">
                                    <div class="chart-title">每日浏览量（柱状）</div>
									<div class="chart-placeholder">
										<div class="chart-mock">
											<div
												v-for="(item, index) in performanceData.slice(0, 10)"
												:key="index"
												class="chart-bar"
                                                :style="{
                                                    height: `${Math.round(((item.views || 0) / maxView) * 100)}%`,
                                                    backgroundColor: '#409eff',
                                                }"
											/>
										</div>
										<div class="chart-labels">
                                        <span>浏览</span>
										</div>
									</div>
								</div>
							</el-col>
						</el-row>
						<el-row :gutter="20" style="margin-top: 20px">
							<el-col :span="24">
								<div class="chart-container">
                                    <div class="chart-title">累计收藏/浏览（折线）</div>
                                    <div class="chart-placeholder">
                                        <div class="chart-line-mock">
                                            <svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                <polyline 
                                                    :points="linePointsAttr" 
                                                    fill="none" 
                                                    stroke="#409eff" 
                                                    stroke-width="2" 
                                                    vector-effect="non-scaling-stroke" 
                                                    stroke-linecap="round" 
                                                    stroke-linejoin="round" 
                                                    shape-rendering="geometricPrecision"
                                                />
                                            </svg>
                                            <div
                                                v-for="(item, index) in performanceData"
                                                :key="index"
                                                class="chart-point"
                                                :style="{
                                                    left: `${(index / (performanceData.length - 1)) * 100}%`,
                                                    bottom: `${Math.round((((item.favorites || 0) + (item.views || 0)) / maxSum) * 100)}%`,
                                                }"
                                            />
                                        </div>
                                        <div class="chart-labels">
                                            <span>累计值</span>
                                        </div>
                                    </div>
                                </div>
                            </el-col>
						</el-row>
					</div>
				</el-card>
			</el-tab-pane>

		</el-tabs>

	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
// import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import request from "@/api/request";

const activeTab = ref("performance");
const timeRange = ref("7d");
const performanceData = ref<any[]>([]);


const normalizeTrend = (data: any): Array<{favorites: number, views: number}> => {
    if (Array.isArray(data)) {
        return data.map((d: any) => ({ favorites: Number(d.favorites || 0), views: Number(d.views || 0) }));
    }
    if (data && Array.isArray(data.weeklyFavorites) && Array.isArray(data.weeklyViews)) {
        const len = Math.max(data.weeklyFavorites.length, data.weeklyViews.length);
        const arr = [] as Array<{favorites: number, views: number}>;
        for (let i = 0; i < len; i++) {
            arr.push({
                favorites: Number(data.weeklyFavorites[i] || 0),
                views: Number(data.weeklyViews[i] || 0),
            });
        }
        return arr;
    }
    if (data && Array.isArray(data.list)) {
        return data.list.map((d: any) => ({ favorites: Number(d.favorites || 0), views: Number(d.views || 0) }));
    }
    return [
        { favorites: 2, views: 10 },
        { favorites: 3, views: 12 },
        { favorites: 1, views: 8 },
        { favorites: 4, views: 15 },
        { favorites: 5, views: 13 },
        { favorites: 3, views: 9 },
        { favorites: 6, views: 18 },
    ];
};

const loadPerformanceData = async () => {
    try {
        const response = await request.get("/api/shop/analytics/trends", {
            params: { timeRange: timeRange.value },
        });
        const normalized = normalizeTrend(response?.data);
        performanceData.value = normalized && normalized.length > 0 ? normalized : normalizeTrend(null);
    } catch (error) {
        performanceData.value = normalizeTrend(null);
    }
};

const maxFav = computed(() => Math.max(...performanceData.value.map(d => Number(d.favorites || 0)), 1));
const maxView = computed(() => Math.max(...performanceData.value.map(d => Number(d.views || 0)), 1));
const maxSum = computed(() => Math.max(...performanceData.value.map(d => Number((d.favorites || 0) + (d.views || 0))), 1));

const linePointsAttr = computed(() => {
    const len = performanceData.value.length;
    if (len <= 1) return '';
    return performanceData.value.map((item, index) => {
        const x = ((index / (len - 1)) * 100).toFixed(2);
        const yPerc = Math.round((((Number(item.favorites || 0) + Number(item.views || 0)) / maxSum.value) * 100));
        const y = (100 - yPerc).toFixed(2);
        return `${x},${y}`;
    }).join(' ');
});

const handleTabChange = (tab: string) => {
    if (tab === "performance") {
        loadPerformanceData();
    }
};

onMounted(() => {
    loadPerformanceData();
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

.system-monitor .performance-charts .chart-container .chart-placeholder .chart-line-mock .chart-svg {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
}

.system-monitor .performance-charts .chart-container .chart-placeholder .chart-line-mock .chart-point {
    position: absolute;
    width: 4px;
    height: 4px;
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

