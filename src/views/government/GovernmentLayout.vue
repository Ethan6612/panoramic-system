<template>
	<div class="government-layout">
		<!-- 政府系统顶部导航 -->
		<el-header class="government-header">
			<div class="header-content">
				<div class="header-left">
					<el-icon class="header-icon" size="24"><MapLocation /></el-icon>
					<h1 class="system-title">政府执法管理系统</h1>
				</div>
				<div class="header-right">
					<!-- 用户信息和退出 -->
					<el-dropdown @command="handleUserCommand">
						<span class="user-dropdown">
							<el-avatar :size="36" class="user-avatar">
								{{ govUserInfo?.username?.charAt(0) || "政" }}
							</el-avatar>
							<span class="user-info">
								<span class="username">{{ govUserInfo?.username || "政府用户" }}</span>
								<span class="department">{{ govUserInfo?.department || "" }}</span>
							</span>
							<el-icon><ArrowDown /></el-icon>
						</span>
						<template #dropdown>
							<el-dropdown-menu>
								<el-dropdown-item command="profile">
									<el-icon><User /></el-icon>
									个人信息
								</el-dropdown-item>
								<el-dropdown-item command="switch" v-if="hasPanoramaLogin">
									<el-icon><Switch /></el-icon>
									切换到全景系统
								</el-dropdown-item>
								<el-dropdown-item command="logout" divided>
									<el-icon><SwitchButton /></el-icon>
									退出政府系统
								</el-dropdown-item>
							</el-dropdown-menu>
						</template>
					</el-dropdown>
				</div>
			</div>
		</el-header>
		
		<!-- 侧边菜单 -->
		<div class="layout-main">
			<el-aside class="government-aside" width="220px">
				<el-menu
					router
					class="government-menu"
					:default-active="$route.path"
					background-color="#2d3a4b"
					text-color="#bfcbd9"
					active-text-color="#409eff"
				>
					<el-menu-item index="/government/tasks">
						<el-icon><List /></el-icon>
						<template #title>任务管理</template>
					</el-menu-item>
					<el-menu-item index="/government/dashboard">
						<el-icon><DataAnalysis /></el-icon>
						<template #title>执法仪表板</template>
					</el-menu-item>
					<el-menu-item index="/government/map">
						<el-icon><Location /></el-icon>
						<template #title>执法地图</template>
					</el-menu-item>
					<el-menu-item index="/government/statistics">
						<el-icon><PieChart /></el-icon>
						<template #title>统计报表</template>
					</el-menu-item>
					<el-menu-item index="/panorama" class="back-to-home">
						<el-icon><House /></el-icon>
						<template #title>返回全景系统</template>
					</el-menu-item>
				</el-menu>
			</el-aside>
			
			<!-- 主内容区域 -->
			<el-main class="government-main">
				<router-view />
			</el-main>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
	MapLocation,
	ArrowDown,
	User,
	SwitchButton,
	List,
	DataAnalysis,
	PieChart,
	House,
	Switch,
	Location
} from "@element-plus/icons-vue";

const router = useRouter();

// 政府用户信息
const govUserInfo = ref<any>(null);

// 检查是否有全景系统登录
const hasPanoramaLogin = computed(() => {
	return !!localStorage.getItem("token");
});

// 加载政府用户信息
const loadGovUserInfo = () => {
	const govUserInfoStr = localStorage.getItem("govUserInfo");
	if (govUserInfoStr) {
		try {
			govUserInfo.value = JSON.parse(govUserInfoStr);
		} catch (error) {
			console.error("解析政府用户信息失败:", error);
			govUserInfo.value = null;
		}
	}
};

// 处理用户命令
const handleUserCommand = async (command: string) => {
	switch (command) {
		case "profile":
			ElMessage.info("个人信息功能开发中");
			break;
		case "switch":
			// 切换到全景系统
			if (hasPanoramaLogin.value) {
				router.push("/panorama");
			} else {
				ElMessage.info("全景系统未登录");
			}
			break;
		case "logout":
			await handleGovLogout();
			break;
	}
};

// 政府系统退出
const handleGovLogout = async () => {
	try {
		await ElMessageBox.confirm("确定要退出政府执法系统吗？", "提示", {
			confirmButtonText: "确定",
			cancelButtonText: "取消",
			type: "warning",
		});
		
		// 清除政府系统登录信息
		localStorage.removeItem("govToken");
		localStorage.removeItem("govUserInfo");
		
		// 如果之前保存了跳转路径，清除它
		sessionStorage.removeItem("govRedirectPath");
		
		ElMessage.success("已退出政府执法系统");
		
		// 跳转到全景系统首页
		router.push("/panorama");
	} catch (error) {
		// 用户取消
	}
};

onMounted(() => {
	loadGovUserInfo();
});
</script>

<style scoped>
.government-layout {
	width: 100%;
	height: 100vh;
	display: flex;
	flex-direction: column;
}

.government-header {
	height: 60px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 0;
	display: flex;
	align-items: center;
}

.header-content {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20px;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 12px;
}

.header-icon {
	color: white;
}

.system-title {
	margin: 0;
	font-size: 20px;
	font-weight: 600;
	color: white;
}

.header-right {
	display: flex;
	align-items: center;
}

.user-dropdown {
	display: flex;
	align-items: center;
	cursor: pointer;
	padding: 8px 12px;
	border-radius: 4px;
	transition: background-color 0.2s;
	color: white;
}

.user-dropdown:hover {
	background-color: rgba(255, 255, 255, 0.1);
}

.user-avatar {
	margin-right: 10px;
	background-color: #409eff;
}

.user-info {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	margin-right: 8px;
}

.username {
	font-size: 14px;
	font-weight: 500;
	color: white;
}

.department {
	font-size: 12px;
	color: rgba(255, 255, 255, 0.8);
	margin-top: 2px;
}

.layout-main {
	flex: 1;
	display: flex;
	overflow: hidden;
}

.government-aside {
	background-color: #2d3a4b;
	height: 100%;
}

.government-menu {
	height: 100%;
	border-right: none;
}

.government-menu .el-menu-item {
	height: 56px;
	line-height: 56px;
}

.government-menu .el-menu-item:hover {
	background-color: #263445 !important;
}

.government-menu .el-menu-item.is-active {
	background-color: #409eff !important;
	color: white !important;
}

.government-menu .back-to-home {
	margin-top: 20px;
	border-top: 1px solid #4a5568;
}

.government-main {
	padding: 20px;
	background-color: #f0f2f5;
	overflow-y: auto;
}
</style>