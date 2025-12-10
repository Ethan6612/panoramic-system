<template>
  <div class="shop-audit-management">
    <!-- 操作工具栏 -->
    <el-card class="toolbar-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="refreshData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button type="success" @click="batchApprove" :disabled="selectedShops.length === 0">
            <el-icon><Check /></el-icon>
            批量通过
          </el-button>
          <el-button type="danger" @click="batchReject" :disabled="selectedShops.length === 0">
            <el-icon><Close /></el-icon>
            批量拒绝
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商铺名或地点"
            style="width: 300px"
            clearable
            @keyup.enter="loadData"
            @clear="loadData"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="auditStatus"
            placeholder="审核状态"
            style="width: 120px; margin-left: 10px"
            @change="loadData"
          >
            <el-option label="全部" value="all" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card shadow="hover" class="stats-card">
        <div class="stats-content">
          <div class="stats-icon" style="background-color: #409eff;">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ stats.pendingCount }}</div>
            <div class="stats-label">待审核</div>
          </div>
        </div>
      </el-card>
      
      <el-card shadow="hover" class="stats-card">
        <div class="stats-content">
          <div class="stats-icon" style="background-color: #67c23a;">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ stats.approvedCount }}</div>
            <div class="stats-label">已通过</div>
          </div>
        </div>
      </el-card>
      
      <el-card shadow="hover" class="stats-card">
        <div class="stats-content">
          <div class="stats-icon" style="background-color: #f56c6c;">
            <el-icon><Close /></el-icon>
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ stats.rejectedCount }}</div>
            <div class="stats-label">已拒绝</div>
          </div>
        </div>
      </el-card>
      
      <el-card shadow="hover" class="stats-card">
        <div class="stats-content">
          <div class="stats-icon" style="background-color: #909399;">
            <el-icon><Shop /></el-icon>
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ stats.totalCount }}</div>
            <div class="stats-label">总数</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 店铺列表 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="username" label="商铺名" width="150" />
        <el-table-column prop="email" label="详细地址" min-width="200">
          <template #default="{ row }">
            <div class="address-cell">
              <div class="address-text">{{ row.email }}</div>
              <el-button
                v-if="row.email.length > 30"
                link
                type="primary"
                size="small"
                @click="showFullAddress(row)"
              >
                查看全部
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="地区" width="180">
          <template #default="{ row }">
            {{ regionDisplay(row) }}
          </template>
        </el-table-column>
        <el-table-column label="规模" width="100">
          <template #default="{ row }">
            <el-tag :type="sizeType(row.size)" size="small">{{ sizeLabel(row.size) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="商铺类型" width="100">
          <template #default="{ row }">
            <el-tag :type="roleType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核状态" width="120">
          <template #default="{ row }">
            <el-tag
              :type="auditStatusType(row.auditStatus)"
              effect="dark"
            >
              {{ auditStatusLabel(row.auditStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creatorName" label="创建人" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.auditStatus === 'pending'"
              type="success"
              size="small"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.auditStatus === 'pending'"
              type="danger"
              size="small"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
            <el-button
              v-if="row.auditStatus !== 'pending'"
              type="primary"
              size="small"
              @click="showShopDetail(row)"
            >
              详情
            </el-button>
            <el-button
              link
              type="warning"
              size="small"
              @click="editShopInfo(row)"
            >
              编辑
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

    <!-- 地址详情对话框 -->
    <el-dialog v-model="addressDialogVisible" title="详细地址" width="500px">
      <div class="address-detail">
        <p>{{ selectedShop?.email }}</p>
        <div class="address-actions">
          <el-button type="primary" @click="copyAddress">
            <el-icon><CopyDocument /></el-icon>
            复制地址
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditDialogVisible" :title="auditDialogTitle" width="500px">
      <el-form :model="auditForm" label-width="100px">
        <el-form-item label="商铺名">
          <el-input v-model="auditForm.shopName" disabled />
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="auditForm.address" disabled type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="审核备注">
          <el-input
            v-model="auditForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入审核备注（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button
          v-if="auditForm.action === 'approve'"
          type="success"
          @click="confirmAudit"
        >
          通过审核
        </el-button>
        <el-button
          v-if="auditForm.action === 'reject'"
          type="danger"
          @click="confirmAudit"
        >
          拒绝审核
        </el-button>
      </template>
    </el-dialog>

    <!-- 店铺详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="商铺详情" width="600px">
      <div v-if="selectedShop" class="shop-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="商铺ID">
            {{ selectedShop.id }}
          </el-descriptions-item>
          <el-descriptions-item label="商铺名">
            {{ selectedShop.username }}
          </el-descriptions-item>
          <el-descriptions-item label="详细地址">
            {{ selectedShop.email }}
          </el-descriptions-item>
          <el-descriptions-item label="地区">
            {{ regionDisplay(selectedShop) }}
          </el-descriptions-item>
          <el-descriptions-item label="规模">
            <el-tag :type="sizeType(selectedShop.size)">
              {{ sizeLabel(selectedShop.size) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="商铺类型">
            <el-tag :type="roleType(selectedShop.role)">
              {{ roleLabel(selectedShop.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="auditStatusType(selectedShop.auditStatus)">
              {{ auditStatusLabel(selectedShop.auditStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建人">
            {{ selectedShop.creatorName || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ selectedShop.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新时间">
            {{ selectedShop.updatedAt || '未更新' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-actions" v-if="selectedShop.auditStatus === 'pending'">
          <el-divider>审核操作</el-divider>
          <div style="text-align: center;">
            <el-button type="success" @click="handleApprove(selectedShop)">
              通过审核
            </el-button>
            <el-button type="danger" @click="handleReject(selectedShop)">
              拒绝审核
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑店铺信息对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑商铺信息" width="600px">
      <div v-if="selectedShop" class="edit-content">
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
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Refresh,
  Search,
  Check,
  Close,
  Clock,
  Shop,
  CopyDocument
} from "@element-plus/icons-vue";
import request from "@/api/request";

const loading = ref(false);
const tableData = ref<any[]>([]);
const selectedShops = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchKeyword = ref("");
const auditStatus = ref("all");

const stats = ref({
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  totalCount: 0
});

// 对话框控制
const addressDialogVisible = ref(false);
const auditDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const editDialogVisible = ref(false);

const selectedShop = ref<any>(null);
const auditForm = ref({
  shopId: 0,
  shopName: "",
  address: "",
  action: "approve", // approve 或 reject
  remark: ""
});

const editForm = ref({
  username: "",
  size: "small",
  role: "advanced"
});

// 店铺名不可编辑，仅展示

// 计算对话框标题
const auditDialogTitle = computed(() => {
  return auditForm.value.action === 'approve' ? '通过审核' : '拒绝审核';
});

const loadData = async () => {
  loading.value = true;
  try {
    const response = await request.get("/api/admin/shop-audit/list", {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value || undefined,
        status: auditStatus.value !== "all" ? auditStatus.value : undefined
      }
    });
    
    if (response.code === "200" && response.data) {
      tableData.value = response.data.list;
      total.value = response.data.total;
      
      // 更新统计信息
      updateStats(response.data.stats);
    }
  } catch (error) {
    console.error("加载店铺审核列表失败:", error);
    ElMessage.error("加载店铺审核列表失败");
  } finally {
    loading.value = false;
  }
};

const updateStats = (statsData: any) => {
  if (statsData) {
    stats.value = statsData;
  }
};

const refreshData = () => {
  loadData();
};

const handleSelectionChange = (selection: any[]) => {
  selectedShops.value = selection;
};

const handleApprove = (row: any) => {
  selectedShop.value = row;
  auditForm.value = {
    shopId: row.id,
    shopName: row.username,
    address: row.email,
    action: "approve",
    remark: ""
  };
  auditDialogVisible.value = true;
};

const handleReject = (row: any) => {
  selectedShop.value = row;
  auditForm.value = {
    shopId: row.id,
    shopName: row.username,
    address: row.email,
    action: "reject",
    remark: ""
  };
  auditDialogVisible.value = true;
};

const confirmAudit = async () => {
  if (!selectedShop.value) return;
  
  try {
    const response = await request.post(`/api/admin/shop-audit/${selectedShop.value.id}/audit`, {
      action: auditForm.value.action,
      remark: auditForm.value.remark
    });
    
    if (response.code === "200") {
      ElMessage.success(auditForm.value.action === "approve" ? "审核通过" : "审核拒绝");
      auditDialogVisible.value = false;
      loadData(); // 重新加载数据
    } else {
      ElMessage.error(response.msg || "操作失败");
    }
  } catch (error) {
    console.error("审核操作失败:", error);
    ElMessage.error("操作失败");
  }
};

const batchApprove = async () => {
  if (selectedShops.value.length === 0) return;
  
  ElMessageBox.confirm(`确定要通过 ${selectedShops.value.length} 个店铺的审核吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(async () => {
      try {
        const shopIds = selectedShops.value.map(shop => shop.id);
        const response = await request.post("/api/admin/shop-audit/batch-audit", {
          shopIds,
          action: "approve"
        });
        
        if (response.code === "200") {
          ElMessage.success(`成功通过 ${response.data.successCount} 个店铺的审核`);
          selectedShops.value = [];
          loadData();
        }
      } catch (error) {
        console.error("批量通过失败:", error);
        ElMessage.error("批量操作失败");
      }
    })
    .catch(() => {});
};

const batchReject = async () => {
  if (selectedShops.value.length === 0) return;
  
  ElMessageBox.confirm(`确定要拒绝 ${selectedShops.value.length} 个店铺的审核吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(async () => {
      try {
        const shopIds = selectedShops.value.map(shop => shop.id);
        const response = await request.post("/api/admin/shop-audit/batch-audit", {
          shopIds,
          action: "reject"
        });
        
        if (response.code === "200") {
          ElMessage.success(`成功拒绝 ${response.data.successCount} 个店铺的审核`);
          selectedShops.value = [];
          loadData();
        }
      } catch (error) {
        console.error("批量拒绝失败:", error);
        ElMessage.error("批量操作失败");
      }
    })
    .catch(() => {});
};

const showFullAddress = (row: any) => {
  selectedShop.value = row;
  addressDialogVisible.value = true;
};

const copyAddress = async () => {
  if (!selectedShop.value) return;
  
  try {
    await navigator.clipboard.writeText(selectedShop.value.email);
    ElMessage.success("地址已复制到剪贴板");
  } catch (error) {
    console.error("复制失败:", error);
    ElMessage.error("复制失败");
  }
};

const showShopDetail = (row: any) => {
  selectedShop.value = row;
  detailDialogVisible.value = true;
};

const editShopInfo = (row: any) => {
  selectedShop.value = row;
  editForm.value = {
    username: row.username,
    size: row.size || "small",
    role: row.role || "advanced"
  };
  editDialogVisible.value = true;
};

const saveEdit = async () => {
  if (!selectedShop.value) return;
  
  // 店铺名不可编辑，不校验
  
  try {
    const response = await request.put(`/api/shop/${selectedShop.value.id}`, {
      size: editForm.value.size,
      role: editForm.value.role,
    });
    
    if (response.code === "200") {
      ElMessage.success("商铺信息更新成功");
      editDialogVisible.value = false;
      loadData();
    } else {
      ElMessage.error("更新失败: " + response.msg);
    }
  } catch (error) {
    console.error("更新失败:", error);
    ElMessage.error("更新失败");
  }
};

// 辅助函数
const roleLabel = (role: string) => {
  return role === 'admin' ? '餐饮类' : role === 'advanced' ? '零售类' : role === 'user' ? '服务类' : '未知';
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
  const statusMap: Record<string, string> = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };
  return statusMap[status] || '未知';
};

const auditStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  };
  return typeMap[status] || 'info';
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.shop-audit-management .toolbar-card {
  margin-bottom: 20px;
}

.shop-audit-management .toolbar-card .toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stats-card {
  height: 100%;
}

.stats-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.shop-audit-management .table-card .pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.address-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.address-text {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.address-detail {
  padding: 10px;
}

.address-detail p {
  margin: 0 0 20px 0;
  line-height: 1.6;
  word-break: break-all;
}

.address-actions {
  display: flex;
  justify-content: flex-end;
}

.shop-detail {
  padding: 10px;
}

.detail-actions {
  margin-top: 20px;
}

.area-inputs {
  display: flex;
  gap: 10px;
}
</style>
