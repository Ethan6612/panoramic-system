<template>
	<div class="panorama-home">
		<!-- 顶部导航栏 -->
		<div class="header">
			<div class="header-left">
				<h1 class="system-title">中山市全景系统</h1>
			</div>
			<div class="header-center">
				<el-input v-model="searchKeyword" placeholder="搜索地点、地址或关键词" class="search-input" @keyup.enter="handleSearch">
					<template #prefix>
						<el-icon><Search /></el-icon>
					</template>
				</el-input>
			</div>
			<div class="header-right">
				<!-- 已登录状态显示用户信息 -->
				<div v-if="isLoggedIn" class="user-info">
					<!-- 管理员显示返回管理后台按钮 -->
					<el-button 
						v-if="userRole === 'admin'" 
						type="primary" 
						size="middle" 
						class="back-to-manager-btn" 
						@click="goToManager">
						<el-icon><Setting /></el-icon>
						管理后台
					</el-button>
					
					<!-- 高级用户显示返回商户后台按钮 -->
					<el-button 
						v-if="userRole === 'advanced'" 
						type="success" 
						size="middle" 
						class="back-to-shop-btn" 
						@click="goToShopManager">
						<el-icon><Shop /></el-icon>
						商户后台
					</el-button>

					<!-- 新增：政府执法入口按钮 -->
					<el-button 
						v-if="showGovernmentButton" 
						type="danger" 
						size="middle" 
						class="government-btn" 
						@click="handleGovernmentAccess">
						<el-icon><MapLocation /></el-icon>
						政府执法
					</el-button>

					<el-dropdown @command="handleUserCommand">
						<span class="user-dropdown">
							<el-avatar :size="40" class="user-avatar">
								{{ userInfo?.username?.charAt(0) || "U" }}
							</el-avatar>
							<span class="username">{{ userInfo?.username || "用户" }}</span>
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
				<!-- 未登录状态显示登录按钮 -->
				<div v-else class="login-info">
					<el-button type="primary" @click="showLoginDialog = true">
						<el-icon><User /></el-icon>
						登录/注册
					</el-button>
				</div>
			</div>
		</div>

		<!-- 地图容器 -->
		<div ref="mapContainer" class="map-container"></div>

		<!-- 地点信息面板 -->
		<LocationInfoPanel v-if="selectedLocation" :location="selectedLocation" @close="selectedLocation = null" />

		<!-- 右键菜单 -->
		<ContextMenu
			v-if="contextMenuVisible"
			:x="contextMenuX"
			:y="contextMenuY"
			@close="contextMenuVisible = false"
			@favorite="handleFavorite"
			@panorama="handlePanorama" />

		<!-- 登录对话框 -->
		<LoginDialog v-model="showLoginDialog" @login-success="handleLoginSuccess" />
		
		<!-- 新增：政府执法登录对话框 -->
		<GovernmentLoginDialog :model-value="showGovLoginDialog" @update:model-value="(val: boolean) => showGovLoginDialog = val" />
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useRouter } from "vue-router";
import { Search, Setting, User, ArrowDown, SwitchButton, Shop, MapLocation } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import AMapLoader from "@amap/amap-jsapi-loader";
import LocationInfoPanel from "@/components/LocationInfoPanel.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import LoginDialog from "@/components/LoginDialog.vue";
import GovernmentLoginDialog from "@/components/GovernmentLoginDialog.vue"; // 新增导入
import request from "@/api/request";
// @ts-ignore
import type { LocationData } from "@/types/panorama";

declare const window: Window & {
	_AMapSecurityConfig: {
		securityJsCode: string;
	};
	panoramaViewer?: any;
};

const router = useRouter();

// 用户登录状态
const userInfo = ref<any>(null);
const isLoggedIn = computed(() => {
	return !!userInfo.value;
});
const userRole = computed(() => {
	return userInfo.value?.role || "";
});

// 判断是否为高级用户
const isAdvancedUser = computed(() => {
	return userRole.value === 'advanced' || userInfo.value?.permission === 1;
});

// 地图相关
const mapContainer = ref<HTMLElement | null>(null);
let map: any = null;
let markersMap = new Map<number, any>();
// let shopMarkers: any[] = [];
// const shopCoords: Record<string, [number, number]> = {
//   "星光餐馆": [113.3915, 22.5308],
//   "乐家超市": [113.3821, 22.5263],
//   "海湾酒店": [113.4042, 22.5319],
//   "老街小吃": [113.3738, 22.5201],
//   "新光商场": [113.4186, 22.5473],
//   "幸福饭店": [113.389, 22.532],
//   "便利超市": [113.381, 22.524],
//   "假日酒店": [113.405, 22.533],
//   "风味小吃": [113.372, 22.519],
//   "阳光商超": [113.420, 22.546],
// };

// 搜索
const searchKeyword = ref("");

// 选中的地点
const selectedLocation = ref<LocationData | null>(null);

// 右键菜单
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuLocation = ref<LocationData | null>(null);

// 登录对话框
const showLoginDialog = ref(false);

// 新增：政府登录对话框
const showGovLoginDialog = ref(false);

// 地点数据
const locations = ref<LocationData[]>([]);

// 添加跳动动画相关变量
const jumpingMarker = ref<any>(null);
let jumpInterval: number | null = null;

// 新增：计算属性，控制政府按钮显示
const showGovernmentButton = computed(() => {
	// 可以根据需求设置显示条件
	// 例如：所有登录用户都可以看到，或者特定IP段才能看到
	// 这里设置为所有登录用户都可以看到
	return isLoggedIn.value;
});

// 新增：检查政府登录状态
const hasGovLogin = computed(() => {
	return !!localStorage.getItem("govToken");
});

// 检查登录状态
const checkLoginStatus = () => {
	const token = localStorage.getItem("token");
	const storedUserInfo = localStorage.getItem("userInfo");

	// 添加调试信息
	console.log("检查登录状态:", { token, storedUserInfo });

	if (token && storedUserInfo) {
		try {
			userInfo.value = JSON.parse(storedUserInfo);
			console.log("已登录用户:", userInfo.value);
			console.log("用户角色:", userRole.value);
			console.log("是否为高级用户:", isAdvancedUser.value);
		} catch (error) {
			console.error("解析用户信息失败:", error);
			// 清除无效的用户信息
			localStorage.removeItem("token");
			localStorage.removeItem("userInfo");
		}
	}
};

// 新增：处理政府系统访问
const handleGovernmentAccess = () => {
	if (hasGovLogin.value) {
		// 已登录政府系统，直接跳转
		router.push("/government/tasks");
	} else {
		// 未登录政府系统，显示政府登录框
		showGovLoginDialog.value = true;
	}
};

// 处理用户命令
const handleUserCommand = async (command: string) => {
	if (command === "profile") {
		ElMessage.info("个人中心功能开发中");
	} else if (command === "logout") {
		await handleLogout();
	}
};

// 退出登录 - 调用后端接口
const handleLogout = async () => {
	try {
		await ElMessageBox.confirm("确定要退出全景系统吗？", "提示", {
			confirmButtonText: "确定",
			cancelButtonText: "取消",
			type: "warning",
		});

		// 调用后端退出接口
		const response = await request.post(
			"/api/users/logout",
			{},
			{
				headers: {
					token: localStorage.getItem("token") || "",
				},
			}
		);

		const responseData = response as any;
		if (responseData && responseData.code === "200") {
			// 清除本地存储
			localStorage.removeItem("token");
			localStorage.removeItem("userInfo");
			// 注意：这里不清理政府登录信息，保持独立
			// localStorage.removeItem("govToken");
			// localStorage.removeItem("govUserInfo");

			// 重置用户信息
			userInfo.value = null;

			ElMessage.success("已退出全景系统");
		} else {
			// 如果API调用失败，仍然清除本地存储
			localStorage.removeItem("token");
			localStorage.removeItem("userInfo");
			userInfo.value = null;
			ElMessage.success("已退出全景系统");
		}
	} catch (error: any) {
		if (error !== "cancel") {
			// 如果用户没有点击取消，清除本地存储
			localStorage.removeItem("token");
			localStorage.removeItem("userInfo");
			userInfo.value = null;
			ElMessage.success("已退出全景系统");
		}
	}
};

// 初始化地图
const initMap = async () => {
	const apiKey = process.env.VUE_APP_AMAP_KEY;
	const securityCode = process.env.VUE_APP_AMAP_SECURITY_CODE;

	if (!apiKey || !securityCode) {
		console.error("请设置 VUE_APP_AMAP_KEY 和 VUE_APP_AMAP_SECURITY_CODE");
		ElMessage.error("地图配置错误，请检查环境变量");
		return;
	}

	(window as any)._AMapSecurityConfig = { securityJsCode: securityCode };

	try {
		const AMap = await AMapLoader.load({
			key: apiKey,
			version: "2.0",
			plugins: ["AMap.PlaceSearch", "AMap.AutoComplete"],
		});

		map = new AMap.Map(mapContainer.value!, {
			zoom: 13,
			center: [113.386913, 22.530342],
		});

		// 将AMap挂载到window对象
		(window as any).AMap = AMap;

		// 加载地点数据
		await loadLocations();
		// await loadApprovedShops();

		// 加载完成后，将地图中心设置为第一个marker的坐标
		if (locations.value.length > 0) {
			const firstLocation = locations.value[0];
			map.setCenter([firstLocation.longitude, firstLocation.latitude]);
			map.setZoom(14);
		}

		// 点击地图其他地方关闭右键菜单
		map.on("click", () => {
			contextMenuVisible.value = false;
		});
	} catch (error) {
		console.error("地图初始化失败:", error);
		ElMessage.error("地图加载失败");
	}
};

// 加载地点数据
const loadLocations = async () => {
	try {
		const response = await request.get("/api/panorama/locations");
		const responseData = response as any;
		console.log("获取地点列表响应:", responseData);

		if (responseData && responseData.data && Array.isArray(responseData.data)) {
			locations.value = responseData.data;
			addMarkersToMap(responseData.data);
		} else {
			ElMessage.error("加载地点数据失败");
		}
	} catch (error) {
		console.error("加载地点数据失败:", error);
		ElMessage.error("加载地点数据失败");
	}
};

// 添加标记到地图
const addMarkersToMap = (data: LocationData[]) => {
	if (!map) return;

	const AMap = (window as any).AMap;
	if (!AMap) return;

	data.forEach((location) => {
		const marker = new AMap.Marker({
			position: [location.longitude, location.latitude],
			map: map,
			icon: new AMap.Icon({
				size: new AMap.Size(30, 30),
				image: "//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png",
				imageSize: new AMap.Size(30, 30),
			}),
			extData: {
				id: location.id,
				location: location,
				originalLng: location.longitude,
				originalLat: location.latitude,
			},
		});

		// 点击marker显示地点信息
		marker.on("click", () => {
			stopJumping();
			// console.log("点击的地点",location)
			selectedLocation.value = location;
			contextMenuVisible.value = false;
			startJumping(marker);
		});

		// 右键点击marker显示菜单
		marker.on("rightclick", (e: any) => {
			if (e && e.originalEvent) {
				e.originalEvent.preventDefault();
				e.originalEvent.stopPropagation();
			}

			contextMenuLocation.value = location;
			const pixel = map.lngLatToContainer(e.lnglat);
			contextMenuX.value = pixel.x;
			contextMenuY.value = pixel.y;
			contextMenuVisible.value = true;
		});

		markersMap.set(location.id, marker);
	});
};

// const loadApprovedShops = async () => {
//   try {
//     const response = await request.get("/api/shop/list", { params: { page: 1, pageSize: 1000 } });
//     const res: any = response;
//     if (res && res.data && Array.isArray(res.data.list)) {
//       const list = res.data.list;
//       const approved = list.filter((x: any) => (x.auditStatus === "approved") || (x.audit_status === "approved"));
//       addShopMarkers(approved);
//     }
//   } catch (e) {
//     console.error(e);
//   }
// };

// const addShopMarkers = (shops: any[]) => {
//   if (!map) return;
//   const AMap = (window as any).AMap;
//   if (!AMap) return;
//   shops.forEach((shop: any) => {
//     const coord = shopCoords[shop.username];
//     if (!coord) return;
//     const marker = new AMap.Marker({
//       position: coord,
//       map: map,
//       title: shop.username,
//     });
//     const infoWindow = new (AMap as any).InfoWindow({
//       content: `<div style="padding:8px;"><strong>${shop.username}</strong><br/>${shop.email}</div>`,
//       offset: new (AMap as any).Pixel(0, -30),
//     });
//     marker.on("click", () => {
//       infoWindow.open(map, marker.getPosition());
//     });
//     shopMarkers.push(marker);
//   });
// };

// 开始跳动动画
const startJumping = (marker: any) => {
	stopJumping();

	jumpingMarker.value = marker;
	const extData = marker.getExtData();
	const originalPosition = [extData.originalLng, extData.originalLat];
	let jumpOffset = 0;
	let direction = 1;
	const maxJumpOffset = 15;
	const jumpSpeed = 1.5;

	jumpInterval = window.setInterval(() => {
		if (!marker || !map) {
			stopJumping();
			return;
		}

		jumpOffset += direction * jumpSpeed;

		if (jumpOffset >= maxJumpOffset) {
			jumpOffset = maxJumpOffset;
			direction = -1;
		} else if (jumpOffset <= 0) {
			jumpOffset = 0;
			direction = 1;
		}

		const AMap = (window as any).AMap;
		if (AMap) {
			const originalPixel = map.lngLatToContainer(new AMap.LngLat(originalPosition[0], originalPosition[1]));
			const newPixel = new AMap.Pixel(originalPixel.x, originalPixel.y - jumpOffset);
			const newPosition = map.containerToLngLat(newPixel);
			marker.setPosition(newPosition);
		}
	}, 30);
};

// 停止跳动动画
const stopJumping = () => {
	if (jumpInterval) {
		clearInterval(jumpInterval);
		jumpInterval = null;
	}

	if (jumpingMarker.value) {
		const AMap = (window as any).AMap;
		if (AMap) {
			const extData = jumpingMarker.value.getExtData();
			if (extData) {
				const originalPosition = new AMap.LngLat(extData.originalLng, extData.originalLat);
				jumpingMarker.value.setPosition(originalPosition);
			}
		}
		jumpingMarker.value = null;
	}
};

// 监听选中的地点变化
watch(selectedLocation, (newLocation) => {
	if (!newLocation) {
		stopJumping();
	}
});

// 搜索功能
const handleSearch = async () => {
	if (!searchKeyword.value.trim() || !map) return;

	try {
		const AMap = (window as any).AMap;
		if (!AMap) {
			ElMessage.warning("地图未加载完成");
			return;
		}

		const placeSearch = new AMap.PlaceSearch({
			city: "中山市",
			citylimit: true,
		});

		placeSearch.search(searchKeyword.value, (status: string, result: any) => {
			if (status === "complete" && result.poiList && result.poiList.pois.length > 0) {
				const poi = result.poiList.pois[0];
				if (map) {
					map.setCenter([poi.location.lng, poi.location.lat]);
					map.setZoom(16);
				}
				ElMessage.success({ message: `已定位到：${poi.name}`, duration: 1500 });
			} else {
				ElMessage.warning("未找到相关地点");
			}
		});
	} catch (error) {
		console.error("搜索失败:", error);
		ElMessage.error("搜索失败");
	}
};

// 处理收藏
const handleFavorite = () => {
	if (contextMenuLocation.value) {
		ElMessage.success(`已收藏：${contextMenuLocation.value.name}`);
		contextMenuVisible.value = false;
	}
};

// 处理全景预览
const handlePanorama = () => {
	if (contextMenuLocation.value) {
		router.push({
			name: "PanoramaView",
			params: { id: contextMenuLocation.value.id.toString() },
		});
		contextMenuVisible.value = false;
	}
};

// 处理登录成功
const handleLoginSuccess = (userInfoData: any) => {
	userInfo.value = userInfoData;
	showLoginDialog.value = false;
	
	// 显示用户角色信息
	if (userInfoData.role === 'admin') {
		ElMessage.success("欢迎回来，管理员！");
	} else if (userInfoData.role === 'advanced') {
		ElMessage.success("欢迎回来，高级用户！");
	}
};

// 跳转到管理后台（管理员）
const goToManager = () => {
	router.push("/manager/dashboard");
};

// 跳转到商户后台（高级用户）
const goToShopManager = () => {
	router.push("/shop/dashboard");
};

// 清理资源
const cleanup = () => {
	stopJumping();

	markersMap.forEach((marker) => marker.setMap(null));
	markersMap.clear();
	if (map) {
		try {
			map.destroy();
		} catch (e) {
			console.warn("地图销毁失败:", e);
		}
		map = null;
	}
};

// 全局禁用浏览器右键菜单
const disableContextMenu = (e: Event) => {
	e.preventDefault();
	e.stopPropagation();
	return false;
};

onMounted(() => {
	// 检查登录状态
	checkLoginStatus();

	// 确保之前可能存在的全景图查看器被清理
	if (window.panoramaViewer) {
		try {
			window.panoramaViewer.destroy();
			delete window.panoramaViewer;
		} catch (e) {
			console.warn("清理全局全景图查看器:", e);
		}
	}

	initMap();

	// 添加全局右键菜单禁用事件监听
	document.addEventListener("contextmenu", disableContextMenu);

	// 添加到地图容器上作为额外的保护层
	if (mapContainer.value) {
		mapContainer.value.addEventListener("contextmenu", disableContextMenu);
	}
});

onUnmounted(() => {
	// 清理资源
	cleanup();

	// 移除全局右键菜单禁用事件监听
	document.removeEventListener("contextmenu", disableContextMenu);

	// 移除地图容器的事件监听
	if (mapContainer.value) {
		mapContainer.value.removeEventListener("contextmenu", disableContextMenu);
	}
});
</script>

<style scoped>
.panorama-home {
	width: 100%;
	height: 100vh;
	display: flex;
	flex-direction: column;
	position: relative;
	background: #f5f5f5;
}

.header {
	height: 60px;
	background: white;
	display: flex;
	align-items: center;
	padding: 0 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	z-index: 1000;
}

.header-left {
	flex: 0 0 auto;
	margin-right: 20px;
}

.system-title {
	margin: 0;
	font-size: 20px;
	font-weight: 600;
	color: #333;
}

.header-center {
	flex: 1;
	max-width: 500px;
	margin: 0 auto;
}

.search-input {
	width: 100%;
}

.header-right {
	flex: 0 0 auto;
	margin-left: 20px;
	display: flex;
	align-items: center;
	gap: 10px;
}

/* 用户信息样式 */
.user-info {
	display: flex;
	align-items: center;
	gap: 10px;
}

.back-to-manager-btn,
.back-to-shop-btn {
	margin-right: 5px;
}

.back-to-manager-btn {
	background-color: #409eff;
	border-color: #409eff;
}

.back-to-manager-btn:hover {
	background-color: #66b1ff;
	border-color: #66b1ff;
}

.back-to-shop-btn {
	background-color: #67c23a;
	border-color: #67c23a;
}

.back-to-shop-btn:hover {
	background-color: #85ce61;
	border-color: #85ce61;
}

/* 新增：政府执法按钮样式 */
.government-btn {
	background-color: #f56c6c;
	border-color: #f56c6c;
	margin-right: 5px;
}

.government-btn:hover {
	background-color: #f78989;
	border-color: #f78989;
}

.user-dropdown {
	display: flex;
	align-items: center;
	cursor: pointer;
	padding: 5px 8px;
	border-radius: 4px;
	transition: background-color 0.2s;
}

.user-dropdown:hover {
	background-color: #f5f5f5;
}

.user-dropdown .user-avatar {
	margin-right: 8px;
}

.user-dropdown .username {
	margin-right: 5px;
	font-size: 14px;
	color: #333;
}

/* 登录按钮样式 */
.login-info .el-button {
	display: flex;
	align-items: center;
	gap: 5px;
}

.map-container {
	flex: 1;
	width: 100%;
	position: relative;
}
</style>