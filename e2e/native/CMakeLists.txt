cmake_minimum_required(VERSION 3.18)
project(epshim CXX)

include(FetchContent)

# Pinned commit of the Ember+ reference implementation (https://github.com/Lawo/ember-plus)
# To bump: update GIT_TAG, delete e2e/native/build, and re-run `yarn e2e:build`.
set(EMBERPLUS_PIN "6bc294e70490b0833640464c365bcb2e42f707ca")

FetchContent_Declare(
	emberplus
	GIT_REPOSITORY https://github.com/Lawo/ember-plus.git
	GIT_TAG ${EMBERPLUS_PIN}
	SOURCE_SUBDIR libember
)

FetchContent_Declare(
	nlohmann_json
	URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
	URL_HASH SHA256=d6c65aca6b1ed68e7a182f4757257b107ae403032760ed6ef121c9d55e81757d
)

FetchContent_MakeAvailable(emberplus nlohmann_json)

add_library(epshim SHARED shim.cpp)
target_compile_features(epshim PRIVATE cxx_std_17)
target_compile_definitions(epshim PRIVATE EMBERPLUS_PIN="${EMBERPLUS_PIN}")
target_link_libraries(epshim PRIVATE libember::ember-headeronly nlohmann_json::nlohmann_json)
target_include_directories(epshim PRIVATE ${emberplus_SOURCE_DIR}/libs101/Headers)
