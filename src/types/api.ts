// src/types/api.ts
export interface ApiResponse<T = any> {
  code: string;
  msg: string;
  data?: T;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserInfo {
  userId: number;
  username: string;
  email: string;
  phone: string;
  permission: number;
  role: string;
  token: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface DataListParams extends PaginationParams {
  status?: string;
}

export interface LogListParams extends PaginationParams {
  operator?: string;
  actionType?: string;
}