<template>
  <div
    class="context-menu"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @click.stop
  >
    <div class="menu-item" @click="handleFavorite">
      <el-icon><Star /></el-icon>
      <span>收藏地点</span>
    </div>
    <div class="menu-item" @click="handlePanorama">
      <el-icon><View /></el-icon>
      <span>全景预览</span>
    </div>
  </div>
  <div class="context-menu-overlay" @click="$emit('close')"></div>
</template>

<script setup lang="ts">
import { Star, View } from '@element-plus/icons-vue'

interface Props {
  x: number
  y: number
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  favorite: []
  panorama: []
}>()

const handleFavorite = () => {
  emit('favorite')
}

const handlePanorama = () => {
  emit('panorama')
}
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 998;
}

.context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 999;
  min-width: 150px;
  padding: 8px 0;
  transform: translate(-50%, -50%);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
  color: #333;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-item .el-icon {
  margin-right: 10px;
  font-size: 16px;
  color: #409eff;
}

.menu-item:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.menu-item:last-child {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}
</style>

