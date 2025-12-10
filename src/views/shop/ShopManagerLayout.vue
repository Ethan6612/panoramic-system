<template>
	<div class="manager-layout">
		<!-- 顶部导航栏 -->
		<el-header class="manager-header">
			<div class="header-left">
				<h1 class="system-title">全景系统管理平台</h1>
			</div>
			<div class="header-right">
				<el-button type="primary" class="back-to-map-btn" @click="goToMap">
					<el-icon><MapLocation /></el-icon>
					<span>回到地图</span>
				</el-button>
				<el-dropdown @command="handleCommand">
					<span class="user-info">
						<el-avatar :size="40" class="user-avatar">
							{{ userInfo?.username?.charAt(0) || "A" }}
						</el-avatar>
						<span class="username">{{ userInfo?.username || "管理员" }}</span>
						<el-icon><ArrowDown /></el-icon>
					</span>
					<template #dropdown>
						<el-dropdown-menu>
							<el-dropdown-item command="profile">
								<el-icon><User /></el-icon>
								个人中心
							</el-dropdown-item>
							<el-dropdown-item command="logout" divided>
								<el-icon><SwitchButton /></el-icon>
								退出登录
							</el-dropdown-item>
						</el-dropdown-menu>
					</template>
				</el-dropdown>
			</div>
		</el-header>

		<div class="manager-container">
			<!-- 左侧导航菜单 -->
			<el-aside width="200px" class="manager-aside">
				<el-menu
					:default-active="activeMenu"
					class="manager-menu"
					router
					@select="handleMenuSelect"
				>
                <el-menu-item index="/shop/dashboard">
                    <el-icon><Odometer /></el-icon>
                    <span>数据监控中心</span>
                </el-menu-item>
                <el-menu-item index="/shop/users">
                    <el-icon><User /></el-icon>
                    <span>商铺与权限管理</span>
                </el-menu-item>
                <el-menu-item index="/shop/monitor">
                    <el-icon><Monitor /></el-icon>
                    <span>系统运维监控</span>
                </el-menu-item>
				</el-menu>
			</el-aside>

			<!-- 主内容区 -->
			<el-main class="manager-main">
				<router-view />
			</el-main>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowDown, Odometer, User, Monitor, MapLocation, SwitchButton } from "@element-plus/icons-vue";
import request from "@/api/request";

const router = useRouter();
const route = useRoute();
const userInfo = ref<any>(null);

const activeMenu = computed(() => {
	return route.path;
});

onMounted(() => {
	// 获取用户信息
	const userInfoStr = localStorage.getItem("userInfo");
	if (userInfoStr) {
		userInfo.value = JSON.parse(userInfoStr);
	}
});

const handleMenuSelect = (index: string) => {
	router.push(index);
};

const handleCommand = async (command: string) => {
	if (command === "profile") {
		ElMessage.info("个人中心功能开发中");
	} else if (command === "logout") {
		await handleLogout();
	}
};

// 退出登录 - 调用后端接口
const handleLogout = async () => {
	try {
		await ElMessageBox.confirm("确定要退出登录吗？", "提示", {
			confirmButtonText: "确定",
			cancelButtonText: "取消",
			type: "warning",
		});

		// 调用后端退出接口
		const response = await request.post("/api/users/logout", {}, {
			headers: {
				'token': localStorage.getItem("token") || ''
			}
		});

		if (response.code === "200") {
			// 清除本地存储
			localStorage.removeItem("token");
			localStorage.removeItem("userInfo");
			router.push("/panorama");
			ElMessage.success("已退出登录");
		} else {
			// 如果API调用失败，仍然清除本地存储
			localStorage.removeItem("token");
			localStorage.removeItem("userInfo");
			router.push("/panorama");
			ElMessage.success("已退出登录");
		}
	} catch (error: any) {
		if (error !== "cancel") {
			// 如果用户没有点击取消，清除本地存储
			localStorage.removeItem("token");
			localStorage.removeItem("userInfo");
			router.push("/panorama");
			ElMessage.success("已退出登录");
		}
	}
};

const goToMap = () => {
	router.push({ name: "PanoramaHome" });
};
</script>

<style scoped>
.manager-layout {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background-color: #f5f5f5;
}

.manager-header {
	height: 60px !important;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20px;
	background-color: #fff;
	border-bottom: 1px solid #e4e7ed;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

	.header-left .system-title {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: #303133;
	}

	.header-right .user-info {
		display: flex;
		align-items: center;
		cursor: pointer;
		padding: 5px 10px;
		border-radius: 4px;
		transition: background-color 0.3s;
	}

	.header-right .user-info:hover {
		background-color: #f5f7fa;
	}

	.header-right .user-info .user-avatar {
		margin-right: 8px;
	}

	.header-right .user-info .username {
		margin-right: 8px;
		font-size: 14px;
		color: #303133;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.back-to-map-btn {
		margin-right: 5px;
	}
}

.manager-container {
	flex: 1;
	display: flex;
	overflow: hidden;
}

.manager-aside {
	background-color: #fff;
	border-right: 1px solid #e4e7ed;

	.manager-menu {
		border-right: none;
		height: 100%;
	}
}

.manager-main {
	padding: 20px;
	overflow-y: auto;
	background-color: #f5f5f5;
}
</style>
