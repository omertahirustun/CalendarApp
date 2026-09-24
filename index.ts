// expo-router'in kendi giris dosyasi normalde package.json "main" alaninda dogrudan
// hedeflenir. Android ana ekran widget'i icin registerWidgetTaskHandler'i da
// kaydetmemiz gerektigi icin bu ozel giris dosyasi araya girip ikisini birden yapar.
import "expo-router/entry";
import { registerWidgetTaskHandler } from "react-native-android-widget";
import { widgetTaskHandler } from "./widget/widget-task-handler";

registerWidgetTaskHandler(widgetTaskHandler);
