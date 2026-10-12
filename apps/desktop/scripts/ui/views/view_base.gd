extends Control
class_name ViewBase
## 所有工坊视图的基类。

signal navigate(target: String)

func refresh() -> void:
	pass

func view_id() -> String:
	return "overview"
