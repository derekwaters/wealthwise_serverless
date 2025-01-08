#!/bin/bash

# Ensure BUILD_PLATFORM is set
if [ -z "$BUILD_PLATFORM"]; then set BUILD_PLATFORM="linux/arm64"; fi

pushd func-balance
kn func build --builder s2i --platform "$BUILD_PLATFORM" --registry "quay.io/rh-ee-dwaters"
popd

pushd func-check-notifications
kn func build --builder s2i --platform "$BUILD_PLATFORM" --registry "quay.io/rh-ee-dwaters"
popd

pushd func-cost-suggest
kn func build --builder s2i --platform "$BUILD_PLATFORM" --registry "quay.io/rh-ee-dwaters"
popd

pushd func-product-suggest
kn func build --builder s2i --platform "$BUILD_PLATFORM" --registry "quay.io/rh-ee-dwaters"
popd

pushd func-transact
kn func build --builder s2i --platform "$BUILD_PLATFORM" --registry "quay.io/rh-ee-dwaters"
popd

pushd tests/func-test-events
kn func build --builder s2i --platform "$BUILD_PLATFORM" --registry "quay.io/rh-ee-dwaters"
popd

pushd tests/func-test-loopback
kn func build --builder s2i --platform "$BUILD_PLATFORM" --registry "quay.io/rh-ee-dwaters"
popd

docker push quay.io/rh-ee-dwaters/func-test-loopback:latest
docker push quay.io/rh-ee-dwaters/func-test-events:latest
docker push quay.io/rh-ee-dwaters/func-transact:latest
docker push quay.io/rh-ee-dwaters/func-product-suggest:latest
docker push quay.io/rh-ee-dwaters/func-cost-suggest:latest
docker push quay.io/rh-ee-dwaters/func-check-notifications:latest
docker push quay.io/rh-ee-dwaters/func-balance:latest