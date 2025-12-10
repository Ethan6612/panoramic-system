// src/stores/device.ts
import { defineStore } from 'pinia'

export interface DeviceLocation {
  deviceId: number
  latitude: number
  longitude: number
}

export const useDeviceStore = defineStore('device', {
  state: () => ({
    devices: [] as DeviceLocation[]
  }),
  actions: {
    updateDeviceLocation(data: DeviceLocation) {
      const index = this.devices.findIndex(d => d.deviceId === data.deviceId)
      if (index >= 0) {
        this.devices[index] = data
      } else {
        this.devices.push(data)
      }
    },
    clearDevices() {
      this.devices = []
    }
  }
})
