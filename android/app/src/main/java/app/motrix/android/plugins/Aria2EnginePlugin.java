package app.motrix.android.plugins;

import android.os.Environment;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

@CapacitorPlugin(name = "Aria2Engine")
public class Aria2EnginePlugin extends Plugin {
    private static final String TAG = "Aria2Engine";
    private Process aria2Process;
    private int aria2Pid = -1;
    private static final String DEFAULT_BT_TRACKERS =
        "udp://tracker.opentrackr.org:1337/announce," +
        "udp://tracker.openbittorrent.com:80/announce," +
        "udp://tracker.torrent.eu.org:451/announce," +
        "udp://exodus.desync.com:6969/announce";

    @PluginMethod()
    public void startEngine(PluginCall call) {
        int rpcPort = call.getInt("rpcPort", 16800);
        String rpcSecret = call.getString("rpcSecret", "");
        String dir = call.getString("dir",
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath());
        int maxConcurrent = call.getInt("maxConcurrentDownloads", 5);
        int maxConnection = call.getInt("maxConnectionPerServer", 16);

        try {
            if (aria2Process != null && isProcessAlive(aria2Process)) {
                JSObject result = new JSObject();
                result.put("started", true);
                result.put("message", "aria2 engine already running");
                result.put("pid", aria2Pid);
                call.resolve(result);
                return;
            }

            String aria2Path = resolveAria2Binary();
            if (aria2Path == null) {
                JSObject result = new JSObject();
                result.put("started", false);
                result.put("message", "Failed to extract aria2 binary");
                call.resolve(result);
                return;
            }

            String filesDir = getContext().getFilesDir().getAbsolutePath();
            String cacheDir = getContext().getCacheDir().getAbsolutePath();
            String sessionFile = filesDir + "/aria2.session";
            String dhtFile = cacheDir + "/dht.dat";
            String dht6File = cacheDir + "/dht6.dat";
            File session = new File(sessionFile);
            if (!session.exists()) {
                session.createNewFile();
            }

            String confDir = getContext().getFilesDir().getAbsolutePath();

            ProcessBuilder pb = new ProcessBuilder(
                aria2Path,
                "--enable-rpc",
                "--rpc-listen-all=false",
                "--rpc-listen-port=" + rpcPort,
                "--rpc-allow-origin-all",
                "--rpc-secret=" + rpcSecret,
                "--dir=" + dir,
                "--max-concurrent-downloads=" + maxConcurrent,
                "--max-connection-per-server=" + maxConnection,
                "--split=16",
                "--min-split-size=1M",
                "--continue=true",
                "--allow-overwrite=true",
                "--auto-file-renaming=true",
                "--save-session=" + sessionFile,
                "--input-file=" + sessionFile,
                "--save-session-interval=10",
                "--disk-cache=64M",
                "--file-allocation=none",
                "--max-overall-download-limit=0",
                "--max-download-limit=0",
                "--enable-dht=true",
                "--dht-listen-port=6881-6999",
                "--dht-file-path=" + dhtFile,
                "--dht-file-path6=" + dht6File,
                "--bt-enable-lpd=true",
                "--enable-peer-exchange=true",
                "--follow-torrent=true",
                "--check-integrity=false",
                "--bt-save-metadata=true",
                "--bt-tracker=" + DEFAULT_BT_TRACKERS,
                "--listen-port=6881-6999",
                "--daemon=false"
            );

            pb.directory(new File(confDir));
            pb.redirectErrorStream(true);
            aria2Process = pb.start();

            new Thread(() -> {
                try {
                    BufferedReader reader = new BufferedReader(
                        new InputStreamReader(aria2Process.getInputStream()));
                    String line;
                    while ((line = reader.readLine()) != null) {
                        Log.d(TAG, "aria2: " + line);
                    }
                } catch (IOException e) {
                    Log.e(TAG, "Error reading aria2 output", e);
                }
            }).start();

            Thread.sleep(500);

            if (isProcessAlive(aria2Process)) {
                JSObject result = new JSObject();
                result.put("started", true);
                result.put("message", "aria2 engine started successfully");
                result.put("pid", getProcessId(aria2Process));
                call.resolve(result);
            } else {
                JSObject result = new JSObject();
                result.put("started", false);
                result.put("message", "aria2 engine failed to start");
                call.resolve(result);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start aria2 engine", e);
            JSObject result = new JSObject();
            result.put("started", false);
            result.put("message", "Error: " + e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod()
    public void stopEngine(PluginCall call) {
        if (aria2Process != null) {
            aria2Process.destroy();
            aria2Process = null;
            aria2Pid = -1;
        }
        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    @PluginMethod()
    public void getEngineStatus(PluginCall call) {
        JSObject result = new JSObject();
        boolean running = aria2Process != null && isProcessAlive(aria2Process);
        result.put("running", running);
        result.put("pid", aria2Pid);
        call.resolve(result);
    }

    @PluginMethod()
    public void isEngineRunning(PluginCall call) {
        JSObject result = new JSObject();
        result.put("running", aria2Process != null && isProcessAlive(aria2Process));
        call.resolve(result);
    }

    private String resolveAria2Binary() {
        String libDir = getContext().getApplicationInfo().nativeLibraryDir;
        if (libDir != null) {
            String[] candidates = new String[] { "libaria2c.so", "aria2c" };
            for (String name : candidates) {
                File libBinary = new File(libDir, name);
                if (libBinary.exists() && (libBinary.canExecute() || libBinary.setExecutable(true, false))) {
                    Log.i(TAG, "Using aria2c from nativeLibraryDir: " + libBinary.getAbsolutePath());
                    return libBinary.getAbsolutePath();
                }
            }
        }
        return extractAria2Binary();
    }

    private String extractAria2Binary() {
        try {
            String abi = android.os.Build.SUPPORTED_ABIS[0];
            String assetPath;

            if (abi.contains("arm64")) {
                assetPath = "engine/aria2c-arm64";
            } else if (abi.contains("arm")) {
                assetPath = "engine/aria2c-arm";
            } else if (abi.contains("x86_64")) {
                assetPath = "engine/aria2c-x86_64";
            } else if (abi.contains("x86")) {
                assetPath = "engine/aria2c-x86";
            } else {
                Log.e(TAG, "Unsupported ABI: " + abi);
                return null;
            }

            File outputFile = new File(getContext().getFilesDir(), "aria2c");

            if (outputFile.exists() && outputFile.canExecute() && outputFile.length() > 0) {
                return outputFile.getAbsolutePath();
            }

            InputStream is;
            try {
                is = getContext().getAssets().open(assetPath);
            } catch (IOException e) {
                String fallbackPath = assetPath.replace("engine/", "");
                Log.w(TAG, "Asset not found at " + assetPath + ", trying " + fallbackPath, e);
                assetPath = fallbackPath;
                is = getContext().getAssets().open(assetPath);
            }
            FileOutputStream fos = new FileOutputStream(outputFile);
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) != -1) {
                fos.write(buffer, 0, read);
            }
            fos.flush();
            fos.close();
            is.close();

            outputFile.setExecutable(true);
            return outputFile.getAbsolutePath();
        } catch (IOException e) {
            Log.e(TAG, "Failed to extract aria2 binary", e);
            return null;
        }
    }

    private boolean isProcessAlive(Process process) {
        try {
            process.exitValue();
            return false;
        } catch (IllegalThreadStateException e) {
            return true;
        }
    }

    private int getProcessId(Process process) {
        try {
            java.lang.reflect.Field pidField = process.getClass().getDeclaredField("pid");
            pidField.setAccessible(true);
            aria2Pid = pidField.getInt(process);
            return aria2Pid;
        } catch (Exception e) {
            return -1;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (aria2Process != null) {
            aria2Process.destroy();
            aria2Process = null;
        }
        super.handleOnDestroy();
    }
}
