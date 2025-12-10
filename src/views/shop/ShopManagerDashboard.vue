<template>
	<div class="manager-dashboard">
		<!-- 数据资产总览卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #409eff">
              <el-icon><Star /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.favoriteTotal }}</div>
              <div class="stat-label">收藏总数</div>
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
              <div class="stat-value">{{ stats.favoritesToday }}</div>
              <div class="stat-label">今日新增收藏</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #67c23a">
              <el-icon><View /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.viewsTotal }}</div>
              <div class="stat-label">浏览总量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #f56c6c">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.viewsToday }}</div>
              <div class="stat-label">今日浏览量</div>
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
                    <span>近7日收藏与浏览趋势</span>
                    <el-button text @click="refreshStats">
                      <el-icon><Refresh /></el-icon>
                      刷新
                    </el-button>
                  </div>
                </template>
                <div class="health-metrics">
                  <div class="metric-item">
                    <div class="metric-label">收藏</div>
                    <el-progress
                      :percentage="trendProgress(stats.weeklyFavorites)"
                      :color="'#67c23a'"
                      :stroke-width="20"
                    />
                    <div class="metric-value">{{ sum(stats.weeklyFavorites) }}</div>
                  </div>
                  <div class="metric-item">
                    <div class="metric-label">浏览</div>
                    <el-progress
                      :percentage="trendProgress(stats.weeklyViews)"
                      :color="'#409eff'"
                      :stroke-width="20"
                    />
                    <div class="metric-value">{{ sum(stats.weeklyViews) }}</div>
                  </div>
                </div>
              </el-card>
            </el-col>
			<el-col :span="12">
              <el-card class="chart-card">
                <template #header>
                  <div class="card-header">
                    <span>收藏与浏览概览</span>
                  </div>
                </template>
                <div class="user-stats">
                  <div class="user-stat-item">
                    <div class="user-stat-value">{{ stats.favoriteTotal }}</div>
                    <div class="user-stat-label">收藏总数</div>
                  </div>
                  <div class="user-stat-item">
                    <div class="user-stat-value">{{ stats.viewsTotal }}</div>
                    <div class="user-stat-label">浏览总量</div>
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
				<el-button type="success" size="large" @click="goToUsers">
					<el-icon><UserFilled /></el-icon>
					商铺管理
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
    Star,
    View,
    Clock,
    TrendCharts,
    Refresh,
    UserFilled,
} from "@element-plus/icons-vue";
import request from "@/api/request";

const router = useRouter();
const stats = ref({
    favoriteTotal: 0,
    favoritesToday: 0,
    viewsTotal: 0,
    viewsToday: 0,
    weeklyFavorites: [] as number[],
    weeklyViews: [] as number[],
});

let refreshTimer: any = null;

const loadStats = async () => {
    try {
        const response = await request.get("/api/shop/analytics/stats");
        if (response.code === "200" && response.data) {
            stats.value = Object.assign(
                { weeklyFavorites: [], weeklyViews: [] },
                response.data
            );
        } else {
            stats.value = {
                favoriteTotal: 0,
                favoritesToday: 0,
                viewsTotal: 0,
                viewsToday: 0,
                weeklyFavorites: [],
                weeklyViews: [],
            };
        }
    } catch (error) {
        stats.value = {
            favoriteTotal: 0,
            favoritesToday: 0,
            viewsTotal: 0,
            viewsToday: 0,
            weeklyFavorites: [2,3,1,4,5,3,6],
            weeklyViews: [10,12,8,15,13,9,18],
        };
    }
};

const refreshStats = () => {
	loadStats();
	ElMessage.success("数据已刷新");
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + (b || 0), 0);
const trendProgress = (arr: number[]) => {
    const s = sum(arr);
    const max = Math.max(...arr, 1);
    const ratio = Math.min(100, Math.round((s / (max * arr.length)) * 100));
    return isNaN(ratio) ? 0 : ratio;
};

const goToUsers = () => {
    router.push("/shop/users");
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

