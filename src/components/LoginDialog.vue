<template>
	<el-dialog
		v-model="dialogVisible"
		title="用户登录"
		width="400px"
		:close-on-click-modal="false"
		@close="handleClose"
		@open="loadRememberedCredentials"
		align-center
		class="login-dialog">
		
		<div class="login-form">
			<!-- 账户输入框 -->
			<div class="form-item">
				<label class="form-label">账户</label>
				<el-input
					v-model="loginForm.username"
					placeholder="请输入您的账户"
					size="large"
					class="form-input"
					@focus="showPasswordHint = false">
				</el-input>
			</div>

			<!-- 密码输入框 -->
			<div class="form-item">
				<label class="form-label">密码</label>
				<div class="password-container">
					<el-input
						v-model="loginForm.password"
						:type="showPassword ? 'text' : 'password'"
						placeholder="请输入您的密码"
						size="large"
						class="form-input"
						@keyup.enter="handleLogin"
						@focus="handlePasswordFocus">
						<template #suffix>
							<el-icon 
								class="password-toggle"
								@click="showPassword = !showPassword">
								<View v-if="showPassword" />
								<Hide v-else />
							</el-icon>
						</template>
					</el-input>
					<div v-if="showPasswordHint && rememberedPassword" class="password-hint">
						<el-icon><InfoFilled /></el-icon>
						<span>已自动填充记住的密码</span>
					</div>
				</div>
			</div>

			<!-- 记住我和忘记密码 -->
			<div class="form-options">
				<div class="remember-me">
					<el-checkbox v-model="loginForm.rememberMe" @change="handleRememberChange">
						记住我（保存密码）
					</el-checkbox>
					<el-tooltip 
						content="将在本地保存您的登录信息，请勿在公用电脑上使用此功能" 
						placement="top">
						<el-icon class="security-tip"><Warning /></el-icon>
					</el-tooltip>
				</div>
				<div class="forgot-password">
					<span class="forgot-link" @click="handleForgotPassword">忘记密码？</span>
				</div>
			</div>

			<!-- 清除记住的密码按钮 -->
			<div v-if="hasRememberedCredentials" class="clear-credentials">
				<el-button 
					type="text" 
					size="small" 
					@click="clearAllRememberedCredentials"
					class="clear-btn">
					<el-icon><Delete /></el-icon>
					清除保存的密码
				</el-button>
			</div>

			<!-- 登录按钮 -->
			<div class="login-button">
				<el-button
					type="primary"
					:loading="loading"
					@click="handleLogin"
					class="submit-btn">
					登录
				</el-button>
			</div>

			<!-- 创建新账户 -->
			<div class="create-account">
				<span class="create-text" @click="handleCreateAccount">创建新账户</span>
			</div>
		</div>
	</el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
// import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { View, Hide, InfoFilled, Warning, Delete } from "@element-plus/icons-vue";
import request from "@/api/request";
import CryptoJS from 'crypto-js'; // 需要安装：npm install crypto-js

interface Props {
	modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	"login-success": [userInfo: any];
}>();

// const router = useRouter();
const dialogVisible = ref(props.modelValue);
const loading = ref(false);
const showPassword = ref(false);
const showPasswordHint = ref(false);
const rememberedPassword = ref<string | null>(null);

// 加密密钥（可以使用用户特定的密钥增强安全性）
const ENCRYPTION_KEY = 'panorama-system-2024';

watch(
	() => props.modelValue,
	(val) => {
		dialogVisible.value = val;
	}
);

watch(dialogVisible, (val) => {
	emit("update:modelValue", val);
});

const loginForm = ref({
	username: "",
	password: "",
	rememberMe: false,
});

// 计算属性：是否有记住的凭据
const hasRememberedCredentials = computed(() => {
	try {
		const stored = localStorage.getItem("rememberedCredentials");
		return !!stored;
	} catch {
		return false;
	}
});

// 加密函数
const encryptData = (text: string): string => {
	try {
		return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
	} catch (error) {
		console.error("加密失败:", error);
		return text; // 如果加密失败，返回原文本
	}
};

// 解密函数
const decryptData = (ciphertext: string): string => {
	try {
		const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
		return bytes.toString(CryptoJS.enc.Utf8);
	} catch (error) {
		console.error("解密失败:", error);
		return ciphertext; // 如果解密失败，返回原文本
	}
};

// 加载记住的凭据
const loadRememberedCredentials = () => {
	try {
		const rememberedCredentials = localStorage.getItem("rememberedCredentials");
		if (rememberedCredentials) {
			const credentials = JSON.parse(rememberedCredentials);
			
			if (credentials.username) {
				loginForm.value.username = credentials.username;
				loginForm.value.rememberMe = true;
				
				// 如果有加密的密码，解密并设置
				if (credentials.encryptedPassword) {
					rememberedPassword.value = decryptData(credentials.encryptedPassword);
					loginForm.value.password = rememberedPassword.value;
					showPasswordHint.value = true;
				}
			}
		}
	} catch (error) {
		console.error("加载记住的凭据失败:", error);
		clearAllRememberedCredentials();
	}
};

// 保存记住的凭据
const saveRememberedCredentials = () => {
	try {
		const credentials = {
			username: loginForm.value.username,
			encryptedPassword: encryptData(loginForm.value.password),
			timestamp: Date.now()
		};
		
		localStorage.setItem("rememberedCredentials", JSON.stringify(credentials));
	} catch (error) {
		console.error("保存记住的凭据失败:", error);
		ElMessage.error("保存登录信息失败");
	}
};

// 清除所有记住的凭据
const clearAllRememberedCredentials = () => {
	ElMessageBox.confirm("确定要清除所有保存的登录信息吗？", "安全提示", {
		confirmButtonText: "确定",
		cancelButtonText: "取消",
		type: "warning",
		center: true,
	})
	.then(() => {
		localStorage.removeItem("rememberedCredentials");
		loginForm.value.rememberMe = false;
		rememberedPassword.value = null;
		showPasswordHint.value = false;
		ElMessage.success("已清除保存的登录信息");
	})
	.catch(() => {});
};

// 处理记住我复选框变化
const handleRememberChange = (value: boolean) => {
	if (!value) {
		// 如果取消记住我，清除保存的凭据
		clearAllRememberedCredentials();
	}
};

// 密码输入框获取焦点时
const handlePasswordFocus = () => {
	if (rememberedPassword.value) {
		showPasswordHint.value = true;
	}
};

const handleLogin = async () => {
	if (!loginForm.value.username || !loginForm.value.password) {
		ElMessage.warning("请输入账户和密码");
		return;
	}

	loading.value = true;
	try {
		const response: any = await request.post("/api/users/login", {
			username: loginForm.value.username,
			password: loginForm.value.password,
		});

		if (response.code === "200" && response.data) {
			const userInfo = response.data;
			
			// 保存token和用户信息到本地存储
			localStorage.setItem("token", userInfo.token);
			localStorage.setItem("userInfo", JSON.stringify(userInfo));

			// 处理记住我功能
			if (loginForm.value.rememberMe) {
				saveRememberedCredentials();
			} else {
				clearAllRememberedCredentials();
			}

			ElMessage.success("登录成功");

			// 统一触发登录成功事件，传递完整的用户信息
			emit("login-success", userInfo);

			dialogVisible.value = false;
			
			// 重置表单（保留记住我的状态）
			loginForm.value = {
				username: "",
				password: "",
				rememberMe: loginForm.value.rememberMe,
			};
			showPasswordHint.value = false;
			rememberedPassword.value = null;
			
			// 如果是管理员，可以显示提示信息
			if (userInfo.role === "admin" || userInfo.permission === 0) {
				setTimeout(() => {
					ElMessage.info("管理员身份已识别，您可以通过顶部按钮进入管理后台");
				}, 500);
			}
		} else {
			// 登录失败时，清除可能错误的密码
			if (rememberedPassword.value) {
				clearAllRememberedCredentials();
			}
			ElMessage.error(response.msg || "登录失败");
		}
	} catch (error: any) {
		// 网络错误时，清除可能错误的凭据
		if (rememberedPassword.value) {
			clearAllRememberedCredentials();
		}
		ElMessage.error(error.msg || "登录失败，请稍后重试");
	} finally {
		loading.value = false;
	}
};

const handleClose = () => {
	dialogVisible.value = false;
	// 重置表单
	loginForm.value = {
		username: "",
		password: "",
		rememberMe: false,
	};
	showPasswordHint.value = false;
	rememberedPassword.value = null;
	showPassword.value = false;
};

const handleForgotPassword = () => {
	ElMessageBox.confirm("是否要重置密码？系统将发送重置链接到您的注册邮箱。", "忘记密码", {
		confirmButtonText: "发送重置邮件",
		cancelButtonText: "取消",
		type: "warning",
	})
	.then(() => {
		ElMessage.success("重置邮件已发送，请查收您的邮箱");
	})
	.catch(() => {});
};

const handleCreateAccount = () => {
	ElMessageBox.alert("请联系系统管理员创建新账户", "创建账户", {
		confirmButtonText: "确定",
		callback: () => {
			// 可以跳转到注册页面
		},
	});
};

</script>

<style scoped>
.login-dialog {
	text-align: center;
}

.login-form {
	padding: 0 20px;
}

.form-item {
	margin-bottom: 20px;
	text-align: left;
}

.form-label {
	display: block;
	margin-bottom: 8px;
	font-size: 14px;
	color: #333;
	font-weight: 500;
}

.form-input {
	width: 100%;
}

:deep(.form-input .el-input__wrapper) {
	border-radius: 6px;
}

:deep(.form-input .el-input__inner) {
	font-size: 14px;
}

.password-container {
	position: relative;
}

.password-toggle {
	cursor: pointer;
	color: #999;
	font-size: 18px;
	transition: color 0.3s;
}

.password-toggle:hover {
	color: #409eff;
}

.password-hint {
	margin-top: 4px;
	font-size: 12px;
	color: #67c23a;
	display: flex;
	align-items: center;
	gap: 4px;
	animation: fadeIn 0.3s;
}

.password-hint .el-icon {
	font-size: 12px;
}

@keyframes fadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

.form-options {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
}

.remember-me {
	display: flex;
	align-items: center;
	gap: 4px;
}

:deep(.remember-me .el-checkbox__label) {
	font-size: 14px;
	color: #666;
}

.security-tip {
	color: #e6a23c;
	font-size: 14px;
	cursor: help;
}

.forgot-password {
	display: flex;
	align-items: center;
}

.forgot-link {
	font-size: 14px;
	color: #409eff;
	cursor: pointer;
	transition: color 0.3s;
}

.forgot-link:hover {
	color: #67c23a;
	text-decoration: underline;
}

.clear-credentials {
	margin-bottom: 15px;
	text-align: left;
}

.clear-btn {
	color: #f56c6c;
	padding: 0;
	font-size: 12px;
}

.clear-btn:hover {
	color: #f78989;
}

.clear-btn .el-icon {
	margin-right: 4px;
}

.login-button {
	margin-bottom: 20px;
}

.submit-btn {
	width: 100%;
	height: 40px;
	font-size: 16px;
	border-radius: 6px;
	background-color: #409eff;
	border: none;
}

.submit-btn:hover {
	background-color: #67c23a;
}

.create-account {
	text-align: center;
	margin-bottom: 10px;
}

.create-text {
	font-size: 14px;
	color: #409eff;
	cursor: pointer;
	transition: color 0.3s;
}

.create-text:hover {
	color: #67c23a;
	text-decoration: underline;
}

/* 对话框标题样式 */
:deep(.login-dialog .el-dialog__header) {
	text-align: center;
	padding: 20px 20px 10px;
	border-bottom: none;
}

:deep(.login-dialog .el-dialog__title) {
	font-size: 18px;
	font-weight: 600;
	color: #333;
}

:deep(.login-dialog .el-dialog__body) {
	padding: 20px;
}

:deep(.login-dialog .el-dialog__headerbtn) {
	top: 20px;
	right: 20px;
}
</style>