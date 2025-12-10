// 地点数据类型（基础信息，不包含timePeriods）
export interface LocationData {
	id: number;
	name: string;
	longitude: number;
	latitude: number;
	rating: number;
	category: string;
	description?: string;
	address?: string;
	timePeriods?: TimePeriodData[];
}

// 时间段数据
export interface TimePeriodData {
	id: string;
	label: string;
	timestamp: string;
	images: string[];
	description: string;
	address: string;
	panoramaImage: string;
	thumbnail: string;
}

// 全景图简化数据（API返回）
export interface PanoramaSimplified {
	id: number;
	name: string;
	panoramaImage: string;
}

// 时光机响应数据结构
export interface TimeMachineResponse {
	timePeriods: TimePeriodData[];
}

// 图片目录响应数据结构
export interface DirectoryResponse {
	images: string[];
}

// 全景数据
export interface PanoramaData {
	id: number;
	locationId: number;
	locationName: string;
	description: string;
	panoramaImage: string;
	thumbnail: string;
	timestamp: string;
}
