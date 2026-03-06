package app.motrix.android;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import app.motrix.android.plugins.Aria2EnginePlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MotrixMain";
    private static final int STORAGE_PERMISSION_CODE = 100;
    private static final int MANAGE_STORAGE_CODE = 101;
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
    // Use a stable open-tracker baseline so metadata->content follow tasks
    // still have enough peers even when source torrent trackers are sparse.

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(Aria2EnginePlugin.class);
        super.onCreate(savedInstanceState);
        requestStoragePermission();
        startAria2Engine();
    }

    private void startAria2Engine() {
        new Thread(() -> {
            try {
                if (aria2Process != null) {
                    try {
                        aria2Process.exitValue();
                    } catch (IllegalThreadStateException e) {
                        Log.i(TAG, "aria2 engine already running");
                        return;
                    }
                }

                String binaryPath = resolveAria2Binary();
                if (binaryPath == null) {
                    Log.e(TAG, "Failed to extract aria2 binary");
                    return;
                }

                String downloadDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS).getAbsolutePath();
                String filesDir = getFilesDir().getAbsolutePath();
                String cacheDir = getCacheDir().getAbsolutePath();
                String sessionFile = filesDir + "/aria2.session";
                String dhtFile = cacheDir + "/dht.dat";
                String dht6File = cacheDir + "/dht6.dat";
                String logFile = cacheDir + "/aria2.log";
                File session = new File(sessionFile);
                if (!session.exists()) {
                    session.createNewFile();
                }

                Log.i(TAG, "Starting aria2 engine: " + binaryPath);
                ProcessBuilder pb = new ProcessBuilder(
                    binaryPath,
                    "--enable-rpc",
                    "--rpc-listen-all=false",
                    "--rpc-listen-port=16800",
                    "--rpc-allow-origin-all",
                    "--dir=" + downloadDir,
                    "--max-concurrent-downloads=5",
                    "--max-connection-per-server=16",
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
                    "--enable-dht6=true",
                    "--dht-entry-point=dht.libtorrent.org:6881",
                    "--dht-entry-point6=dht.libtorrent.org:25401",
                    "--dht-listen-port=6881-6999",
                    "--dht-file-path=" + dhtFile,
                    "--dht-file-path6=" + dht6File,
                    "--bt-enable-lpd=false",
                    "--bt-max-peers=300",
                    "--bt-request-peer-speed-limit=0",
                    "--bt-tracker-connect-timeout=15",
                    "--bt-tracker-timeout=45",
                    "--bt-tracker=" + DEFAULT_BT_TRACKERS,
                    "--enable-peer-exchange=true",
                    "--check-certificate=false",
                    "--follow-torrent=true",
                    "--check-integrity=false",
                    "--bt-save-metadata=true",
                    "--log=" + logFile,
                    "--log-level=debug",
                    "--console-log-level=debug",
                    "--listen-port=6881-6999",
                    "--daemon=false"
                );
                pb.directory(getFilesDir());
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
                try {
                    int exitCode = aria2Process.exitValue();
                    Log.e(TAG, "aria2 engine exited immediately with code: " + exitCode);
                } catch (IllegalThreadStateException e) {
                    Log.i(TAG, "aria2 engine started successfully");
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to start aria2 engine", e);
            }
        }).start();
    }

    private String resolveAria2Binary() {
        String libDir = getApplicationInfo().nativeLibraryDir;
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
        return extractBinary();
    }

    private String extractBinary() {
        try {
            String abi = Build.SUPPORTED_ABIS[0];
            String assetName;
            if (abi.contains("arm64")) {
                assetName = "engine/aria2c-arm64";
            } else if (abi.contains("arm")) {
                assetName = "engine/aria2c-arm";
            } else if (abi.contains("x86_64")) {
                assetName = "engine/aria2c-x86_64";
            } else if (abi.contains("x86")) {
                assetName = "engine/aria2c-x86";
            } else {
                Log.e(TAG, "Unsupported ABI: " + abi);
                return null;
            }

            File outputFile = new File(getFilesDir(), "aria2c");
            if (outputFile.exists() && outputFile.canExecute() && outputFile.length() > 0) {
                Log.i(TAG, "aria2c binary already extracted: " + outputFile.length() + " bytes");
                return outputFile.getAbsolutePath();
            }

            Log.i(TAG, "Extracting aria2c from assets: " + assetName + " (ABI: " + abi + ")");
            InputStream is;
            try {
                is = getAssets().open(assetName);
            } catch (IOException e) {
                String fallbackName = assetName.replace("engine/", "");
                Log.w(TAG, "Asset not found at " + assetName + ", trying " + fallbackName, e);
                assetName = fallbackName;
                is = getAssets().open(assetName);
            }
            FileOutputStream fos = new FileOutputStream(outputFile);
            byte[] buffer = new byte[65536];
            int read;
            long total = 0;
            while ((read = is.read(buffer)) != -1) {
                fos.write(buffer, 0, read);
                total += read;
            }
            fos.flush();
            fos.close();
            is.close();

            outputFile.setExecutable(true, false);
            Log.i(TAG, "aria2c binary extracted: " + total + " bytes");
            return outputFile.getAbsolutePath();
        } catch (IOException e) {
            Log.e(TAG, "Failed to extract aria2 binary", e);
            return null;
        }
    }

    private void requestStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivityForResult(intent, MANAGE_STORAGE_CODE);
                } catch (Exception e) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    startActivityForResult(intent, MANAGE_STORAGE_CODE);
                }
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{
                        Manifest.permission.WRITE_EXTERNAL_STORAGE,
                        Manifest.permission.READ_EXTERNAL_STORAGE
                    }, STORAGE_PERMISSION_CODE);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (aria2Process != null) {
            aria2Process.destroy();
            aria2Process = null;
        }
        super.onDestroy();
    }
}
