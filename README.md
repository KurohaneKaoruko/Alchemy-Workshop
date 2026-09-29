# 炼金工坊 · Alchemy Workshop

一个基于 **Godot 4.6** 的文字冒险炼金游戏。  
玩家从学徒出发，通过剧情探索、随机异象与魔法阵炼成逐步提升境界，最终点化贤者之石。

**当前版本：v0.1.0**

## 核心玩法

- **剧情探索**：每章 3 个行动选项，消耗行动点，提升知识 / 熟练 / 名望 / 精力并获得材料。
- **魔法阵炼金**：九个阵位自由投料，按「等价交换」随机显化产物；精确命中定式时必定产出指定物。
- **定式系统**：四条奥术定式（三元初衡 → 汞梯升华 → 日月合契 → 赤红完成），
  可通过剧情推演或阵纹谐振破译。
- **随机异象**：支持 AI 叙事事件（设置页自配 OpenAI 兼容接口），失败自动回退内置事件池；
  事件带来增益 / 减益临时效果，影响炼成交换倾向。
- **境界成长**：学徒 → 炼金士 → 大炼金士 → 贤者候补 → 至高炼金术师。
- **演出系统**：章节开场、异象打字机演出、晋升过场、终局仪式、路由转场闪光，
  全部过场进入档案，可在档案页重播。

## 界面分区

| 分区 | 内容 |
| --- | --- |
| 工坊总览 | 今日主线、工作台入口、状态侧栏、首日引导 |
| 剧情探索 | 章节推进、行动选项、最近异象、快照与线索 |
| 魔法阵炼金 | 九槽投料、等价交换、定式追踪、背包投料、定式与效果 |
| 炼金档案 | 日志筛选、过场档案、重播、库存摘要 |
| 工坊设置 | AI 异象来源、仪式音效、校验清单、安全说明 |

## 运行

1. 安装 [Godot 4.7](https://godotengine.org/download)（标准版即可）。
2. 用 Godot 打开本目录的 `project.godot`。
3. 按 F5 运行。基础窗口 1440×900，最小 1152×720。

游戏完全离线可玩；AI 异象为可选增强（设置页填写 Base URL / 模型 / API Key）。

## 构建

本地构建（推荐）：

```powershell
pwsh -File tools/build.ps1
```

脚本使用项目内的 Godot 引擎（`tools/godot/`）与 Windows 导出模板
（`.godot-user/Godot/export_templates/`），通过 `APPDATA` 指向 `.godot-user` 便携运行，
产物输出到 `builds/`。这两个目录均不入库，需要时从 Godot 4.7.2 官方发行版取：

- `tools/godot/`：`Godot_v4.7.2-stable_win64.exe` 与 console 版
- `.godot-user/Godot/export_templates/4.7.2.stable/`：官方导出模板中的 `windows_release_x86_64.exe` 与 `version.txt`

GitHub Actions（`build.yml`）**只在发布时构建**，日常 push 到 main 不会触发：

```bash
# 发布：打标签推送即可，版本号取自标签
git tag v0.1.0 && git push origin v0.1.0
```

也可在仓库 Actions 页面手动触发（Run workflow），此时版本号取自 `project.godot`。
标签与 `project.godot` 的 `config/version` 不一致时构建会给出告警，产物按标签版本命名。
产物以 Artifacts 上传，命名与本地脚本一致（`AlchemyWorkshop_v<版本>.exe` + `.sha256`）。

## 测试

```bash
# 60 项逻辑检查 + 从学徒到贤者之石的全流程模拟
godot --headless res://tools/smoke_test.tscn

# 可选：真实渲染下依次截取五个视图画面到 .run/shots/
godot res://tools/visual_probe.tscn
```

## 目录结构

```
project.godot            # Godot 4.6 工程配置（autoload / 窗口 / 渲染）
scenes/Main.tscn         # 工坊外壳主场景
scripts/
  core/                  # 纯逻辑层
    game_data.gd         #   静态数据：材料、章节、配方、定式、内置事件
    state_helper.gd      #   状态构建、日志、临时效果
    progression.gd       #   境界晋升、剧情行动、定式线索
    alchemy_circle.gd    #   等价交换、定式显化、谐振破译
    crafting.gd          #   炼成台配方
    event_engine.gd      #   随机事件触发与结算
    grand_work_plan.gd   #   大工计划（阶段/日程/推荐工序）
    first_day_guide.gd   #   学徒首日引导
    workshop_overview.gd #   总览摘要
    archive_summary.gd   #   档案统计
    settings_checklist.gd#   设置校验清单
  singletons/            # 自动加载单例
    save_store.gd        #   user:// JSON 持久化（存档/偏好/AI配置/档案）
    sfx_manager.gd       #   AudioStreamGenerator 音符合成
    ai_client.gd         #   OpenAI 兼容接口调用与解析
    game_manager.gd      #   状态持有、回合驱动、过场信号
  ui/                    # 界面层
    theme_factory.gd     #   主题与调色板（羊皮纸 + 金）
    ui_factory.gd        #   控件构建助手
    magic_circle.gd      #   魔法阵自绘（充能/符文/爆发）
    main.gd              #   外壳：页头/导航/视图切换/过场队列
    views/               #   五个分区视图
    overlays/            #   过场演出组件
    widgets/             #   首日引导、大工导览
shaders/parchment_background.gdshader   # 羊皮纸氛围底纹
tools/                   # headless 冒烟测试 + 视觉截图探针
assets/cc0/              # CC0 素材（Kenney UI Pack、药水瓶图标）
```

## 存档与隐私

- 存档、偏好、过场档案保存在 `user://`（Godot 用户数据目录）下的 JSON 文件。
- API Key 仅做本地轻量混淆后保存，适合防误读，不等于加密保管；请自行斟酌。
- 所有数值结算在本地完成，AI 仅参与异象文本生成。

## 素材许可

- [Kenney UI Pack](https://kenney.nl/assets/ui-pack)（CC0）— 按钮纹理、字体、音效、星纹装饰。
- 药水瓶图标（CC0）— `assets/cc0/icons/`。
- 其余代码、文案与视觉设计为本项目原创。