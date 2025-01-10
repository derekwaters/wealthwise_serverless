#!/bin/bash

# Ensure BUILD_PLATFORM is set
if [ -z "$BUILD_PLATFORM"]; then set BUILD_PLATFORM="linux/arm64"; fi

pushd func-balance
npm install
kn func build --platform "$BUILD_PLATFORM"
popd

pushd func-check-notifications
npm install
kn func build --platform "$BUILD_PLATFORM"
popd

pushd func-cost-suggest
npm install
kn func build --platform "$BUILD_PLATFORM"
popd

pushd func-product-suggest
npm install
kn func build --platform "$BUILD_PLATFORM"
popd

pushd func-transact
npm install
kn func build --platform "$BUILD_PLATFORM"
popd

pushd tests/func-test-events
npm install
kn func build --platform "$BUILD_PLATFORM"
popd

pushd tests/func-test-loopback
npm install
kn func build --platform "$BUILD_PLATFORM"
popd

docker push quay.io/rh-ee-dwaters/func-test-loopback:latest
docker push quay.io/rh-ee-dwaters/func-test-events:latest
docker push quay.io/rh-ee-dwaters/func-transact:latest
docker push quay.io/rh-ee-dwaters/func-product-suggest:latest
docker push quay.io/rh-ee-dwaters/func-cost-suggest:latest
docker push quay.io/rh-ee-dwaters/func-check-notifications:latest
docker push quay.io/rh-ee-dwaters/func-balance:latest