package app.motrix.android;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import app.motrix.android.plugins.Aria2EnginePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(Aria2EnginePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
