<template>
	<el-dialog 
		:model-value="modelValue" 
		@update:model-value="$emit('update:modelValue', $event)"
		title="政府执法系统登录" 
		width="400px" 
		:before-close="handleClose"
	>
		<el-form :model="loginForm" :rules="rules" ref="formRef" label-width="80px">
			<el-form-item label="用户名" prop="username">
				<el-input 
					v-model="loginForm.username" 
					placeholder="请输入政府账号" 
					@keyup.enter="handleLogin"
				/>
			</el-form-item>
			<el-form-item label="密码" prop="password">
				<el-input 
					v-model="loginForm.password" 
					type="password" 
					placeholder="请输入密码" 
					show-password
					@keyup.enter="handleLogin"
				/>
			</el-form-item>
			<el-form-item>
				<div style="color: #999; font-size: 12px; line-height: 1.5;">
					<p>温馨提示：</p>
					<p>1. 政府执法系统需要专用账号登录</p>
					<p>2. 仅限政府执法人员使用</p>
				</div>
			</el-form-item>
		</el-form>
		<template #footer>
			<el-button @click="handleClose">取消</el-button>
			<el-button type="danger" @click="handleLogin" :loading="loading" :disabled="loading">
				登录
			</el-button>
		</template>
	</el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from 'element-plus';
import request from "@/api/request";

const props = defineProps<{
	modelValue: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	'login-success': [];
}>();

const router = useRouter();
const loading = ref(false);
const formRef = ref<FormInstance>();

const loginForm = ref({
	username: "",
	password: "",
});

const rules: FormRules = {
	username: [
		{ required: true, message: "请输入用户名", trigger: "blur" },
		{ min: 3, max: 20, message: "用户名长度在 3 到 20 个字符", trigger: "blur" }
	],
	password: [
		{ required: true, message: "请输入密码", trigger: "blur" },
		{ min: 6, max: 20, message: "密码长度在 6 到 20 个字符", trigger: "blur" }
	],
};

// 监听对话框显示状态，重置表单
watch(() => props.modelValue, (val) => {
	if (val) {
		resetForm();
	}
});

const resetForm = () => {
	loginForm.value = {
		username: "",
		password: "",
	};
	if (formRef.value) {
		formRef.value.clearValidate();
	}
};

const handleClose = () => {
	emit('update:modelValue', false);
	resetForm();
};

const handleLogin = async () => {
	if (!formRef.value) return;

	try {
		const valid = await formRef.value.validate();
		if (!valid) return;

		loading.value = true;
		
		const response = await request.post("/api/government/login", loginForm.value);
		const responseData = response as any;
		
		if (responseData && responseData.code === "200" && responseData.data) {
			// 保存政府用户信息到 localStorage
			localStorage.setItem("govToken", responseData.data.token);
			localStorage.setItem("govUserInfo", JSON.stringify(responseData.data));
			
			ElMessage.success({
				message: "政府系统登录成功",
				duration: 2000
			});
			
			// 延迟关闭对话框，让用户看到成功提示
			setTimeout(() => {
				emit('update:modelValue', false);
				emit('login-success');
				// 跳转到政府管理页面
				router.push("/government/tasks");
			}, 500);
			
		} else {
			ElMessage.error({
				message: responseData?.msg || "登录失败，请检查用户名和密码",
				duration: 3000
			});
		}
	} catch (error: any) {
		console.error("政府系统登录失败:", error);
		let errorMsg = "登录失败";
		if (error.response && error.response.data) {
			errorMsg = error.response.data.detail || errorMsg;
		}
		ElMessage.error({
			message: errorMsg,
			duration: 3000
		});
	} finally {
		loading.value = false;
	}
};
</script>

<style scoped>
:deep(.el-dialog__header) {
	border-bottom: 1px solid #e4e7ed;
	margin-right: 0;
}

:deep(.el-dialog__body) {
	padding: 20px 30px;
}

:deep(.el-dialog__footer) {
	border-top: 1px solid #e4e7ed;
}
</style>