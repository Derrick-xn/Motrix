# Motrix Android

Motrix 下载管理器的 Android 版本，基于 Capacitor + Vue 构建。

## 架构

Android 版本复用了桌面版的核心功能：

- **UI 层**：基于 Vue 2 + Element UI，针对移动端做了响应式适配
- **下载引擎**：aria2，通过 WebSocket JSON-RPC 通信
- **原生桥接**：Capacitor 插件，管理 aria2 进程生命周期
- **平台适配**：替换 Electron API 为 Web/Capacitor API

```
src/mobile/
├── main.js                    # 移动端入口
├── App.vue                    # 根组件
├── router/                    # 移动端路由
├── store/                     # Vuex store（去 Electron 依赖）
├── components/                # 移动端专用组件
│   ├── MobileMain.vue         # 主布局
│   ├── MobileNav.vue          # 底部导航栏
│   ├── MobileTaskIndex.vue    # 任务列表页
│   ├── MobileAddTask.vue      # 添加任务弹窗
│   └── MobileEngineClient.vue # 引擎客户端
├── platform/                  # 平台抽象层
│   ├── electron-shim.js       # Electron API 模拟
│   ├── native-shim.js         # 原生功能适配
│   ├── api-adapter.js         # API 层（localStorage 替代 IPC）
│   └── fetch-shim.js          # fetch/WebSocket shim
├── plugins/                   # Capacitor 插件
│   └── aria2-engine/          # aria2 引擎管理插件
└── styles/                    # 移动端样式
    └── mobile.scss
```

## 环境要求

- Node.js >= 16
- Android Studio
- Android SDK 34+
- JDK 17

## 开发

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式（浏览器）

```bash
npm run dev:mobile
```

访问 http://localhost:9081 在浏览器中预览移动端 UI。

> 注意：浏览器模式下 aria2 引擎不可用，需要手动启动一个 aria2 RPC 服务。

### 3. 构建移动端 Web 资源

```bash
npm run build:mobile
```

### 4. 同步到 Android 项目

```bash
npm run build:android
```

### 5. 在 Android Studio 中打开

```bash
npm run open:android
```

然后在 Android Studio 中连接设备或启动模拟器进行调试。

## aria2 引擎集成

Android 版需要编译适用于 Android 的 aria2 二进制文件，放置到以下位置：

```
android/app/src/main/assets/engine/
├── aria2c-arm64       # arm64-v8a
├── aria2c-arm         # armeabi-v7a
├── aria2c-x86_64      # x86_64
└── aria2c-x86         # x86
```

### 编译 aria2 for Android

可以使用以下项目来交叉编译 aria2：

- [AriaNg/aria2-android](https://github.com/nicengi/AriaNg-Android)
- [nicengi/AriaNg-Android](https://github.com/nicengi/AriaNg-Android)
- 使用 Android NDK 手动交叉编译

或者使用远程 aria2 模式：在设置中配置远程 aria2 RPC 地址和端口即可。

## 功能支持

| 功能 | 状态 |
|------|------|
| HTTP/HTTPS 下载 | ✅ |
| FTP 下载 | ✅ |
| 磁力链接下载 | ✅ |
| BT 种子下载 | ✅ |
| 多线程下载 | ✅ |
| 断点续传 | ✅ |
| 下载速度限制 | ✅ |
| 暗黑模式 | ✅ |
| 多语言支持 | ✅ |
| 下载通知 | ✅ |
| 前台服务 | ✅ |
| 文件管理器打开 | 🚧 |
| 分享接收链接 | 🚧 |

## 注意事项

1. Android 10+ 的存储权限限制可能需要额外处理
2. 后台下载依赖前台服务保持 aria2 运行
3. 首次运行需要授予网络和存储权限
