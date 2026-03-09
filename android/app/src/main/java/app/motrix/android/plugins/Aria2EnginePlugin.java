package app.motrix.android.plugins;

import android.content.Intent;
import android.os.Environment;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import app.motrix.android.services.Aria2Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "Aria2Engine")
public class Aria2EnginePlugin extends Plugin {
    private static final String TAG = "Aria2Engine";
    private static final String DEFAULT_BT_TRACKERS =
        "https://tracker.pmman.tech:443/announce," +
        "https://tr.nyacat.pw:443/announce," +
        "https://tracker.zhuqiy.com:443/announce," +
        "https://tracker.moeking.me:443/announce," +
        "https://tr.zukizuki.org:443/announce," +
        "https://cny.fan:443/announce," +
        "https://tracker.iochimari.moe:443/announce," +
        "https://tracker.opentrackr.org:443/announce," +
        "https://opentracker.i2p.rocks:443/announce," +
        "https://torrent.tracker.durukanbal.com:443/announce," +
        "udp://tracker.opentrackr.org:1337/announce," +
        "udp://open.demonii.com:1337/announce," +
        "udp://open.stealth.si:80/announce," +
        "udp://tracker.torrent.eu.org:451/announce," +
        "udp://exodus.desync.com:6969/announce," +
        "udp://tracker.moeking.me:6969/announce," +
        "udp://opentracker.io:6969/announce," +
        "udp://tracker.theoks.net:6969/announce," +
        "udp://tracker.srv00.com:6969/announce," +
        "udp://tracker.qu.ax:6969/announce," +
        "udp://tracker.bittor.pw:1337/announce," +
        "udp://tracker.alaskantf.com:6969/announce," +
        "udp://tracker-udp.gbitt.info:80/announce," +
        "udp://t.overflow.biz:6969/announce," +
        "udp://open.dstud.io:6969/announce," +
        "udp://leet-tracker.moe:1337/announce," +
        "udp://explodie.org:6969/announce," +
        "udp://bittorrent-tracker.e-n-c-r-y-p-t.net:1337/announce";
    private static Process aria2Process;
    private static int aria2Pid = -1;
    private static String activeDownloadDir = "";
    // Use a stable open-tracker baseline so metadata->content follow tasks
    // still have enough peers even when source torrent trackers are sparse.

    @PluginMethod()
    public void startEngine(PluginCall call) {
        int rpcPort = call.getInt("rpcPort", 16800);
        String rpcSecret = call.getString("rpcSecret", "");
        String preferredDir = call.getString("dir", "");
        String btTracker = call.getString("btTracker", DEFAULT_BT_TRACKERS);
        int maxConcurrent = Math.max(call.getInt("maxConcurrentDownloads", 5), 1);
        int maxConnection = Math.max(call.getInt("maxConnectionPerServer", 16), 1);
        int split = Math.max(call.getInt("split", 16), 1);

        try {
            startForegroundService();

            if (aria2Process != null && !isProcessAlive(aria2Process)) {
                aria2Process = null;
                aria2Pid = -1;
                activeDownloadDir = "";
            }

            if (aria2Process != null && isProcessAlive(aria2Process)) {
                call.resolve(buildResult(true, "aria2 engine already running"));
                return;
            }

            String aria2Path = resolveAria2Binary();
            if (aria2Path == null) {
                call.resolve(buildResult(false, "Failed to extract aria2 binary"));
                return;
            }

            String filesDir = getContext().getFilesDir().getAbsolutePath();
            String cacheDir = getContext().getCacheDir().getAbsolutePath();
            String sessionFile = filesDir + "/aria2.session";
            String dhtFile = filesDir + "/dht.dat";
            String dht6File = filesDir + "/dht6.dat";
            String logFile = cacheDir + "/aria2.log";
            String dir = resolveDownloadDir(preferredDir);
            File session = new File(sessionFile);
            if (!session.exists()) {
                session.createNewFile();
            }

            String confDir = getContext().getFilesDir().getAbsolutePath();
            List<String> command = new ArrayList<>();
            command.add(aria2Path);
            command.add("--enable-rpc");
            command.add("--rpc-listen-all=false");
            command.add("--rpc-listen-port=" + rpcPort);
            command.add("--rpc-allow-origin-all");
            if (rpcSecret != null && !rpcSecret.trim().isEmpty()) {
                command.add("--rpc-secret=" + rpcSecret.trim());
            }
            command.add("--dir=" + dir);
            command.add("--max-concurrent-downloads=" + maxConcurrent);
            command.add("--max-connection-per-server=" + maxConnection);
            command.add("--split=" + split);
            command.add("--min-split-size=1M");
            command.add("--continue=true");
            command.add("--allow-overwrite=true");
            command.add("--auto-file-renaming=true");
            command.add("--save-session=" + sessionFile);
            command.add("--input-file=" + sessionFile);
            command.add("--save-session-interval=10");
            command.add("--disk-cache=64M");
            command.add("--file-allocation=none");
            command.add("--max-overall-download-limit=0");
            command.add("--max-download-limit=0");
            command.add("--max-overall-upload-limit=0");
            command.add("--enable-dht=true");
            command.add("--enable-dht6=true");
            command.add("--dht-entry-point=dht.libtorrent.org:6881");
            command.add("--dht-entry-point6=dht.libtorrent.org:25401");
            command.add("--dht-listen-port=6881-6999");
            command.add("--dht-file-path=" + dhtFile);
            command.add("--dht-file-path6=" + dht6File);
            command.add("--bt-enable-lpd=false");
            command.add("--bt-max-peers=300");
            command.add("--bt-request-peer-speed-limit=0");
            command.add("--bt-tracker-connect-timeout=15");
            command.add("--bt-tracker-timeout=45");
            command.add("--bt-load-saved-metadata=true");
            command.add("--bt-tracker=" + normalizeTrackerList(btTracker));
            command.add("--enable-peer-exchange=true");
            command.add("--check-certificate=false");
            command.add("--follow-torrent=true");
            command.add("--check-integrity=false");
            command.add("--bt-save-metadata=true");
            command.add("--seed-ratio=2");
            command.add("--seed-time=2880");
            command.add("--log=" + logFile);
            command.add("--log-level=warn");
            command.add("--console-log-level=warn");
            command.add("--listen-port=6881-6999");
            command.add("--daemon=false");

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(new File(confDir));
            pb.redirectErrorStream(true);
            aria2Process = pb.start();

            Process process = aria2Process;
            Thread outputThread = new Thread(() -> consumeProcessOutput(process), "aria2-output");
            outputThread.setDaemon(true);
            outputThread.start();

            Thread.sleep(750);

            if (isProcessAlive(aria2Process)) {
                aria2Pid = getProcessId(aria2Process);
                activeDownloadDir = dir;
                call.resolve(buildResult(true, "aria2 engine started successfully"));
            } else {
                int exitCode = aria2Process.exitValue();
                aria2Process = null;
                aria2Pid = -1;
                activeDownloadDir = "";
                stopForegroundService();
                call.resolve(buildResult(false, "aria2 engine failed to start (exit code " + exitCode + ")"));
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start aria2 engine", e);
            aria2Process = null;
            aria2Pid = -1;
            activeDownloadDir = "";
            stopForegroundService();
            call.resolve(buildResult(false, "Error: " + e.getMessage()));
        }
    }

    @PluginMethod()
    public void stopEngine(PluginCall call) {
        if (aria2Process != null) {
            aria2Process.destroy();
            aria2Process = null;
            aria2Pid = -1;
            activeDownloadDir = "";
        }
        stopForegroundService();
        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }

    @PluginMethod()
    public void getEngineStatus(PluginCall call) {
        boolean running = aria2Process != null && isProcessAlive(aria2Process);
        JSObject result = buildResult(running, "ok");
        result.put("started", running);
        call.resolve(result);
    }

    @PluginMethod()
    public void isEngineRunning(PluginCall call) {
        JSObject result = new JSObject();
        result.put("running", aria2Process != null && isProcessAlive(aria2Process));
        call.resolve(result);
    }

    private void startForegroundService() {
        Intent intent = new Intent(getContext(), Aria2Service.class);
        ContextCompat.startForegroundService(getContext(), intent);
    }

    private void stopForegroundService() {
        Intent intent = new Intent(getContext(), Aria2Service.class);
        getContext().stopService(intent);
    }

    private JSObject buildResult(boolean started, String message) {
        JSObject result = new JSObject();
        boolean running = aria2Process != null && isProcessAlive(aria2Process);
        result.put("started", started);
        result.put("running", running);
        result.put("message", message);
        result.put("pid", aria2Pid);
        result.put("dir", activeDownloadDir);
        return result;
    }

    private String normalizeTrackerList(String trackerList) {
        if (trackerList == null) {
            return DEFAULT_BT_TRACKERS;
        }
        String value = trackerList.trim();
        return value.isEmpty() ? DEFAULT_BT_TRACKERS : value;
    }

    private String resolveDownloadDir(String preferredDir) {
        List<File> candidates = new ArrayList<>();
        if (preferredDir != null && !preferredDir.trim().isEmpty()) {
            candidates.add(new File(preferredDir.trim()));
        }

        File appExternalDownloads = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (appExternalDownloads != null) {
            candidates.add(appExternalDownloads);
        }

        File publicDownloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (publicDownloads != null) {
            candidates.add(publicDownloads);
        }

        candidates.add(new File(getContext().getFilesDir(), "downloads"));

        for (File candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            if (ensureWritableDirectory(candidate)) {
                Log.i(TAG, "Using download directory: " + candidate.getAbsolutePath());
                return candidate.getAbsolutePath();
            }
        }

        String fallback = getContext().getFilesDir().getAbsolutePath();
        Log.w(TAG, "Falling back to app files dir for downloads: " + fallback);
        return fallback;
    }

    private boolean ensureWritableDirectory(File dir) {
        try {
            if (dir.exists()) {
                if (!dir.isDirectory()) {
                    return false;
                }
            } else if (!dir.mkdirs()) {
                return false;
            }

            File probe = new File(dir, ".motrix-write-test");
            if (probe.exists() || probe.createNewFile()) {
                //noinspection ResultOfMethodCallIgnored
                probe.delete();
                return true;
            }
        } catch (IOException e) {
            Log.w(TAG, "Directory is not writable: " + dir.getAbsolutePath(), e);
        }
        return false;
    }

    private void consumeProcessOutput(Process process) {
        try {
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                String normalized = line.toLowerCase();
                if (normalized.contains("error") || normalized.contains("exception")) {
                    Log.w(TAG, "aria2: " + line);
                }
            }
        } catch (IOException e) {
            Log.e(TAG, "Error reading aria2 output", e);
        }
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
            return pidField.getInt(process);
        } catch (Exception e) {
            return -1;
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
    }
}
