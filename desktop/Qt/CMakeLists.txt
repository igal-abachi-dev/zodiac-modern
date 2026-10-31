cmake_minimum_required(VERSION 3.29)
project(NeutronStarQt VERSION 1.0 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_LINKER_TYPE MSVC)
# Official shared Qt binaries use the Microsoft dynamic CRT.
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")
find_package(Qt6 6.12.0 EXACT REQUIRED COMPONENTS Quick QuickControls2)
qt_standard_project_setup(REQUIRES 6.12)
function(add_bench target)
qt_add_executable(${target} WIN32 src/main.cpp src/startup.cpp src/startup.hpp)
qt_add_qml_module(${target} URI NeutronStar VERSION 1.0
    OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/${target}-qml/NeutronStar"
    QML_FILES ui/Main.qml ui/BenchButton.qml ui/BenchLabel.qml ui/Card.qml ui/Operation.qml ui/Workbench.qml
    SOURCES src/controller.hpp src/controller.cpp src/domain.hpp src/theme.hpp src/theme.cpp)
qt_add_resources(${target} assets PREFIX "/" BASE assets FILES
    assets/Fonts/inter-latin-400-normal.ttf assets/Fonts/inter-latin-500-normal.ttf
    assets/Fonts/inter-latin-600-normal.ttf assets/Fonts/noto-sans-hebrew-hebrew-400-normal.ttf
    assets/Icons/orbit.svg assets/Icons/shield-check.svg assets/Icons/lock-keyhole.svg assets/Icons/unlock-keyhole.svg)
target_link_libraries(${target} PRIVATE Qt6::Quick Qt6::QuickControls2 d3d11 dxgi user32)
target_include_directories(${target} PRIVATE src)
target_compile_options(${target} PRIVATE /W4 /WX /permissive- /utf-8 /guard:cf)
target_link_options(${target} PRIVATE /GUARD:CF /DYNAMICBASE /HIGHENTROPYVA /NXCOMPAT /CETCOMPAT)
endfunction()
add_bench(neutronstar_qt)
add_bench(neutronstar_qt_probe)
target_compile_definitions(neutronstar_qt_probe PRIVATE NEUTRONSTAR_STARTUP_PROBE)
enable_testing()
add_executable(domain_tests tests/domain_tests.cpp)
target_compile_options(domain_tests PRIVATE /W4 /WX /permissive- /utf-8)
add_test(NAME domain-contract COMMAND domain_tests)
add_executable(model_tests tests/model_tests.cpp src/controller.cpp src/controller.hpp)
target_include_directories(model_tests PRIVATE src)
target_link_libraries(model_tests PRIVATE Qt6::Quick)
target_compile_options(model_tests PRIVATE /W4 /WX /permissive- /utf-8)
add_test(NAME qt-model-contract COMMAND model_tests)
install(TARGETS neutronstar_qt RUNTIME DESTINATION .)
