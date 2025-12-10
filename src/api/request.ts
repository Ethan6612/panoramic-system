// src/utils/request.ts
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { ElMessage } from "element-plus";

// 使用全局 axios 实例，便于 mock 拦截统一生效
axios.defaults.baseURL = process.env.VUE_APP_API_BASE_URL || "/";
axios.defaults.timeout = 100000;
const service: AxiosInstance = axios;

// 请求拦截器：自动添加 token
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    config.headers["ngrok-skip-browser-warning"] = "true";
    // 为所有请求添加 token 查询参数（根据后端接口要求）
    if (token && config.params) {
      config.params.token = token;
    } else if (token) {
      config.params = { token };
    }
    
    // 添加请求日志，便于调试
    console.log(`发起请求: ${config.method?.toUpperCase()} ${config.url}`, config.params);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：统一处理响应或错误
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;
    console.log(`请求响应: ${response.config.url}`, res); // 调试日志
    
    // 根据后端响应格式调整
    if (res.code && res.code !== "200") {
      ElMessage.error(res.msg || "请求出错");
      return Promise.reject(res);
    }
    return res;
  },
  (error) => {
    console.error("请求异常：", error);
    if (error.response?.status === 401) {
      ElMessage.error("登录已过期，请重新登录");
      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");
      window.location.href = "/panorama";
    } else {
      ElMessage.error(error.response?.data?.detail || error.message || "网络异常");
    }
    return Promise.reject(error);
  }
);

export default service;