<template>
	<div class="user-management">
		<!-- 操作工具栏 -->
		<el-card class="toolbar-card">
			<div class="toolbar">
				<div class="toolbar-left">
					<el-button type="primary" @click="handleAddUser">
						<el-icon><Plus /></el-icon>
						添加用户
					</el-button>
				</div>
				<div class="toolbar-right">
					<el-input
						v-model="searchKeyword"
						placeholder="搜索用户名或邮箱"
						style="width: 300px"
						clearable
						@keyup.enter="loadData"
						@clear="loadData"
					>
						<template #prefix>
							<el-icon><Search /></el-icon>
						</template>
					</el-input>
				</div>
			</div>
		</el-card>

		<!-- 用户列表 -->
		<el-card class="table-card">
			<el-table v-loading="loading" :data="tableData" stripe>
				<el-table-column prop="username" label="用户名" width="150" />
				<el-table-column prop="email" label="邮箱" min-width="200" />
				<el-table-column label="角色" width="120">
					<template #default="{ row }">
						<el-tag
							:type="row.role === 'admin' ? 'danger' : row.role === 'advanced' ? 'warning' : ''"
						>
							{{ row.roleText }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="账户状态" width="120">
					<template #default="{ row }">
						<el-switch
							v-model="row.status"
							:disabled="row.id === currentUserId"
							@change="handleStatusChange(row)"
						/>
					</template>
				</el-table-column>
				<el-table-column prop="lastLoginTime" label="最后登录时间" width="180" />
				<el-table-column label="操作" width="120" fixed="right">
						<template #default="{ row }">
							<el-button
								v-if="row.id !== currentUserId"
								link
								type="danger"
								size="small"
								@click="handleDelete(row)"
							>
								删除
							</el-button>
						</template>
					</el-table-column>
			</el-table>

			<!-- 分页 -->
			<div class="pagination">
				<el-pagination
					v-model:current-page="currentPage"
					v-model:page-size="pageSize"
					:page-sizes="[10, 20, 50, 100]"
					:total="total"
					layout="total, sizes, prev, pager, next, jumper"
					@size-change="loadData"
					@current-change="loadData"
				/>
			</div>
		</el-card>

		<!-- 添加用户对话框 -->
		<el-dialog v-model="addUserDialogVisible" title="添加用户" width="500px">
			<el-form :model="addUserForm" :rules="addUserRules" ref="addUserFormRef" label-width="80px">
				<el-form-item label="用户名" prop="username" required>
					<el-input v-model="addUserForm.username" placeholder="请输入用户名" />
				</el-form-item>
				<el-form-item label="邮箱" prop="email" required>
					<el-input v-model="addUserForm.email" placeholder="请输入邮箱" />
				</el-form-item>
				<el-form-item label="密码" prop="password" required>
					<el-input v-model="addUserForm.password" type="password" placeholder="请输入密码" show-password />
				</el-form-item>
				<el-form-item label="手机号">
					<el-input v-model="addUserForm.phone" placeholder="请输入手机号" />
				</el-form-item>
				<el-form-item label="角色">
					<el-select v-model="addUserForm.role" placeholder="选择角色">
						<el-option label="普通用户" value="user" />
						<el-option label="高级用户" value="advanced" />
						<el-option label="管理员" value="admin" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="addUserDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleConfirmAddUser" :loading="addUserLoading">
					确定
				</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from 'element-plus';
import { Plus, Search } from "@element-plus/icons-vue";
import request from "@/api/request";

const loading = ref(false);
const tableData = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchKeyword = ref("");

const currentUserId = computed(() => {
	const userInfo = localStorage.getItem("userInfo");
	return userInfo ? JSON.parse(userInfo).userId : 0;
});

const addUserDialogVisible = ref(false);
const addUserLoading = ref(false);
const addUserFormRef = ref<FormInstance>();
const addUserForm = ref({
	username: "",
	email: "",
	password: "",
	phone: "",
	role: "user",
});

const addUserRules: FormRules = {
	username: [
		{ required: true, message: '请输入用户名', trigger: 'blur' },
		{ min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
	],
	email: [
		{ required: true, message: '请输入邮箱', trigger: 'blur' },
		{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
	],
	password: [
		{ required: true, message: '请输入密码', trigger: 'blur' },
		{ min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
	]
};

const loadData = async () => {
	loading.value = true;
	try {
		const response = await request.get("/api/manager/users/list", {
			params: {
				page: currentPage.value,
				pageSize: pageSize.value,
			},
		});
		if (response.code === "200" && response.data) {
			let list = response.data.list;
			// 前端搜索过滤
			if (searchKeyword.value) {
				const keyword = searchKeyword.value.toLowerCase();
				list = list.filter(
					(item: any) =>
						item.username.toLowerCase().includes(keyword) ||
						item.email.toLowerCase().includes(keyword)
				);
			}
			tableData.value = list;
			total.value = searchKeyword.value ? list.length : response.data.total;
		}
	} catch (error) {
		ElMessage.error("加载用户列表失败");
	} finally {
		loading.value = false;
	}
};

const handleStatusChange = async (row: any) => {
	try {
		const response = await request.put(`/api/manager/users/${row.id}`, {
			status: row.status,
		});
		if (response.code === "200") {
			ElMessage.success(row.status ? "账户已启用" : "账户已禁用");
		}
	} catch (error) {
		// 回滚状态
		row.status = !row.status;
		ElMessage.error("操作失败");
	}
};



const handleDelete = (row: any) => {
	ElMessageBox.confirm(`确定要删除用户"${row.username}"吗？此操作不可恢复。`, "提示", {
		confirmButtonText: "确定",
		cancelButtonText: "取消",
		type: "warning",
	})
		.then(async () => {
			try {
				const response = await request.delete(`/api/manager/users/${row.id}`);
				if (response.code === "200") {
					ElMessage.success("用户删除成功");
					loadData();
				}
			} catch (error) {
				ElMessage.error("删除失败");
			}
		})
		.catch(() => {});
};

const handleAddUser = () => {
	addUserForm.value = {
		username: "",
		email: "",
		password: "",
		phone: "",
		role: "user",
	};
	addUserDialogVisible.value = true;
};

const handleConfirmAddUser = async () => {
	if (!addUserFormRef.value) return;

	try {
		const valid = await addUserFormRef.value.validate();
		if (!valid) return;

		addUserLoading.value = true;
		const response = await request.post("/api/manager/users", addUserForm.value);
		if (response.code === "200") {
			ElMessage.success("用户创建成功");
			addUserDialogVisible.value = false;
			loadData();
		}
	} catch (error: any) {
		ElMessage.error(error.response?.data?.detail || "创建用户失败");
	} finally {
		addUserLoading.value = false;
	}
};

onMounted(() => {
	loadData();
});
</script>

<style scoped>
.user-management .toolbar-card {
	margin-bottom: 20px;
}

.user-management .toolbar-card .toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.user-management .table-card .pagination {
	margin-top: 20px;
	display: flex;
	justify-content: flex-end;
}


</style>