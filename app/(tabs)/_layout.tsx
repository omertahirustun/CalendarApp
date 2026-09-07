import { Tabs } from "expo-router/js-tabs";
import { useEffect, useRef } from "react";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import {
  Platform,
  View,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../components/AppText";
import type { ErrorBoundaryProps } from "expo-router";
import { CalendarDays, Clock3, FolderKanban } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#2D26F0";
const BAR_RADIUS = 32;
const BAR_HEIGHT = 64;
const CENTER_SIZE = 64;

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
        <Text style={{ color: PRIMARY, fontWeight: "700" }}>Tekrar dene</Text>
      </Pressable>
    </View>
  );
}

function springIn(value: Animated.Value, toValue: number) {
  Animated.spring(value, {
    toValue,
    useNativeDriver: true,
    damping: 16,
    stiffness: 170,
    mass: 0.6,
  }).start();
}

function pressDown(value: Animated.Value) {
  Animated.timing(value, {
    toValue: 0.86,
    duration: 90,
    useNativeDriver: true,
  }).start();
}

function pressUp(value: Animated.Value) {
  Animated.spring(value, {
    toValue: 1,
    useNativeDriver: true,
    damping: 11,
    stiffness: 140,
    mass: 0.45,
  }).start();
}

function shadowIn(value: Animated.Value) {
  Animated.timing(value, {
    toValue: 1,
    duration: 140,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  }).start();
}

function shadowOut(value: Animated.Value) {
  Animated.timing(value, {
    toValue: 0,
    duration: 220,
    easing: Easing.inOut(Easing.cubic),
    useNativeDriver: false,
  }).start();
}

function AnimatedSideTab({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: typeof CalendarDays;
  label: string;
  onPress: () => void;
}) {
  const lift = useRef(new Animated.Value(active ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    springIn(lift, active ? 1 : 0);
  }, [active, lift]);

  const groupTranslate = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });
  const groupScale = Animated.multiply(
    lift.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.08],
    }),
    press
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => pressDown(press)}
      onPressOut={() => pressUp(press)}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={{
          alignItems: "center",
          transform: [
            { translateY: groupTranslate },
            { scale: groupScale },
          ],
        }}
      >
        <Icon
          size={25}
          color={active ? PRIMARY : "#9CA3AF"}
          strokeWidth={active ? 2.2 : 1.8}
        />
        <Text
          style={{
            marginTop: 4,
            fontSize: 11,
            fontWeight: active ? "700" : "600",
            color: active ? PRIMARY : "#9CA3AF",
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedName = state.routes[state.index]?.name;
  const bottomPad = Math.max(insets.bottom, 12);

  const centerActive = focusedName === "index";
  const centerLift = useRef(new Animated.Value(centerActive ? 1 : 0)).current;
  const centerShadow = useRef(new Animated.Value(centerActive ? 1 : 0)).current;
  const centerShadowPress = useRef(new Animated.Value(0)).current;
  const centerPress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    springIn(centerLift, centerActive ? 1 : 0);
    Animated.timing(centerShadow, {
      toValue: centerActive ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [centerActive, centerLift, centerShadow]);

  const centerTranslate = centerLift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });
  const centerScale = centerLift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const centerPressedScale = Animated.multiply(centerScale, centerPress);
  const centerBaseShadow = centerShadow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.16],
  });
  const centerBaseElevation = centerShadow.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 6],
  });
  const centerPressShadow = centerShadowPress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.06],
  });
  const centerPressElevation = centerShadowPress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2],
  });
  const centerShadowOpacity = Animated.add(centerBaseShadow, centerPressShadow);
  const centerElevation = Animated.add(centerBaseElevation, centerPressElevation);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: bottomPad,
        left: 16,
        right: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: BAR_HEIGHT,
          backgroundColor: "#FFFFFF",
          borderRadius: BAR_RADIUS,
          paddingHorizontal: 6,
          borderWidth: 1,
          borderColor: "#EEF1F6",
          shadowColor: "#1F2937",
          shadowOpacity: 0.14,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <View style={{ flex: 1, flexDirection: "row", height: "100%" }}>
          <AnimatedSideTab
            active={focusedName === "agenda"}
            icon={Clock3}
            label="Ajanda"
            onPress={() => navigation.navigate("agenda")}
          />
        </View>

        <View style={{ width: CENTER_SIZE + 8 }} />

        <View style={{ flex: 1, flexDirection: "row", height: "100%" }}>
          <AnimatedSideTab
            active={focusedName === "projects"}
            icon={FolderKanban}
            label="Projeler"
            onPress={() => navigation.navigate("projects")}
          />
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: -CENTER_SIZE / 2,
          left: "50%",
          marginLeft: -CENTER_SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={() => navigation.navigate("index")}
          onPressIn={() => {
            pressDown(centerPress);
            shadowIn(centerShadowPress);
          }}
          onPressOut={() => {
            pressUp(centerPress);
            shadowOut(centerShadowPress);
          }}
        >
          <Animated.View
            style={{
              transform: [
                { translateY: centerTranslate },
                { scale: centerPressedScale },
              ],
            }}
          >
            <Animated.View
              style={{
                width: CENTER_SIZE,
                height: CENTER_SIZE,
                borderRadius: CENTER_SIZE / 2,
                backgroundColor: PRIMARY,
                borderWidth: 4,
                borderColor: "#FFFFFF",
                shadowColor: PRIMARY,
                shadowOpacity: centerShadowOpacity,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: centerElevation,
              }}
            >
              <LinearGradient
                colors={["#5850FF", PRIMARY]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  borderRadius: CENTER_SIZE / 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarDays size={28} color="#FFFFFF" strokeWidth={2.2} />
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarContentHeight =
    BAR_HEIGHT + (Platform.OS === "android" ? insets.bottom : 0);

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#F3F4F6",
          height: tabBarContentHeight,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Ajanda",
          tabBarIcon: ({ color }) => <Clock3 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Takvim",
          tabBarIcon: ({ color }) => <CalendarDays size={24} color={color} />,
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