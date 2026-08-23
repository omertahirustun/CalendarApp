import { View, Text, Pressable } from "react-native";
import { Trash2 } from "lucide-react-native";
import CheckboxCircle from "./CheckboxCircle";
import { formatDayMonth, formatTime } from "../lib/date";
import { PRIORITY_META, type TaskRow } from "../lib/types";

interface TaskCardProps {
  task: TaskRow;
  onToggle: () => void;
  onDelete?: () => void;
}

export default function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const completed = task.status === "completed";
  const meta = PRIORITY_META[task.priority];

  return (
    <View
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 mb-3 ${
        completed ? "opacity-60" : ""
      }`}
      style={{ borderLeftColor: task.color }}
    >
      <View className="flex-row items-center px-4 py-3.5">
        <CheckboxCircle checked={completed} onToggle={onToggle} />

        <View className="flex-1 ml-3">
          <Text
            className={`text-base font-semibold ${completed ? "line-through text-gray-400" : "text-gray-900"}`}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <View className="flex-row items-center gap-2 mt-1.5">
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: meta.bg }}>
              <Text className="text-[11px] font-bold" style={{ color: meta.color }}>
                {meta.label}
              </Text>
            </View>
            {task.due_date && (
              <Text className="text-gray-400 text-xs">
                {formatDayMonth(task.due_date)} · {formatTime(task.due_date)}
              </Text>
            )}
          </View>
        </View>

        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={8} className="p-2">
            <Trash2 size={18} color="#EF4444" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
