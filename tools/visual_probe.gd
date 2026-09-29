extends Node
## 视觉验证：真实渲染下依次切换五个视图并截图到 .run/shots/。

var _main: Control

func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://.run/shots"))
	_main = load("res://scenes/Main.tscn").instantiate()
	add_child(_main)
	await _wait_frames(30)
	await _capture("01_overview")
	_main.switch_view("story")
	await _wait_frames(25)
	await _capture("02_story")
	_main.switch_view("alchemy")
	await _wait_frames(25)
	await _capture("03_alchemy")
	_main.switch_view("journal")
	await _wait_frames(25)
	await _capture("04_journal")
	_main.switch_view("settings")
	await _wait_frames(25)
	await _capture("05_settings")
	print("VISUAL-PROBE DONE")
	get_tree().quit(0)

func _wait_frames(count: int) -> void:
	for _i in range(count):
		await get_tree().process_frame

func _capture(shot_name: String) -> void:
	await get_tree().process_frame
	var image := get_viewport().get_texture().get_image()
	var path := "res://.run/shots/%s.png" % shot_name
	image.save_png(path)
	print("captured " + path)
