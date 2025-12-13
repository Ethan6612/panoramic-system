<template>
	<div class="data-management">
		<!-- 添加标签页切换 -->
		<el-tabs v-model="activeTab" @tab-change="handleTabChange" class="data-tabs">
			<el-tab-pane label="全景图数据" name="panorama"></el-tab-pane>
			<el-tab-pane label="地点管理" name="location"></el-tab-pane>
			<el-tab-pane label="全景图预览" name="panoramaPreview"></el-tab-pane>
		</el-tabs>

		<!-- 全景图数据管理部分（现有代码） -->
		<div v-show="activeTab === 'panorama'">
			<!-- 操作工具栏 -->
			<el-card class="toolbar-card">
				<div class="toolbar">
					<div class="toolbar-left">
						<el-button type="primary" @click="handleUpload">
							<el-icon><Upload /></el-icon>
							上传新数据
						</el-button>
						<el-dropdown @command="handleBatchAction">
							<el-button>
								批量操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
							</el-button>
							<template #dropdown>
								<el-dropdown-menu>
									<el-dropdown-item command="publish">批量发布</el-dropdown-item>
									<el-dropdown-item command="delete" divided>批量删除</el-dropdown-item>
								</el-dropdown-menu>
							</template>
						</el-dropdown>
					</div>
					<div class="toolbar-right">
						<el-select v-model="filterStatus" placeholder="数据状态" style="width: 150px" @change="loadData">
							<el-option label="全部" value="all" />
							<el-option label="待审核" value="pending" />
							<el-option label="已发布" value="published" />
							<el-option label="已拒绝" value="rejected" />
						</el-select>
						<el-input
							v-model="searchKeyword"
							placeholder="搜索数据ID、名称或描述"
							style="width: 250px; margin-left: 10px"
							clearable
							@keyup.enter="loadData"
							@clear="loadData">
							<template #prefix>
								<el-icon><Search /></el-icon>
							</template>
						</el-input>
					</div>
				</div>
			</el-card>

			<!-- 数据列表 -->
			<el-card class="table-card">
				<el-table v-loading="loading" :data="tableData" @selection-change="handleSelectionChange" stripe>
					<el-table-column type="selection" width="55" />
					<el-table-column label="数据ID" prop="id" />
					<el-table-column label="缩略图" min-width="120">
						<template #default="{ row }">
							<el-image
								:src="loadImage(row.thumbnail)"
								style="width: 80px; height: 60px"
								fit="cover"/>
						</template>
					</el-table-column>
					<el-table-column prop="name" label="数据名称" min-width="150" />
					<el-table-column prop="shootTime" label="拍摄时间" width="180" />
					<el-table-column prop="location" label="使用情况" min-width="150">
						<template #default="{ row }">
							<div v-if="row.location_name">
								<div>{{ row.location_name }}</div>
								<el-tag size="small" type="success">已使用</el-tag>
							</div>
							<el-tag v-else size="small" type="info">未使用</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="数据状态" width="100">
						<template #default="{ row }">
							<el-tag :type="row.status === 'published' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'">
								{{ row.statusText }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="预览图" width="100">
						<template #default="{ row }">
							<div class="preview-count-cell">
								{{ row.preview_count || 0 }}张
								<el-button
									v-if="row.status === 'published'"
									link
									type="primary"
									size="small"
									@click.stop="handleAddPreview(row)"
									style="margin-left: 5px">
									<el-icon><Plus /></el-icon>
								</el-button>
							</div>
						</template>
					</el-table-column>
					<el-table-column label="操作" min-width="300" fixed="right">
						<template #default="{ row }">
							<el-button v-if="row.status === 'pending'" link type="primary" size="small" @click="handleReview(row)"> 审核 </el-button>
							<el-button v-if="!row.is_used && row.status === 'published'" link type="success" size="small" @click="showAssignDialog(row)">
								关联地点
							</el-button>
							<el-button v-if="row.is_used" link type="warning" size="small" @click="showDetachDialog(row)"> 解除关联 </el-button>
							<el-button link type="primary" size="small" @click="handleEdit(row)"> 编辑 </el-button>
							<el-button link type="primary" size="small" @click="handleViewDetail(row)"> 详情 </el-button>
							<el-button link type="danger" size="small" @click="handleDelete(row)"> 删除 </el-button>
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
						@current-change="loadData" />
				</div>
			</el-card>
		</div>

		<!-- 地点管理部分（修改） -->
		<div v-show="activeTab === 'location'">
			<el-card class="toolbar-card">
				<div class="toolbar">
					<div class="toolbar-left">
						<el-button type="primary" @click="handleAddLocation">
							<el-icon><Plus /></el-icon>
							添加新地点
						</el-button>
						<el-button type="danger" @click="handleBatchDeleteLocations" :disabled="selectedLocations.length === 0">
							<el-icon><Delete /></el-icon>
							批量删除
						</el-button>
					</div>
					<div class="toolbar-right">
						<el-select v-model="locationFilter" placeholder="筛选类别" style="width: 150px" clearable @change="loadLocations">
							<el-option label="全部" value="" />
							<el-option label="景点" value="景点" />
							<el-option label="城市" value="城市" />
							<el-option label="自然" value="自然" />
							<el-option label="建筑" value="建筑" />
						</el-select>
						<el-input
							v-model="locationKeyword"
							placeholder="搜索地点名称或地址"
							style="width: 250px; margin-left: 10px"
							clearable
							@keyup.enter="loadLocations"
							@clear="loadLocations">
							<template #prefix>
								<el-icon><Search /></el-icon>
							</template>
						</el-input>
					</div>
				</div>
			</el-card>

			<el-card class="table-card">
				<el-table v-loading="locationLoading" :data="locationData" @selection-change="handleLocationSelectionChange" stripe>
					<el-table-column type="selection" width="55" />
					<el-table-column label="地点ID" prop="id" width="100" />
					<el-table-column prop="name" label="地点名称" min-width="150" />
					<el-table-column prop="category" label="类别" width="120">
						<template #default="{ row }">
							<el-tag size="small">{{ row.category || "未分类" }}</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="全景图" width="120">
						<template #default="{ row }">
							<div v-if="row.panorama">
								<el-tag size="small" type="success">已关联</el-tag>
								<div class="panorama-info" style="font-size: 12px; color: #666; margin-top: 4px">
									{{ row.panorama.description || "全景图" }}
								</div>
							</div>
							<el-tag v-else size="small" type="info">未关联</el-tag>
						</template>
					</el-table-column>
					<el-table-column prop="rating" label="评分" width="100">
						<template #default="{ row }">
							<el-rate v-model="row.rating" disabled show-score text-color="#ff9900" score-template="{value}" />
						</template>
					</el-table-column>
					<el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
					<el-table-column label="操作" width="300" fixed="right">
						<template #default="{ row }">
							<el-button v-if="!row.panorama" link type="success" size="small" @click="showAssignPanoramaDialog(row)"> 关联全景图 </el-button>
							<el-button v-if="row.panorama" link type="warning" size="small" @click="handleDetachPanorama(row)"> 解除关联 </el-button>
							<el-button link type="primary" size="small" @click="handleEditLocation(row)"> 编辑 </el-button>
							<el-button link type="primary" size="small" @click="handleViewLocationDetail(row)"> 查看 </el-button>
							<el-button link type="danger" size="small" @click="handleDeleteLocation(row)"> 删除 </el-button>
						</template>
					</el-table-column>
				</el-table>

				<!-- 分页 -->
				<div class="pagination">
					<el-pagination
						v-model:current-page="locationCurrentPage"
						v-model:page-size="locationPageSize"
						:page-sizes="[10, 20, 50, 100]"
						:total="locationTotal"
						layout="total, sizes, prev, pager, next, jumper"
						@size-change="loadLocations"
						@current-change="loadLocations" />
				</div>
			</el-card>
		</div>

		<!-- 全景图预览部分 -->
		<div v-show="activeTab === 'panoramaPreview'">
			<el-card class="toolbar-card">
				<div class="toolbar">
					<div class="toolbar-left">
						<el-button type="primary" @click="refreshPanoramaPreviews">
							<el-icon><Refresh /></el-icon>
							刷新列表
						</el-button>
						<el-select v-model="previewFilterType" placeholder="筛选类型" style="width: 150px; margin-left: 10px" @change="filterPanoramaPreviews">
							<el-option label="所有全景图" value="all" />
							<el-option label="已发布" value="published" />
							<el-option label="待审核" value="pending" />
							<el-option label="已关联地点" value="withLocation" />
							<el-option label="未关联地点" value="withoutLocation" />
						</el-select>
					</div>
					<div class="toolbar-right">
						<el-input
							v-model="previewSearchKeyword"
							placeholder="搜索全景图描述或地点"
							style="width: 250px"
							clearable
							@keyup.enter="loadPanoramaPreviews"
							@clear="loadPanoramaPreviews">
							<template #prefix>
								<el-icon><Search /></el-icon>
							</template>
						</el-input>
					</div>
				</div>
			</el-card>

			<!-- 全景图预览图展示 -->
			<el-card class="preview-container-card">
				<el-row :gutter="20" v-if="panoramaPreviews.length > 0">
					<el-col v-for="item in currentPagePanoramas" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6" class="preview-item-col">
						<el-card class="preview-item-card" shadow="hover">
							<!-- 主图预览 -->
							<div class="preview-main-image" @click="viewPanoramaPreview(item)">
								<el-image
									:src="loadImage(item.thumbnail)"
									style="width: 100%; height: 200px"
									fit="cover"
									:preview-src-list="[loadImage(item.panorama_image)]" />
								<div class="preview-overlay">
									<el-icon><ZoomIn /></el-icon>
									<span>查看全景图</span>
								</div>
							</div>

							<!-- 预览图列表 -->
							<div class="preview-thumbnails" v-if="item.preview_images && item.preview_images.length > 0">
								<div class="thumbnails-title">
									<el-icon><Picture /></el-icon>
									<span>预览图 ({{ item.preview_images.length }})</span>
									<el-button link type="primary" size="small" @click.stop="handleAddPreviewForPanorama(item)" style="margin-left: auto">
										<el-icon><Plus /></el-icon>
										添加
									</el-button>
								</div>
								<div class="thumbnail-list">
									<div
										v-for="(img, index) in item.preview_images.slice(0, 4)"
										:key="index"
										class="thumbnail-item"
										@click="viewImageGallery(item, index)">
										<el-image :src="loadImage(img)" style="width: 100%; height: 60px" fit="cover" />
										<div class="thumbnail-index">{{ index + 1 }}</div>
										<div class="thumbnail-remove" @click.stop="handleRemovePreview(item, img)">
											<el-icon><Close /></el-icon>
										</div>
									</div>
									<div v-if="item.preview_images.length > 4" class="thumbnail-more" @click="viewImageGallery(item)">
										+{{ item.preview_images.length - 4 }}
									</div>
								</div>
							</div>
							<div class="no-preview-thumbnails" v-else>
								<el-empty description="暂无预览图" :image-size="50">
									<el-button type="primary" size="small" @click.stop="handleAddPreviewForPanorama(item)"> 添加预览图 </el-button>
								</el-empty>
							</div>

							<!-- 全景图信息 -->
							<div class="preview-info">
								<div class="info-header">
									<h4 class="preview-title" :title="item.description">
										{{ item.description ? (item.description.length > 25 ? item.description.substring(0, 25) + "..." : item.description) : "无描述" }}
									</h4>
									<div class="status-badge">
										<el-tag :type="item.status === 'published' ? 'success' : 'warning'" size="small">
											{{ item.status === "published" ? "已发布" : "待审核" }}
										</el-tag>
									</div>
								</div>

								<div class="info-details">
									<div class="info-row">
										<el-icon><Timer /></el-icon>
										<span>{{ item.shoot_time || "未知时间" }}</span>
									</div>
									<div class="info-row">
										<el-icon><Location /></el-icon>
										<span>{{ item.location_name ? item.location_name : "未关联地点" }}</span>
									</div>
									<div class="info-row">
										<el-icon><PictureRounded /></el-icon>
										<span>{{ item.preview_images ? item.preview_images.length : 0 }}张预览图</span>
									</div>
								</div>

								<div class="action-buttons">
									<el-button type="primary" size="small" @click="viewPanoramaPreview(item)" plain> 查看全景 </el-button>
									<el-button v-if="!item.is_used && item.status === 'published'" type="success" size="small" @click="showAssignDialog(item)">
										关联地点
									</el-button>
									<el-button v-if="item.is_used" type="warning" size="small" @click="showDetachDialog(item)"> 解除关联 </el-button>
									<el-button type="info" size="small" @click="handleViewPanoramaDetail(item)"> 详情 </el-button>
									<el-button type="primary" size="small" @click="handleAddPreviewForPanorama(item)" plain> 添加预览图 </el-button>
								</div>
							</div>
						</el-card>
					</el-col>
				</el-row>

				<!-- 空状态 -->
				<div v-if="panoramaPreviews.length === 0 && !previewLoading" class="preview-empty">
					<el-empty description="暂无全景图数据" image-size="200">
						<template #description>
							<p>当前没有可预览的全景图数据</p>
							<p style="font-size: 14px; color: #999; margin-top: 10px">切换到"全景图数据"标签页上传新的全景图</p>
						</template>
					</el-empty>
				</div>

				<!-- 加载状态 -->
				<div v-if="previewLoading" class="preview-loading">
					<el-skeleton :rows="6" animated />
				</div>

				<!-- 分页 -->
				<div v-if="panoramaPreviews.length > 0" class="preview-pagination">
					<el-pagination
						v-model:current-page="previewCurrentPage"
						v-model:page-size="previewPageSize"
						:page-sizes="[12, 24, 48, 96]"
						:total="filteredPanoramaCount"
						layout="total, sizes, prev, pager, next, jumper"
						@size-change="handlePreviewPageSizeChange"
						@current-change="handlePreviewPageChange" />
				</div>
			</el-card>
		</div>

		<!-- 审核对话框 -->
		<el-dialog v-model="reviewDialogVisible" title="数据审核" width="80%">
			<div v-if="reviewData" class="review-content">
				<div class="review-image">
					<el-image :src="loadImage(reviewData.panoramaImage)" style="width: 100%; max-height: 500px" fit="contain" />
				</div>
				<div class="review-info">
					<el-descriptions :column="2" border>
						<el-descriptions-item label="数据ID">{{ reviewData.id }}</el-descriptions-item>
						<el-descriptions-item label="数据名称">{{ reviewData.name }}</el-descriptions-item>
						<el-descriptions-item label="拍摄时间">{{ reviewData.shootTime }}</el-descriptions-item>
						<el-descriptions-item label="使用情况">
							<template v-if="reviewData.location && reviewData.location !== '未使用'">
								{{ reviewData.location }}
							</template>
							<el-tag v-else size="small" type="info">未使用</el-tag>
						</el-descriptions-item>
						<el-descriptions-item label="当前状态">
							<el-tag :type="reviewData.status === 'published' ? 'success' : reviewData.status === 'rejected' ? 'danger' : 'warning'">
								{{ reviewData.statusText }}
							</el-tag>
						</el-descriptions-item>
						<el-descriptions-item label="描述" :span="2">
							{{ reviewData.description || "无" }}
						</el-descriptions-item>
					</el-descriptions>
					<div class="review-actions">
						<el-input v-model="reviewComment" type="textarea" :rows="3" placeholder="审核意见（可选）" style="margin-top: 20px" />
					</div>
				</div>
			</div>
			<template #footer>
				<el-button @click="reviewDialogVisible = false">取消</el-button>
				<el-button type="danger" @click="handleReject">拒绝</el-button>
				<el-button type="success" @click="handleApprove">通过</el-button>
			</template>
		</el-dialog>

		<!-- 详情对话框 -->
		<el-dialog v-model="detailDialogVisible" title="数据详情" width="80%">
			<div v-if="detailData" class="detail-content">
				<div class="detail-image">
					<el-image
						:src="loadImage(detailData.panoramaImage)"
						style="width: 100%; max-height: 500px"
						fit="contain"
						:preview-src-list="[loadImage(detailData.panoramaImage)]" />
				</div>
				<div class="detail-info">
					<el-descriptions :column="2" border>
						<el-descriptions-item label="数据ID">{{ detailData.id }}</el-descriptions-item>
						<el-descriptions-item label="数据名称">{{ detailData.name }}</el-descriptions-item>
						<el-descriptions-item label="拍摄时间">{{ detailData.shootTime }}</el-descriptions-item>
						<el-descriptions-item label="使用地点">
							<template v-if="detailData.location_id"> {{ detailData.location }} (ID: {{ detailData.location_id }}) </template>
							<el-tag v-else size="small" type="info">未使用</el-tag>
						</el-descriptions-item>
						<el-descriptions-item label="经度">{{ detailData.longitude }}</el-descriptions-item>
						<el-descriptions-item label="纬度">{{ detailData.latitude }}</el-descriptions-item>
						<el-descriptions-item label="当前状态">
							<el-tag :type="detailData.status === 'published' ? 'success' : detailData.status === 'rejected' ? 'danger' : 'warning'">
								{{ detailData.statusText }}
							</el-tag>
						</el-descriptions-item>
						<el-descriptions-item label="预览图数量">
							{{ (detailData.preview_images && detailData.preview_images.length) || 0 }}张
						</el-descriptions-item>
						<el-descriptions-item label="描述" :span="2">
							{{ detailData.description || "无" }}
						</el-descriptions-item>
						<el-descriptions-item label="元数据" :span="2" v-if="detailData.metadata">
							<pre>{{ JSON.stringify(detailData.metadata || {}, null, 2) }}</pre>
						</el-descriptions-item>
					</el-descriptions>
				</div>
			</div>
			<template #footer>
				<el-button type="primary" @click="detailDialogVisible = false">关闭</el-button>
			</template>
		</el-dialog>

		<!-- 编辑对话框 -->
		<el-dialog v-model="editDialogVisible" title="编辑数据" width="600px">
			<div v-if="editData" class="edit-content">
				<el-form :model="editForm" label-width="100px" :rules="editRules" ref="editFormRef">
					<el-form-item label="数据名称" prop="name">
						<el-input v-model="editForm.name" placeholder="请输入数据名称" />
					</el-form-item>
					<el-form-item label="数据描述" prop="description">
						<el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="请输入数据描述" />
					</el-form-item>
					<el-form-item label="拍摄时间" prop="shootTime">
						<el-date-picker
							v-model="editForm.shootTime"
							type="datetime"
							placeholder="选择拍摄时间"
							style="width: 100%"
							value-format="YYYY-MM-DD HH:mm:ss" />
					</el-form-item>
					<el-form-item label="经度" prop="longitude">
						<el-input-number v-model="editForm.longitude" :precision="6" :step="0.000001" :min="-180" :max="180" style="width: 100%" />
					</el-form-item>
					<el-form-item label="纬度" prop="latitude">
						<el-input-number v-model="editForm.latitude" :precision="6" :step="0.000001" :min="-90" :max="90" style="width: 100%" />
					</el-form-item>
					<el-form-item label="元数据">
						<el-input v-model="editForm.metadataText" type="textarea" :rows="3" placeholder="请输入元数据（JSON格式）" @blur="validateMetadata" />
					</el-form-item>
				</el-form>
			</div>
			<template #footer>
				<el-button @click="editDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleConfirmEdit">保存</el-button>
			</template>
		</el-dialog>

		<!-- 上传对话框 -->
		<el-dialog v-model="uploadDialogVisible" title="上传新数据" width="600px">
			<el-form :model="uploadForm" label-width="100px" :rules="uploadRules" ref="uploadFormRef">
				<el-form-item label="全景图片" required>
					<el-upload
						class="upload-demo"
						drag
						action="#"
						:auto-upload="false"
						:on-change="handleFileChange"
						:file-list="uploadFiles"
						:before-upload="beforeUpload">
						<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
						<div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
						<template #tip>
							<div class="el-upload__tip">支持jpg/png格式文件，且不超过10MB</div>
						</template>
					</el-upload>
				</el-form-item>
				<el-form-item label="数据描述" prop="description">
					<el-input v-model="uploadForm.description" type="textarea" :rows="3" placeholder="请输入数据描述" />
				</el-form-item>
				<el-form-item label="拍摄时间" prop="shootTime" required>
					<el-date-picker
						v-model="uploadForm.shootTime"
						type="datetime"
						placeholder="选择拍摄时间"
						style="width: 100%"
						value-format="YYYY-MM-DD HH:mm:ss" />
				</el-form-item>
				<el-form-item label="经度" prop="longitude" required>
					<el-input-number v-model="uploadForm.longitude" :precision="6" :step="0.000001" :min="-180" :max="180" style="width: 100%" />
				</el-form-item>
				<el-form-item label="纬度" prop="latitude" required>
					<el-input-number v-model="uploadForm.latitude" :precision="6" :step="0.000001" :min="-90" :max="90" style="width: 100%" />
				</el-form-item>
				<el-form-item label="关联地点（可选）">
					<el-select v-model="uploadForm.location_id" placeholder="选择要关联的地点" style="width: 100%" clearable filterable>
						<el-option v-for="loc in availableLocations" :key="loc.id" :label="loc.name" :value="loc.id" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="uploadDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleConfirmUpload" :loading="uploadLoading"> 确定上传 </el-button>
			</template>
		</el-dialog>

		<!-- 地点编辑对话框 -->
		<el-dialog v-model="locationDialogVisible" :title="locationDialogType === 'add' ? '添加新地点' : '编辑地点'" width="600px">
			<el-form :model="locationForm" label-width="100px" :rules="locationRules" ref="locationFormRef">
				<el-form-item label="地点名称" prop="name">
					<el-input v-model="locationForm.name" placeholder="请输入地点名称" />
				</el-form-item>
				<el-form-item label="经度" prop="longitude">
					<el-input-number v-model="locationForm.longitude" :precision="6" :step="0.000001" :min="-180" :max="180" style="width: 100%" />
				</el-form-item>
				<el-form-item label="纬度" prop="latitude">
					<el-input-number v-model="locationForm.latitude" :precision="6" :step="0.000001" :min="-90" :max="90" style="width: 100%" />
				</el-form-item>
				<el-form-item label="评分">
					<el-rate v-model="locationForm.rating" :max="5" show-score text-color="#ff9900" score-template="{value}分" />
				</el-form-item>
				<el-form-item label="类别">
					<el-select v-model="locationForm.category" placeholder="选择类别" style="width: 100%" clearable>
						<el-option label="景点" value="景点" />
						<el-option label="城市" value="城市" />
						<el-option label="自然" value="自然" />
						<el-option label="建筑" value="建筑" />
						<el-option label="历史" value="历史" />
						<el-option label="文化" value="文化" />
						<el-option label="其他" value="其他" />
					</el-select>
				</el-form-item>
				<el-form-item label="地址">
					<el-input v-model="locationForm.address" placeholder="请输入详细地址" />
				</el-form-item>
				<el-form-item label="描述">
					<el-input v-model="locationForm.description" type="textarea" :rows="3" placeholder="请输入地点描述" />
				</el-form-item>
				<el-form-item label="关联全景图（可选）">
					<el-select
						v-model="locationForm.panorama_id"
						placeholder="选择全景图"
						style="width: 100%"
						clearable
						filterable
						@focus="loadAvailablePanoramasForSelect">
						<el-option
							v-for="pano in selectablePanoramas"
							:key="pano.id"
							:label="`${pano.description || '全景图'} (ID: ${pano.id})`"
							:value="pano.id" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="locationDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleSaveLocation">
					{{ locationDialogType === "add" ? "添加" : "保存" }}
				</el-button>
			</template>
		</el-dialog>

		<!-- 关联全景图对话框 -->
		<el-dialog v-model="assignDialogVisible" title="关联全景图" width="600px">
			<div v-if="assignData" class="assign-content">
				<div class="assign-info">
					<el-descriptions :column="1" border>
						<el-descriptions-item label="全景图ID">
							<strong>{{ assignData.panorama.id }}</strong>
						</el-descriptions-item>
						<el-descriptions-item label="全景图描述">
							{{ assignData.panorama.description || "无描述" }}
						</el-descriptions-item>
						<el-descriptions-item label="当前状态">
							<el-tag type="info" size="small">未关联地点</el-tag>
						</el-descriptions-item>
					</el-descriptions>

					<div style="margin-top: 20px">
						<h4>选择地点：</h4>
						<el-select v-model="selectedLocationId" placeholder="请选择地点" style="width: 100%" filterable>
							<el-option v-for="loc in assignData.availableLocations" :key="loc.id" :label="`${loc.name} (ID: ${loc.id})`" :value="loc.id" />
						</el-select>
					</div>
				</div>
			</div>
			<template #footer>
				<el-button @click="assignDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleConfirmAssign" :disabled="!selectedLocationId"> 确定关联 </el-button>
			</template>
		</el-dialog>

		<!-- 全景图详情对话框 -->
		<el-dialog v-model="panoramaDetailDialogVisible" title="全景图详情" width="80%">
			<div v-if="panoramaDetailData" class="detail-content">
				<div class="detail-image">
					<el-image
						:src="loadImage(panoramaDetailData.panorama_image)"
						style="width: 100%; max-height: 500px"
						fit="contain"
						:preview-src-list="[loadImage(panoramaDetailData.panorama_image)]" />
				</div>
				<div class="detail-info">
					<el-descriptions :column="2" border>
						<el-descriptions-item label="全景图ID">{{ panoramaDetailData.id }}</el-descriptions-item>
						<el-descriptions-item label="描述">{{ panoramaDetailData.description || "无" }}</el-descriptions-item>
						<el-descriptions-item label="拍摄时间">{{ panoramaDetailData.shoot_time }}</el-descriptions-item>
						<el-descriptions-item label="状态">
							<el-tag :type="panoramaDetailData.status === 'published' ? 'success' : 'warning'">
								{{ panoramaDetailData.status === "published" ? "已发布" : "待审核" }}
							</el-tag>
						</el-descriptions-item>
						<el-descriptions-item label="预览图数量">{{ panoramaDetailData.preview_count || 0 }}张</el-descriptions-item>
						<el-descriptions-item label="创建时间">{{ panoramaDetailData.created_at }}</el-descriptions-item>
					</el-descriptions>

					<div v-if="panoramaDetailData.preview_images && panoramaDetailData.preview_images.length > 0" style="margin-top: 20px">
						<h4>预览图：</h4>
						<div class="preview-images">
							<el-image
								v-for="(img, index) in panoramaDetailData.preview_images"
								:key="index"
								:src="loadImage(img)"
								style="width: 120px; height: 90px; margin-right: 10px; margin-bottom: 10px"
								fit="cover"
								:preview-src-list="panoramaDetailData.preview_images.map((img) => loadImage(img))" />
						</div>
					</div>
				</div>
			</div>
			<template #footer>
				<el-button type="primary" @click="panoramaDetailDialogVisible = false">关闭</el-button>
			</template>
		</el-dialog>

		<!-- 添加预览图对话框 -->
		<el-dialog v-model="addPreviewDialogVisible" :title="`为全景图 ${currentPanorama?.id || ''} 添加预览图`" width="600px">
			<div v-if="currentPanorama" class="add-preview-content">
				<div class="current-preview-info" v-if="currentPanorama.preview_images && currentPanorama.preview_images.length > 0">
					<h4>当前预览图 ({{ currentPanorama.preview_images.length }}张):</h4>
					<div class="current-previews">
						<el-image
							v-for="(img, index) in currentPanorama.preview_images"
							:key="index"
							:src="loadImage(img)"
							style="width: 80px; height: 60px; margin-right: 10px; margin-bottom: 10px"
							fit="cover"
							:preview-src-list="currentPanorama.preview_images.map((img) => loadImage(img))" />
					</div>
				</div>

				<div class="add-preview-form">
					<el-upload
						class="upload-demo"
						drag
						action="#"
						:auto-upload="false"
						:on-change="handleAddPreviewFileChange"
						:file-list="addPreviewFiles"
						:before-upload="beforeUpload"
						multiple
						:limit="10">
						<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
						<div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
						<template #tip>
							<div class="el-upload__tip">支持jpg/png格式文件，且不超过10MB，最多可上传10张图片</div>
						</template>
					</el-upload>

					<div v-if="addPreviewFiles.length > 0" class="preview-files-list">
						<h4>已选择文件 ({{ addPreviewFiles.length }}张):</h4>
						<div class="file-list">
							<div v-for="(file, index) in addPreviewFiles" :key="index" class="file-item">
								<el-icon><Picture /></el-icon>
								<span class="file-name">{{ file.name }}</span>
								<span class="file-size">{{ formatFileSize(file.size) }}</span>
								<el-button link type="danger" size="small" @click="removePreviewFile(index)">
									<el-icon><Close /></el-icon>
								</el-button>
							</div>
						</div>
					</div>
				</div>
			</div>
			<template #footer>
				<el-button @click="addPreviewDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="handleConfirmAddPreview" :disabled="addPreviewFiles.length === 0" :loading="addPreviewLoading">
					确定添加
				</el-button>
			</template>
		</el-dialog>

		<!-- 图片画廊对话框 -->
		<el-dialog v-model="galleryDialogVisible" title="预览图画廊" width="90%" fullscreen>
			<div v-if="currentGalleryData" class="gallery-container">
				<div class="gallery-main">
					<el-image :src="loadImage(currentGalleryData.currentImage)" style="width: 100%" fit="contain" />
				</div>
				<div class="gallery-controls">
					<div class="gallery-info">
						<h3>{{ currentGalleryData.panorama.description || "全景图预览" }}</h3>
						<p>图片 {{ currentGalleryData.currentIndex + 1 }} / {{ currentGalleryData.images.length }}</p>
					</div>
					<div class="gallery-nav">
						<el-button :disabled="currentGalleryData.currentIndex === 0" @click="prevGalleryImage">
							<el-icon><ArrowLeft /></el-icon>
							上一张
						</el-button>
						<el-button :disabled="currentGalleryData.currentIndex === currentGalleryData.images.length - 1" @click="nextGalleryImage">
							下一张
							<el-icon><ArrowRight /></el-icon>
						</el-button>
					</div>
				</div>
				<div class="gallery-thumbnails">
					<div
						v-for="(img, index) in currentGalleryData.images"
						:key="index"
						:class="['thumbnail-item', { active: index === currentGalleryData.currentIndex }]"
						@click="selectGalleryImage(index)">
						<el-image :src="loadImage(img)" style="width: 120px; height: 90px" fit="cover" />
						<div class="thumbnail-index">{{ index + 1 }}</div>
					</div>
				</div>
			</div>
			<template #footer>
				<el-button type="primary" @click="galleryDialogVisible = false">关闭</el-button>
			</template>
		</el-dialog>

		<!-- 全景图查看弹窗 -->
		<el-dialog v-model="panoramaImageDialogVisible" title="全景图预览" width="90%" fullscreen>
			<div class="panorama-image-container">
				<el-image
					:src="currentPanoramaImage"
					style="width: 100%; height: 80vh"
					fit="contain"
					:preview-src-list="[currentPanoramaImage]"
					:loading="true">
					<!-- 自定义加载占位符 -->
					<template #placeholder>
						<div class="image-loading-placeholder">
							<div class="loading-spinner">
								<el-icon class="is-loading"><Loading /></el-icon>
								<p>图片加载中...</p>
							</div>
						</div>
					</template>

					<!-- 加载失败占位符 -->
					<template #error>
						<div class="image-error-placeholder">
							<el-icon><Picture /></el-icon>
							<p>图片加载失败</p>
						</div>
					</template>
				</el-image>
			</div>
			<template #footer>
				<el-button type="primary" @click="panoramaImageDialogVisible = false">关闭</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import {
	Upload,
	ArrowDown,
	Search,
	UploadFilled,
	Plus,
	Delete,
	Refresh,
	ZoomIn,
	Picture,
	Timer,
	Location,
	PictureRounded,
	ArrowLeft,
	ArrowRight,
	Loading,
	Close,
} from "@element-plus/icons-vue";
import request from "@/api/request";
import { loadImage } from "@/utils/imageUrl";
// import { onUnmounted } from "vue";

// 格式化文件大小
const formatFileSize = (bytes: number) => {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const route = useRoute();
const loading = ref(false);
const tableData = ref<any[]>([]);
const selectedRows = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const filterStatus = ref((route.query.status as string) || "all");
const searchKeyword = ref("");

// 对话框状态
const reviewDialogVisible = ref(false);
const reviewData = ref<any>(null);
const reviewComment = ref("");

const detailDialogVisible = ref(false);
const detailData = ref<any>(null);

const editDialogVisible = ref(false);
const editData = ref<any>(null);
const editFormRef = ref<FormInstance>();
const editForm = reactive({
	name: "",
	description: "",
	shootTime: "",
	location: "",
	longitude: 0,
	latitude: 0,
	metadataText: "",
});

const uploadDialogVisible = ref(false);
const uploadLoading = ref(false);
const uploadFormRef = ref<FormInstance>();
const uploadFiles = ref<any[]>([]);
const uploadForm = reactive({
	description: "",
	shootTime: "",
	longitude: 116.397128,
	latitude: 39.916527,
	address: "",
	location_id: null as number | null,
});

// 地点管理相关变量
const activeTab = ref((route.query.tab as string) || "panorama");
const locationData = ref<any[]>([]);
const selectedLocations = ref<any[]>([]);
const locationLoading = ref(false);
const locationCurrentPage = ref(1);
const locationPageSize = ref(10);
const locationTotal = ref(0);
const locationFilter = ref("");
const locationKeyword = ref("");

// 地点对话框相关变量
const locationDialogVisible = ref(false);
const locationDialogType = ref("add");
const locationFormRef = ref<FormInstance>();
const locationForm = reactive({
	id: 0,
	name: "",
	longitude: 116.397128,
	latitude: 39.916527,
	rating: 0,
	category: "",
	description: "",
	address: "",
	panorama_id: null as number | null,
	images: [] as string[],
});

// 全景图预览相关变量
const panoramaPreviews = ref<any[]>([]);
const previewLoading = ref(false);
const previewSearchKeyword = ref("");
const previewFilterType = ref("all");
const previewCurrentPage = ref(1);
const previewPageSize = ref(12);
const previewTotal = ref(0);
const panoramaImageDialogVisible = ref(false);
const currentPanoramaImage = ref<string>("");

// 关联相关变量
const assignDialogVisible = ref(false);
const assignLoading = ref(false);
const assignData = ref<any>(null);
const selectedPanoramaId = ref<number | null>(null);

// 全景图详情对话框
const panoramaDetailDialogVisible = ref(false);
const panoramaDetailData = ref<any>(null);

// 图片画廊对话框
const galleryDialogVisible = ref(false);
const currentGalleryData = ref<any>(null);

// 添加预览图对话框
const addPreviewDialogVisible = ref(false);
const addPreviewLoading = ref(false);
const currentPanorama = ref<any>(null);
const addPreviewFiles = ref<any[]>([]);

// 选择框数据
const availableLocations = ref<any[]>([]);
const selectablePanoramas = ref<any[]>([]);

const selectedLocationId = ref<number | null>(null);

// 表单验证规则
const editRules: FormRules = {
	name: [{ required: true, message: "请输入数据名称", trigger: "blur" }],
	shootTime: [{ required: true, message: "请选择拍摄时间", trigger: "change" }],
	longitude: [{ required: true, message: "请输入经度", trigger: "blur" }],
	latitude: [{ required: true, message: "请输入纬度", trigger: "blur" }],
};

const uploadRules: FormRules = {
	shootTime: [{ required: true, message: "请选择拍摄时间", trigger: "change" }],
	longitude: [{ required: true, message: "请输入经度", trigger: "blur" }],
	latitude: [{ required: true, message: "请输入纬度", trigger: "blur" }],
};

const locationRules: FormRules = {
	name: [{ required: true, message: "请输入地点名称", trigger: "blur" }],
	longitude: [{ required: true, message: "请输入经度", trigger: "blur" }],
	latitude: [{ required: true, message: "请输入纬度", trigger: "blur" }],
};

// 计算属性：过滤后的预览图数据
const filteredPanoramaPreviews = computed(() => {
	let data = panoramaPreviews.value;

	// 按类型过滤
	if (previewFilterType.value === "published") {
		data = data.filter((item) => item.status === "published");
	} else if (previewFilterType.value === "pending") {
		data = data.filter((item) => item.status === "pending");
	} else if (previewFilterType.value === "withLocation") {
		data = data.filter((item) => item.is_used);
	} else if (previewFilterType.value === "withoutLocation") {
		data = data.filter((item) => !item.is_used);
	}

	// 按关键词过滤
	if (previewSearchKeyword.value) {
		const keyword = previewSearchKeyword.value.toLowerCase();
		data = data.filter(
			(item) =>
				item.description?.toLowerCase().includes(keyword) ||
				item.location_name?.toLowerCase().includes(keyword) ||
				item.id.toString().includes(keyword)
		);
	}

	return data;
});

// 计算属性：过滤后的总数
const filteredPanoramaCount = computed(() => {
	return filteredPanoramaPreviews.value.length;
});

// 计算属性：当前页数据
const currentPagePanoramas = computed(() => {
	const start = (previewCurrentPage.value - 1) * previewPageSize.value;
	const end = start + previewPageSize.value;
	return filteredPanoramaPreviews.value.slice(start, end);
});

// 标签页切换处理
const handleTabChange = () => {
	if (activeTab.value === "location") {
		loadLocations();
	} else if (activeTab.value === "panoramaPreview") {
		loadPanoramaPreviews();
	} else {
		loadData();
	}
};

// 加载地点数据
const loadLocations = async () => {
	locationLoading.value = true;
	try {
		const response = await request.get("/api/panorama/locations");
		if (response.code === "200" && response.data) {
			let filteredData = response.data;

			// 按类别过滤
			if (locationFilter.value) {
				filteredData = filteredData.filter((loc: any) => loc.category === locationFilter.value);
			}

			// 按关键词过滤
			if (locationKeyword.value) {
				const keyword = locationKeyword.value.toLowerCase();
				filteredData = filteredData.filter(
					(loc: any) =>
						loc.name.toLowerCase().includes(keyword) ||
						loc.address?.toLowerCase().includes(keyword) ||
						loc.description?.toLowerCase().includes(keyword)
				);
			}

			locationTotal.value = filteredData.length;
			const start = (locationCurrentPage.value - 1) * locationPageSize.value;
			const end = start + locationPageSize.value;
			locationData.value = filteredData.slice(start, end);
		}
	} catch (error) {
		console.error("加载地点数据失败:", error);
		ElMessage.error("加载地点数据失败");
	} finally {
		locationLoading.value = false;
	}
};

// 加载全景图预览数据
const loadPanoramaPreviews = async () => {
	previewLoading.value = true;
	try {
		const response = await request.get("/api/panorama/panoramas");
		if (response.code === "200" && response.data) {
			panoramaPreviews.value = response.data.map((item: any) => ({
				id: item.id,
				panorama_image: item.panoramaImage,
				thumbnail: item.thumbnail,
				description: item.description,
				shoot_time: item.timestamp,
				status: item.status,
				preview_images: item.preview_images || [],
				is_used: item.is_used,
				location_name: item.location_name,
				longitude: item.longitude,
				latitude: item.latitude,
			}));

			previewTotal.value = panoramaPreviews.value.length;
		}
	} catch (error) {
		console.error("加载全景图预览数据失败:", error);
		ElMessage.error("加载数据失败");
	} finally {
		previewLoading.value = false;
	}
};

// 过滤全景图预览
const filterPanoramaPreviews = () => {
	// 重新计算 filteredPanoramaPreviews 计算属性
	previewCurrentPage.value = 1;
};

// 刷新全景图预览
const refreshPanoramaPreviews = () => {
	loadPanoramaPreviews();
};

// 查看全景图预览
const viewPanoramaPreview = (item: any) => {
	// 获取全景图主图 URL
	const imageUrl = loadImage(item.panorama_image); // 使用 loadImage 工具函数
	currentPanoramaImage.value = imageUrl;
	panoramaImageDialogVisible.value = true;
};

// 查看图片画廊
const viewImageGallery = (item: any, startIndex = 0) => {
	if (!item.preview_images || item.preview_images.length === 0) {
		ElMessage.warning("该全景图暂无预览图");
		return;
	}

	currentGalleryData.value = {
		panorama: item,
		images: item.preview_images,
		currentImage: item.preview_images[startIndex],
		currentIndex: startIndex,
	};

	galleryDialogVisible.value = true;
};

// 画廊导航
const prevGalleryImage = () => {
	if (currentGalleryData.value && currentGalleryData.value.currentIndex > 0) {
		currentGalleryData.value.currentIndex--;
		currentGalleryData.value.currentImage = currentGalleryData.value.images[currentGalleryData.value.currentIndex];
	}
};

const nextGalleryImage = () => {
	if (currentGalleryData.value && currentGalleryData.value.currentIndex < currentGalleryData.value.images.length - 1) {
		currentGalleryData.value.currentIndex++;
		currentGalleryData.value.currentImage = currentGalleryData.value.images[currentGalleryData.value.currentIndex];
	}
};

const selectGalleryImage = (index: number) => {
	if (currentGalleryData.value && index >= 0 && index < currentGalleryData.value.images.length) {
		currentGalleryData.value.currentIndex = index;
		currentGalleryData.value.currentImage = currentGalleryData.value.images[index];
	}
};

// 预览图分页处理
const handlePreviewPageSizeChange = (size: number) => {
	previewPageSize.value = size;
	previewCurrentPage.value = 1;
};

const handlePreviewPageChange = (page: number) => {
	previewCurrentPage.value = page;
};

// 加载全景图数据
const loadData = async () => {
	loading.value = true;
	try {
		const response = await request.get("/api/panorama/panoramas");
		if (response.code === "200" && response.data) {
			let filteredData = response.data;

			// 按状态过滤
			if (filterStatus.value !== "all") {
				filteredData = filteredData.filter((item: any) => item.status === filterStatus.value);
			}

			// 按关键词过滤
			if (searchKeyword.value) {
				const keyword = searchKeyword.value.toLowerCase();
				filteredData = filteredData.filter(
					(item: any) =>
						item.id.toString().includes(keyword) ||
						item.description?.toLowerCase().includes(keyword) ||
						item.location_name?.toLowerCase().includes(keyword)
				);
			}

			total.value = filteredData.length;
			const start = (currentPage.value - 1) * pageSize.value;
			const end = start + pageSize.value;

			tableData.value = filteredData.slice(start, end).map((item: any) => ({
				id: item.id,
				name: `全景图数据${item.id.toString().padStart(3, "0")}`,
				thumbnail: item.thumbnail,
				shootTime: item.timestamp,
				location: item.location_name,
				location_name: item.location_name,
				status: item.status,
				statusText: item.status === "published" ? "已发布" : item.status === "rejected" ? "已拒绝" : "待审核",
				is_used: item.is_used,
				preview_count: item.preview_images?.length || 0,
			}));
		}
	} catch (error) {
		console.error("加载数据失败:", error);
		ElMessage.error("加载数据失败");
	} finally {
		loading.value = false;
	}
};

// 为选择框加载可用全景图
const loadAvailablePanoramasForSelect = async () => {
	try {
		const response = await request.get("/api/panorama/available");
		if (response.code === "200" && response.data) {
			selectablePanoramas.value = response.data;
		}
	} catch (error) {
		console.error("加载全景图列表失败:", error);
	}
};

// 加载可用地点列表
const loadAvailableLocations = async () => {
	try {
		const response = await request.get("/api/panorama/locations");
		if (response.code === "200" && response.data) {
			availableLocations.value = response.data.filter((loc: any) => !loc.panorama);
		}
	} catch (error) {
		console.error("加载地点列表失败:", error);
	}
};

// 地点选择处理
const handleLocationSelectionChange = (selection: any[]) => {
	selectedLocations.value = selection;
};

// 行选择处理
const handleSelectionChange = (selection: any[]) => {
	selectedRows.value = selection;
};

// 添加地点
const handleAddLocation = () => {
	locationDialogType.value = "add";
	Object.assign(locationForm, {
		id: 0,
		name: "",
		longitude: 116.397128,
		latitude: 39.916527,
		rating: 0,
		category: "",
		description: "",
		address: "",
		panorama_id: null,
		images: [],
	});
	locationDialogVisible.value = true;
};

// 编辑地点（修改为从现有数据中查找）
const handleEditLocation = async (row: any) => {
	locationDialogType.value = "edit";

	try {
		// 从现有数据中查找
		const location = locationData.value.find((loc) => loc.id === row.id);
		if (location) {
			Object.assign(locationForm, {
				id: location.id,
				name: location.name,
				longitude: location.longitude,
				latitude: location.latitude,
				rating: location.rating || 0,
				category: location.category || "",
				description: location.description || "",
				address: location.address || "",
				panorama_id: location.panorama?.id || null,
				images: location.preview_images || [],
			});
			locationDialogVisible.value = true;
			return;
		}
	} catch (error) {
		ElMessage.error("加载地点详情失败");
	}
};

// 查看地点详情
const handleViewLocationDetail = (row: any) => {
	const content = `
    <div>
      <h3>${row.name}</h3>
      <p><strong>类别：</strong>${row.category || "未分类"}</p>
      <p><strong>评分：</strong>${row.rating || "0"}</p>
      <p><strong>地址：</strong>${row.address || "未设置"}</p>
      <p><strong>描述：</strong>${row.description || "无"}</p>
      <p><strong>经度：</strong>${row.longitude}</p>
      <p><strong>纬度：</strong>${row.latitude}</p>
      <p><strong>全景图：</strong>${row.panorama ? "已关联" : "未关联"}</p>
      ${row.panorama ? `<p><strong>全景图描述：</strong>${row.panorama.description || "无"}</p>` : ""}
      <p><strong>预览图数量：</strong>${row.preview_images?.length || 0}张</p>
    </div>
  `;

	ElMessageBox.alert(content, "地点详情", {
		dangerouslyUseHTMLString: true,
		confirmButtonText: "关闭",
		customClass: "location-detail-dialog",
	}).catch(() => {
		// 用户点击关闭或取消，什么也不做
	});
};

// 保存地点
const handleSaveLocation = async () => {
	if (!locationFormRef.value) return;

	try {
		await locationFormRef.value.validate();

		const locationData = {
			name: locationForm.name,
			longitude: locationForm.longitude,
			latitude: locationForm.latitude,
			rating: locationForm.rating,
			category: locationForm.category,
			description: locationForm.description,
			address: locationForm.address,
			panorama_image_id: locationForm.panorama_id || null,
		};

		if (locationDialogType.value === "add") {
			// 创建新地点
			const response = await request.post("/api/panorama/locations", locationData);
			if (response.code === "200") {
				ElMessage.success("地点添加成功");
				locationDialogVisible.value = false;
				loadLocations();
			}
		} else {
			// 更新地点
			const response = await request.put(`/api/panorama/locations/${locationForm.id}`, locationData);
			if (response.code === "200") {
				ElMessage.success("地点更新成功");
				locationDialogVisible.value = false;
				loadLocations();
			}
		}
	} catch (error: any) {
		if (error.errors) {
			ElMessage.error("请完善表单信息");
		} else {
			console.error("保存失败:", error);
			ElMessage.error("保存失败");
		}
	}
};

// 显示关联全景图对话框
const showAssignPanoramaDialog = async (row: any) => {
	try {
		// 加载可用全景图
		const response = await request.get("/api/panorama/available");
		if (response.code === "200" && response.data) {
			assignData.value = {
				location: {
					id: row.id,
					name: row.name,
				},
				panoramas: response.data,
			};
			selectedPanoramaId.value = null;
			assignDialogVisible.value = true;
		}
	} catch (error) {
		ElMessage.error("加载数据失败");
	}
};

// 确认关联全景图
const handleConfirmAssign = async () => {
	if (!selectedLocationId.value) return;

	assignLoading.value = true;

	try {
		console.log("开始关联操作...");

		// 获取 token（根据您的认证方式）
		// 假设 token 存储在 localStorage 中
		const token = localStorage.getItem("token") || "";

		if (!token) {
			ElMessage.error("请先登录");
			return;
		}

		// 构建查询参数
		const params = new URLSearchParams({
			token: token,
			panorama_id: assignData.value.panorama.id.toString(),
		});

		// 构建完整的 URL
		const url = `/api/panorama/locations/${selectedLocationId.value}/attach-panorama?${params.toString()}`;

		console.log("请求URL:", url);

		// 发送 POST 请求（使用空请求体）
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			// 不需要 body，参数都在 URL 中
		});

		console.log("响应状态:", response.status);
		const data = await response.json();
		console.log("响应数据:", data);

		if (response.ok && data.code === "200") {
			ElMessage.success("关联成功");
			assignDialogVisible.value = false;

			// 刷新相关数据
			loadData();
			if (activeTab.value === "location") {
				loadLocations();
			}
			if (activeTab.value === "panoramaPreview") {
				loadPanoramaPreviews();
			}
		} else {
			ElMessage.error(data.msg || `关联失败 (${response.status})`);
		}
	} catch (error: any) {
		console.error("请求失败:", error);
		ElMessage.error("请求失败: " + error.message);
	} finally {
		assignLoading.value = false;
	}
};

// 解除全景图关联
const handleDetachPanorama = async (row: any) => {
	try {
		await ElMessageBox.confirm(`确定要解除地点 "${row.name}" 与全景图的关联吗？`, "解除关联", {
			confirmButtonText: "确定",
			cancelButtonText: "取消",
			type: "warning",
		});

		const response = await request.post(`/api/panorama/locations/${row.id}/detach-panorama`);
		if (response.code === "200") {
			ElMessage.success("已解除关联");
			loadLocations();
			loadPanoramaPreviews();
		}
	} catch (error: any) {
		if (error !== "cancel") {
			ElMessage.error("解除关联失败");
		}
	}
};

// 为全景图显示关联对话框
const showAssignDialog = async (row: any) => {
	try {
		// 加载可用地点列表
		const response = await request.get("/api/panorama/locations");
		if (response.code === "200" && response.data) {
			// 筛选出未关联全景图的地点
			const availableLocations = response.data.filter((loc: any) => !loc.panorama);

			if (availableLocations.length === 0) {
				ElMessage.warning("没有可关联的地点，所有地点都已关联了全景图");
				return;
			}

			assignData.value = {
				panorama: row,
				availableLocations: availableLocations,
			};
			selectedPanoramaId.value = null;
			assignDialogVisible.value = true;
		}
	} catch (error) {
		console.error("加载地点列表失败:", error);
		ElMessage.error("加载地点列表失败");
	}
};

// 为全景图显示解除关联对话框
const showDetachDialog = (row: any) => {
	if (!row.location_id) {
		ElMessage.warning("该全景图未关联地点");
		return;
	}

	ElMessageBox.confirm(`确定要解除全景图与地点的关联吗？`, "解除关联", {
		confirmButtonText: "确定",
		cancelButtonText: "取消",
		type: "warning",
	})
		.then(async () => {
			try {
				const response = await request.post(`/api/panorama/locations/${row.location_id}/detach-panorama`);
				if (response.code === "200") {
					ElMessage.success("已解除关联");
					loadData();
					loadLocations();
					loadPanoramaPreviews();
				}
			} catch (error) {
				ElMessage.error("解除关联失败");
			}
		})
		.catch(() => {});
};

// 查看全景图详情
const handleViewPanoramaDetail = (row: any) => {
	panoramaDetailData.value = row;
	panoramaDetailDialogVisible.value = true;
};

// 添加预览图文件处理
const handleAddPreviewFileChange = (file: any) => {
	addPreviewFiles.value.push(file);
};

// 移除预览图文件
const removePreviewFile = (index: number) => {
	addPreviewFiles.value.splice(index, 1);
};

// 添加预览图
const handleAddPreview = (row: any) => {
	currentPanorama.value = row;
	addPreviewFiles.value = [];
	addPreviewDialogVisible.value = true;
};

// 为全景图添加预览图（在预览页面）
const handleAddPreviewForPanorama = (item: any) => {
	currentPanorama.value = item;
	addPreviewFiles.value = [];
	addPreviewDialogVisible.value = true;
};

// 确认添加预览图
const handleConfirmAddPreview = async () => {
	if (!currentPanorama.value || addPreviewFiles.value.length === 0) return;

	addPreviewLoading.value = true;

	try {
		// const formData = new FormData();

		// 上传图片并获取图片ID
		const uploadedImageIds: number[] = [];

		for (const file of addPreviewFiles.value) {
			if (file.raw) {
				const imageFormData = new FormData();
				imageFormData.append("file", file.raw);
				imageFormData.append("image_type", "preview");

				const uploadResponse = await request.post("/api/images/upload", imageFormData, {
					headers: {
						"Content-Type": "multipart/form-data",
					},
				});

				if (uploadResponse.code === "200" && uploadResponse.data) {
					uploadedImageIds.push(uploadResponse.data.imageId);
				}
			}
		}

		if (uploadedImageIds.length === 0) {
			ElMessage.error("图片上传失败");
			return;
		}

		// 将图片关联到全景图 - 直接发送数组
		const response = await request.post(`/api/panorama/${currentPanorama.value.id}/add-preview`, uploadedImageIds, {
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (response.code === "200") {
			ElMessage.success(`成功添加 ${uploadedImageIds.length} 张预览图`);
			addPreviewDialogVisible.value = false;

			// 刷新数据
			loadData();
			loadPanoramaPreviews();
		} else {
			ElMessage.error(response.msg || "添加预览图失败");
		}
	} catch (error) {
		console.error("添加预览图失败:", error);
		ElMessage.error("添加预览图失败");
	} finally {
		addPreviewLoading.value = false;
	}
};

// 移除预览图
const handleRemovePreview = async (item: any, imageUrl: string) => {
	try {
		// 从URL中提取图片ID
		const imageId = imageUrl.split("/").pop();
		if (!imageId) {
			ElMessage.error("无法获取图片ID");
			return;
		}

		await ElMessageBox.confirm("确定要移除这张预览图吗？", "移除预览图", {
			confirmButtonText: "确定移除",
			cancelButtonText: "取消",
			type: "warning",
		});

		const response = await request.delete(`/api/panorama/${item.id}/remove-preview`, {
			data: {
				preview_image_ids: [parseInt(imageId)],
			},
		});

		if (response.code === "200") {
			ElMessage.success("预览图已移除");
			// 刷新数据
			loadData();
			loadPanoramaPreviews();
		}
	} catch (error: any) {
		if (error !== "cancel") {
			ElMessage.error("移除预览图失败");
		}
	}
};

// 删除地点（简化为直接删除）
const handleDeleteLocation = async (row: any) => {
	try {
		await ElMessageBox.confirm(`确定要删除地点 "${row.name}" 吗？`, "删除地点", {
			confirmButtonText: "确定",
			cancelButtonText: "取消",
			type: "warning",
		});

		const response = await request.delete(`/api/panorama/locations/${row.id}`);
		if (response.code === "200") {
			ElMessage.success("地点删除成功");
			loadLocations();
			loadPanoramaPreviews();
		}
	} catch (error: any) {
		if (error !== "cancel") {
			ElMessage.error("删除失败");
		}
	}
};

// 批量删除地点
const handleBatchDeleteLocations = async () => {
	if (selectedLocations.value.length === 0) return;

	try {
		await ElMessageBox.confirm(`确定要删除选中的 ${selectedLocations.value.length} 个地点吗？`, "批量删除地点", {
			confirmButtonText: "确定删除",
			cancelButtonText: "取消",
			type: "warning",
		});

		const locationIds = selectedLocations.value.map((loc) => loc.id);
		const response = await request.post("/api/panorama/locations/batch-delete", {
			location_ids: locationIds,
			confirm: true,
		});

		if (response.code === "200") {
			ElMessage.success(`批量删除完成，成功删除 ${response.data.success} 个地点`);
			selectedLocations.value = [];
			loadLocations();
			loadPanoramaPreviews();
		}
	} catch (error: any) {
		if (error !== "cancel") {
			ElMessage.error("批量删除失败");
		}
	}
};

// 其他函数保持不变...
const handleViewDetail = async (row: any) => {
	try {
		const response = await request.get(`/api/manager/data/${row.id}`);
		if (response.code === "200" && response.data) {
			detailData.value = response.data;
			detailDialogVisible.value = true;
		}
	} catch (error) {
		ElMessage.error("加载详情失败");
	}
};

const handleEdit = async (row: any) => {
	try {
		const response = await request.get(`/api/manager/data/${row.id}`);
		if (response.code === "200" && response.data) {
			editData.value = response.data;
			Object.assign(editForm, {
				name: response.data.name || "",
				description: response.data.description || "",
				shootTime: response.data.shootTime,
				location: response.data.location || "",
				longitude: response.data.longitude || 0,
				latitude: response.data.latitude || 0,
				metadataText: response.data.metadata ? JSON.stringify(response.data.metadata, null, 2) : "",
			});
			editDialogVisible.value = true;
		}
	} catch (error) {
		ElMessage.error("加载数据失败");
	}
};

const validateMetadata = () => {
	if (editForm.metadataText) {
		try {
			JSON.parse(editForm.metadataText);
		} catch (error) {
			ElMessage.error("元数据格式错误，请输入有效的JSON格式");
			return false;
		}
	}
	return true;
};

const handleConfirmEdit = async () => {
	if (!editFormRef.value) return;

	try {
		await editFormRef.value.validate();

		if (!validateMetadata()) {
			return;
		}

		const updateData: any = {
			description: editForm.description,
			shoot_time: editForm.shootTime,
			longitude: editForm.longitude,
			latitude: editForm.latitude,
		};

		if (editForm.metadataText) {
			updateData.metadata = JSON.parse(editForm.metadataText);
		}

		const response = await request.put(`/api/manager/data/${editData.value.id}`, updateData);
		if (response.code === "200") {
			ElMessage.success("数据更新成功");
			editDialogVisible.value = false;
			loadData();
			loadPanoramaPreviews();
		}
	} catch (error: any) {
		if (error.errors) {
			ElMessage.error("请完善表单信息");
		} else {
			ElMessage.error("更新失败");
		}
	}
};

// 文件上传前验证
const beforeUpload = (file: File) => {
	const isImage = file.type.startsWith("image/");
	const isLt10M = file.size / 1024 / 1024 < 10;

	if (!isImage) {
		ElMessage.error("只能上传图片文件!");
		return false;
	}
	if (!isLt10M) {
		ElMessage.error("图片大小不能超过 10MB!");
		return false;
	}
	return true;
};

const handleBatchAction = async (command: string) => {
	if (selectedRows.value.length === 0) {
		ElMessage.warning("请先选择要操作的数据");
		return;
	}

	const actionText = command === "delete" ? "删除" : "发布";
	const dataIds = selectedRows.value.map((row) => row.id);

	try {
		await ElMessageBox.confirm(`确定要${actionText}选中的 ${selectedRows.value.length} 条数据吗？`, "提示", {
			confirmButtonText: "确定",
			cancelButtonText: "取消",
			type: "warning",
		});

		const response = await request.post("/api/manager/data/batch", {
			data_ids: dataIds,
			action: command,
		});

		if (response.code === "200") {
			ElMessage.success(`批量${actionText}操作完成`);
			loadData();
			loadPanoramaPreviews();
			selectedRows.value = [];
		}
	} catch (error: any) {
		if (error !== "cancel") {
			ElMessage.error(`${actionText}操作失败`);
		}
	}
};

const handleReview = async (row: any) => {
	try {
		const response = await request.get(`/api/manager/data/${row.id}`);
		if (response.code === "200" && response.data) {
			reviewData.value = response.data;
			reviewDialogVisible.value = true;
			reviewComment.value = "";
		}
	} catch (error) {
		ElMessage.error("加载数据详情失败");
	}
};

const handleApprove = async () => {
	if (!reviewData.value) return;
	try {
		const response = await request.post(`/api/manager/data/${reviewData.value.id}/review`, {
			action: "approve",
			comment: reviewComment.value,
		});
		if (response.code === "200") {
			ElMessage.success("审核通过");
			reviewDialogVisible.value = false;
			loadData();
			loadPanoramaPreviews();
		}
	} catch (error) {
		ElMessage.error("审核失败");
	}
};

const handleReject = async () => {
	if (!reviewData.value) return;
	try {
		const response = await request.post(`/api/manager/data/${reviewData.value.id}/review`, {
			action: "reject",
			comment: reviewComment.value,
		});
		if (response.code === "200") {
			ElMessage.success("已拒绝");
			reviewDialogVisible.value = false;
			loadData();
			loadPanoramaPreviews();
		}
	} catch (error) {
		ElMessage.error("操作失败");
	}
};

const handleDelete = (row: any) => {
	ElMessageBox.confirm(`确定要删除数据"${row.name}"吗？`, "提示", {
		confirmButtonText: "确定",
		cancelButtonText: "取消",
		type: "warning",
	})
		.then(async () => {
			try {
				const response = await request.delete(`/api/manager/data/${row.id}`);
				if (response.code === "200") {
					ElMessage.success("删除成功");
					loadData();
					loadPanoramaPreviews();
				}
			} catch (error) {
				ElMessage.error("删除失败");
			}
		})
		.catch(() => {});
};

const handleUpload = async () => {
	// 加载可用地点列表
	await loadAvailableLocations();

	uploadDialogVisible.value = true;
	uploadFiles.value = [];
	Object.assign(uploadForm, {
		description: "",
		shootTime: "",
		longitude: 116.397128,
		latitude: 39.916527,
		address: "",
		location_id: null,
	});
};

const handleFileChange = (file: any) => {
	uploadFiles.value = [file];
};

const handleConfirmUpload = async () => {
	if (!uploadFormRef.value) return;

	try {
		await uploadFormRef.value.validate();

		if (uploadFiles.value.length === 0) {
			ElMessage.warning("请选择要上传的文件");
			return;
		}

		uploadLoading.value = true;
		const formData = new FormData();

		if (uploadFiles.value[0]?.raw) {
			formData.append("panorama_file", uploadFiles.value[0].raw);
		}

		if (uploadFiles.value[0]?.raw) {
			formData.append("thumbnail_file", uploadFiles.value[0].raw);
		}

		formData.append("description", uploadForm.description);
		formData.append("shoot_time", uploadForm.shootTime);
		formData.append("longitude", uploadForm.longitude.toString());
		formData.append("latitude", uploadForm.latitude.toString());
		formData.append("address", uploadForm.address);

		if (uploadForm.location_id) {
			formData.append("location_id", uploadForm.location_id.toString());
		}

		const response = await request.post("/api/manager/data/upload", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});

		if (response.code === "200") {
			ElMessage.success("数据上传成功，等待审核");
			uploadDialogVisible.value = false;
			loadData();
			loadPanoramaPreviews();
		}
	} catch (error: any) {
		if (error.errors) {
			ElMessage.error("请完善表单信息");
		} else {
			console.error("上传失败:", error);
			ElMessage.error("上传失败");
		}
	} finally {
		uploadLoading.value = false;
	}
};

onMounted(() => {
	loadData();
	if (activeTab.value === "location") {
		loadLocations();
	} else if (activeTab.value === "panoramaPreview") {
		loadPanoramaPreviews();
	}
});
</script>

<style scoped>
.data-management .toolbar-card {
	margin-bottom: 20px;
}

.data-management .toolbar-card .toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.data-management .toolbar-card .toolbar .toolbar-left {
	display: flex;
	gap: 10px;
}

.data-management .toolbar-card .toolbar .toolbar-right {
	display: flex;
	align-items: center;
}

.data-management .table-card .pagination {
	margin-top: 20px;
	display: flex;
	justify-content: flex-end;
}

.data-management .review-content .review-image,
.data-management .detail-content .detail-image {
	margin-bottom: 20px;
}

.data-management .review-content .review-info .review-actions {
	margin-top: 20px;
}

.data-management .detail-info pre {
	background: #f5f7fa;
	padding: 12px;
	border-radius: 4px;
	font-family: "Courier New", monospace;
	font-size: 12px;
	overflow: auto;
	max-height: 200px;
}

/* 标签页样式 */
.data-tabs {
	margin-bottom: 20px;
}

/* 预览图数量单元格 */
.preview-count-cell {
	display: flex;
	align-items: center;
	justify-content: center;
}

/* 全景图预览样式 */
.preview-container-card {
	min-height: 600px;
}

.preview-item-col {
	margin-bottom: 20px;
}

.preview-item-card {
	height: 100%;
	transition: all 0.3s ease;
}

.preview-item-card:hover {
	transform: translateY(-5px);
	box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.preview-main-image {
	position: relative;
	cursor: pointer;
	overflow: hidden;
	border-radius: 4px;
}

.preview-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: white;
	opacity: 0;
	transition: opacity 0.3s ease;
}

.preview-main-image:hover .preview-overlay {
	opacity: 1;
}

.preview-overlay .el-icon {
	font-size: 24px;
	margin-bottom: 8px;
}

.preview-thumbnails {
	margin-top: 15px;
}

.thumbnails-title {
	display: flex;
	align-items: center;
	margin-bottom: 10px;
	font-size: 14px;
	color: #666;
}

.thumbnails-title .el-icon {
	margin-right: 5px;
}

.thumbnail-list {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 5px;
}

.thumbnail-item {
	position: relative;
	cursor: pointer;
	overflow: hidden;
	border-radius: 4px;
}

.thumbnail-item:hover {
	transform: scale(1.05);
}

.thumbnail-index {
	position: absolute;
	top: 2px;
	right: 2px;
	background: rgba(0, 0, 0, 0.7);
	color: white;
	font-size: 10px;
	padding: 1px 4px;
	border-radius: 2px;
}

.thumbnail-remove {
	position: absolute;
	top: 2px;
	left: 2px;
	background: rgba(255, 0, 0, 0.7);
	color: white;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: opacity 0.3s ease;
	cursor: pointer;
}

.thumbnail-item:hover .thumbnail-remove {
	opacity: 1;
}

.thumbnail-remove .el-icon {
	font-size: 10px;
}

.thumbnail-more {
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f5f5f5;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
	color: #666;
}

.thumbnail-more:hover {
	background: #e0e0e0;
}

.no-preview-thumbnails {
	margin-top: 15px;
	padding: 10px;
	background: #f9f9f9;
	border-radius: 4px;
	text-align: center;
}

.preview-info {
	margin-top: 15px;
}

.info-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 10px;
}

.preview-title {
	margin: 0;
	font-size: 14px;
	color: #333;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.status-badge {
	margin-left: 10px;
}

.info-details {
	margin-bottom: 15px;
}

.info-row {
	display: flex;
	align-items: center;
	margin-bottom: 5px;
	font-size: 12px;
	color: #666;
}

.info-row .el-icon {
	margin-right: 5px;
	width: 16px;
	text-align: center;
}

.action-buttons {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
}

.action-buttons .el-button {
	flex: 1;
	min-width: 70px;
}

/* 添加预览图对话框样式 */
.add-preview-content {
	max-height: 70vh;
	overflow-y: auto;
}

.current-preview-info {
	margin-bottom: 20px;
}

.current-preview-info h4 {
	margin-bottom: 10px;
	color: #333;
}

.current-previews {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.add-preview-form {
	margin-top: 20px;
}

.preview-files-list {
	margin-top: 20px;
	padding: 15px;
	background: #f9f9f9;
	border-radius: 4px;
}

.preview-files-list h4 {
	margin-bottom: 10px;
	color: #333;
}

.file-list {
	max-height: 200px;
	overflow-y: auto;
}

.file-item {
	display: flex;
	align-items: center;
	padding: 8px;
	background: white;
	border-radius: 4px;
	margin-bottom: 5px;
}

.file-item .el-icon {
	margin-right: 8px;
	color: #409eff;
}

.file-name {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	margin-right: 10px;
}

.file-size {
	color: #999;
	font-size: 12px;
	margin-right: 10px;
}

/* 画廊样式 */
.gallery-container {
	display: flex;
	flex-direction: column;
	height: 80vh;
}

.gallery-main {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f5f5f5;
	border-radius: 4px;
	margin-bottom: 20px;
	overflow: hidden;
}

.gallery-controls {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
	padding: 15px;
	background: #f9f9f9;
	border-radius: 4px;
}

.gallery-info h3 {
	margin: 0 0 5px 0;
	color: #333;
}

.gallery-info p {
	margin: 0;
	color: #666;
	font-size: 14px;
}

.gallery-nav {
	display: flex;
	gap: 10px;
}

.gallery-thumbnails {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 10px;
	padding: 15px;
	background: #f9f9f9;
	border-radius: 4px;
	max-height: 200px;
	overflow-y: auto;
}

.gallery-thumbnails .thumbnail-item {
	position: relative;
	cursor: pointer;
	border: 2px solid transparent;
	border-radius: 4px;
	overflow: hidden;
}

.gallery-thumbnails .thumbnail-item.active {
	border-color: #409eff;
}

.gallery-thumbnails .thumbnail-item:hover {
	transform: scale(1.05);
}

/* 空状态和加载状态 */
.preview-empty {
	padding: 60px 0;
	text-align: center;
}

.preview-loading {
	padding: 40px 0;
}

.preview-pagination {
	margin-top: 30px;
	display: flex;
	justify-content: center;
}

/* 禁用状态的删除按钮样式 */
.el-button--danger.is-disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* 预览图展示 */
.preview-images {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin-top: 10px;
}

/* 全景图信息样式 */
.panorama-info {
	font-size: 12px;
	color: #666;
	line-height: 1.4;
}

/* 操作按钮组样式 */
.el-table__cell .el-button + .el-button {
	margin-left: 4px;
}

/* 表格中的预览图列样式 */
:deep(.el-table__cell) .preview-count-cell .el-button {
	padding: 0;
	height: auto;
}

:deep(.el-table__cell) .preview-count-cell .el-button:hover {
	background: transparent;
}
</style>

<style>
/* 全局对话框样式 */
.delete-confirm-dialog .el-message-box__message {
	text-align: left;
}

.delete-confirm-dialog .el-message-box__title {
	color: #f56c6c;
	font-weight: bold;
}

.location-detail-dialog .el-message-box__message h3 {
	margin-top: 0;
	color: #333;
}

.location-detail-dialog .el-message-box__message p {
	margin: 8px 0;
}

.assign-content .el-descriptions {
	margin-bottom: 20px;
}

/* 画廊对话框全屏样式 */
.el-dialog__wrapper .el-dialog.is-fullscreen {
	max-width: 100%;
	height: 100vh;
}

.el-dialog__wrapper .el-dialog.is-fullscreen .el-dialog__body {
	height: calc(100vh - 100px);
}

/* 添加预览图对话框中的上传组件样式 */
.add-preview-content .upload-demo {
	width: 100%;
}

.add-preview-content .el-upload-dragger {
	width: 100%;
	height: 200px;
}

.panorama-image-container {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20px;
	height: 80vh;
}

.image-loading-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.image-error-placeholder {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	width: 100%;
	height: 100%;
	color: #909399;
}

.image-error-placeholder .el-icon {
	font-size: 48px;
	margin-bottom: 10px;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #409eff;
}

.loading-spinner .el-icon {
  font-size: 36px;
  margin-bottom: 10px;
}
</style>
