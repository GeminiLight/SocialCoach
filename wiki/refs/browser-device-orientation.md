<!-- Last verified: 2026-10-05 | Current stage: B -->

# 浏览器方向事件

Primary source：[W3C Device Orientation and Motion](https://www.w3.org/TR/orientation-event/)，2026-10-05 查阅；[Apple DeviceOrientationEvent](https://developer.apple.com/documentation/webkitjs/deviceorientationevent)。

- 方向 API 要求安全上下文；不要将手机访问局域网 HTTP 当成 HTTPS 站点的等价测试。
- 提供 `DeviceOrientationEvent.requestPermission()` 的浏览器需要从用户点击直接发起请求；在调用前等待异步工作会失去短暂用户激活。没有该方法的实现直接监听，但 API 存在不代表设备会提供有效读数。
- `beta` / `gamma` 可能为 null。两者是不同旋转轴的 Euler 分量，竖直握持时不能把 gamma 的跳变当成真实镜头跳转。
- 当前功能只需要相对重力方向，不使用 alpha / 绝对指南针。将重力投影到当前 screen orientation，水平放置缺少稳定左右方向时重新校准。屏幕旋转不能沿用旧中点。
- 不能通过浏览器工具的手机尺寸模拟确认真实硬件权限、读数质量或性能；真实手机需要独立验收。

本项目入口为 `tilt.ts` / `useTiltLook.ts`，传感器读数不持久化、不上传。规格与生命周期边界见 [方案](../specs/spec-3d-tilt-look.md)。
