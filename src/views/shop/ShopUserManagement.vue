<template>
  <div class="user-management">
    <!-- 操作工具栏 -->
    <el-card class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="handleAddUser">
            <el-icon><Plus /></el-icon>
            添加店铺
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商铺名或地点"
            style="width: 300px"
            clearable
            @keyup.enter="loadData"
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
        <el-table-column prop="username" label="商铺名" width="150" />
        <el-table-column prop="email" label="详细地址" min-width="200" />
        <el-table-column label="地区" width="220">
          <template #default="{ row }">
            {{ regionDisplay(row) }}
          </template>
        </el-table-column>
        <el-table-column label="规模" width="120">
          <template #default="{ row }">
            <el-tag :type="sizeType(row.size)" effect="dark">{{ sizeLabel(row.size) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="商铺类型" width="120">
          <template #default="{ row }">
            <el-tag :type="roleType(row.role)" effect="dark">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="120">
          <template #default="{ row }">
            <el-tag :type="auditStatusType(row.auditStatus)" effect="dark">{{ auditStatusLabel(row.auditStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginTime" label="最后更新时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEditPermission(row)">
              编辑权限
            </el-button>
            <el-button
              v-if="row.id !== 0"
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

    <!-- 权限编辑对话框 -->
    <el-dialog v-model="permissionDialogVisible" title="编辑商铺信息" width="600px">
      <div v-if="currentShop" class="permission-content">
        <el-form :model="editForm" label-width="100px">
          <el-form-item label="商铺名">
            <el-input v-model="editForm.username" disabled />
          </el-form-item>
          <el-form-item label="规模">
            <el-select v-model="editForm.size" placeholder="选择规模" style="width: 100%">
              <el-option label="小型" value="small" />
              <el-option label="中型" value="medium" />
              <el-option label="大型" value="large" />
            </el-select>
          </el-form-item>
          <el-form-item label="商铺类型">
            <el-select v-model="editForm.role" placeholder="选择商铺类型" style="width: 100%">
              <el-option label="零售类" value="advanced" />
              <el-option label="餐饮类" value="admin" />
              <el-option label="服务类" value="user" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePermission">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加用户对话框 -->
    <el-dialog v-model="addUserDialogVisible" title="添加店铺" width="500px">
      <el-form :model="addUserForm" label-width="80px">
        <el-form-item label="商铺名" required>
          <el-select v-model="addUserForm.username" placeholder="请选择店铺" filterable style="width: 100%" @change="handleShopChange">
            <el-option v-for="shop in availableAddOptions" :key="shop.name" :label="shop.name" :value="shop.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="商铺类型">
          <el-select v-model="addUserForm.role" placeholder="选择商铺类型">
            <el-option label="零售类" value="advanced" />
            <el-option label="餐饮类" value="admin" />
            <el-option label="服务类" value="user" />
            <el-option label="复合类" value="composite" />
          </el-select>
        </el-form-item>
        <el-form-item label="规模">
          <el-select v-model="addUserForm.size" placeholder="选择规模">
            <el-option label="小型" value="small" />
            <el-option label="中型" value="medium" />
            <el-option label="大型" value="large" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addUserDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAddUser">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Search } from "@element-plus/icons-vue";
import request from "@/api/request";

const loading = ref(false);
const tableData = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchKeyword = ref("");

// 修改权限编辑相关的变量和方法
const permissionDialogVisible = ref(false);
const currentShop = ref<any>(null);
const editForm = ref({
  username: "",
  size: "small",
  role: "advanced",
});

const addUserDialogVisible = ref(false);
const addUserForm = ref({
  username: "",
  email: "",
  role: "advanced",
  size: "small",
});

const allowedShops = [
  { name: "星光餐馆", address: "东区文化路18号" },
  { name: "乐家超市", address: "西区建设路88号" },
  { name: "海湾酒店", address: "石岐区兴中路120号" },
  { name: "老街小吃", address: "南区城南路8号" },
  { name: "新光商场", address: "火炬开发区科技路66号" },
  { name: "幸福饭店", address: "东区博爱路10号" },
  { name: "便利超市", address: "西区康乐大道88号" },
  { name: "假日酒店", address: "石岐区朝阳路120号" },
  { name: "风味小吃", address: "南区民兴街8号" },
  { name: "阳光商超", address: "火炬开发区创业路66号" },
];

const usedShopNames = computed(() => new Set(tableData.value.map((r: any) => r.username)));
const availableAddOptions = computed(() => allowedShops.filter(s => !usedShopNames.value.has(s.name)));
// 编辑时不允许修改店铺名

const handleShopChange = (shopName: string) => {
  const s = allowedShops.find((x) => x.name === shopName);
  if (s) {
    addUserForm.value.username = s.name;
    addUserForm.value.email = s.address;
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const response = await request.get("/api/shop/list", {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value || undefined,
      },
    });
    console.log("API响应:", response); // 调试日志
    
    if (response.code === "200" && response.data) {
      let list = response.data.list || [];
      
      // 如果搜索关键词存在，在前端进行筛选
      if (searchKeyword.value) {
        const keyword = searchKeyword.value.toLowerCase();
        list = list.filter(
          (item: any) =>
            (item.username && item.username.toLowerCase().includes(keyword)) ||
            (item.email && item.email.toLowerCase().includes(keyword))
        );
      }
      
      // 处理数据，确保所有必需字段都有值
      tableData.value = list.map((item: any) => {
        // 确保 auditStatus 有值
        const auditStatus = item.audit_status || item.auditStatus || 'pending';
        
        // 确保 lastLoginTime 有值
        const lastLoginTime = item.lastLoginTime || item.last_login_time || 
          new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).replace(/\//g, '-');
        
        return { 
          ...item, 
          auditStatus,
          lastLoginTime,
          // 保留原始的 status 字段用于其他用途
          status: item.status !== undefined ? item.status : true
        };
      });
      
      total.value = searchKeyword.value ? list.length : response.data.total || 0;
      console.log("处理后的表格数据:", tableData.value); // 调试日志
    } else {
      console.error("API响应格式错误:", response);
      ElMessage.error("获取数据失败");
    }
  } catch (error) {
    console.error("加载商铺列表失败:", error);
    ElMessage.error("加载商铺列表失败");
  } finally {
    loading.value = false;
  }
};


// 审核状态仅展示，商户不可修改

const handleEditPermission = (row: any) => {
  currentShop.value = row;
  editForm.value = {
    username: row.username,
    size: row.size || "small",
    role: row.role || "advanced",
  };
  permissionDialogVisible.value = true;
};

const handleSavePermission = async () => {
  if (!currentShop.value) return;

  // 店铺名不可编辑，不校验

  ElMessageBox.confirm("确定要修改该商铺的信息吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        // 调用商铺更新接口
        const response = await request.put(`/api/shop/${currentShop.value.id}`, {
          size: editForm.value.size,
          role: editForm.value.role,
        });

        console.log("更新商铺API响应:", response); // 调试日志

        if (response.code === "200") {
          ElMessage.success("商铺信息更新成功");
          permissionDialogVisible.value = false;
          loadData(); // 重新加载数据
        } else {
          ElMessage.error("更新失败: " + (response.msg || "未知错误"));
        }
      } catch (error) {
        console.error("更新失败:", error);
        ElMessage.error("更新失败");
      }
    })
    .catch(() => {});
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除商铺"${row.username}"吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        const response = await request.delete(`/api/shop/${row.id}`);
        console.log("删除商铺API响应:", response); // 调试日志
        
        if (response.code === "200") {
          const idx = tableData.value.findIndex((r: any) => r.id === row.id);
          if (idx >= 0) {
            tableData.value.splice(idx, 1);
            total.value = Math.max(0, total.value - 1);
          }
          ElMessage.success("已删除");
        } else {
          ElMessage.error("删除失败: " + (response.msg || "未知错误"));
        }
      } catch (error) {
        console.error("删除失败:", error);
        ElMessage.error("删除失败");
      }
    })
    .catch(() => {});
};

const handleAddUser = () => {
  addUserForm.value = {
    username: "",
    email: "",
    province: "",
    city: "",
    district: "",
    role: "advanced",
    size: "small",
  };
  addUserDialogVisible.value = true;
};

const handleConfirmAddUser = async () => {
  if (!addUserForm.value.username || !addUserForm.value.email) {
    ElMessage.warning("请填写完整信息");
    return;
  }
  
  try {
    const response = await request.post("/api/shop", {
      username: addUserForm.value.username,
      email: addUserForm.value.email,
      province: "广东省",
      city: "中山市",
      role: addUserForm.value.role,
      size: addUserForm.value.size,
    });
    
    console.log("添加商铺API响应:", response); // 调试日志
    
    if (response.code === "200") {
      const now = new Date();
      const newRow = {
        id: response.data?.id || Date.now(),
        username: addUserForm.value.username,
        email: addUserForm.value.email,
        province: "广东省",
        city: "中山市",
        role: addUserForm.value.role,
        size: addUserForm.value.size,
        auditStatus: "pending",
        lastLoginTime: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`,
      };
      tableData.value.unshift(newRow);
      total.value += 1;
      ElMessage.success("已添加店铺");
      addUserDialogVisible.value = false;
    } else {
      ElMessage.error("添加店铺失败: " + (response.msg || "未知错误"));
    }
  } catch (error) {
    console.error("添加店铺失败:", error);
    ElMessage.error("添加店铺失败");
  }
};

// 监听搜索关键词变化
watch(searchKeyword, () => {
  if (!searchKeyword.value) {
    loadData();
  }
});

onMounted(() => {
  loadData();
});

const roleLabel = (role: string) => {
  return role === 'admin' ? '餐饮类' : role === 'advanced' ? '零售类' : role === 'user' ? '服务类' : '复合类';
};

const roleType = (role: string) => {
  return role === 'admin' ? 'danger' : role === 'advanced' ? 'warning' : role === 'user' ? 'success' : 'info';
};

const regionDisplay = (row: any) => {
  const p = String(row.province || '').trim();
  const c = String(row.city || '').trim();
  const d = String(row.district || '').trim();
  const pLabel = p ? (p.endsWith('省') ? p : `${p}省`) : '';
  const cLabel = c ? (c.endsWith('市') ? c : `${c}市`) : '';
  const dLabel = d ? (d.endsWith('区') || d.endsWith('县') ? d : `${d}县/区`) : '';
  const parts = [pLabel, cLabel, dLabel].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
};

const sizeLabel = (size?: string) => {
  return size === 'small' ? '小型' : size === 'medium' ? '中型' : size === 'large' ? '大型' : '—';
};

const sizeType = (size?: string) => {
  return size === 'small' ? 'success' : size === 'medium' ? 'warning' : size === 'large' ? 'danger' : 'info';
};

const auditStatusLabel = (status: string) => {
  const map: Record<string, string> = { 
    'pending': '待审核', 
    'approved': '已通过', 
    'rejected': '已拒绝' 
  };
  return map[status] || '未知';
};

const auditStatusType = (status: string) => {
  const map: Record<string, string> = { 
    'pending': 'warning', 
    'approved': 'success', 
    'rejected': 'danger' 
  };
  return map[status] || 'info';
};
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

.user-management .table-card :deep(.el-table__row.disabled-row) {
  background-color: #f5f7fa;
}

.user-management .table-card .pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.user-management .permission-content .el-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-management .area-inputs {
  display: flex;
  gap: 10px;
}
</style>