// vue.config.js
const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack");
const path = require("path");

module.exports = defineConfig({
	transpileDependencies: true,

	configureWebpack: {
		plugins: [
			new webpack.DefinePlugin({
				__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
			}),
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "src"),
			},
		},
	},
	chainWebpack: (config) => {
		// 排除 .d.ts 文件不被 ts-loader 处理
		config.module
			.rule("ts")
			.test(/\.ts$/)
			.exclude.add(/\.d\.ts$/)
			.end();

		// 为 .d.ts 文件添加一个规则，返回空模块
		config.module
			.rule("dts")
			.test(/\.d\.ts$/)
			.use("null-loader")
			.loader("null-loader")
			.end();

		// 添加图片加载器
		config.module
			.rule("images")
			.test(/\.(png|jpe?g|gif|webp|svg)$/i)
			.type("asset");
	},
	devServer: {
		port: 8081, // 明确指定前端端口
		// 修复代理配置，指向后端服务
		proxy: {
			"/api": {
				target: "http://8.148.228.10:8000", // 指向后端服务
				changeOrigin: true,
				secure: false,
				// 可选：如果需要重写路径
				// pathRewrite: {
				//   '^/api': '/api'
				// },
				logLevel: "debug", // 开启调试日志
			},
		},
	},
});