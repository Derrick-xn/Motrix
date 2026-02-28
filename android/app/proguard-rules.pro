# Motrix Android ProGuard Rules

# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class app.motrix.android.** { *; }

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
