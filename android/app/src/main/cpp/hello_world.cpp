#include <jni.h>

#ifdef __cplusplus
extern "C" {
#endif

jstring Java_com_uooo_HelloModule_helloWorldJni(JNIEnv* env, jobject obj) {
  return env->NewStringUTF("Hello from NDK");
}

#ifdef __cplusplus
}
#endif
