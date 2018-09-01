package com.uooo;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class HelloModule extends ReactContextBaseJavaModule {
  static {
    System.loadLibrary("hello_world_jni"); // Loads the library when the class is loaded
  }

  public HelloModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "HelloWorld"; // HelloWorld is how this module will be referred to from React Native
  }

  @ReactMethod
  public void helloJava(Promise promise) {
      promise.resolve("Hello from Java");
  }

  @ReactMethod
  public void helloNdk(Promise promise) {
      promise.resolve(helloWorldJni());
  }

  public native String helloWorldJni();
}
