# 中山市全景系统

基于 Vue 3 + TypeScript + Element Plus + 高德地图的中山市全景系统，支持地点浏览、全景预览和时光机功能。

## 功能特性

### 1. 地图浏览

- 高德地图集成，显示中山市地图
- 红色地点标记，展示多个景点和地点
- 地图缩放、拖拽、标记点交互
- 白色背景样式，灰绿蓝道路及绿地

### 2. 地点信息

- 点击地图标记显示右侧信息面板
- 显示地点名称、评分、分类标签
- 地点相关图片展示（支持预览）
- 文字介绍和地址信息
- 操作按钮："到这去"、"从这出发"

### 3. 搜索功能

- 支持地点、地址或关键词搜索
- 自动定位到搜索结果

### 4. 右键菜单

- 右键点击地图标记显示菜单
- 收藏地点功能
- 全景预览功能

### 5. 全景预览

- 全景图片主体展示
- 右上角地点信息框
- 底部地点缩略图选择栏
- 时光机功能：显示不同时间的地图全景
- 功能栏：搜索、刷新、放大、缩小

### 6. 用户系统

- 默认用户名"吴志超"
- 点击头像弹出登录对话框
- 登录后更新用户信息

## 技术栈

- Vue 3 + TypeScript
- Pinia 状态管理
- Element Plus UI 组件库
- 高德地图 JS API
- Axios HTTP 请求
- Mock 数据支持

## 安装步骤

1. 克隆项目

```bash
git clone [项目地址]
cd fire_map
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量
   创建 `.env.development` 文件：

```
VUE_APP_AMAP_KEY=你的高德地图Key
VUE_APP_AMAP_SECURITY_CODE=你的安全密钥
VUE_APP_MOCK=true  # 开启mock数据
```

4. 启动开发服务器

```bash
npm run serve
```

5. 打包生产环境

```bash
npm run build
```

## 项目结构

```
src/
├── api/          # API 请求和 mock 数据
├── assets/       # 静态资源
├── components/   # 公共组件
│   ├── LocationInfoPanel.vue  # 地点信息面板
│   ├── ContextMenu.vue        # 右键菜单
│   └── LoginDialog.vue        # 登录对话框
├── stores/       # Pinia 状态管理
├── types/        # TypeScript 类型定义
│   └── panorama.ts            # 全景系统类型
├── utils/        # 工具函数
└── views/        # 页面组件
    ├── PanoramaHome.vue       # 全景系统首页
    └── PanoramaView.vue       # 全景预览页面
```

## API 接口

### 1. 地点列表接口

- GET `/api/panorama/locations`
- 返回：地点列表数据

### 2. 全景数据接口

- GET `/api/panorama/panoramas`
- 返回：全景数据列表

### 3. 时光机数据接口

- GET `/api/panorama/timemachine/:locationId`
- 返回：指定地点的时光机数据

### 4. 登录接口（可选）

- POST `/api/users/login`
- 参数：`{ username: string, password: string }`

## 注意事项

1. 开发环境

   - Node.js >= 14.0.0
   - Vue CLI >= 5.0.0

2. 高德地图

   - 需要申请高德地图 Key 和安全密钥
   - 确保有正确的域名白名单配置
   - 地图样式使用 `amap://styles/whitesmoke`

3. Mock 数据
   - 开发环境默认使用 Mock 数据
   - 可通过 `VUE_APP_MOCK` 环境变量控制

## 开发团队

- 前端开发：[团队成员]
- 后端支持：[团队成员]
- 设计支持：[团队成员]

## License

[选择合适的开源协议]
