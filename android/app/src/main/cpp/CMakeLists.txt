cmake_minimum_required(VERSION 3.6.0)

add_library(hello_world_jni SHARED hello_world.cpp)

target_link_libraries(hello_world_jni)
