extends ViewBase
## 工坊设置：AI 异象来源、仪式音效与校验清单。

var _scroll: ScrollContainer
var _content: VBoxContainer
var _draft := {"enabled": false, "baseUrl": "", "model": "", "apiKey": ""}
var _prefs_draft := {"sfxEnabled": true, "sfxVolume": 0.7}
var _status := ""
var _busy_action := ""
var _show_api_key := false

var _enabled_check: CheckBox
var _base_url_edit: LineEdit
var _model_edit: LineEdit
var _api_key_edit: LineEdit
var _api_key_toggle: Button
var _key_status_label: Label
var _sfx_check: CheckBox
var _sfx_slider: HSlider
var _sfx_value_label: Label
var _save_button: Button
var _test_button: Button
var _connection_note: Label
var _overview_box: VBoxContainer
var _checklist_box: VBoxContainer
var _stats_grid: GridContainer
var _draft_note: Label
var _agenda_slot: VBoxContainer
var _agenda: PanelContainer = null

func _ready() -> void:
	_draft = Game.ai_settings.duplicate()
	_prefs_draft = Game.preferences.duplicate()
	_scroll = UIFactory.scroll_box()
	_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_scroll)
	_content = UIFactory.vbox(16)
	_scroll.add_child(_content)
	_build_static()
	Game.state_changed.connect(func(_s): refresh())

func view_id() -> String:
	return "settings"

func _build_static() -> void:
	# ---- 英雄卡 ----
	var hero := UIFactory.card(false)
	_content.add_child(hero)
	var hero_box := UIFactory.vbox(10)
	hero.add_child(UIFactory.margin(hero_box, 20, 16, 20, 16))
	hero_box.add_child(UIFactory.eyebrow("控制台 · Console"))
	hero_box.add_child(UIFactory.title("工坊设置", 24))
	hero_box.add_child(UIFactory.label("设置页优先回答三件事：当前配置是否能生效、哪些草稿尚未保存、以及你是否已经具备连接测试条件。", 14, ThemeFactory.PALETTE.ink_soft))

	var hero_row := UIFactory.hbox(16)
	hero_box.add_child(hero_row)

	var focus := UIFactory.card(false, true)
	focus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var focus_box := UIFactory.vbox(6)
	focus.add_child(focus_box)
	focus_box.add_child(UIFactory.eyebrow("当前控制焦点"))
	_overview_box = UIFactory.vbox(4)
	focus_box.add_child(_overview_box)
	var focus_actions := UIFactory.hbox(8)
	_save_button = UIFactory.button("保存设置", "gold")
	_save_button.pressed.connect(_on_save)
	focus_actions.add_child(_save_button)
	_test_button = UIFactory.button("测试连接", "secondary")
	_test_button.pressed.connect(_on_test)
	focus_actions.add_child(_test_button)
	focus_box.add_child(focus_actions)
	_connection_note = UIFactory.label("-", 12, ThemeFactory.PALETTE.ink_muted)
	focus_box.add_child(_connection_note)
	hero_row.add_child(focus)

	var rail_panel := UIFactory.card(false)
	rail_panel.custom_minimum_size = Vector2(430, 0)
	_stats_grid = GridContainer.new()
	_stats_grid.columns = 4
	_stats_grid.add_theme_constant_override("h_separation", 8)
	rail_panel.add_child(_stats_grid)
	hero_row.add_child(rail_panel)

	# ---- 主体 ----
	var main_row := UIFactory.hbox(16)
	main_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_child(main_row)

	var left_box := UIFactory.vbox(14)
	left_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	main_row.add_child(left_box)

	# 操作台
	var ops_card := UIFactory.card(false)
	left_box.add_child(ops_card)
	var ops_inner := UIFactory.vbox(8)
	ops_card.add_child(UIFactory.margin(ops_inner, 18, 14, 18, 14))
	ops_inner.add_child(UIFactory.eyebrow("控制操作"))
	ops_inner.add_child(UIFactory.title("设置操作台", 19))
	_draft_note = UIFactory.label("-", 12, ThemeFactory.PALETTE.ink_muted)
	ops_inner.add_child(_draft_note)
	var ops_row := UIFactory.hbox(8)
	var restore_saved := UIFactory.button("载入存档", "secondary")
	restore_saved.pressed.connect(_on_restore_saved)
	ops_row.add_child(restore_saved)
	var restore_default := UIFactory.button("恢复默认", "danger")
	restore_default.pressed.connect(_on_restore_default)
	ops_row.add_child(restore_default)
	ops_inner.add_child(ops_row)

	# AI 设置卡
	var ai_card := UIFactory.card(false)
	left_box.add_child(ai_card)
	var ai_inner := UIFactory.vbox(8)
	ai_card.add_child(UIFactory.margin(ai_inner, 18, 14, 18, 14))
	ai_inner.add_child(UIFactory.eyebrow("AI 异象来源"))
	ai_inner.add_child(UIFactory.title("AI 随机事件设置", 19))
	_enabled_check = UIFactory.checkbox("启用 AI 叙事异象")
	_enabled_check.toggled.connect(func(value):
		_draft.enabled = value
		_refresh_actions()
	)
	ai_inner.add_child(_enabled_check)
	ai_inner.add_child(UIFactory.label("启用后优先走外部模型；不可用时仍自动回退为内置事件。", 11, ThemeFactory.PALETTE.ink_muted))

	ai_inner.add_child(UIFactory.label("Base URL（OpenAI 兼容接口地址，留空回退默认值）", 13, ThemeFactory.PALETTE.ink, true, false))
	_base_url_edit = UIFactory.line_edit("https://api.openai.com/v1")
	_base_url_edit.text_changed.connect(func(text):
		_draft.baseUrl = text
		_refresh_actions()
	)
	ai_inner.add_child(_base_url_edit)

	ai_inner.add_child(UIFactory.label("模型名称", 13, ThemeFactory.PALETTE.ink, true, false))
	_model_edit = UIFactory.line_edit("gpt-4.1-mini")
	_model_edit.text_changed.connect(func(text):
		_draft.model = text
		_refresh_actions()
	)
	ai_inner.add_child(_model_edit)

	var key_head := UIFactory.hbox(6)
	_key_status_label = UIFactory.label("API Key（本地混淆保存）", 13, ThemeFactory.PALETTE.ink, true, false)
	key_head.add_child(_key_status_label)
	key_head.add_child(UIFactory.spacer())
	_api_key_toggle = UIFactory.button("显示", "secondary")
	_api_key_toggle.pressed.connect(_on_toggle_key)
	key_head.add_child(_api_key_toggle)
	ai_inner.add_child(key_head)
	_api_key_edit = UIFactory.line_edit("")
	_api_key_edit.secret = true
	_api_key_edit.text_changed.connect(func(text):
		_draft.apiKey = text
		_refresh_actions()
	)
	ai_inner.add_child(_api_key_edit)

	# 音效卡
	var sfx_card := UIFactory.card(false)
	left_box.add_child(sfx_card)
	var sfx_inner := UIFactory.vbox(8)
	sfx_card.add_child(UIFactory.margin(sfx_inner, 18, 14, 18, 14))
	sfx_inner.add_child(UIFactory.eyebrow("仪式回响"))
	sfx_inner.add_child(UIFactory.title("仪式音效", 19))
	_sfx_check = UIFactory.checkbox("启用仪式音效")
	_sfx_check.toggled.connect(func(value):
		_prefs_draft.sfxEnabled = value
		_refresh_actions()
	)
	sfx_inner.add_child(_sfx_check)
	var slider_row := UIFactory.hbox(8)
	_sfx_slider = UIFactory.slider()
	_sfx_slider.value_changed.connect(func(value):
		_prefs_draft.sfxVolume = float(value) / 100.0
		_sfx_value_label.text = "当前草稿输出强度：%d%%" % int(value)
		_refresh_actions()
	)
	slider_row.add_child(_sfx_slider)
	_sfx_value_label = UIFactory.label("-", 12, ThemeFactory.PALETTE.ink_muted, false, false)
	slider_row.add_child(_sfx_value_label)
	sfx_inner.add_child(slider_row)
	var preview_row := UIFactory.hbox(8)
	var preview_tap := UIFactory.button("试听按键", "secondary")
	preview_tap.pressed.connect(func():
		Sfx.configure(bool(_prefs_draft.sfxEnabled), float(_prefs_draft.sfxVolume))
		Sfx.play_cue("tap")
		Sfx.configure(bool(Game.preferences.sfxEnabled), float(Game.preferences.sfxVolume))
	)
	preview_row.add_child(preview_tap)
	var preview_success := UIFactory.button("试听炼成", "secondary")
	preview_success.pressed.connect(func():
		Sfx.configure(bool(_prefs_draft.sfxEnabled), float(_prefs_draft.sfxVolume))
		Sfx.play_cue("transmute_success")
		Sfx.configure(bool(Game.preferences.sfxEnabled), float(Game.preferences.sfxVolume))
	)
	preview_row.add_child(preview_success)
	sfx_inner.add_child(preview_row)

	# 侧栏
	var sidebar_wrap := UIFactory.scroll_box()
	sidebar_wrap.custom_minimum_size = Vector2(390, 0)
	var sidebar_box := UIFactory.vbox(12)
	sidebar_wrap.add_child(sidebar_box)
	main_row.add_child(sidebar_wrap)

	var checklist_card := UIFactory.card(false)
	var checklist_inner := UIFactory.vbox(6)
	checklist_card.add_child(UIFactory.margin(checklist_inner, 16, 12, 16, 12))
	checklist_inner.add_child(UIFactory.eyebrow("校验清单"))
	checklist_inner.add_child(UIFactory.title("检查清单", 17))
	_checklist_box = UIFactory.vbox(6)
	checklist_inner.add_child(_checklist_box)
	sidebar_box.add_child(checklist_card)

	var security_card := UIFactory.card(false)
	var security_inner := UIFactory.vbox(4)
	security_card.add_child(UIFactory.margin(security_inner, 16, 12, 16, 12))
	security_inner.add_child(UIFactory.eyebrow("安全说明"))
	security_inner.add_child(UIFactory.title("安全说明", 17))
	security_inner.add_child(UIFactory.label("API Key 会在本地做轻量混淆后存储，适合防误读，不等同于服务器级密钥管理。", 12, ThemeFactory.PALETTE.ink_soft))
	security_inner.add_child(UIFactory.label("数值结算仍在本地完成，AI 仅参与文本生成，不接管规则判断。", 12, ThemeFactory.PALETTE.ink_soft))
	sidebar_box.add_child(security_card)

	_agenda_slot = UIFactory.vbox(0)
	_content.add_child(_agenda_slot)

func refresh() -> void:
	_enabled_check.set_pressed_no_signal(bool(_draft.enabled))
	_base_url_edit.text = String(_draft.baseUrl)
	_model_edit.text = String(_draft.model)
	_api_key_edit.text = String(_draft.apiKey)
	_api_key_edit.secret = not _show_api_key
	_sfx_check.set_pressed_no_signal(bool(_prefs_draft.sfxEnabled))
	_sfx_slider.set_value_no_signal(round(float(_prefs_draft.sfxVolume) * 100.0))
	_sfx_value_label.text = "当前草稿输出强度：%d%%" % int(round(float(_prefs_draft.sfxVolume) * 100.0))
	_refresh_actions()

	var plan := GrandWorkPlan.build_grand_work_plan(Game.state)
	if _agenda != null and is_instance_valid(_agenda):
		_agenda.queue_free()
	var agenda := preload("res://scripts/ui/widgets/grand_work_agenda.gd").new()
	agenda.setup(plan, "settings")
	agenda.navigate.connect(func(target): navigate.emit(target))
	_agenda_slot.add_child(agenda)
	_agenda = agenda

func _has_unsaved_changes() -> bool:
	var ai_changed := bool(_draft.enabled) != bool(Game.ai_settings.enabled) \
		or String(_draft.baseUrl).strip_edges() != String(Game.ai_settings.baseUrl).strip_edges() \
		or String(_draft.model).strip_edges() != String(Game.ai_settings.model).strip_edges() \
		or String(_draft.apiKey).strip_edges() != String(Game.ai_settings.apiKey).strip_edges()
	var prefs_changed: bool = bool(_prefs_draft.sfxEnabled) != bool(Game.preferences.sfxEnabled) \
		or abs(float(_prefs_draft.sfxVolume) - float(Game.preferences.sfxVolume)) > 0.004
	return ai_changed or prefs_changed

func _can_test() -> bool:
	return bool(_draft.enabled) and String(_draft.model).strip_edges() != "" and String(_draft.apiKey).strip_edges() != ""

func _refresh_actions() -> void:
	var has_changes := _has_unsaved_changes()
	_save_button.disabled = not has_changes or _busy_action != ""
	_save_button.text = "保存中..." if _busy_action == "save" else ("保存设置" if has_changes else "已同步")
	_test_button.disabled = not _can_test() or _busy_action != ""
	_test_button.text = "测试中..." if _busy_action == "test" else "测试连接"

	var runtime = Game.runtime_ai_config
	if runtime != null:
		_key_status_label.text = "API Key（当前生效模型：%s）" % String(runtime.model)
	elif String(_draft.apiKey).strip_edges() != "":
		_key_status_label.text = "API Key（已录入草稿，未启用或未保存）"
	else:
		_key_status_label.text = "API Key（本地混淆保存，未录入）"

	_draft_note.text = "草稿与已保存设置一致。" if not has_changes else "当前草稿和已保存设置不同，建议先保存再继续测试。"
	_connection_note.text = _status if _status != "" else ("当前草稿已具备连接测试条件。" if _can_test() else "当前草稿还不具备连接测试条件。")

	# 侧栏清单
	for child in _checklist_box.get_children():
		child.queue_free()
	var checklist := SettingsChecklist.build_settings_checklist(_draft, _prefs_draft, runtime)
	var options := {
		"aiModeLabel": "实时异象" if runtime != null else ("待验证" if bool(_draft.enabled) else "回退模式"),
		"keyStatus": "已录入" if String(_draft.apiKey).strip_edges() != "" else "未录入",
		"canTestConnection": _can_test(),
	}
	var overview := SettingsChecklist.build_settings_overview(checklist, runtime, _status, options)
	var summary_card := UIFactory.card(false, overview.tone == "ready" or overview.tone == "success")
	var summary_inner := UIFactory.vbox(2)
	summary_card.add_child(summary_inner)
	summary_inner.add_child(UIFactory.label(String(overview.headline), 14, ThemeFactory.PALETTE.ink, true))
	summary_inner.add_child(UIFactory.label("就绪 %d/%d · %s" % [int(overview.readinessCount), int(overview.totalCount), String(overview.detail)], 11, ThemeFactory.PALETTE.ink_soft))
	_checklist_box.add_child(summary_card)
	for item in checklist:
		var row := UIFactory.card(false, false)
		var row_inner := UIFactory.vbox(1)
		row.add_child(row_inner)
		var head := UIFactory.hbox(6)
		head.add_child(UIFactory.label(String(item.label), 12, ThemeFactory.PALETTE.ink, true, false))
		head.add_child(UIFactory.spacer())
		var state_text: String = {"ready": "就绪", "attention": "待补全", "standby": "待机"}.get(String(item.state), String(item.state))
		head.add_child(UIFactory.label(state_text, 11, ThemeFactory.PALETTE.ink_muted, false, false))
		row_inner.add_child(head)
		row_inner.add_child(UIFactory.label(String(item.detail), 11, ThemeFactory.PALETTE.ink_soft))
		_checklist_box.add_child(row)

	# 统计栏
	for child in _stats_grid.get_children():
		child.queue_free()
	_stats_grid.add_child(UIFactory.stat_cell("模式", options.aiModeLabel, String(runtime.model) if runtime != null else "当前使用本地回退叙事"))
	_stats_grid.add_child(UIFactory.stat_cell("草稿", "待保存" if has_changes else "已同步", "检测到未保存改动" if has_changes else "当前与已保存设置一致"))
	_stats_grid.add_child(UIFactory.stat_cell("清单", "%d/%d" % [int(overview.readinessCount), int(overview.totalCount)], "连接：%s" % String(overview.connectionLabel)))
	_stats_grid.add_child(UIFactory.stat_cell("音效", ("%d%%" % int(round(float(_prefs_draft.sfxVolume) * 100.0))) if bool(_prefs_draft.sfxEnabled) else "关闭", "本地偏好草稿" ))

func _on_save() -> void:
	_busy_action = "save"
	_refresh_actions()
	Game.save_ai_settings(_draft)
	Game.set_preferences(_prefs_draft)
	_status = "设置已保存。"
	_busy_action = ""
	refresh()

func _on_test() -> void:
	_busy_action = "test"
	_status = "测试连接中..."
	_refresh_actions()
	var result: String = await Game.test_ai_connection(_draft)
	_status = result
	_busy_action = ""
	_refresh_actions()

func _on_restore_saved() -> void:
	_draft = Game.ai_settings.duplicate()
	_prefs_draft = Game.preferences.duplicate()
	_status = "已恢复到当前已保存设置。"
	refresh()

func _on_restore_default() -> void:
	_draft = Store.AI_DEFAULTS.duplicate()
	_prefs_draft = Store.PREFS_DEFAULTS.duplicate()
	_status = "已恢复默认草稿，保存后才会正式生效。"
	refresh()

func _on_toggle_key() -> void:
	_show_api_key = not _show_api_key
	_api_key_toggle.text = "隐藏" if _show_api_key else "显示"
	_api_key_edit.secret = not _show_api_key
