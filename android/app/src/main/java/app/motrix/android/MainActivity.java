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
    private static Process aria2Process;

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

                String binaryPath = extractBinary();
                if (binaryPath == null) {
                    Log.e(TAG, "Failed to extract aria2 binary");
                    return;
                }

                String downloadDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS).getAbsolutePath();
                String sessionFile = getFilesDir().getAbsolutePath() + "/aria2.session";
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
                    "--bt-enable-lpd=true",
                    "--enable-peer-exchange=true",
                    "--follow-torrent=true",
                    "--check-integrity=false",
                    "--bt-save-metadata=true",
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
            InputStream is = getAssets().open(assetName);
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
