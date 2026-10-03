<!-- Last verified: 2026-10-03 | Current stage: B -->

# Blender → glTF / GLB → 网页资产

用于 [3D 资产重建](../specs/spec-3d-blender-assets.md)；记录本轮重复查阅的外部导出 / 加载机制，本轮已制作并接入 24 个 GLB，运行版本为 Blender 5.2.2 LTS / Three.js 0.180.0。

## 机制与项目约束

- Blender glTF 导出支持网格、符合导出约定的材质、骨骼 / 蒙皮、表情形变和动画。复杂节点材质需整理或烘焙成可导出的贴图，离线渲染效果不能直接当作网页效果。
- Three.js `GLTFLoader` 加载资产及命名动画；Draco、KTX2 和 Meshopt 各有对应解码接入。实施时核对项目安装的 Three.js 与 Blender 版本，不照搬手册当前版本的全部选项。
- Draco 能减小网格传输量，也增加客户端解码工作。需要分别记录下载、解码、GPU 上传和首帧时间，不能只用压缩后文件大小证明加载加速。
- GLB 能存放动画数据，不会自动解决人物动作质量。握杯锚点、骨骼权重、转头、坐立和衣服变形仍需实际制作与浏览器回放检查。
- 资产许可、出处和修改记录单独维护；导出格式支持不代表第三方资产可以再分发。

## 一手来源

1. [Blender glTF 导出手册](https://docs.blender.org/manual/en/5.3/addons/scene_gltf2.html)：导出材质、动画、形变与骨骼约定；查阅版本为 5.3，不作为本机版本记录。
2. [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)：加载结果、动画列表与解码器接口。
3. [Three.js DRACOLoader](https://threejs.org/docs/pages/DRACOLoader.html)：网格压缩及客户端解码开销。

本机使用 Blender 5.2.2 LTS 独立后台进程制作，MCP 连接不作为前提，也不修改已打开的 Blender 项目。源素材、许可与复现命令见 [制作流程](../../app/scripts/blender/README.md)。
