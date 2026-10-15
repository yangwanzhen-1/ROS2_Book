# ROS 2 笔记

本书用于记录 ROS 2、Navigation2 及其核心服务器的学习笔记。

## 使用说明

- [指导手册](./guide.md)：介绍如何新增章节、管理目录、插入图片和构建网页。
- 图片统一存放在对应章节的 `image/` 目录中。
- 新增 Markdown 文件后，需要在 `SUMMARY.md` 中添加目录项。

## 内容目录

1. [ROS 2 基础](./01_ROS2基础/README.md)
2. [生命周期节点](./02_生命周期节点/README.md)
3. [Navigation2](./03_Navigation2/README.md)
4. [Costmap2D](./04_Costmap2D/README.md)
5. [Planner Server](./05_PlannerServer/README.md)
6. [Controller Server](./06_ControllerServer/README.md)

也可以通过网页左侧目录选择对应章节。

## 本地预览

在 `ROS2_Book` 目录中执行：

```bash
nvm use
gitbook serve
```

然后在浏览器中访问 `http://localhost:4000`。
