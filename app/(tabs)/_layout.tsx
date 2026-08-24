import { Tabs } from "expo-router";
import { Platform, View, Text, Pressable } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { CalendarDays, Clock3, FolderKanban } from "lucide-react-native";

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
        Bir sorun oluştu
      </Text>
      <Text
        style={{ color: "#6B7280", marginTop: 8, textAlign: "center" }}
        numberOfLines={6}
      >
        {String(props.error?.message ?? props.error)}
      </Text>
      <Pressable onPress={props.retry} style={{ marginTop: 16 }}>
        <Text style={{ color: "#2D26F0", fontWeight: "700" }}>Tekrar dene</Text>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2D26F0",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#F3F4F6",
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Takvim",
          tabBarIcon: ({ color }) => <CalendarDays size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Ajanda",
          tabBarIcon: ({ color }) => <Clock3 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projeler",
          tabBarIcon: ({ color }) => <FolderKanban size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
