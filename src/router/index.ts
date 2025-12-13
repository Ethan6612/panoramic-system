import { createRouter, createWebHashHistory } from 'vue-router'
import { ElMessage } from "element-plus";
import PanoramaHome from "@/views/user/PanoramaHome.vue";
import PanoramaView from "@/views/user/PanoramaView.vue";
import ManagerLayout from "@/views/manager/ManagerLayout.vue";
import ManagerDashboard from "@/views/manager/ManagerDashboard.vue";
import DataManagement from "@/views/manager/DataManagement.vue";
import UserManagement from "@/views/manager/UserManagement.vue";
import SystemMonitor from "@/views/manager/SystemMonitor.vue";
import AdminShopAudit from "@/views/manager/AdminShopAudit.vue";
import ShopManagerLayout from "@/views/shop/ShopManagerLayout.vue";
import ShopManagerDashboard from "@/views/shop/ShopManagerDashboard.vue";
import ShopUserManagement from "@/views/shop/ShopUserManagement.vue";
import ShopSystemMonitor from "@/views/shop/ShopSystemMonitor.vue";
import GovernmentLayout from "@/views/government/GovernmentLayout.vue"; 
import GovernmentManagement from "@/views/government/GovernmentManagement.vue";
import GovernmentDashboard from "@/views/government/GovernmentDashboard.vue";
import GovernmentStatistics from "@/views/government/GovernmentStatistics.vue";
import GovernmentMap from "@/views/government/GovernmentMap.vue";

const routes = [
	{
		path: "/panorama",
		name: "PanoramaHome",
		component: PanoramaHome,
	},
	{
		path: "/panorama/:id",
		name: "PanoramaView",
		component: PanoramaView,
	},
	{
		path: "/manager",
		component: ManagerLayout,
		redirect: "/manager/dashboard",
		children: [
			{
				path: "dashboard",
				name: "ManagerDashboard",
				component: ManagerDashboard,
			},
			{
				path: "data",
				name: "DataManagement",
				component: DataManagement,
			},
			{
				path: "users",
				name: "UserManagement",
				component: UserManagement,
			},
			{
				path: "monitor",
				name: "SystemMonitor",
				component: SystemMonitor,
			},
						{
				path: "shops",
				name: "AdminShopAudit",
				component: AdminShopAudit,
			},
		],
	},
	{
		path: "/shop",
		component: ShopManagerLayout,
		redirect: "/shop/dashboard",
		children: [
			{
				path: "dashboard",
				name: "ShopManagerDashboard",
				component: ShopManagerDashboard,
			},
			{
				path: "users",
				name: "ShopUserManagement",
				component: ShopUserManagement,
			},
			{
				path: "monitor",
				name: "ShopSystemMonitor",
				component: ShopSystemMonitor,
			},
		],
	},
	{
		path: "/government",
		component: GovernmentLayout, // 使用政府专用的布局组件
		redirect: "/government/tasks",
		meta: {
			requiresGovAuth: true // 添加政府系统认证标记
		},
		children: [
			{
				path: "tasks",
				name: "GovernmentManagement",
				component: GovernmentManagement,
				meta: {
					title: "执法任务管理",
					requiresGovAuth: true
				}
			},
			{
				path: "dashboard",
				name: "GovernmentDashboard",
				component: GovernmentDashboard,
				meta: {
					title: "执法仪表板",
					requiresGovAuth: true
				}
			},
			{
				path: "statistics",
				name: "GovernmentStatistics",
				component: GovernmentStatistics,
				meta: {
					title: "统计报表",
					requiresGovAuth: true
				}
			},
			{
				path: "map",
				name: "GovernmentMap",
				component: GovernmentMap,
				meta: {
					title: "执法地图",
					requiresGovAuth: true
				}
			},
		],
	},
	{ path: "/", redirect: "/panorama" },
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

// 检查政府用户登录状态
const checkGovAuth = (): boolean => {
	const govToken = localStorage.getItem("govToken");
	const govUserInfo = localStorage.getItem("govUserInfo");
	
	if (!govToken || !govUserInfo) {
		return false;
	}
	
	try {
		const userInfo = JSON.parse(govUserInfo);
		// 检查token是否过期（如果有expiry字段）
		if (userInfo.expiry && new Date(userInfo.expiry) < new Date()) {
			// token已过期
			localStorage.removeItem("govToken");
			localStorage.removeItem("govUserInfo");
			return false;
		}
		return true;
	} catch (error) {
		// 解析失败，清除无效数据
		localStorage.removeItem("govToken");
		localStorage.removeItem("govUserInfo");
		return false;
	}
};

// 获取政府用户信息
const getGovUserInfo = () => {
	const govUserInfo = localStorage.getItem("govUserInfo");
	if (govUserInfo) {
		try {
			return JSON.parse(govUserInfo);
		} catch (error) {
			return null;
		}
	}
	return null;
};

// 路由守卫：检查管理员权限和政府权限
router.beforeEach((to, from, next) => {
	// 设置页面标题
	if (to.meta.title) {
		document.title = `${to.meta.title} - 中山市全景系统`;
	}
	
	// 检查管理员权限
	if (to.path.startsWith("/manager")) {
		const userInfoStr = localStorage.getItem("userInfo");
		if (userInfoStr) {
			try {
				const userInfo = JSON.parse(userInfoStr);
				if (userInfo.role === "admin" || userInfo.permission === 0) {
					next();
				} else {
					ElMessage.warning("您没有权限访问管理员页面");
					next("/panorama");
				}
			} catch (error) {
				ElMessage.warning("用户信息异常，请重新登录");
				localStorage.removeItem("token");
				localStorage.removeItem("userInfo");
				next("/panorama");
			}
		} else {
			ElMessage.warning("请先登录管理员账号");
			next("/panorama");
		}
	}
	// 检查商户权限
	else if (to.path.startsWith("/shop")) {
		const userInfoStr = localStorage.getItem("userInfo");
		if (userInfoStr) {
			try {
				const userInfo = JSON.parse(userInfoStr);
				if (userInfo.role === "advanced" || userInfo.role === "admin") {
					next();
				} else {
					ElMessage.warning("您没有权限访问商户后台");
					next("/panorama");
				}
			} catch (error) {
				ElMessage.warning("用户信息异常，请重新登录");
				localStorage.removeItem("token");
				localStorage.removeItem("userInfo");
				next("/panorama");
			}
		} else {
			ElMessage.warning("请先登录商户账号");
			next("/panorama");
		}
	}
	// 检查政府系统权限（重点修改部分）
	else if (to.path.startsWith("/government")) {
		// 检查是否需要政府认证
		if (to.meta.requiresGovAuth !== false) {
			const isGovAuth = checkGovAuth();
			
			if (!isGovAuth) {
				// 未登录政府系统
				ElMessage.warning({
					message: "请先登录政府执法系统",
					duration: 3000
				});
				
				// 保存当前想访问的路径，登录后可以跳转回来
				if (to.path !== "/government" && to.path !== "/government/tasks") {
					sessionStorage.setItem("govRedirectPath", to.fullPath);
				}
				
				// 如果有全景系统登录，保留全景系统状态，只提示需要政府登录
				// 可以跳转到首页或留在当前页
				next("/panorama");
				return;
			}
			
			// 已登录政府系统，可以检查用户角色或权限
			const govUserInfo = getGovUserInfo();
			if (govUserInfo) {
				// 可以根据用户角色限制某些页面
				if (to.meta.requiredRole && govUserInfo.role !== to.meta.requiredRole) {
					ElMessage.warning("您没有权限访问此页面");
					next("/government/tasks");
					return;
				}
			}
		}
		
		next();
	}
	else {
		next();
	}
});

// 全景系统不需要登录验证
export default router;