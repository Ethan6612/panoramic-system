import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import Mock from "mockjs";
import imageLocations from "@/config/imageLocations.json";
import { loadImage } from "@/utils/imageLoader";
import { wgs84ToGcj02 } from "@/utils/coords";

// 直接拦截全局 axios（与 request.ts 中的 service 保持一致）
if (process.env.VUE_APP_MOCK === "true") {
  const mock = new MockAdapter(axios, { delayResponse: 500 }); // 模拟延迟

	// 登录接口
	mock.onPost("/api/users/login").reply((config) => {
		const { username, password } = JSON.parse(config.data);

		// 管理员登录
		if (username === "admin" && password === "123456") {
			return [
				200,
				{
					code: "200",
					msg: "登录成功",
					data: {
						userId: 0,
						username: "admin",
						email: "admin@example.com",
						phone: "13800000001",
						permission: 0, // 0表示管理员
						role: "admin",
						token: Mock.Random.guid(),
					},
				},
			];
		}
		// 普通用户登录
		else if (username === "user" && password === "123456") {
			return [
				200,
				{
					code: "200",
					msg: "登录成功",
					data: {
						userId: 1,
						username: "user",
						email: "user@example.com",
						phone: "13800000000",
						permission: 1,
						role: "user",
						token: Mock.Random.guid(),
					},
				},
			];
		} else {
			return [
				200,
				{
					code: "400",
					msg: "用户名或密码错误",
					data: null,
				},
			];
		}
	});

	// 全景系统 - 地点列表接口
	// 使用从EXIF读取的真实数据
	mock.onGet("/api/panorama/locations").reply(200, {
		code: "200",
		msg: "获取成功",
		data: imageLocations.map((loc: any) => {
			// 将WGS84坐标转换为GCJ-02坐标
			const [gcjLng, gcjLat] = wgs84ToGcj02(loc.longitude, loc.latitude);
			return {
				id: loc.id,
				name: loc.name,
				longitude: gcjLng,
				latitude: gcjLat,
				rating: loc.rating,
				category: loc.category,
				images: loc.images,
				description: loc.description,
				address: loc.address,
			};
		}),
	});

	// 全景系统 - 全景数据接口
	// 使用从EXIF读取的真实数据
	mock.onGet("/api/panorama/panoramas").reply(200, {
		code: "200",
		msg: "获取成功",
		data: imageLocations.map((loc: any) => {
			// 将WGS84坐标转换为GCJ-02坐标
			const [gcjLng, gcjLat] = wgs84ToGcj02(loc.longitude, loc.latitude);
			return {
				id: loc.id,
				locationId: loc.id,
				locationName: loc.name,
				description: loc.description,
				panoramaImage: loc.panoramaImage,
				thumbnail: loc.thumbnail,
				timestamp: loc.timestamp,
				longitude: gcjLng,
				latitude: gcjLat,
			};
		}),
	});

	// 全景系统 - 时光机数据接口
	// 返回该地点的所有时间段数据
	mock.onGet(/^\/api\/panorama\/timemachine\/\d+$/).reply((config) => {
		const locationId = parseInt(config.url?.split("/").pop() || "1");
		const location = imageLocations.find((loc: any) => loc.id === locationId);

		// 如果有该地点，返回其所有时间段数据
		const timeMachineData =
			location && location.timePeriods
				? location.timePeriods.map((period: any, index: number) => {
						// 将WGS84坐标转换为GCJ-02坐标
						const [gcjLng, gcjLat] = wgs84ToGcj02(location.longitude, location.latitude);
						return {
							id: period.id || `${locationId * 100 + index + 1}`,
							locationId: locationId,
							year: new Date(period.timestamp).getFullYear(),
							month: new Date(period.timestamp).getMonth() + 1,
							label: period.label || `${new Date(period.timestamp).getFullYear()}年${new Date(period.timestamp).getMonth() + 1}月`,
							panoramaImage: period.panoramaImage,
							thumbnail: period.thumbnail,
							description: period.description,
							address: period.address,
							images: period.images,
							longitude: gcjLng,
							latitude: gcjLat,
						};
				})
				: [];

		return [
			200,
			{
				code: "200",
				msg: "获取成功",
				data: timeMachineData,
			},
		];
	});

	// ========== 管理员端接口 ==========
	
	// 管理员 - 仪表盘统计数据
	mock.onGet("/api/manager/dashboard/stats").reply(200, {
		code: "200",
		msg: "获取成功",
		data: {
			totalPanoramas: 156,
			pendingReview: 12,
			weeklyNew: 8,
			onlineUsers: 23,
			todayActiveUsers: 156,
			systemHealth: {
				cpu: 45.6,
				memory: 62.3,
				disk: 78.9,
			},
		},
	});

	// 管理员 - 数据列表
	mock.onGet("/api/manager/data/list").reply((config) => {
		const params = new URLSearchParams(config.url?.split("?")[1] || "");
		const status = params.get("status") || "all";
		const page = parseInt(params.get("page") || "1");
		const pageSize = parseInt(params.get("pageSize") || "10");

		const allData = [
			{
				id: 1,
				name: "全景图数据001",
				thumbnail: imageLocations[0]?.timePeriods?.[0]?.thumbnail || "",
				shootTime: "2025-01-15 10:30:00",
				location: "北京市朝阳区",
				status: "pending", // pending, published, rejected
				statusText: "待审核",
			},
			{
				id: 2,
				name: "全景图数据002",
				thumbnail: imageLocations[1]?.timePeriods?.[0]?.thumbnail || "",
				shootTime: "2025-01-14 14:20:00",
				location: "上海市浦东新区",
				status: "published",
				statusText: "已发布",
			},
			{
				id: 3,
				name: "全景图数据003",
				thumbnail: imageLocations[0]?.timePeriods?.[0]?.thumbnail || "",
				shootTime: "2025-01-13 09:15:00",
				location: "广州市天河区",
				status: "rejected",
				statusText: "已拒绝",
			},
		];

		// 生成更多模拟数据
		for (let i = 4; i <= 30; i++) {
			const statuses = ["pending", "published", "rejected"];
			const status = statuses[Math.floor(Math.random() * statuses.length)];
			const loc = imageLocations[i % imageLocations.length];
			allData.push({
				id: i,
				name: `全景图数据${String(i).padStart(3, "0")}`,
				thumbnail: loc?.timePeriods?.[0]?.thumbnail || "",
				shootTime: Mock.Random.datetime("yyyy-MM-dd HH:mm:ss"),
				location: Mock.Random.county(true),
				status: status,
				statusText: status === "pending" ? "待审核" : status === "published" ? "已发布" : "已拒绝",
			});
		}

		// 筛选
		let filteredData = allData;
		if (status !== "all") {
			filteredData = allData.filter((item) => item.status === status);
		}

		// 分页
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const pageData = filteredData.slice(start, end);

		return [
			200,
			{
				code: "200",
				msg: "获取成功",
				data: {
					list: pageData,
					total: filteredData.length,
					page,
					pageSize,
				},
			},
		];
	});

	// 管理员 - 数据详情
	mock.onGet(/^\/api\/manager\/data\/\d+$/).reply((config) => {
		const id = parseInt(config.url?.split("/").pop() || "1");
		return [
			200,
			{
				code: "200",
				msg: "获取成功",
				data: {
					id,
					name: `全景图数据${String(id).padStart(3, "0")}`,
					panoramaImage: imageLocations[0]?.timePeriods?.[0]?.panoramaImage || "",
					shootTime: "2025-01-15 10:30:00",
					location: "北京市朝阳区",
					longitude: 116.397128,
					latitude: 39.916527,
					status: "pending",
					description: "这是一张高质量的全景图数据，拍摄于2025年1月15日。",
					metadata: {
						camera: "DJI Mavic 3",
						resolution: "8192x4096",
						format: "JPEG",
					},
				},
			},
		];
	});

	// 管理员 - 审核数据
	mock.onPost(/^\/api\/manager\/data\/\d+\/review$/).reply((config) => {
		const id = parseInt(config.url?.split("/")[4] || "1");
		const { action, comment } = JSON.parse(config.data);
		return [
			200,
			{
				code: "200",
				msg: action === "approve" ? "审核通过" : "审核拒绝",
				data: { id, status: action === "approve" ? "published" : "rejected" },
			},
		];
	});

	// 管理员 - 删除数据
	mock.onDelete(/^\/api\/manager\/data\/\d+$/).reply((config) => {
		const id = parseInt(config.url?.split("/").pop() || "1");
		return [
			200,
			{
				code: "200",
				msg: "删除成功",
				data: { id },
			},
		];
	});

	// 管理员 - 用户列表
	mock.onGet("/api/manager/users/list").reply((config) => {
		const params = new URLSearchParams(config.url?.split("?")[1] || "");
		const page = parseInt(params.get("page") || "1");
		const pageSize = parseInt(params.get("pageSize") || "10");

		const allUsers = [
			{
				id: 0,
				username: "admin",
				email: "admin@example.com",
				role: "admin",
				roleText: "管理员",
				status: true,
				lastLoginTime: "2025-01-15 10:30:00",
			},
			{
				id: 1,
				username: "user",
				email: "user@example.com",
				role: "user",
				roleText: "普通用户",
				status: true,
				lastLoginTime: "2025-01-15 09:20:00",
			},
		];

		// 生成更多模拟用户
		for (let i = 2; i <= 50; i++) {
			const roles = ["user", "advanced", "admin"];
			const role = roles[Math.floor(Math.random() * roles.length)];
			allUsers.push({
				id: i,
				username: `user${i}`,
				email: `user${i}@example.com`,
				role: role,
				roleText: role === "admin" ? "管理员" : role === "advanced" ? "高级用户" : "普通用户",
				status: Math.random() > 0.2,
				lastLoginTime: Mock.Random.datetime("yyyy-MM-dd HH:mm:ss"),
			});
		}

		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const pageData = allUsers.slice(start, end);

		return [
			200,
			{
				code: "200",
				msg: "获取成功",
				data: {
					list: pageData,
					total: allUsers.length,
					page,
					pageSize,
				},
			},
		];
	});

	// 管理员 - 更新用户权限
	mock.onPut(/^\/api\/manager\/users\/\d+$/).reply((config) => {
		const id = parseInt(config.url?.split("/").pop() || "1");
		const body = JSON.parse(config.data);
		return [
			200,
			{
				code: "200",
				msg: "更新成功",
				data: { id, ...body },
			},
		];
	});

	// 管理员 - 系统监控 - 性能数据
	mock.onGet("/api/manager/monitor/performance").reply((config) => {
		const params = new URLSearchParams(config.url?.split("?")[1] || "");
		const timeRange = params.get("timeRange") || "1h";

		// 生成时间序列数据
		const data = [];
		const now = Date.now();
		const points = timeRange === "1h" ? 60 : timeRange === "today" ? 24 : 7;

		for (let i = points - 1; i >= 0; i--) {
			const time = new Date(now - i * (timeRange === "1h" ? 60000 : timeRange === "today" ? 3600000 : 86400000));
			data.push({
				time: time.toISOString(),
				cpu: Mock.Random.float(20, 80, 1, 1),
				memory: Mock.Random.float(40, 90, 1, 1),
				disk: Mock.Random.float(60, 95, 1, 1),
				diskIOPS: Mock.Random.integer(100, 1000),
				apiResponseTime: Mock.Random.float(50, 500, 1, 1),
			});
		}

		return [
			200,
			{
				code: "200",
				msg: "获取成功",
				data,
			},
		];
	});

	// 管理员 - 系统监控 - 服务状态
	mock.onGet("/api/manager/monitor/services").reply(200, {
		code: "200",
		msg: "获取成功",
		data: [
			{
				name: "数据库服务",
				status: "normal", // normal, warning, error
				statusText: "正常",
				uptime: "99.9%",
				lastCheck: "2025-01-15 10:30:00",
			},
			{
				name: "文件存储服务",
				status: "normal",
				statusText: "正常",
				uptime: "99.8%",
				lastCheck: "2025-01-15 10:30:00",
			},
			{
				name: "AI打码服务",
				status: "warning",
				statusText: "警告",
				uptime: "98.5%",
				lastCheck: "2025-01-15 10:30:00",
			},
		],
	});

	// 管理员 - 系统监控 - 操作日志
	mock.onGet("/api/manager/monitor/logs").reply((config) => {
		const params = new URLSearchParams(config.url?.split("?")[1] || "");
		const page = parseInt(params.get("page") || "1");
		const pageSize = parseInt(params.get("pageSize") || "10");
		const operator = params.get("operator") || "";
		const actionType = params.get("actionType") || "";

		const allLogs = [];
		const actions = ["登录", "权限修改", "数据发布", "数据删除", "用户创建", "用户禁用"];
		const operators = ["admin", "user1", "user2"];

		for (let i = 0; i < 100; i++) {
			const action = actions[Math.floor(Math.random() * actions.length)];
			const operatorName = operators[Math.floor(Math.random() * operators.length)];
			allLogs.push({
				id: i + 1,
				operator: operatorName,
				action: action,
				target: action.includes("用户") ? `用户${i}` : `数据${i}`,
				time: Mock.Random.datetime("yyyy-MM-dd HH:mm:ss"),
				ip: Mock.Random.ip(),
				result: Math.random() > 0.1 ? "成功" : "失败",
			});
		}

		// 筛选
		let filteredLogs = allLogs;
		if (operator) {
			filteredLogs = filteredLogs.filter((log) => log.operator.includes(operator));
		}
		if (actionType) {
			filteredLogs = filteredLogs.filter((log) => log.action === actionType);
		}

		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const pageData = filteredLogs.slice(start, end);

		return [
			200,
			{
				code: "200",
				msg: "获取成功",
				data: {
					list: pageData,
					total: filteredLogs.length,
					page,
					pageSize,
				},
			},
		];
	});

	console.log("✅ Mock 数据已启用");

  // ====== 店铺与审核相关 Mock ======
  const shops: any[] = [
    {
      id: 1001,
      username: "星光餐馆",
      email: "东区文化路18号",
      province: "广东省",
      city: "中山市",
      district: "东区",
      role: "advanced",
      size: "medium",
      auditStatus: "approved",
      createdAt: "2024-12-01T10:00:00Z",
      updatedAt: "2024-12-15T14:30:00Z",
      lastLoginTime: "2025-01-15 10:30:00",
      creatorName: "高级用户"
    },
    {
      id: 1002,
      username: "乐家超市",
      email: "西区建设路88号",
      province: "广东省",
      city: "中山市",
      district: "西区",
      role: "admin",
      size: "large",
      auditStatus: "approved",
      createdAt: "2024-11-20T09:15:00Z",
      updatedAt: "2024-12-10T16:45:00Z",
      lastLoginTime: "2025-01-14 09:20:00",
      creatorName: "管理员"
    },
    {
      id: 1003,
      username: "海湾酒店",
      email: "石岐区兴中路120号",
      province: "广东省",
      city: "中山市",
      district: "石岐区",
      role: "user",
      size: "large",
      auditStatus: "pending",
      createdAt: "2025-01-05T14:20:00Z",
      updatedAt: "2025-01-05T14:20:00Z",
      lastLoginTime: "2025-01-13 15:40:00",
      creatorName: "普通用户"
    },
    {
      id: 1004,
      username: "老街小吃",
      email: "南区城南路8号",
      province: "广东省",
      city: "中山市",
      district: "南区",
      role: "user",
      size: "small",
      auditStatus: "rejected",
      createdAt: "2024-12-25T11:30:00Z",
      updatedAt: "2025-01-10T10:15:00Z",
      lastLoginTime: "2025-01-12 11:25:00",
      creatorName: "普通用户"
    },
    {
      id: 1005,
      username: "新光商场",
      email: "火炬开发区科技路66号",
      province: "广东省",
      city: "中山市",
      district: "火炬开发区",
      role: "advanced",
      size: "large",
      auditStatus: "approved",
      createdAt: "2024-10-15T08:45:00Z",
      updatedAt: "2024-12-20T13:20:00Z",
      lastLoginTime: "2025-01-11 14:35:00",
      creatorName: "高级用户"
    }
  ];
  let nextShopId = 1006;

  const computeStats = () => {
    const pendingCount = shops.filter(s => s.auditStatus === 'pending').length;
    const approvedCount = shops.filter(s => s.auditStatus === 'approved').length;
    const rejectedCount = shops.filter(s => s.auditStatus === 'rejected').length;
    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount: shops.length,
    };
  };

  mock.onGet('/api/shop/list').reply((config) => {
    const params = new URLSearchParams(config.url?.split('?')[1] || '');
    const page = parseInt(params.get('page') || '1');
    const pageSize = parseInt(params.get('pageSize') || '10');
    const keyword = (params.get('keyword') || '').toLowerCase();

    let list = shops;
    if (keyword) {
      list = list.filter((item) =>
        item.username.toLowerCase().includes(keyword) ||
        String(item.email || '').toLowerCase().includes(keyword)
      );
    }
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return [200, { code: '200', msg: '获取成功', data: { list: list.slice(start, end), total: list.length, page, pageSize } }];
  });

  mock.onPost('/api/shop').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const now = new Date();
    const newShop = {
      id: nextShopId++,
      username: body.username,
      email: body.email,
      province: '广东省',
      city: '中山市',
      role: body.role || 'advanced',
      size: body.size || 'small',
      auditStatus: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      creatorName: '高级用户',
    };
    shops.unshift(newShop);
    return [200, { code: '200', msg: '添加成功', data: { id: newShop.id } }];
  });

  mock.onPut(/\/api\/shop\/\d+$/).reply((config) => {
    const id = parseInt(config.url!.split('/').pop() || '0');
    const body = JSON.parse(config.data || '{}');
    const idx = shops.findIndex(s => s.id === id);
    if (idx >= 0) {
      shops[idx] = { ...shops[idx], size: body.size ?? shops[idx].size, role: body.role ?? shops[idx].role, updatedAt: new Date().toISOString() };
      return [200, { code: '200', msg: '更新成功', data: shops[idx] }];
    }
    return [200, { code: '404', msg: '未找到店铺', data: null }];
  });

  mock.onDelete(/\/api\/shop\/\d+$/).reply((config) => {
    const id = parseInt(config.url!.split('/').pop() || '0');
    const idx = shops.findIndex(s => s.id === id);
    if (idx >= 0) {
      shops.splice(idx, 1);
      return [200, { code: '200', msg: '删除成功', data: { id } }];
    }
    return [200, { code: '404', msg: '未找到店铺', data: null }];
  });

  mock.onGet('/api/admin/shop-audit/list').reply((config) => {
    const params = new URLSearchParams(config.url?.split('?')[1] || '');
    const page = parseInt(params.get('page') || '1');
    const pageSize = parseInt(params.get('pageSize') || '10');
    const status = params.get('status') || 'all';
    const keyword = (params.get('keyword') || '').toLowerCase();
    let list = shops.map(s => ({ ...s }));
    if (status !== 'all') list = list.filter(s => s.auditStatus === status);
    if (keyword) list = list.filter(s => s.username.toLowerCase().includes(keyword) || String(s.email || '').toLowerCase().includes(keyword));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return [200, { code: '200', msg: '获取成功', data: { list: list.slice(start, end), total: list.length, stats: computeStats() } }];
  });

  mock.onPost(/\/api\/admin\/shop-audit\/\d+\/audit$/).reply((config) => {
    const id = parseInt(config.url!.split('/')[4] || '0');
    const { action } = JSON.parse(config.data || '{}');
    const idx = shops.findIndex(s => s.id === id);
    if (idx >= 0) {
      shops[idx].auditStatus = action === 'approve' ? 'approved' : 'rejected';
      shops[idx].updatedAt = new Date().toISOString();
      return [200, { code: '200', msg: '审核成功', data: shops[idx] }];
    }
    return [200, { code: '404', msg: '未找到店铺', data: null }];
  });

  mock.onPost('/api/admin/shop-audit/batch-audit').reply((config) => {
    const { shopIds, action } = JSON.parse(config.data || '{}');
    let successCount = 0;
    (shopIds || []).forEach((id: number) => {
      const idx = shops.findIndex(s => s.id === id);
      if (idx >= 0) {
        shops[idx].auditStatus = action === 'approve' ? 'approved' : 'rejected';
        shops[idx].updatedAt = new Date().toISOString();
        successCount++;
      }
    });
    return [200, { code: '200', msg: '批量审核完成', data: { successCount } }];
  });
}
